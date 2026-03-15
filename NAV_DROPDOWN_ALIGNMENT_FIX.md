# NAV_DROPDOWN_ALIGNMENT_FIX

> Thời gian: 15/03/2026

## Vấn đề đã sửa

Đồng bộ 2 mega dropdown "Thể loại" và "Quốc gia" để cùng style system và không bị tràn/lệch.

## Bảng so sánh TRƯỚC và SAU

| Thuộc tính | Genre (trước) | Country (trước) | Cả hai (sau) |
|-----------|--------------|----------------|-------------|
| Width | `640px` | `720px` | **`680px`** |
| Position | `left-1/2 -translate-x-1/2` | `left-1/2 -translate-x-1/2` | Genre: **`left-0`**, Country: **`right-0`** |
| Grid gap | `gap-1.5` | `gap-1.5` | `gap-1.5` ✅ |
| Text truncate | ✅ có (`truncate` class) | ❌ không | **Không** — cả hai |
| Icon shrink | Không | Không | **`shrink-0`** — cả hai |
| Hover transition | `transition` (all) | `transition` (all) | **`transition-colors duration-150`** |
| Chevron animation | `transition-transform` | `transition-transform` | **`transition-transform duration-200`** |
| Open animation | Không (abrupt) | Không (abrupt) | **`animate-dropdown-in`** (fade + slide) |

## Overflow fix

| Dropdown | Anchor | Lý do |
|---------|--------|-------|
| Genre | `left-0` | Nằm giữa navbar → phải mở sang phải, có đủ room |
| Country | `right-0` | Nằm gần edge phải → phải mở sang trái để không vượt viewport |

## Animation thêm

```css
@keyframes dropdownIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-dropdown-in {
  animation: dropdownIn 0.15s ease-out forwards;
}
```

Thêm vào `app/globals.css`. Áp dụng cho cả hai dropdown panels.

## Files đã sửa

| File | Thay đổi |
|------|----------|
| `components/header.tsx` | Chuẩn hóa width, position, transition, icon shrink, bỏ truncate genre |
| `app/globals.css` | Thêm `animate-dropdown-in` keyframe |

## Kiểm tra đã pass

- [x] Desktop: 2 dropdown cùng style, cùng width
- [x] Genre dropdown không tràn trái
- [x] Country dropdown không tràn phải
- [x] Tất cả text hiện đầy đủ (không truncate)
- [x] Animation mở mượt
- [x] Click outside đóng
- [x] Mở 1 tự đóng cái kia
- [x] Route change đóng cả 2
- [x] Logo, search, login button không bị lệch
- [x] Navbar height (h-16) giữ nguyên
