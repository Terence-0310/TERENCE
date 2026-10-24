# Rollback — Render Free + Neon

Nguyên tắc: rollback **ứng dụng** trước (nhanh, không đụng dữ liệu); chỉ rollback **dữ liệu** khi thật sự cần và luôn tạo ảnh chụp trước.

## 1. Trước mỗi lần deploy có migration
```bash
neon branches create --name pre-deploy-$(date +%Y%m%d-%H%M) --parent production   # snapshot tức thì, copy-on-write
node scripts/predeploy-check.mjs --live
```
Xóa các branch snapshot cũ khi không cần (`neon branches delete <name>`) để không vượt giới hạn số branch của gói Free.

## 2. Rollback ứng dụng (Render)
- Dashboard → service → **Events/Deploys** → chọn deploy cũ → **Rollback to this deploy**. Render chạy lại image đã build, không build lại.
- Hoặc theo git: `git revert <commit>` → push nhánh `deploy/render` → **Manual Deploy**.
- Nếu deploy mới không qua health check (`/api/health/live`), Render giữ phiên bản cũ đang chạy.
- Sau rollback: `node scripts/smoke-test.mjs https://<service>.onrender.com`.

Migration hiện có chỉ **thêm** bảng/index/khóa ngoại → code cũ chạy được trên schema mới. Khi viết migration mới, theo kiểu expand → migrate → contract để rollback ứng dụng luôn an toàn.

## 3. Rollback biến môi trường
Render lưu lịch sử deploy kèm cấu hình; sửa lại biến → **Manual Deploy**. Biến `NEXT_PUBLIC_*` cần **Clear build cache & deploy**.

## 4. Rollback dữ liệu (Neon) — chỉ khi cần, có phê duyệt
Mất mọi thay đổi phát sinh sau thời điểm khôi phục.

- Về snapshot đã tạo ở §1:
  ```bash
  neon branches restore production pre-deploy-<timestamp> --preserve-under-name production-before-restore
  ```
- Về một thời điểm (trong cửa sổ lịch sử của gói Neon hiện tại — kiểm tra trong Console):
  ```bash
  neon branches restore production ^self@2026-10-24T10:00:00Z --preserve-under-name production-before-restore
  ```
- Luôn dùng `--preserve-under-name` để giữ trạng thái trước restore thành một branch riêng → quay lại được nếu restore nhầm.
- Sau đó: deploy lại phiên bản ứng dụng khớp schema (`npx prisma migrate status` với `DIRECT_URL`).

## 5. Object Storage (uploads)
Object nằm trên branch `production` và branch cùng với DB (snapshot branch ở §1 cũng giữ bản copy-on-write của bucket). Key upload là duy nhất và không bị ghi đè, nên rollback ứng dụng không ảnh hưởng file. Hành vi của `branches restore` với storage: kiểm tra tài liệu Neon trước khi dựa vào.

## 6. Redis (Upstash)
Chỉ chứa dữ liệu tái tạo được (rate limit, cache, pool mã phòng) → không cần rollback; có thể `FLUSHDB` từ Upstash Console nếu dữ liệu cache lỗi.

## 7. Thoát khỏi Render
Image `Dockerfile.render` chạy được ở mọi nơi có Docker. Cấu hình Oracle Cloud Always Free đã có sẵn (`README_DEPLOY_ORACLE.md`), dùng chung Neon/Upstash/LiveKit Cloud.
