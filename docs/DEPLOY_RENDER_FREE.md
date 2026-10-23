# Triển khai TERENCE lên Render Free

Nhánh: `deploy/render-free` · Kết luận hiện tại: **PARTIALLY READY** (xem §9).

## 1. Kiến trúc

```
Trình duyệt ──HTTPS/WSS──► Render Web Service (Free, Singapore, Docker: Dockerfile.render)
                             └─ node dist/server.js  = Next.js 16 + Socket.IO (/api/socketio) trên cùng 1 HTTP server
                                 ├─► Neon PostgreSQL (pooled, TLS)      — dữ liệu
                                 ├─► Upstash Redis (rediss://, TLS)     — rate limit, cache, pool mã phòng
                                 └─► LiveKit Cloud (wss://…livekit.cloud) — voice/video Watch Party (trình duyệt nối trực tiếp)
                                 └─► Elastic Cloud Serverless (tùy chọn) — tìm kiếm; thiếu/lỗi → fallback PostgreSQL (đã kiểm chứng: "source":"prisma_fallback")
Elasticsearch KHÔNG chạy trên instance Render.
```

| File | Vai trò |
|---|---|
| `Dockerfile.render` | Image Render: build Next + biên dịch `server.ts` → `dist/server.js` (esbuild), runtime chỉ có production deps |
| `Dockerfile.render.dockerignore` | Loại `.env*` và file thừa khỏi build context |
| `render.yaml` | Blueprint: 1 web service `plan: free`, `region: singapore`, `healthCheckPath: /api/health/live`, `autoDeploy: false` |
| `.env.render.example` | Mẫu biến môi trường (không có giá trị thật) |
| `scripts/predeploy-check.mjs` | Kiểm tra biến + probe chỉ-đọc (migrate status, Redis PING, LiveKit listRooms) |
| `scripts/smoke-test.mjs` | Kiểm tra sau deploy; `--e2e` để test ghi (chỉ dùng với DB không phải production) |
| `app/api/health/live` | Liveness không chạm DB/Redis — Render health check không đánh thức Neon |

## 2. Giới hạn Render Free và cách xử lý

| Giới hạn | Ảnh hưởng | Xử lý trong nhánh này |
|---|---|---|
| 512 MB RAM | — | Đo được đỉnh **181 MiB** (10 request SSR đồng thời + 50 socket). Heap giới hạn `--max-old-space-size=320`. |
| **0,1 CPU** | SSR chậm: homepage 2–3 s khi tuần tự, **6–20 s khi 10 request đồng thời** (đo bằng `docker --cpus=0.1`) | Không khắc phục được bằng code. Chấp nhận cho demo/lượng truy cập thấp. |
| Ngủ sau ~15 phút không có request | Lần truy cập đầu chờ khởi động (~20 s đo local + thời gian Render kéo image); Socket.IO bị ngắt | Client Socket.IO tự reconnect. **Không** dùng ping/keep-alive để né sleep. |
| Filesystem tạm (không có persistent disk) | Upload ghi đĩa sẽ mất khi restart/redeploy/ngủ dậy | **Đã sửa**: upload lưu vào Neon Object Storage, bucket `uploads` (§7). |
| 1 instance | Watch Party lưu state phòng trong RAM (`rooms` Map) → mất khi restart; DB vẫn giữ phòng/participant | Người dùng join lại; state playback lấy lại từ host. Không scale >1 instance. |
| Không có pre-deploy command / shell trên Free | Không chạy migration từ Render | Chạy migration từ máy bạn bằng `DIRECT_URL` (§4.4), có phê duyệt. |
| Không chạy được Elasticsearch trên 512 MB | — | Dùng **Elastic Cloud** (`ELASTICSEARCH_HOST` + `ELASTICSEARCH_API_KEY`). Code đã hỗ trợ Serverless: bỏ setting shard/replica khi tạo index, health dùng ping thay `_cluster/health`. Không cấu hình → fallback PostgreSQL. Tạo index lần đầu: `npm run search:reindex` từ máy bạn (`.env` trỏ Elastic Cloud + Neon). |

## 3. Những gì đã thay đổi trong code (tối thiểu)

