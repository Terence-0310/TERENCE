# COUNTRY_MEGA_DROPDOWN_NOTES

> Thời gian: 15/03/2026

## Tổng quan

Mục "Quốc gia" trên navbar giờ là **mega dropdown** dạng panel lớn sổ xuống, hiển thị 20 quốc gia trong grid 4 cột — tương tự dropdown "Thể loại".

## Data lấy từ đâu

- **File**: `lib/data/countries.ts`
- **Dữ liệu**: Static list 20 quốc gia với:
  - `code` (ISO 3166-1 alpha-2)
  - `name` (tên tiếng Việt)
  - `flag` (emoji cờ — hiển thị tùy font hệ thống)
- **Lý do dùng static**: Header là client component, danh sách quốc gia cố định, không cần gọi API runtime.

## Click item quốc gia điều hướng đi đâu

```
/browse?country={ISO_CODE}
```

Ví dụ:
- Hàn Quốc → `/browse?country=KR`
- Nhật Bản → `/browse?country=JP`
- Mỹ → `/browse?country=US`

**Trang `/browse` đã hỗ trợ filter theo country query param** (route `getMoviesByCountry`).

## Files đã sửa

| File | Thay đổi |
|------|----------|
| `components/header.tsx` | Thêm country mega dropdown, xóa "Quốc gia" khỏi NAV_ITEMS |
| `lib/data/countries.ts` | **MỚI** — shared country data + URL builder |

## Files KHÔNG sửa

- `app/page.tsx` (homepage) — ❌ không đổi
- `app/browse/page.tsx` — ❌ không đổi
- `components/footer.tsx` — ❌ không đổi
- Layout, theme, routing — ❌ không đổi

## Chi tiết kỹ thuật

### Mega dropdown

| Thuộc tính | Giá trị |
|-----------|---------|
| Width | `720px` |
| Columns | 4 cột |
| Position | Centered dưới "Quốc gia" |
| Background | `bg-[#0A0F1E]/98 backdrop-blur-xl` |
| Border | `border-white/[0.08]` |
| Shadow | `shadow-2xl shadow-black/50` |
| Border radius | `rounded-2xl` |

### Tương tác với Genre dropdown

- Mở Country dropdown → tự động đóng Genre dropdown (và ngược lại)
- Không bao giờ có 2 dropdown mở cùng lúc

### Điều khiển

| Hành vi | Cách hoạt động |
|---------|---------------|
| **Mở** | Hover (150ms delay) hoặc Click |
| **Đóng** | Hover out / Click outside / Route change |

### Active state

- Nếu đang ở `/browse?country=KR` → item "Hàn Quốc" highlight `bg-primary/15 text-primary`
- Button "Quốc gia" trên nav cũng highlight

### Mobile

- Không dùng dropdown
- Quốc gia hiển thị flat trong mobile menu, grid 2 cột
- Có separator và label "Quốc gia"

## Lưu ý

- Route `/countries` vẫn tồn tại nhưng KHÔNG link từ navbar
- Mega dropdown là cách chính để truy cập filter quốc gia
- Nếu muốn thêm/bớt quốc gia, chỉ cần sửa `lib/data/countries.ts`
