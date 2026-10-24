# Short Videos — Triển khai

## Trạng thái

| Hạng mục | Trạng thái |
|---|---|
| Feed Shorts của TERENCE: cuộn dọc, autoplay, like, bình luận, chia sẻ, quản trị, đồng bộ TMDB/YouTube | Đã có từ trước, không đổi |
| Tab "Khám phá" với video mẫu Wikimedia Commons | Hoạt động, không cần key |
| Tìm kiếm (Shorts TERENCE và thư viện), lọc theo chủ đề, skeleton, trạng thái lỗi/rỗng | Hoạt động |
| Endpoint `search`, `trending`; `:id` nhận cả video thư viện | Hoạt động |
| Adapter Coverr | Đã viết theo tài liệu chính thức và có unit test; xác nhận endpoint thật trả 401 khi key sai |
| Phát video thật từ Coverr | **Cần `COVERR_API_KEY`** |
| Video do người dùng tự đăng | Mới có thiết kế (xem `SHORT_VIDEO_ARCHITECTURE.md`), chưa làm |

**Không có migration database.** Thay đổi chỉ gồm code và biến môi trường.

## Render (Free, Singapore)

1. Merge hoặc push code lên nhánh `deploy/render`. Render đang tắt tự động deploy.
2. Tuỳ chọn: thêm `COVERR_API_KEY` trong **Environment**.
3. Bấm **Manual Deploy → Deploy latest commit**.
4. Kiểm tra sau khi deploy:
   - `https://<service>.onrender.com/api/v1/shorts/trending?limit=1`: response có `data.library.provider` bằng `coverr` (đã có key) hoặc `mock` (chưa có key).
   - Mở `/shorts?tab=discover` → video tự phát, cuộn sang video khác được, dưới video có dòng ghi công.
   - Mở `/shorts` → các tab cũ vẫn hoạt động như trước.

Về tài nguyên trên Render Free (512 MB RAM):
- Video được phát trực tiếp từ CDN của Coverr hoặc Wikimedia, không đi qua server TERENCE.
- Cache dùng Upstash Redis đang có. Nếu thiếu Redis, cache trong bộ nhớ tối đa 300 key, không đáng kể.

## Checklist trước khi lên production

- [ ] `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` đều qua.
- [ ] Đã đặt `COVERR_API_KEY` trên Render (không commit vào repo, không dùng `NEXT_PUBLIC_`), **hoặc** chấp nhận dùng video mẫu.
- [ ] Đã xem điều khoản Coverr (license, cách ghi công). Nếu Coverr yêu cầu logo thì thay dòng chữ ghi công bằng logo.
- [ ] Nếu nhiều người xem: application Coverr đã lên mức Production (2.000 request/giờ). Mức Demo chỉ 50 request/giờ, dù đã có cache 30 phút.
- [ ] Quyết định `SHORTS_LIBRARY_MOCK_FALLBACK`: `true` (mặc định) hiện video mẫu khi Coverr lỗi; `false` hiện trạng thái lỗi.
- [ ] Theo dõi log `shorts-coverr` / `shorts-library` sau deploy. Log chỉ ghi đường dẫn và mã lỗi, không ghi key.

## Rollback

Không có thay đổi database nên rollback chỉ là deploy lại commit trước, theo `docs/DEPLOY_ROLLBACK.md`. Muốn tắt Coverr mà không deploy lại code: xoá `COVERR_API_KEY` trên Render, tab Khám phá sẽ quay về video mẫu.
