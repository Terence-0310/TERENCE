# GENRE_MEGA_DROPDOWN_NOTES

> Thời gian: 15/03/2026

## Tổng quan

Mục "Thể loại" trên navbar giờ là **mega dropdown** dạng panel lớn sổ xuống, hiển thị 19 thể loại phim trong grid 4 cột.

## Data genre lấy từ đâu

- **File**: `lib/data/genres.ts`
- **Dữ liệu**: Static list 19 thể loại TMDB với:
  - `id` (TMDB genre ID)
  - `name` (tên tiếng Việt)
  - `icon` (emoji)
- **Lý do dùng static**: Header là client component, không thể gọi server-side TMDB API trực tiếp. Static list đồng bộ với TMDB IDs.

## Click item genre điều hướng đi đâu

```
/browse?genre={genreId}
```

Ví dụ:
- Hành Động → `/browse?genre=28`
- Kinh Dị → `/browse?genre=27`
- Lãng Mạn → `/browse?genre=10749`

**Trang `/browse` đã hỗ trợ filter theo genre query param** — logic hiện có không cần thay đổi.

## Files đã sửa

| File | Thay đổi |
|------|----------|
| `components/header.tsx` | Thêm mega dropdown cho "Thể loại", xóa item Link cũ |
| `lib/data/genres.ts` | **MỚI** — shared genre data + URL builder |

## Files KHÔNG sửa

- `app/page.tsx` (homepage) — ❌ không đổi
- `app/browse/page.tsx` — ❌ không đổi
- `components/footer.tsx` — ❌ không đổi
- Layout, theme, routing — ❌ không đổi

## Chi tiết kỹ thuật

### Mega dropdown

| Thuộc tính | Giá trị |
|-----------|---------|
| Width | `640px` |
| Columns | 4 cột |
| Position | `absolute left-1/2 -translate-x-1/2` (centered dưới "Thể loại") |
| Background | `bg-[#0A0F1E]/98 backdrop-blur-xl` (dark navy) |
| Border | `border-white/[0.08]` |
| Shadow | `shadow-2xl shadow-black/50` |
| Border radius | `rounded-2xl` |

### Điều khiển mở/đóng

| Hành vi | Cách hoạt động |
|---------|---------------|
| **Mở** | Hover vào "Thể loại" (với 150ms delay chống nhấp nháy) hoặc Click |
| **Đóng — hover out** | Rời khỏi button + panel (150ms delay) |
| **Đóng — click outside** | `useEffect` + `mousedown` listener |
| **Đóng — route change** | `useEffect` watch `pathname` + `searchParams` |

### Active state

- Nếu đang ở `/browse?genre=28` → item "Hành Động" highlight `bg-primary/15 text-primary`
- Button "Thể loại" trên nav cũng highlight `bg-white/10 text-white`

### Mobile

- Không dùng dropdown
- Genres hiển thị flat trong mobile menu, grid 2 cột
- Có separator và label "Thể loại"

## Lưu ý

- Trang `/genres` (route riêng) vẫn tồn tại nhưng KHÔNG được link từ navbar
- Mega dropdown là cách chính để truy cập thể loại
- Nếu muốn thêm/bớt thể loại, chỉ cần sửa `lib/data/genres.ts`
