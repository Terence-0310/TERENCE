# Short Videos — Kiến trúc

TERENCE có hai nguồn video ngắn, dùng chung một feed dọc tại `/shorts`:

| | Shorts của TERENCE | Thư viện "Khám phá" |
|---|---|---|
| Nguồn | Trailer/clip nhập từ TMDB, YouTube, trailer catalog; video admin thêm (YouTube/MP4/HLS) | Coverr API (stock video), hoặc video mẫu Wikimedia Commons khi chưa có key |
| Lưu trữ | Bảng `Short` (PostgreSQL) | **Không lưu**: lấy trực tiếp từ provider, chỉ cache metadata |
| Like / bình luận / lượt xem / chia sẻ | Có (`ShortLike`, `ShortComment`, bộ đếm trên `Short`) | Chỉ chia sẻ. Không có số liệu tương tác, kể cả số giả |
| Id | cuid, ví dụ `cmvgy5l4m0013ufh06f1pqnye` | `<provider>:<id>`, ví dụ `coverr:abc123`, `mock:cat-kitten` |
| Tab | Dành cho bạn, Mới nhất, Phổ biến | Khám phá |

## Luồng dữ liệu

```
Trình duyệt (ShortsFeed)
  │  GET /api/v1/shorts                 ← feed DB (tab, seed, skip)
  │  GET /api/v1/shorts/trending        ← thư viện (mặc định) | scope=terence
  │  GET /api/v1/shorts/search          ← scope=terence (DB) | scope=library
  │  GET /api/v1/shorts/:id             ← Short hoặc video thư viện
  ▼
shorts.controller.ts   — validate (zod), rate limit, auth khi cần, map lỗi
  ├─► shorts.service.ts          — Prisma: feed, tìm kiếm, like, comment, admin, sync
  └─► video-library.service.ts   — chọn provider, cache, cooldown, fallback, dedupe
        └─► VideoProvider (video-providers/types.ts)
              ├─ coverr.provider.ts  — Coverr REST API (COVERR_API_KEY)
              └─ mock.provider.ts    — 11 clip CC0/public domain trên Wikimedia Commons
```

Video thư viện được trình duyệt phát thẳng từ CDN của provider. Server TERENCE không proxy hay tải video về, nên không tốn băng thông hay dung lượng trên Render.

## Interface `VideoProvider`

```ts
interface VideoProvider {
  readonly name: 'coverr' | 'mock'
  isConfigured(): boolean
  list(params: { sort: 'popular' | 'trending' | 'latest'; query?: string; page: number; pageSize: number }):
    Promise<{ items: LibraryVideo[]; hasMore: boolean }>
  getById(providerId: string): Promise<LibraryVideo | null>
}
```

Mọi provider trả về cùng một dạng `LibraryVideo`: `id, title, description, videoUrl, thumbnailUrl, duration, width, height, author, tags, source, license, createdAt`. Trong đó `license` có tên giấy phép, link giấy phép và dòng ghi công (`attribution`, `attributionUrl`) mà giao diện hiển thị dưới video.

Lỗi provider dùng `VideoProviderError` với `kind`:
- `auth`: key sai hoặc thiếu (401/403)
- `quota`: hết hạn mức (429)
- `unavailable`: lỗi 5xx, timeout hoặc mạng
- `bad_response`: provider trả 4xx khác hoặc dữ liệu sai dạng

### Thêm provider mới

1. Tạo `video-providers/<name>.provider.ts`, implement `VideoProvider` và map dữ liệu sang `LibraryVideo`, với `id = "<name>:<providerId>"`.
2. Thêm `<name>` vào `LibraryProviderName`, vào map `PROVIDERS` và vào regex trong `isLibraryId()` (file `video-library.service.ts`).
3. Sửa `primaryProvider()` để chọn provider mới khi nó đã được cấu hình.
4. Thêm test giống `tests/unit/shorts-library.test.ts`.

Frontend không cần sửa: `libraryToItem()` đã chuyển mọi `LibraryVideo` sang dạng item của feed.

## Độ bền của thư viện (`video-library.service.ts`)

