# Short Videos — API và cấu hình

## Biến môi trường

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `COVERR_API_KEY` | Không | trống | Key Coverr, chỉ dùng phía server. Để trống (hoặc để nguyên chuỗi mẫu `YOUR_API_KEY`) thì tab Khám phá dùng video mẫu Wikimedia Commons |
| `SHORTS_LIBRARY_MOCK_FALLBACK` | Không | `true` | `false` thì khi Coverr lỗi, hệ thống trả 503 thay vì hiện video mẫu |
| `REDIS_URL` | Không | | Cache thư viện dùng chung giữa các lần chạy. Không có thì dùng cache trong bộ nhớ |
| `TMDB_*`, `YOUTUBE_API_KEY` | Không | | Nguồn nhập Shorts của TERENCE (không đổi) |

**Không bao giờ** đặt key Coverr dưới dạng `NEXT_PUBLIC_*`, vì biến này sẽ bị đưa ra trình duyệt. Coverr cũng yêu cầu mọi request phải đi từ backend.

## Lấy Coverr API key

1. Đăng ký tài khoản tại https://coverr.co.
2. Vào trang https://coverr.co/developers hoặc https://coverr.co/profile/api, tạo một application để nhận key.
3. Application mới ở mức **Demo**, giới hạn **50 request/giờ**. Mức **Production** cho 2.000 request/giờ và cần gói Coverr Pro/Ultimate. Xem https://api.coverr.co/docs/start.
4. Đặt key:
   - Local: thêm `COVERR_API_KEY=<key>` vào `.env` (file này đã được gitignore).
   - Render: **Environment → Add Environment Variable → `COVERR_API_KEY`**, rồi **Save, rebuild, and deploy**. `render.yaml` đã khai báo biến này với `sync: false`.

Khi có key, tab Khám phá tự chuyển sang Coverr mà không cần sửa code. Ghi chú "Video mẫu…" ở cột trái sẽ biến mất.

### Điều khoản Coverr cần tuân thủ

- **Ghi công:** API yêu cầu ghi công Coverr. Giao diện hiện dòng "Video từ Coverr" kèm link dưới mỗi video. Nếu Coverr yêu cầu đúng logo, thay phần chữ trong `ExternalCredit` (file `ShortsFeed.tsx`) bằng logo theo hướng dẫn thương hiệu của họ.
- **Giấy phép:** dùng thương mại được, nhưng **không** được bán lại hay phân phối video kiểu kho stock, và không dùng để huấn luyện AI (https://coverr.co/license).
- **Link video:** link `urls.mp4` là link ký số gắn với key, không hết hạn. TERENCE chỉ phát trực tiếp, không tải về. Nếu sau này có tính năng tải xuống, bắt buộc phải ping `mp4_download` theo tài liệu Coverr.

## Endpoint

Mọi endpoint trả về dạng `{ success, data }` hoặc `{ success: false, error }` như các API khác của TERENCE.

### `GET /api/v1/shorts` (có sẵn)
Feed Shorts của TERENCE, phân trang bằng `skip`.

| Tham số | Giá trị |
|---|---|
| `tab` | `foryou` / `latest` / `popular` |
| `seed` | chuỗi để giữ thứ tự trộn ổn định khi cuộn |
| `skip`, `limit` | `limit` ≤ 30 |
| `movieId` | lọc theo phim (tuỳ chọn) |

### `GET /api/v1/shorts/:id`
- Id là cuid → trả về một Short (kèm `likedByMe` nếu đã đăng nhập).
- Id dạng `coverr:<id>` hoặc `mock:<id>` → trả về một `LibraryVideo`.
- Không tìm thấy → 404.

### `GET /api/v1/shorts/search`

| Tham số | Giá trị |
|---|---|
| `q` | từ khoá, tối đa 100 ký tự |
| `scope` | `terence` (mặc định): tìm trong DB theo tiêu đề, mô tả, hashtag, tên phim; cần `q` ≥ 2 ký tự. `library`: tìm qua provider; cần `q` hoặc `topic` |
| `topic` | `nature`, `city`, `ocean`, `animals`, `sky`, `food`, `people` |
| `cursor` | lấy từ `nextCursor` của response trước |
| `limit` | 1–24, mặc định 10 |

Response:
```json
{ "success": true, "data": {
  "scope": "library",
  "items": [ /* LibraryVideo[] hoặc Short[] */ ],
  "nextCursor": "1",
  "library": { "provider": "coverr", "mode": "cache", "configured": true }
} }
```

### `GET /api/v1/shorts/trending`
- Mặc định trả video thư viện, xếp theo `sort=trending` của Coverr.
- Nhận các tham số `topic`, `cursor`, `limit`.
- `scope=terence` → trả Shorts của TERENCE xếp theo like và lượt xem.

### Tương tác (có sẵn, chỉ áp dụng cho Short của TERENCE)

| Endpoint | Ghi chú |
|---|---|
| `POST /api/v1/shorts/:id/like` | cần đăng nhập |
| `POST /api/v1/shorts/:id/view` | tối đa 1 lượt / IP / 10 phút |
| `POST /api/v1/shorts/:id/share` | |
| `GET /api/v1/shorts/:id/comments` | |
| `POST /api/v1/shorts/:id/comments` | cần đăng nhập, tối đa 5 lần/phút |
| `DELETE /api/v1/shorts/:id/comments/:commentId` | tác giả hoặc người có quyền `short.manage` |

Gọi các endpoint này với id video thư viện sẽ nhận 404 (hoặc 401 nếu chưa đăng nhập). Video thư viện không có số liệu tương tác.

### Quản trị (có sẵn, quyền `short.manage`)
`GET|POST /api/admin/shorts`, `PATCH|DELETE /api/admin/shorts/:id`, `POST /api/admin/shorts/sync`, `POST /api/admin/shorts/verify`.

### Mã lỗi

| Mã | Khi nào |
|---|---|
| 400 | Tham số không hợp lệ: `topic` lạ, `q` quá ngắn, `cursor` sai dạng |
| 404 | Không tìm thấy video |
| 429 | Vượt giới hạn: search/trending 60 request/phút/IP |
| 503 `LIBRARY_UNAVAILABLE` | Provider lỗi, không có bản stale và đã tắt fallback video mẫu |

## Chạy local

```bash
npm install
npm run dev                 # http://localhost:3000/shorts?tab=discover
```

Không có `COVERR_API_KEY` thì tab Khám phá vẫn chạy với 11 clip CC0 / public domain của Wikimedia Commons. Thêm key vào `.env` rồi khởi động lại dev server để dùng Coverr.

Thử nhanh bằng curl:
```bash
curl "http://localhost:3000/api/v1/shorts/trending?limit=3"
curl "http://localhost:3000/api/v1/shorts/search?scope=library&topic=animals"
curl "http://localhost:3000/api/v1/shorts/search?q=trailer"
curl "http://localhost:3000/api/v1/shorts/mock:cat-kitten"
```

## Kiểm thử

```bash
npx vitest run tests/unit/shorts-library.test.ts tests/unit/shorts-providers.test.ts
npm test && npm run lint && npx tsc --noEmit && npm run build
```

`tests/unit/shorts-library.test.ts` kiểm tra:
- Map dữ liệu Coverr sang `LibraryVideo`.
- Key được gửi qua header `Authorization: Bearer`, không nằm trong URL.
- Lỗi 401 → `auth`; 429 → `quota`, không retry; 5xx → retry 1 lần.
- Mock provider: tìm kiếm không dấu và phân trang.
- Cache, gộp request trùng, fallback sang mock, cooldown, và trường hợp tắt fallback.
