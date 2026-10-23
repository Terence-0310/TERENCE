# Báo cáo kiểm thử — Render Free (nhánh `deploy/render-free`)

Ngày: 2026-10-24 · Môi trường: Windows 11 + Docker Desktop 29.8.2 (linux/amd64, cùng kiến trúc Render), Node 24.20.0.
Container mô phỏng Render Free: `docker run --memory=512m --memory-swap=512m --cpus=0.1`.
DB cho test ghi: branch Neon tạm `render-e2e` (copy-on-write từ `production`, đã xóa sau test). Production chỉ được đọc.

## Kết quả

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| `npm ci` (sạch, trong Docker) | ✅ PASS | stage `deps` + `prod-deps` của `Dockerfile.render` |
| Prisma generate (linux-musl) | ✅ PASS | build log |
| TypeScript `tsc --noEmit` | ✅ PASS | exit 0 |
| ESLint `npm run lint` | ✅ PASS | exit 0 |
| Unit tests `npm test` | ✅ PASS | 32 files, 353 tests |
| `npm run build` (local) | ✅ PASS | exit 0 |
| Docker build `Dockerfile.render` | ✅ PASS | exit 0, 75 s (cache deps), image 1,24 GB (node_modules 672 MB, `.next` 84 MB) |
| Secret trong image | ✅ PASS | 0 file `.env`; 0 file chứa giá trị secret thật (7 secret + mật khẩu Neon) |
| Boot trong 512 MB / 0,1 CPU | ✅ PASS | live sau 20–22 s; idle 78–119 MiB |
| Health `/api/health/live` | ✅ PASS | 200 |
| Health `/api/health` | ✅ PASS | 200 `{"database":"ok","elasticsearch":"not_configured","redis":"not_configured"}` |
| PostgreSQL (Neon pooled, TLS) | ✅ PASS | health + register/login/watch-party trên branch Neon |
| Neon production — migrate status | ✅ PASS (chỉ đọc) | "up to date" (2 migration) |
| Chuyển dữ liệu local → Neon production | ✅ PASS | snapshot `pre-import-20261024`; thử trên branch `import-test` trước; `pg_restore --data-only --single-transaction`; 45/45 bảng, 7.890/7.890 dòng khớp; 49 FK hợp lệ; app chạy trên production: trang phim 200, search fallback 11 kết quả, shorts OK |
| Socket.IO polling + WebSocket | ✅ PASS | handshake `upgrades:["websocket"]`, transport `websocket` |
| Socket.IO CORS origin lạ | ✅ PASS | không trả ACAO cho `https://evil.example.net` |
| Auth: register / login / session | ✅ PASS | session chứa user id từ DB |
| Auth guards (admin 401, dashboard→login, cron 401, webhook SePay 401) | ✅ PASS | smoke test |
| Watch Party: tạo phòng, guest join, 2 socket join | ✅ PASS | participantCount=2 |
| Watch Party: chat, play/pause/seek, guest không điều khiển được | ✅ PASS | smoke test `--e2e` |
| Watch Party: participant giả mạo | ✅ PASS | bị từ chối "Bạn chưa được tham gia phòng này" |
| Watch Party: mất kết nối & join lại | ✅ PASS | state playbackTime=42 được khôi phục |
| LiveKit Cloud credentials | ✅ PASS (chỉ đọc) | `listRooms` OK — cả project cũ và project mới `terence-dlkoc95s` |
| LiveKit token API | ✅ PASS | token đúng room/grant; người lạ bị từ chối |
| Elastic Cloud Serverless | ❌ NOT TESTED | đã có API key, còn thiếu endpoint URL; code serverless có unit test (2) |
| Tìm kiếm không có Elasticsearch | ✅ PASS | `source: prisma_fallback`, ~0,3 s |
| Security headers | ✅ PASS | nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy; không có `x-powered-by` (HSTS chỉ bật khi site là https) |
| Upload → Neon Object Storage | ✅ PASS | avatar lưu vào bucket `uploads` (branch tạm); tải ẩn danh 200 `image/png`; 0 file trên đĩa; còn nguyên sau khi thay container; HTML đội lốt PNG bị từ chối; 6 unit test mới |
| Upload chế độ đĩa local (khi không có `UPLOADS_BUCKET`) | ⚠️ HẠN CHẾ | 404 tới khi restart (có từ trước); chỉ dùng cho dev |
| Upstash Redis (rediss://, TLS) | ✅ PASS | PING 33 ms; app trong container 512 MB kết nối được (`redis: ok`); rate limit đăng nhập chặn từ lần thứ 11; log không chứa mật khẩu |
| `/api/health` ngay sau boot | ⚠️ GHI CHÚ | request đầu tiên có thể báo `redis: unavailable` khi TLS chưa kết nối xong (~vài giây), sau đó `ok`; Render dùng `/api/health/live` nên không ảnh hưởng |
| Deploy thật lên Render | ❌ NOT TESTED | chưa có service/quyền, cần bạn phê duyệt push + tạo service |
| Build trên hạ tầng build của Render | ❌ NOT TESTED | |
| LiveKit media (mic/camera/reconnect) | ❌ NOT TESTED | cần 2 trình duyệt thật + thiết bị |
| Frontend responsive | ❌ NOT TESTED | không có trình duyệt tự động trong phiên này |
| Google OAuth, SMTP, SePay thật | ❌ NOT TESTED | cần cấu hình thật/thanh toán thật |

## Số liệu tài nguyên (512 MB / 0,1 CPU)

| Tình huống | RAM | Thời gian |
|---|---|---|
| Idle sau boot | 78–119 MiB | boot → live 20–22 s |
| Homepage (tuần tự, ấm) | — | 2,0–3,0 s |
| `/browse`, `/shorts` | — | 1,7–2,0 s |
| `/movies`, `/news`, `/tv`, `/login` | — | 0,06–0,36 s |
| 10 request homepage đồng thời | — | 5,9 → 20,1 s |
| 50 Socket.IO đồng thời | 118 MiB | 50/50 kết nối |
| **Đỉnh (cgroup `memory.peak`)** | **181 MiB** | 0 OOM |

Ghi chú: `--cpus=0.1` trên CPU máy local chỉ là xấp xỉ vCPU của Render. Catalog trong DB test đang trống nên trang có dữ liệu thật sẽ nặng hơn. RAM dư nhiều; **CPU là nút thắt**.

## Lỗi phát hiện trong quá trình test
1. `/api/health` trả 503 khi không có Elasticsearch → Render health check sẽ fail. **Đã sửa** (`not_configured`) + thêm `/api/health/live`.
2. `public/uploads` không ghi được (EACCES) trong image. **Đã sửa** (thư mục thuộc user `nextjs`).
3. Cảnh báo `"next start" does not work with "output: standalone"` khi dùng custom server. **Đã sửa** (`NEXT_OUTPUT_STANDALONE=0`).
4. Upload trả 404 cho tới khi restart và mất trên Render. **Đã sửa** bằng Neon Object Storage (chế độ đĩa local vẫn còn lỗi 404 cũ, chỉ dùng cho dev).
5. `CRON_SECRET` trong `.env` local ngắn hơn 32 ký tự. Trên Render dùng `generateValue`.
6. Dữ liệu đã chuyển lên Neon production (7.890 dòng). Ghi chú: search fallback (`contains`) trả 0 khi query có dấu ngoặc của tiêu đề đầy đủ — Elastic xử lý tốt hơn.

## Cách chạy lại
```bash
docker build -f Dockerfile.render --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:10000 -t terence-render:test .
docker run --rm --memory=512m --cpus=0.1 -p 10000:10000 --env-file <env-file-không-commit> terence-render:test
node scripts/smoke-test.mjs http://localhost:10000 --e2e     # chỉ với DB không phải production
node scripts/predeploy-check.mjs --env-file .env.render --live
```

## Lượt 2 — sau Deep Cleanup + tối ưu image (2026-10-24, nhánh `deploy/render`)

| Hạng mục | Kết quả | Bằng chứng |
|---|---|---|
| `npm ci`, `prisma generate`, `tsc`, `npm run lint` | ✅ PASS | exit 0 |
| Unit + integration tests | ✅ PASS | 34 files, 367 tests |
| `npm run build` (Next 16.4.3) | ✅ PASS | |
| Docker build `Dockerfile.render` (standalone) | ✅ PASS | image **505 MB** (trước 1,28 GB); `node_modules` runtime 118 MB (trước 707 MB) |
| RAM, cùng tải (8 trang/API + 20 socket), 512 MB / 0,1 CPU | ✅ | đỉnh **112 MiB** (image cũ 149 MiB); 1 kết nối Redis |
| Boot | ✅ | 18 s tới `/api/health/live` |
| Smoke chỉ-đọc trên Neon production thật | ✅ 12/12 | trang `/`, `/browse`, phim, search, `/shorts`, `/xem-chung`, rewrite `/watch-party` đều 200 |
| E2E (branch Neon tạm `slim-e2e`, đã xóa) | ✅ 24/24 | auth, Watch Party realtime, LiveKit token, guard admin/cron/webhook |
| Upload → Neon Object Storage (branch) | ✅ | GET 200 `image/png` |
| Body upload quá cỡ | ✅ | 413 trước khi đọc body |
| Thu hồi session khi reset mật khẩu | ✅ | session cũ rỗng sau reset; session mới hợp lệ |
| `npm run deploy:check` (Neon, Upstash, Storage, LiveKit — chỉ đọc) | ✅ PASS | migrate status up to date |
| Elastic Cloud | ❌ NOT TESTED | chưa có endpoint |
| Deploy thật trên Render | ❌ NOT TESTED | chờ phê duyệt |