| Cơ chế | Chi tiết |
|---|---|
| Cache | Redis (`REDIS_URL`), không có Redis thì dùng bộ nhớ (tối đa 300 key). Mỗi trang lưu 30 phút; bản dự phòng (stale) giữ 24 giờ; chi tiết một video giữ 1 giờ |
| Gộp request trùng | Các request giống nhau đến cùng lúc dùng chung một lần gọi provider |
| Timeout / retry | Mỗi request tối đa 8 giây. Chỉ retry 1 lần cho lỗi 5xx hoặc mạng; không retry 4xx/429 |
| Cooldown | Sau lỗi, tạm ngừng gọi provider: `auth` 60 phút, `quota` 15 phút, `unavailable` 2 phút, `bad_response` 5 phút |
| Fallback | Lần lượt: cache → gọi Coverr → bản stale → video mẫu (tắt được bằng `SHORTS_LIBRARY_MOCK_FALLBACK=false`) → nếu vẫn không có thì trả 503 `LIBRARY_UNAVAILABLE` |
| Trạng thái | Mỗi response kèm `library: { provider, mode: live/cache/stale/fallback, configured }` để giao diện hiện ghi chú phù hợp |

Gói Demo của Coverr chỉ cho 50 request/giờ. Nhờ cache 30 phút cho mỗi tổ hợp (sort, từ khoá, trang), số lần gọi thật thấp hơn nhiều so với lượt xem.

## Frontend (`src/fe/components/shorts/`)

`ShortsFeed.tsx`:
- **Feed:** cuộn dọc toàn màn hình với CSS scroll-snap. `IntersectionObserver` xác định video đang xem.
- **Phát video:** chỉ video đang xem được mount player thật và tự phát; các slide kề bên chỉ hiện ảnh thumbnail, các slide còn lại không render gì. Video ra khỏi màn hình bị huỷ player, nên không có hai video phát cùng lúc. Feed cũng tự pause khi tab trình duyệt bị ẩn.
- **Điều khiển:** video lặp lại; chạm để pause/play; chạm đúp để like (chỉ video TERENCE); nút tắt/bật tiếng được ghi nhớ trong `localStorage`.
- **Phím tắt:** ↑/↓ hoặc J/K để chuyển video, Space để pause, M để tắt/bật tiếng.
- **Tải thêm:** cuộn vô hạn. Feed DB dùng `skip`; thư viện và kết quả tìm kiếm dùng `cursor`.
- **Tab Khám phá:** có chip chủ đề. Tìm kiếm và chủ đề loại trừ nhau.
- **Tìm kiếm:** ô tìm kiếm ở cột trái trên desktop; trên mobile là nút kính lúp mở thanh tìm kiếm phủ trên video.
- **Trạng thái:** có skeleton khi tải, trạng thái lỗi với nút "Thử lại", và trạng thái rỗng riêng cho tìm kiếm, chủ đề và feed.
- **Video thư viện:** hiện dòng ghi công, tác giả và giấy phép; không có like, bình luận hay số lượt xem.

`ShortPlayer.tsx` không đổi, vì video thư viện là `videoType: 'mp4'` và được phát qua thẻ `<video>` sẵn có.

## Database và lưu trữ

**Không cần migration.** Các bảng hiện có đã đủ cho phần TERENCE:
- `Short` (kèm `viewCount`, `likeCount`, `commentCount`, `shareCount`)
- `ShortLike` (unique theo `shortId` + `userId`)
- `ShortComment`

Video thư viện không lưu vào DB. Lý do: giấy phép Coverr cấm phân phối lại video kiểu kho stock, link video là link ký số gắn với API key, và chính sách cache chưa được Coverr công bố. Lưu metadata vào DB sẽ biến TERENCE thành một bản sao kho video của họ.

**Hướng mở rộng: video do người dùng tự đăng** (chưa làm, cần duyệt nghiệp vụ trước):
- Upload qua Neon Object Storage (bucket `uploads`, `AWS_*`), dùng lại helper upload sẵn có (`legacy-upload.ts`, giới hạn `MAX_VIDEO_UPLOAD_MB`).
- Tạo dòng `Short` với `source = 'user'`, `videoType = 'mp4'` và `createdBy = <userId>`, trạng thái `draft` để kiểm duyệt rồi mới `published`. Cột `createdBy` đã có sẵn.
- Like, bình luận và lượt xem dùng lại nguyên vẹn bảng hiện có.
- Nếu cần thống kê lượt xem chi tiết hoặc quan hệ theo dõi (follow) thì mới thêm bảng `ShortView` hoặc `UserFollow`. Hiện TERENCE chưa có tính năng follow, nên chưa tạo các bảng này.
