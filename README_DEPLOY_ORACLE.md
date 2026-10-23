# TERENCE — Triển khai production trên Oracle Cloud Always Free (ARM64)

Hướng dẫn từ một VM Ubuntu 24.04 mới tinh đến khi website chạy HTTPS, kèm vận hành, backup và rollback.

**Mục tiêu:** VM.Standard.A1.Flex, **2 OCPU / 12 GB RAM**, Ubuntu 24.04 aarch64, Docker Engine + Compose v2. Chi phí 0đ/tháng nếu nằm trong hạn mức Always Free (tổng A1 ≤ 4 OCPU / 24 GB, boot + block volume ≤ 200 GB, outbound ≤ 10 TB/tháng).

| Thành phần | Image | Ghi chú |
|---|---|---|
| Caddy (HTTPS, reverse proxy) | `caddy:2.11-alpine` | Let's Encrypt tự động, WebSocket, HTTP/3 |
| App (Next.js 16 + Socket.IO, `server.ts`) | `terence-app:<git-sha>` (build từ `Dockerfile.prod`) | Node 24 LTS, alpine |
| PostgreSQL | `postgres:16-alpine` | chỉ trong mạng private |
| Redis | `redis:7-alpine` | có mật khẩu, AOF, LRU 256 MB |
| Elasticsearch | `elasticsearch:8.19.23` | single-node, bật security, heap 1 GB |
| LiveKit SFU | `livekit/livekit-server:v1.13.10` | 7881/tcp + 7882/udp |

Tất cả image trên đều có bản `linux/arm64`.

File liên quan:

```
Dockerfile.prod                     # image production (không đụng Dockerfile gốc)
Dockerfile.prod.dockerignore        # loại .env* khỏi build context
docker-compose.prod.yml             # stack production (không đụng docker-compose.yml)
deploy/oracle/Caddyfile
deploy/oracle/livekit.yaml
deploy/oracle/env.production.example
deploy/oracle/check-env.sh          # kiểm tra môi trường (read-only)
deploy/oracle/deploy.sh             # build + backup + migrate + start + health + auto-revert image
deploy/oracle/rollback.sh           # quay về image trước
deploy/oracle/backup-postgres.sh    # pg_dump (+ uploads) có xác minh + xoay vòng
```

---

## 1. Tạo VM trên OCI

1. **Compute → Instances → Create instance**
   - Image: **Canonical Ubuntu 24.04** (bản *aarch64*).
   - Shape: **VM.Standard.A1.Flex**, 2 OCPU, 12 GB.
   - Boot volume: 100 GB là đủ (còn lại dành cho backup volume nếu cần).
   - Thêm SSH public key của bạn.
2. Gán **Reserved Public IP** (Networking → IP Management) để IP không đổi khi stop/start VM.
3. **Mở cổng trong Security List / NSG** của subnet (Networking → VCN → Security Lists → Ingress Rules), source `0.0.0.0/0`:

   | Cổng | Giao thức | Mục đích |
   |---|---|---|
   | 22 | TCP | SSH (nên giới hạn về IP của bạn) |
   | 80 | TCP | ACME HTTP-01 + redirect sang HTTPS |
   | 443 | TCP | HTTPS |
   | 443 | UDP | HTTP/3 (tùy chọn) |
   | 7881 | TCP | LiveKit ICE/TCP |
   | 7882 | UDP | LiveKit ICE/UDP (media) |
   | 3478 | UDP | LiveKit TURN (chỉ khi bật TURN) |

   > ⚠️ Việc đổi firewall là thao tác trên hạ tầng của bạn — tự thực hiện/duyệt. Các script trong repo **không** thay đổi firewall.

   Về iptables trong VM: image Ubuntu của Oracle có sẵn rule `REJECT` trong chain `INPUT`. Cổng do Docker publish đi qua chain `FORWARD`/`DOCKER` nên thường **không** bị rule `INPUT` chặn — Security List là lớp chặn chính. Nếu sau khi mở Security List mà vẫn không vào được, kiểm tra `sudo iptables -L -n --line-numbers`. **Không** `ufw enable` một cách mù quáng (dễ khóa luôn SSH; Oracle khuyến cáo không dùng ufw).