- `app/api/health/live/route.ts` (mới): liveness 200, không chạm dependency.
- `app/api/health/route.ts`: Elasticsearch không cấu hình → `not_configured` (không còn 503); `not_configured` không bị tính là lỗi.
- `server.ts`: chỉ đặt cron reindex ES khi có `ELASTICSEARCH_HOST`; log RTC lấy từ `NEXT_PUBLIC_LIVEKIT_URL` thay vì hardcode `rtc.terence.com.vn`.
- `next.config.mjs`: security headers cho mọi response (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy cho camera/mic, HSTS khi site là https); CORS `/api/*` theo `NEXT_PUBLIC_SITE_URL` lúc build; `NEXT_OUTPUT_STANDALONE=0` để tắt standalone khi không cần.
- `proxy.ts`: danh sách host CSRF lấy thêm từ `NEXTAUTH_URL`/`APP_URL`/`NEXT_PUBLIC_SITE_URL`/`ALLOWED_ORIGINS` — domain `*.onrender.com` dùng được mà không hardcode.
- `docker-entrypoint.sh`: cờ `RUN_MIGRATIONS` và `ALLOW_AUTO_BASELINE` (mặc định giữ hành vi dev; image Render đặt cả hai = `false` → **không bao giờ tự baseline P3005, không migrate/seed khi boot**).
- `.gitignore`: thêm `.env.render`, `/dist/`.

## 4. Trình tự triển khai an toàn

### 4.1 Upstash Redis
1. Upstash Console → database `terence-redis` → tab **Connect** → chọn **ioredis / TCP**.
2. Copy URL dạng `rediss://default:<password>@<name>.upstash.io:6379` — dán **trực tiếp vào Render** (và `.env.render` local nếu muốn chạy check). Không dán vào chat.

### 4.2 LiveKit Cloud
Project đang dùng: `terence-dlkoc95s.livekit.cloud`; credentials trong `.env` / `.env.render` local hợp lệ (`listRooms` OK). Trên Render đặt `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` = `NEXT_PUBLIC_LIVEKIT_URL` = `wss://terence-dlkoc95s.livekit.cloud`. Không cần cấu hình domain/cổng (trình duyệt nối thẳng LiveKit Cloud).

### 4.3 Neon
- `DATABASE_URL` = chuỗi **pooled** (host có `-pooler`), thêm `&connection_limit=5&pool_timeout=20`.
- `DIRECT_URL` = chuỗi **direct** (không `-pooler`) — Prisma dùng cho migrate.
- Lấy từ Neon Console → Connect, hoặc `neon connection-string production --pooled` / `neon connection-string production`.

### 4.4 Dữ liệu và migration
**Đã chuyển (2026-10-24):** dữ liệu từ Postgres local `terence_dev` (Docker `terence-db`, PG 16) → Neon `production`: 45 bảng, **7.890 dòng khớp tuyệt đối** (104 phim, 5.658 tập, 6 user, 64 shorts…). Snapshot trước khi nhập: branch `pre-import-20261024` (hết hạn 2026-11-22) — rollback: `neon branches restore production pre-import-20261024 --preserve-under-name production-after-import`.

Nếu server production cũ (terence.com.vn) có dữ liệu nhiều hơn DB local, lặp lại quy trình dưới đây với nguồn là server đó — **nhưng phải restore vào DB trống** (khôi phục snapshot trước) vì dữ liệu local đã nằm trong production và sẽ trùng khóa.

Chuyển dữ liệu (không đụng schema Neon đã có):

```bash
# 0) Ảnh chụp an toàn trước khi ghi (tức thì, copy-on-write)
neon branches create --name pre-import-$(date +%Y%m%d) --parent production

# 1) Dump DỮ LIỆU từ DB nguồn (nguồn phải ở cùng 2 migration trên — kiểm tra _prisma_migrations)
docker run --rm -e PGPASSWORD postgres:18-alpine pg_dump -h <host> -p <port> -U <user> -d <db> \
  -Fc --data-only --no-owner --exclude-table-data=_prisma_migrations > terence_data.dump

# 2) Thử restore vào branch thử nghiệm trước
neon branches create --name import-test --parent production
docker run --rm -i postgres:18-alpine pg_restore --data-only --no-owner --single-transaction \
  -d "<DIRECT_URL của import-test>" < terence_data.dump
node scripts/smoke-test.mjs <URL app trỏ vào import-test>      # hoặc kiểm tra số dòng

# 3) Khi đã ổn → lặp lại bước restore với DIRECT_URL của production
```

