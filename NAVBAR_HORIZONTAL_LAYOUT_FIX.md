# NAVBAR_HORIZONTAL_LAYOUT_FIX

> Thời gian: 15/03/2026

## Thay đổi

Chuyển navbar từ dạng **dropdown "Thêm"** sang **menu ngang flat** với tất cả 12 items.

## Trước

```
Trang chủ | Khám phá | Xu hướng | Đánh giá cao | Xem chung | Thêm ▼
                                                                ├─ Tin tức
                                                                ├─ Thể loại
                                                                ├─ Quốc gia
                                                                ├─ Diễn viên
                                                                ├─ Lịch chiếu
                                                                ├─ Review
                                                                └─ TCoin
```

## Sau

```
Trang chủ | Khám phá | Xu hướng | Đánh giá cao | Xem chung | Tin tức | Thể loại | Quốc gia | Diễn viên | Lịch chiếu | Review | TCoin
```

## Chi tiết kỹ thuật

| Mục | Giá trị |
|-----|---------|
| File sửa | `components/header.tsx` |
| Items | 12 items trên 1 hàng ngang |
| Font size | `text-[13px]` (giảm từ `text-sm` = 14px) |
| Padding | `px-2 py-1.5` (md), `px-2.5` (lg) |
| Max width | `1400px` (tăng từ `max-w-7xl` = 1280px) |
| Logo text | Ẩn ở `md`, hiện ở `lg` để tiết kiệm space |

## Giữ nguyên (không thay đổi)

- ✅ Logo icon + text
- ✅ Search icon
- ✅ Login button
- ✅ Navbar height (h-16)
- ✅ Hover animation (hover:bg-white/5 hover:text-white)
- ✅ Active state (bg-white/10 text-white)
- ✅ Mobile menu (collapse tất cả items)
- ✅ Search overlay
- ✅ User menu / logout
- ✅ Dashboard link cho admin

## Đã xóa

- ❌ `MORE_ITEMS` array
- ❌ `moreOpen` state
- ❌ `moreRef` ref
- ❌ `useEffect` click-outside handler
- ❌ `isMoreActive` computed
- ❌ ChevronDown dropdown icon
- ❌ Toàn bộ dropdown UI

## Responsive

| Breakpoint | Hành vi |
|------------|---------|
| `< md` (768px) | Mobile menu hamburger |
| `md` - `lg` | 12 items ngang, logo icon only |
| `> lg` (1024px) | 12 items ngang, logo full |