4. **DNS**: tạo bản ghi A
   - `APP_DOMAIN` (vd `terence.com.vn`) → Reserved Public IP
   - `LIVEKIT_DOMAIN` (vd `livekit.terence.com.vn`) → cùng IP

   Nếu dùng Cloudflare: `LIVEKIT_DOMAIN` **bắt buộc DNS-only (mây xám)** — media WebRTC không đi qua proxy Cloudflare. `APP_DOMAIN` nên để DNS-only lúc lấy chứng chỉ lần đầu; nếu sau đó bật proxy, xem §9.

## 2. Chuẩn bị Ubuntu

```bash
ssh ubuntu@<PUBLIC_IP>
sudo apt-get update && sudo apt-get -y upgrade
sudo apt-get install -y ca-certificates curl git
sudo timedatectl set-timezone Asia/Ho_Chi_Minh

# Swap 4 GB — giúp `next build` không bị OOM khi stack đang chạy
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Elasticsearch
echo 'vm.max_map_count=262144' | sudo tee /etc/sysctl.d/99-elasticsearch.conf
sudo sysctl --system
```

Cài Docker Engine + Compose plugin (repo chính thức Docker, có bản arm64):

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"   # đăng xuất / đăng nhập lại để có hiệu lực
docker version && docker compose version
```

## 3. Lấy mã nguồn và cấu hình secrets

```bash
sudo mkdir -p /opt/terence && sudo chown "$USER": /opt/terence
git clone <REPO_URL> /opt/terence && cd /opt/terence

cp deploy/oracle/env.production.example .env.production
chmod 600 .env.production
```

Sinh secrets (hex để không phải URL-encode khi nhúng vào `DATABASE_URL`/`REDIS_URL`):

```bash
for k in NEXTAUTH_SECRET CRON_SECRET POSTGRES_PASSWORD REDIS_PASSWORD ELASTIC_PASSWORD LIVEKIT_API_SECRET; do
  sed -i "s|^$k=.*|$k=$(openssl rand -hex 32)|" .env.production
done
sed -i "s|^LIVEKIT_API_KEY=.*|LIVEKIT_API_KEY=API$(openssl rand -hex 6)|" .env.production
nano .env.production   # điền APP_DOMAIN, LIVEKIT_DOMAIN, ACME_EMAIL, SMTP_*, TMDB_*, SEPAY_*, ...
```

Các lệnh trên không in secret ra màn hình. Không commit `.env.production` (đã nằm trong `.gitignore`, và bị loại khỏi build context).

## 4. Kiểm tra môi trường

```bash
bash deploy/oracle/check-env.sh
```

Script kiểm tra (chỉ đọc, chỉ in **tên** biến): kiến trúc aarch64, Docker/Compose, RAM, swap, ổ đĩa, `vm.max_map_count`, cổng 80/443, quyền file env, biến bắt buộc, giá trị mặc định/placeholder, độ dài secret ≥ 32, ký tự cần URL-encode, DNS, và `docker compose config`.

## 5. Triển khai lần đầu

```bash
bash deploy/oracle/deploy.sh
```

Các bước script thực hiện:

1. `check-env.sh` (dừng nếu có lỗi chặn).
2. `git pull --ff-only` (dừng nếu working tree có thay đổi local).
3. Build `terence-app:<git-sha>` từ `Dockerfile.prod` (lần đầu ~10–20 phút trên 2 OCPU).
4. Start `db`, `redis` (chờ healthy) và `elasticsearch`.
5. Backup PostgreSQL (`backups/terence_<UTC>.dump`, có `pg_restore --list` xác minh).
6. `prisma migrate status` → `prisma migrate deploy`. **Không** bao giờ `migrate reset`, `db push`, hay tự baseline.
7. Start `app`, `livekit`, `caddy`; chờ healthcheck của app. Nếu không healthy → tự chuyển app về image trước (DB không bị đụng tới).

Dữ liệu ban đầu (chạy **một lần**, tùy nhu cầu):

```bash
alias dcp='docker compose -f docker-compose.prod.yml --env-file .env.production'