Migration mới trong tương lai: `node scripts/predeploy-check.mjs --live` (liệt kê migration chờ) → tạo branch backup → `npx prisma migrate deploy` với `DATABASE_URL=$DIRECT_URL`. Không dùng `db push`, `migrate reset`, hay `db:reset`.

### 4.5 Kiểm tra trước khi deploy
```bash
cp .env.render.example .env.render      # điền giá trị thật (file đã git-ignore)
node scripts/predeploy-check.mjs --live # phải kết thúc bằng "✓ Pre-deploy check passed."
```

### 4.6 Đẩy code (cần bạn duyệt)
```bash
git add <các file deploy> && git commit -m "deploy: Render Free configuration"
git push -u origin deploy/render-free
```
Nhánh hiện còn chứa thay đổi chưa commit của bạn từ trước — hãy tự chọn file đưa vào commit.

### 4.7 Tạo service trên Render
1. Render Dashboard → **New → Blueprint** → chọn repo `Terence-0310/TERENCE`, nhánh `deploy/render-free`.
2. Render đọc `render.yaml`: 1 web service **Free**, Singapore. Kiểm tra lại "Plan: Free" trước khi bấm Apply.
3. Điền các biến `sync: false` (xem `docs/RENDER_VARIABLES.md`). Với URL, nếu chưa biết tên service: tạo xong lấy `https://<service>.onrender.com`, cập nhật 4 biến URL rồi **Manual Deploy → Clear build cache & deploy** (vì `NEXT_PUBLIC_SITE_URL` được nhúng lúc build).
4. `autoDeploy: false` → mỗi lần deploy bấm **Manual Deploy**.

Nếu build trên Render thất bại do tài nguyên build: build image bằng GitHub Actions (`docker build -f Dockerfile.render --build-arg NEXT_PUBLIC_SITE_URL=…`), push lên GHCR, tạo service loại **Existing Image** (vẫn plan Free). Chưa kiểm thử.

### 4.8 Sau deploy
```bash
node scripts/smoke-test.mjs https://<service>.onrender.com     # chỉ đọc, an toàn với production
```
- Google OAuth (nếu bật): thêm redirect `https://<service>.onrender.com/api/auth/callback/google`, đặt `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`, deploy lại.
- SePay: webhook `https://<service>.onrender.com/api/payments/sepay/webhook`. Lưu ý: service đang ngủ sẽ mất ~30–60 s để thức → webhook có thể timeout; `/api/cron/reconcile-orders` (cần `SEPAY_API_KEY`) dùng để đối soát bù.

## 5. Bảo mật đã kiểm tra
- Image không chứa file `.env` nào; quét chuỗi các secret thật (NextAuth, LiveKit, SMTP, SePay, CRON, mật khẩu Neon) trong `.next`, `dist`, `public`: **0 kết quả**.
- Chỉ `NEXT_PUBLIC_*` được khai báo `ARG` → secret Render truyền vào build không vào layer/bundle. `next.config.mjs#env` chỉ inline TMDB vào **server** bundle khi có lúc build — trên Render không có lúc build nên đọc lúc chạy.
- Smoke test xác nhận: admin API 401 khi chưa đăng nhập, `/dashboard` → `/login`, cron 401 khi thiếu secret, webhook SePay 401 khi thiếu key, Socket.IO không phản hồi CORS cho origin lạ, participant giả mạo bị từ chối, guest không điều khiển được player, token LiveKit chỉ cấp cho participant hợp lệ.
- Không có tài khoản admin mặc định: seed chỉ chạy thủ công, mật khẩu từ `SEED_*_PASSWORD`.

