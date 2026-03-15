# 🎨 THEME MINT BLUE — Báo cáo thay đổi

> Chuyển theme chủ đạo từ **Violet (#8b5cf6)** sang **Mint Blue (#2DD4BF)**
> Ngày: 2026-03-15
> Đảm bảo: **LAYOUT KHÔNG ĐỔI**

---

## 1. Bảng token theme mới

| Token CSS Variable       | Giá trị cũ (Violet) | Giá trị mới (Mint Blue) | Ghi chú                  |
|--------------------------|----------------------|-------------------------|--------------------------|
| `--primary`              | `#8b5cf6`            | `#2DD4BF`               | Màu chủ đạo              |
| `--primary-foreground`   | `#ffffff`            | `#022c22`               | Text trên primary (dark) |
| `--accent`               | `#8b5cf6`            | `#14B8A6`               | Accent nhấn mạnh         |
| `--accent-foreground`    | `#ffffff`            | `#F0FDFA`               | Text trên accent         |
| `--ring`                 | `#8b5cf6`            | `#2DD4BF`               | Focus ring               |
| `--chart-1`              | `#8b5cf6`            | `#2DD4BF`               | Chart primary             |
| `--sidebar-primary`      | `#8b5cf6`            | `#2DD4BF`               | Sidebar active            |
| `--sidebar-primary-fg`   | `#ffffff`            | `#022c22`               | Sidebar text trên primary|
| `--sidebar-ring`         | `#8b5cf6`            | `#2DD4BF`               | Sidebar focus ring        |
| `--background`           | `#06060a`            | `#020617`               | Nền chính (slate-950)     |
| `--foreground`           | `#f0f0f5`            | `#F8FAFC`               | Text chính (slate-50)     |
| `--card`                 | `#12121a`            | `#0B1120`               | Nền card                  |
| `--card-foreground`      | `#f0f0f5`            | `#F8FAFC`               | Text trong card           |
| `--popover`              | `#12121a`            | `#0B1120`               | Nền popover               |
| `--popover-foreground`   | `#f0f0f5`            | `#F8FAFC`               | Text popover              |
| `--secondary`            | `#1a1a28`            | `#0F172A`               | Nền secondary (slate-900) |
| `--secondary-foreground` | `#f0f0f5`            | `#F8FAFC`               | Text secondary             |
| `--muted`                | `#2a2a3d`            | `#1E293B`               | Nền muted (slate-800)     |
| `--muted-foreground`     | `#8888a0`            | `#94A3B8`               | Text muted (slate-400)    |
| `--border`               | `#1e1e30`            | `#1E293B`               | Border color               |
| `--input`                | `#16162a`            | `#0F172A`               | Input bg                   |
| `--sidebar`              | `#0e0e18`            | `#030712`               | Sidebar bg                 |
| `--sidebar-foreground`   | `#f0f0f5`            | `#F8FAFC`               | Sidebar text               |
| `--sidebar-accent`       | `#1a1a28`            | `#0F172A`               | Sidebar accent bg          |
| `--sidebar-accent-fg`    | `#f0f0f5`            | `#F8FAFC`               | Sidebar accent text        |
| `--sidebar-border`       | `#1e1e30`            | `#1E293B`               | Sidebar border             |
| `--surface`              | `#0d0d16`            | `#020617`               | Surface extra              |
| `--glass`                | `rgba(18,18,26,0.7)` | `rgba(11,17,32,0.75)`   | Glass morph bg             |

> **Không đổi:** `--destructive`, `--destructive-foreground`, `--gold`, `--chart-2` đến `--chart-5`, `--radius`

---

## 2. File đã chỉnh

### ✅ `app/globals.css`

| Khu vực                  | Thay đổi                                                        |
|--------------------------|------------------------------------------------------------------|
| `:root` (dòng 6-44)     | Đổi tất cả CSS variables theo bảng token ở trên                 |
| `.dark` (dòng 46-79)    | Đồng bộ hoàn toàn với `:root` (cùng giá trị)                    |
| `.glow-primary`          | `rgba(139, 92, 246, ...)` → `rgba(45, 212, 191, ...)`           |
| `.text-gradient`         | `#a78bfa, #8b5cf6` → `#5EEAD4, #2DD4BF`                        |
| `.card-hover:hover`      | `rgba(139, 92, 246, 0.08)` → `rgba(45, 212, 191, 0.08)`        |

### ✅ `components/shared/MovieCard.tsx`

| Dòng  | Thay đổi                                                        |
|-------|------------------------------------------------------------------|
| 40    | `WebkitTextStroke: '1px rgba(139,92,246,0.3)'` → `'1px rgba(45,212,191,0.3)'` |

### ✅ `components/watch-party/WatchPartyHero.tsx`

| Dòng  | Thay đổi                                                        |
|-------|------------------------------------------------------------------|
| 33    | `bg-[radial-gradient(...#312e81...)]` → `bg-[radial-gradient(...#0D3B35...)]` |

---

## 3. Các thành phần UI được áp dụng theme mới (qua CSS variables)

Tất cả đều sử dụng Tailwind classes như `bg-primary`, `text-primary`, `shadow-primary/...` nên tự động nhận theme mới qua CSS variables mà **không cần sửa JSX**:

| Thành phần          | Nơi hiển thị mint blue                                    |
|---------------------|----------------------------------------------------------|
| **Header**          | Logo gradient, nav active state, search border focus, login button |
| **Nav active**      | `bg-white/10 text-white` → giữ nguyên, viền primary tự đổi |
| **Button primary**  | Tất cả `bg-primary` → tự đổi sang `#2DD4BF`             |
| **Search box**      | Focus border `border-primary/50` → tự đổi                |
| **MovieCard**       | Play button, hover title color, badge accent              |
| **HeroBanner**      | Trending badge, progress dots active, "Xem ngay" button   |
| **MovieRow**        | "Xem tất cả" link color                                   |
| **GenreChips**      | Hover border/bg primary                                    |
| **Browse page**     | Active genre chip, pagination active, search bar           |
| **Movie detail**    | Genre tags, "Xem phim" button, trailer button accent       |
| **Watch page**      | "Xem chung" link, info bar buttons                         |
| **WatchPartyHero**  | "Tạo phòng nhanh" button, gradient background              |
| **Footer**          | Logo gradient, link hover colors                           |
| **Dashboard**       | Sidebar active, notification dot, chart colors              |
| **Login/Signup**    | Submit button, social button, tab active accent             |
| **Glow effects**    | Poster glow, card hover shadow                              |
| **Focus rings**     | Tất cả focus-visible outline                                |

---

## 4. Xác nhận LAYOUT KHÔNG ĐỔI

| Kiểm tra                        | Kết quả |
|----------------------------------|---------|
| Header structure (HTML/JSX)      | ✅ Giữ nguyên |
| Footer structure                 | ✅ Giữ nguyên |
| HeroBanner carousel markup      | ✅ Giữ nguyên |
| MovieCard structure              | ✅ Giữ nguyên |
| MovieRow scroll layout           | ✅ Giữ nguyên |
| GenreChips grid                  | ✅ Giữ nguyên |
| Browse page grid + pagination   | ✅ Giữ nguyên |
| Movie detail layout              | ✅ Giữ nguyên |
| Watch page player + info bar    | ✅ Giữ nguyên |
| Login/Signup form layout         | ✅ Giữ nguyên |
| Dashboard sidebar + topbar      | ✅ Giữ nguyên |
| Xem chung hero + room grid      | ✅ Giữ nguyên |
| News/Reviews card grid           | ✅ Giữ nguyên |
| Font sizes, weights, spacing    | ✅ Giữ nguyên |
| Responsive breakpoints           | ✅ Giữ nguyên |
| Animation/transition timing      | ✅ Giữ nguyên |
| Nav items order                  | ✅ Giữ nguyên |
| Route redirects                  | ✅ Giữ nguyên |

---

## 5. Palette nhanh cho tham khảo

```
Primary:     #2DD4BF  (teal-400)     — buttons, badges, active states
Accent:      #14B8A6  (teal-500)     — secondary emphasis
Hover Mint:  #5EEAD4  (teal-300)     — hover glow, gradient highlight
Background:  #020617  (slate-950)    — main bg
Card:        #0B1120  (custom dark)  — card/popover bg
Text Main:   #F8FAFC  (slate-50)     — primary text
Text Muted:  #94A3B8  (slate-400)    — secondary text
Surface:     #0F172A  (slate-900)    — inputs, secondary bg
Border:      #1E293B  (slate-800)    — borders, dividers
Gold:        #fbbf24  (amber-400)    — ratings (KHÔNG ĐỔI)
Destructive: #f43f5e  (rose-500)     — errors (KHÔNG ĐỔI)
```