# Tài khoản quản trị/demo — mật khẩu lấy từ SEED_*_PASSWORD (đặt trước trong .env.production)
dcp exec app ./node_modules/.bin/prisma db seed --schema=src/dta/prisma/schema.prisma

# Danh mục phim + index tìm kiếm
dcp exec app ./node_modules/.bin/tsx src/dta/scripts/sync-kkphim-catalog.ts --pages=3 --delay=750
dcp exec app ./node_modules/.bin/tsx src/dta/scripts/elastic-reindex.ts

# Đổi role một user (mặc định ADMIN)
dcp exec app ./node_modules/.bin/tsx scripts/set-user-role.ts you@example.com ADMIN
```

### Chuyển dữ liệu từ server cũ (giữ nguyên dữ liệu hiện tại)

Trên server cũ: `pg_dump -Fc --no-owner -d <db> > terence_old.dump` (và nén `public/uploads` nếu có). Trên VM mới, **trước khi** người dùng truy cập:

```bash
scp terence_old.dump ubuntu@<IP>:/opt/terence/backups/
dcp up -d --wait db
dcp exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --exit-on-error' < backups/terence_old.dump
# uploads (nếu có):
dcp up -d app && dcp exec -T app tar -xzf - -C /app/public < uploads_old.tar.gz
bash deploy/oracle/deploy.sh --skip-pull
dcp exec app ./node_modules/.bin/tsx src/dta/scripts/elastic-reindex.ts
```

Nếu `deploy.sh` báo *"Database has tables but no migration history"* (DB cũ tạo bằng `db push`), xem §Migration bên dưới — script cố ý **không** tự baseline.

## 6. Kiểm tra sau triển khai

```bash
dcp ps                                         # tất cả Up / healthy
curl -sS https://$APP_DOMAIN/api/health        # {"status":"ok", checks: database/elasticsearch/redis}
curl -sSI https://$APP_DOMAIN | grep -iE 'strict-transport|x-frame|x-content-type'
curl -sS "https://$APP_DOMAIN/api/socketio/?EIO=4&transport=polling"   # trả về 0{"sid":...}
curl -sS https://$LIVEKIT_DOMAIN               # "OK"
dcp logs -f --tail=100 app
docker stats --no-stream                       # RAM thực tế từng container
```

(`APP_DOMAIN` ở trên là giá trị bạn đặt, không phải biến shell — thay tay.)

## 7. Cập nhật phiên bản mới

```bash
cd /opt/terence && bash deploy/oracle/deploy.sh
```

## 8. Rollback

**Ứng dụng (an toàn, nhanh):**

```bash
bash deploy/oracle/rollback.sh --list      # các image terence-app:<sha> còn trên máy
bash deploy/oracle/rollback.sh             # về image trước đó
bash deploy/oracle/rollback.sh <sha>       # về một sha cụ thể
```

Chỉ đổi image của container `app`; volume dữ liệu giữ nguyên. Hai migration hiện có (`20261006000000_baseline`, `20261020171403_shorts`) chỉ tạo bảng/index/khóa ngoại — code cũ chạy được trên schema mới. Khi viết migration mới, giữ nguyên tắc *expand → migrate → contract* để rollback image luôn an toàn.

**Cơ sở dữ liệu (chỉ khi thật sự cần — có mất dữ liệu phát sinh sau thời điểm backup):**

```bash
bash deploy/oracle/backup-postgres.sh           # luôn backup trạng thái hiện tại trước
dcp stop app
dcp exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --single-transaction' \
  < backups/terence_<TIMESTAMP>.dump