## 6. Background jobs trên Render Free
- `expireStaleOrders` mỗi 5 phút (trong `server.ts`) — chỉ chạy khi service thức; mỗi lần là 1 truy vấn Neon.
- Reindex ES: tắt khi không có `ELASTICSEARCH_HOST`.
- Đồng bộ catalog (KKPhim/OPhim), Shorts, seed: **không** chạy trên web service. Chạy từ máy bạn với `.env` trỏ Neon: `npm run sync:kkphim:catalog -- --pages=3`, `npm run shorts:sync` (ghi vào production → cần bạn quyết định).
- Render Cron Job không có gói Free. Nếu cần gọi `/api/cron/*` định kỳ, dùng GitHub Actions `schedule` với `CRON_SECRET` trong GitHub Secrets, tần suất thấp — mục đích chạy job, không phải giữ service thức.

## 7. Upload — Neon Object Storage
Upload (avatar, poster, backdrop, thumbnail, file admin) được lưu vào bucket **`uploads`** (`public_read`) trên branch Neon `production`, region Singapore. Trình duyệt tải trực tiếp từ `https://<branch-id>.storage.c-4.ap-southeast-1.aws.neon.tech/uploads/<key>`.

- **Code:** `src/be/modules/uploads/object-storage.ts` (S3 client, `forcePathStyle: true` theo yêu cầu của Neon). `legacy-upload.ts` dùng storage khi có `UPLOADS_BUCKET` + `AWS_*`, nếu không thì ghi `public/uploads` như cũ (dev). `isManagedUploadUrl()` giúp 4 route admin dọn file cũ ở cả hai nơi.
- **Hạ tầng:** `neon.ts` khai báo `buckets: { uploads: { access: "public_read" } }`; `neon deploy` tạo bucket và ghi `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` vào `.env`. Copy 3 biến đầu sang Render (`AWS_REGION` có sẵn trong `render.yaml`).
- **Đã kiểm chứng:** upload qua app trả URL bucket; tải ẩn danh trả 200 `image/png`; không có file nào trên đĩa container; **thay container mới vẫn còn ảnh**; file HTML đội lốt PNG bị từ chối; branch con có bucket riêng (copy-on-write), cách ly khỏi production.
- **Hạn mức:** gói Free có 5 GB/project (giới hạn cứng, không tính tiền vượt mức). Tài liệu Neon chưa nêu giới hạn request/egress cho storage — theo dõi trong Neon Console.
- **Còn lại:** file cũ trong `public/uploads` của DB/server cũ cần copy lên bucket rồi cập nhật URL trong DB nếu muốn giữ (`aws s3 sync` với `--endpoint-url $AWS_ENDPOINT_URL_S3`) — chưa làm. Thumbnail seek-bar (`thumbnail.service`, cần ffmpeg) vẫn là cache trên đĩa, tái tạo được; image Render không có ffmpeg nên tính năng này tắt.
- **Rủi ro RAM:** route upload đọc cả file vào bộ nhớ; upload video tới 500 MB (chỉ admin) sẽ làm instance 512 MB bị OOM. Trên Render chỉ nên upload ảnh, hoặc giảm `MAX_VIDEO_SIZE`.

## 8. Phương án thay thế nếu 0,1 CPU không đủ
- **Oracle Cloud Always Free** (A1, 2–4 OCPU/12–24 GB): đã chuẩn bị `Dockerfile.prod`, `docker-compose.prod.yml`, `deploy/oracle/*`, `README_DEPLOY_ORACLE.md` (có Caddy HTTPS, Elasticsearch, volume cho upload). Có thể giữ Neon + Upstash + LiveKit Cloud và chỉ chạy app trên VM.
- Giữ Render nhưng nâng gói trả phí (Starter) — **không tự thực hiện**.

## 9. Kết luận
**PARTIALLY READY**: Next.js + Socket.IO + Watch Party + Auth + LiveKit token + Neon chạy được trong 512 MB/0,1 CPU (đã đo). Upstash và upload bền vững (Neon Object Storage) đã kiểm thử PASS. Còn chặn trước khi gọi là READY: (1) chưa deploy thật lên Render, (2) dữ liệu thật chưa được chuyển lên Neon, (3) độ trễ SSR ở 0,1 CPU cao khi có nhiều người dùng đồng thời.
