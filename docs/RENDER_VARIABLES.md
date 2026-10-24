# Biến môi trường trên Render

Đặt tại Render Dashboard → service `terence` → **Environment**. Không commit giá trị thật; không dán secret vào chat/issue.

**Build** = được nhúng vào bundle lúc `docker build` (Render truyền biến môi trường thành build arg, `Dockerfile.render` chỉ khai báo `ARG` cho các biến `NEXT_PUBLIC_*`). Đổi biến Build → phải **Clear build cache & deploy**.

## Bắt buộc

| Biến | Build | Giá trị / nguồn | Ghi chú |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ✓ | `https://<service>.onrender.com` | Cũng quyết định CORS `/api/*` và HSTS |
| `NEXTAUTH_URL` | | như trên | NextAuth callback; https → cookie `__Secure-next-auth.session-token` |
| `APP_URL` | | như trên | Link trong email |
| `ALLOWED_ORIGINS` | | như trên (phân tách bằng dấu phẩy nếu thêm custom domain) | Socket.IO CORS + CSRF `proxy.ts` |
| `NEXTAUTH_SECRET` | | Render `generateValue` | ≥32 ký tự |
| `CRON_SECRET` | | Render `generateValue` | ≥32 ký tự; bảo vệ `/api/cron/*` (thiếu → app không khởi động) |
| `MAX_VIDEO_UPLOAD_MB` | | `40` (có trong `render.yaml`) | upload được đọc vào RAM; body lớn hơn bị từ chối 413 trước khi đọc |
| `DATABASE_URL` | | Neon **pooled** + `&connection_limit=5&pool_timeout=20` | host có `-pooler`, `sslmode=require` |
| `DIRECT_URL` | | Neon **direct** | Prisma `directUrl` (migrate) |
| `UPLOADS_BUCKET` | | `uploads` (có trong `render.yaml`) | Thiếu → upload ghi đĩa tạm và mất |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3` | | `neon deploy` / `neon env pull` ghi vào `.env` | Credential Neon Object Storage của branch `production` |
| `AWS_REGION` | | `ap-southeast-1` (có trong `render.yaml`) | |
| `NODE_ENV` | | `production` | có trong `render.yaml` |
| `HOSTNAME` | | `0.0.0.0` | có trong `render.yaml`; `PORT` do Render cấp (mặc định 10000) |

## Nên có

| Biến | Build | Nguồn | Thiếu thì |
|---|---|---|---|
| `REDIS_URL` | | Upstash → Connect → ioredis: `rediss://default:…@….upstash.io:6379` | Rate limit/cache chạy trong RAM từng instance (vẫn hoạt động) |
| `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | | LiveKit Cloud → Settings → Keys | Gọi voice/video Watch Party tắt; phần còn lại chạy bình thường |
| `LIVEKIT_URL`, `NEXT_PUBLIC_LIVEKIT_URL` | ✓ (public) | `wss://<project>.livekit.cloud` | như trên |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` | | Nhà cung cấp email (vd Gmail App Password, port 465) | Không gửi được email xác thực/quên mật khẩu |
| `TMDB_API_KEY`, `TMDB_READ_ACCESS_TOKEN`, `TMDB_BASE_URL` | | themoviedb.org | Không có metadata/ảnh TMDB |
| `SEPAY_WEBHOOK_API_KEY` | | SePay | Webhook bị từ chối → nạp TCoin không hoàn tất |

## Tùy chọn

| Biến | Build | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | ✓ | `true` chỉ khi có `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | | Redirect URI: `https://<service>.onrender.com/api/auth/callback/google` |
| `NEXT_PUBLIC_TMDB_IMAGE_BASE_URL`, `NEXT_PUBLIC_REGION` | ✓ | mặc định có trong `render.yaml` |
| `SEPAY_API_KEY`, `SEPAY_BANK_CODE`, `SEPAY_BANK_ACCOUNT`, `VIETQR_ACCOUNT_NAME` (legacy `VIETQR_*`, `SEPAY_WEBHOOK_SECRET`) | | Bật SePay thì cần đủ cặp ngân hàng |
| `KKPHIM_BASE_URL`, `OPHIM_BASE_URL`, `OPHIM18_BASE_URL`, `*_TIMEOUT`, `DISABLE_OPHIM_CHECK` | | Nguồn catalog |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GNEWS_API_KEY`, `YOUTUBE_API_KEY` | | Tin tức AI / Shorts |
| `COVERR_API_KEY`, `SHORTS_LIBRARY_MOCK_FALLBACK` | | Tab Shorts "Khám phá" (Coverr). Trống → video mẫu Wikimedia Commons. Xem `docs/SHORT_VIDEO_API_SETUP.md` |
| `DEMO_HLS_URL`, `PUBLIC_STREAM_ALLOWED_HOSTS` | | Player |
| `LOG_LEVEL`, `TZ` | | `info`, `Asia/Ho_Chi_Minh` |
| `ELASTICSEARCH_HOST`, `ELASTICSEARCH_API_KEY`, `ELASTICSEARCH_INDEX_MOVIES` | | Elastic Cloud (Serverless: Endpoints → Elasticsearch URL; key `essu_…`). Để trống host → search fallback PostgreSQL, cron reindex tự tắt. Không bao giờ chạy ES trên instance 512 MB |
| `DATA_ENCRYPTION_KEY` | | ≥32 ký tự, tùy chọn | khóa mã hóa metadata ví (mặc định = `NEXTAUTH_SECRET`). Trước khi rotate `NEXTAUTH_SECRET`, đặt biến này = giá trị `NEXTAUTH_SECRET` hiện tại |
| `UPLOADS_PUBLIC_BASE_URL` | | CDN trước bucket (mặc định `${AWS_ENDPOINT_URL_S3}/${UPLOADS_BUCKET}`) |

## Không đặt trên Render Free

| Biến | Lý do |
|---|---|
| `SEED_ON_START`, `SYNC_*_ON_START` | Image đặt `false`; tác vụ nặng chạy từ máy bạn, không chạy khi web khởi động |
| `RUN_MIGRATIONS`, `ALLOW_AUTO_BASELINE` | Image đặt `false`; migration chạy có kiểm soát (DEPLOY_RENDER_FREE.md §4.4) |
| `NODE_OPTIONS` | Image đặt `--max-old-space-size=320`; không tăng vượt RAM thật |
| `NEXT_STANDALONE_RUNTIME` | Image đặt `1` (đọc config build-time từ `.next/required-server-files.json`) |
| `SEED_*_PASSWORD` | Chỉ dùng khi seed thủ công từ máy bạn |