bash deploy/oracle/rollback.sh <sha khớp với backup>
```

## 9. Bảo mật & mạng

- Chỉ Caddy publish 80/443; LiveKit publish 7881/tcp, 7882/udp. **App, PostgreSQL, Redis, Elasticsearch không publish cổng nào**; db/redis/es nằm trong mạng Docker `internal` (không ra Internet).
- Header: HSTS, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy` (cho phép camera/mic/màn hình trên chính origin — cần cho Watch Party), ẩn `Server`. CSP toàn site chưa bật (nhiều nguồn ảnh/HLS/YouTube bên ngoài — nên triển khai dạng `Content-Security-Policy-Report-Only` trước).
- `/uploads/*` do Caddy phục vụ trực tiếp từ volume `uploads` với CSP `sandbox` — file upload không thể chạy script trên origin.
- Cookie NextAuth: vì `NEXTAUTH_URL=https://…`, NextAuth dùng `__Secure-next-auth.session-token` (Secure, HttpOnly, SameSite=Lax). `proxy.ts` và Socket.IO đọc được cả hai tên cookie.
- Google OAuth: thêm *Authorized redirect URI* `https://APP_DOMAIN/api/auth/callback/google`; bật `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` rồi **build lại**.
- SePay: cấu hình webhook về `https://APP_DOMAIN/api/payments/sepay/webhook` (code cũng có `/api/webhooks/sepay`) với API key = `SEPAY_WEBHOOK_API_KEY`.
- Cloudflare proxy trước `APP_DOMAIN`: thêm vào đầu Caddyfile `servers { trusted_proxies static <dải IP Cloudflare> }` để rate-limit thấy IP thật; nếu không, mọi request bị tính là IP của Cloudflare.
- Secret: không có giá trị mặc định nào trong `docker-compose.prod.yml` — thiếu biến là `docker compose` dừng ngay. Các script chỉ in tên biến.

## 10. Biến môi trường

**Build-time** (nhúng vào bundle JS — đổi phải build lại): `NEXT_PUBLIC_SITE_URL` (= `https://APP_DOMAIN`), `NEXT_PUBLIC_LIVEKIT_URL` (= `wss://LIVEKIT_DOMAIN`), `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`, `NEXT_PUBLIC_TMDB_IMAGE_BASE_URL`, `NEXT_PUBLIC_REGION`. Header CORS `/api/*` trong `next.config.mjs` cũng được tính lúc build từ `NEXT_PUBLIC_SITE_URL`.

**Runtime — bắt buộc:** `APP_DOMAIN`, `LIVEKIT_DOMAIN`, `ACME_EMAIL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `ELASTIC_PASSWORD`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.

**Runtime — tự sinh trong compose (không đặt trong env):** `NEXTAUTH_URL`, `APP_URL`, `ALLOWED_ORIGINS`, `LIVEKIT_URL`, `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `ELASTICSEARCH_HOST/USERNAME/PASSWORD`.

**Runtime — tùy chức năng:** `SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM_NAME/ADDRESS` (đăng ký, quên mật khẩu); `GOOGLE_CLIENT_ID/SECRET`; `TMDB_API_KEY`, `TMDB_READ_ACCESS_TOKEN`, `TMDB_BASE_URL`; `OPHIM_*`, `OPHIM18_*`, `KKPHIM_*`, `DISABLE_OPHIM_CHECK`; `YOUTUBE_API_KEY`; `DEMO_HLS_URL`, `PUBLIC_STREAM_ALLOWED_HOSTS`; `SEPAY_WEBHOOK_API_KEY` (hoặc legacy `SEPAY_WEBHOOK_SECRET`), `SEPAY_API_KEY`, `SEPAY_API_BASE`, `SEPAY_BANK_CODE`, `SEPAY_BANK_ACCOUNT`, `VIETQR_*`; `GNEWS_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`; `ELASTICSEARCH_INDEX_MOVIES`, `LOG_LEVEL`, `TZ`.

**Chỉ dùng cho seed/script:** `SEED_ADMIN_PASSWORD`, `SEED_STAFF_PASSWORD`, `SEED_USER_PASSWORD`.

**Cờ entrypoint** (đặt sẵn trong compose prod): `RUN_MIGRATIONS=false`, `ALLOW_AUTO_BASELINE=false`, `SEED_ON_START=false`, `SYNC_*_ON_START=false`.

## 11. Tài nguyên (2 OCPU / 12 GB)

| Service | CPU limit | RAM limit | Ghi chú |
|---|---|---|---|
| app | 1.5 | 2 GB | `--max-old-space-size=1536` |
| db | 1.0 | 1.5 GB | `shared_buffers=384MB`, `max_connections=60` |
| elasticsearch | 1.0 | 2 GB | heap 1 GB (`ES_JAVA_OPTS`) |
| livekit | 1.0 | 1 GB | ~20 người/phòng |
| redis | 0.5 | 384 MB | `maxmemory 256mb` |
| caddy | 0.5 | 256 MB | |

Tổng giới hạn ≈ 7.1 GB; ~4.5 GB còn lại cho OS, page cache và `next build` (~3 GB). CPU limit được phép vượt tổng 2 OCPU vì không phải lúc nào các service cũng cùng tải.

Khi thiếu tài nguyên — theo thứ tự ưu tiên, **không bỏ chức năng**:
1. Giảm heap ES: `ES_JAVA_OPTS=-Xms512m -Xmx512m` (đủ cho vài chục nghìn phim). Search vẫn tự fallback về PostgreSQL nếu ES chết.
2. Build image ở nơi khác thay vì trên VM: GitHub Actions runner `ubuntu-24.04-arm` (hoặc `docker buildx --platform linux/arm64`), push lên GHCR, rồi `docker pull` + tag `terence-app:<sha>` trên VM.
3. Watch Party video đông người: LiveKit là phần ăn CPU nhất (mã hóa SRTP + forward). Có thể tách LiveKit sang VM A1 thứ hai (2 OCPU/12 GB còn lại của hạn mức Always Free).

## 12. Background jobs

- Trong `server.ts`: hủy đơn nạp quá hạn mỗi 5 phút; reindex Elasticsearch lúc **02:00** theo `TZ` của container (`Asia/Ho_Chi_Minh` mặc định). Chạy trong 1 process duy nhất — **không** scale `app` lên >1 replica (job sẽ chạy trùng và Socket.IO cần sticky session/adapter).
- `/api/cron/reconcile-orders` (đối soát SePay chủ động, cần `SEPAY_API_KEY`) không được gọi tự động. Nếu cần, thêm crontab trên host — secret được đọc bên trong container, không nằm trong crontab:

  ```cron
  */10 * * * * cd /opt/terence && docker compose -f docker-compose.prod.yml --env-file .env.production exec -T app sh -c 'wget -qO- --header "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/reconcile-orders' >/dev/null 2>&1
  ```

## 13. Backup PostgreSQL

```bash
bash deploy/oracle/backup-postgres.sh --with-uploads
crontab -e
# 30 3 * * * /usr/bin/bash /opt/terence/deploy/oracle/backup-postgres.sh --with-uploads >> /opt/terence/backups/backup.log 2>&1
```

Giữ 14 ngày (`BACKUP_RETENTION_DAYS`). Backup nằm trên cùng đĩa với DB — nên đồng bộ thêm ra **OCI Object Storage** (Always Free 20 GB) bằng `rclone` hoặc `oci os object put`. Thỉnh thoảng thử restore vào một DB tạm để chắc chắn backup dùng được.

## 14. Migration Prisma

- Production chỉ dùng `prisma migrate deploy` (qua `deploy.sh`, sau backup). Entrypoint với `RUN_MIGRATIONS=false` không chạy migration khi container khởi động.
- **Baseline thủ công** (chỉ khi DB đã có bảng nhưng không có `_prisma_migrations`): trước tiên xác minh schema thật khớp với migration baseline:

  ```bash
  dcp run --rm --no-deps app sh -c './node_modules/.bin/prisma migrate diff \
    --from-url "$DATABASE_URL" \
    --to-schema-datamodel src/dta/prisma/schema.prisma --script'
  ```

  Nếu kết quả chỉ chứa các thay đổi của migration sau baseline (vd bảng `Short*`) hoặc rỗng, mới đánh dấu baseline:
  `dcp run --rm --no-deps app ./node_modules/.bin/prisma migrate resolve --applied 20261006000000_baseline --schema=src/dta/prisma/schema.prisma`, rồi chạy lại `deploy.sh`. Nếu có khác biệt khác (cột/bảng thiếu hoặc thừa) — dừng lại và xử lý thủ công.
- `npm run db:reset` / `prisma migrate reset` **không bao giờ** chạy trên production.

## 15. Checklist nghiệm thu

**PostgreSQL**
- [ ] `dcp ps db` healthy; `docker port terence-db-1` không có cổng public (`ss -ltn | grep 5432` trên host rỗng)
- [ ] `/api/health` → `checks.database = "ok"`
- [ ] `prisma migrate status` → *Database schema is up to date*
- [ ] `dcp restart db` rồi đăng nhập lại → dữ liệu còn (volume `terence_postgres_data`)
- [ ] `backup-postgres.sh` tạo file `.dump`, `pg_restore --list` thành công; đã thử restore vào DB tạm

**Redis**
- [ ] `dcp exec redis redis-cli ping` → `PONG` (dùng `REDISCLI_AUTH`); `redis-cli` không auth từ container khác bị `NOAUTH`
- [ ] `/api/health` → `checks.redis = "ok"`
- [ ] Đăng nhập sai >10 lần/phút → bị rate-limit
- [ ] Dừng redis (`dcp stop redis`) → site vẫn chạy (fallback), health báo `degraded`; bật lại → `ok`

**Socket.IO / Watch Party**
- [ ] `curl "https://APP_DOMAIN/api/socketio/?EIO=4&transport=polling"` trả `0{"sid":…}`
- [ ] DevTools → Network → WS: kết nối `wss://APP_DOMAIN/api/socketio/?EIO=4&transport=websocket` trạng thái 101
- [ ] Hai trình duyệt cùng phòng Watch Party: play/pause/seek đồng bộ, chat realtime, số người xem cập nhật
- [ ] Người dùng đã đăng nhập nhận được thông báo nạp TCoin realtime (room `user:<id>`)
- [ ] Origin lạ bị từ chối CORS handshake (`ALLOWED_ORIGINS` chỉ có `https://APP_DOMAIN`)

**Elasticsearch**
- [ ] `dcp ps elasticsearch` healthy; `/api/health` → `checks.elasticsearch = "ok"`
- [ ] `elastic-reindex.ts` chạy xong, tìm kiếm theo tên phim/diễn viên có kết quả
- [ ] `dcp stop elasticsearch` → tìm kiếm vẫn trả kết quả (fallback PostgreSQL); bật lại → dùng ES
- [ ] RAM container ES < 2 GB (`docker stats`)

**LiveKit**
- [ ] `curl https://LIVEKIT_DOMAIN` → `OK`; log có `found external IP via STUN` và **không** có `could not validate external IP` (nếu có → 7882/udp chưa mở)
- [ ] `/api/livekit/token` chỉ cấp token cho participant đã được duyệt của phòng
- [ ] Hai thiết bị khác mạng (Wi-Fi + 4G) gọi video trong Watch Party: nghe/thấy nhau
- [ ] Chặn UDP phía client → vẫn kết nối qua 7881/tcp (hoặc TURN nếu đã bật)

**Chung**
- [ ] HTTPS hợp lệ cho cả hai domain, HTTP tự chuyển HTTPS
- [ ] Đăng ký/đăng nhập/đăng xuất, quên mật khẩu (email tới), Google login (nếu bật)
- [ ] CMS `/dashboard`: tạo/sửa nội dung, upload ảnh → ảnh hiển thị qua `/uploads/...` ngay (không cần restart)
- [ ] Nạp TCoin: webhook SePay thử nghiệm được chấp nhận, webhook sai key bị từ chối
- [ ] `deploy/oracle/rollback.sh` chuyển về image trước và healthy
- [ ] Reboot VM → toàn bộ stack tự lên (`restart: unless-stopped`)
