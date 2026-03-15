# 🔒 UI LOCK RULES — DỰ ÁN TERENCE

> **Tài liệu bảo vệ giao diện gốc.**
> Mọi thay đổi code PHẢI tuân thủ các quy tắc bên dưới.
> Cập nhật lần cuối: 2026-03-15

---

## Mục lục

- [I. Nguyên tắc chung](#i-nguyên-tắc-chung)
- [II. Danh sách Route & Trạng thái khóa](#ii-danh-sách-route--trạng-thái-khóa)
- [III. Component & Trạng thái khóa](#iii-component--trạng-thái-khóa)
- [IV. CSS / Theme — Chỉ được đổi màu](#iv-css--theme--chỉ-được-đổi-màu)
- [V. Checklist trước khi sửa file](#v-checklist-trước-khi-sửa-file)

---

## I. Nguyên tắc chung

### ❌ TUYỆT ĐỐI KHÔNG ĐƯỢC

| # | Hành vi cấm                                                      |
|---|-------------------------------------------------------------------|
| 1 | Rebuild / viết lại homepage (`app/page.tsx`)                      |
| 2 | Đổi layout header (cấu trúc HTML, thứ tự phần tử, spacing)      |
| 3 | Đổi hero banner structure (markup, carousel logic, gradient)      |
| 4 | Đổi card structure (MovieCard, WatchRoomCard, NewsCard, ReviewCard)|
| 5 | Đổi nav structure (NAV_ITEMS order, mobile menu layout)           |
| 6 | Đổi spacing tổng thể (padding, margin, gap giữa các section)     |
| 7 | Đổi UX flow hiện tại (routing, redirect, page flow)              |
| 8 | Copy UI từ Netflix / rophim / web phim khác                       |
| 9 | Tạo giao diện mới thay thế giao diện cũ                          |
| 10| Xóa bất kỳ component giao diện đang render                       |
| 11| Đổi grid responsive breakpoints (cols, gap, sizing)               |
| 12| Đổi font-size, font-weight, line-height đã thiết lập              |

### ✅ ĐƯỢC PHÉP

| # | Hành vi được phép                                                 |
|---|-------------------------------------------------------------------|
| 1 | Sửa logic bên trong component (API call, state, event handler)    |
| 2 | Sửa bug (lỗi render, lỗi navigation, lỗi type)                  |
| 3 | Bổ sung chức năng còn thiếu (search, filter, auth, player, v.v.) |
| 4 | Đổi theme màu sang **mint blue** (chỉ qua CSS variables)         |
| 5 | Tối ưu code nội bộ (refactor, performance, clean code)            |
| 6 | Thêm loading state / error boundary / fallback message            |
| 7 | Thêm component hỗ trợ logic (modal, toast, dialog nhỏ)          |
| 8 | Thêm middleware, API route, service mới                           |

---

## II. Danh sách Route & Trạng thái khóa

### Public Pages (Có Header + Footer)

| Route                         | File                                | Lock Level      | Ghi chú                                                |
|-------------------------------|-------------------------------------|-----------------|--------------------------------------------------------|
| `/` (Homepage)                | `app/page.tsx`                      | 🔒 **UI LOCKED** | Không đổi structure. Được đổi logic fetch, thêm error handling. |
| `/browse`                     | `app/browse/page.tsx`               | 🔒 **UI LOCKED** | Không đổi grid, search bar layout, pagination layout.  |
| `/movie/[id]`                 | `app/movie/[id]/page.tsx`           | 🔒 **UI LOCKED** | Không đổi hero backdrop, poster + info layout, cast grid. |
| `/watch/[id]`                 | `app/watch/[id]/page.tsx`           | 🔒 **UI LOCKED** | Không đổi player area, info bar. Được thêm HLS player logic. |
| `/xem-chung`                  | `app/xem-chung/page.tsx`            | 🔒 **UI LOCKED** | Không đổi hero, room grid. Được thêm logic realtime.   |
| `/login`                      | `app/login/page.tsx`                | 🔒 **UI LOCKED** | Không đổi form layout, tab switcher. Được sửa auth logic. |
| `/signup`                     | `app/signup/page.tsx`               | 🔒 **UI LOCKED** | Không đổi form layout, split-screen. Được sửa auth logic. |
| `/news`                       | `app/news/page.tsx`                 | 🔒 **UI LOCKED** | Không đổi grid layout, card structure.                 |
| `/reviews`                    | `app/reviews/page.tsx`              | 🔒 **UI LOCKED** | Không đổi grid layout, card structure.                 |

### Redirect Pages (Không có UI riêng — chỉ redirect)

| Route              | File                             | Lock Level     | Ghi chú                                     |
|--------------------|----------------------------------|----------------|----------------------------------------------|
| `/movies`          | `app/movies/page.tsx`            | 🟢 Logic only  | Redirect → `/browse`. Được đổi redirect target. |
| `/series`          | `app/series/page.tsx`            | 🟢 Logic only  | Redirect → `/browse`. Được đổi redirect target. |
| `/genres`          | `app/genres/page.tsx`            | 🟢 Logic only  | Redirect → `/browse`. Được đổi redirect target. |
| `/movie`           | `app/movie/page.tsx`             | 🟢 Logic only  | Redirect → `/browse`.                        |
| `/watch`           | `app/watch/page.tsx`             | 🟢 Logic only  | Redirect → `/`.                              |
| `/watch-together`  | `app/watch-together/page.tsx`    | 🟢 Logic only  | Redirect → `/xem-chung`.                     |

### Dashboard Pages (Layout riêng — ẩn Header/Footer)

| Route                     | File                                    | Lock Level      | Ghi chú                                           |
|---------------------------|-----------------------------------------|-----------------|---------------------------------------------------|
| `/dashboard`              | `app/dashboard/page.tsx`                | 🔒 **UI LOCKED** | Không đổi layout sidebar/topbar. Được sửa data.   |
| `/dashboard/movies`       | `app/dashboard/movies/page.tsx`         | 🔒 **UI LOCKED** | Không đổi table/grid structure.                    |
| `/dashboard/users`        | `app/dashboard/users/page.tsx`          | 🔒 **UI LOCKED** | Không đổi table structure.                         |
| `/dashboard/analytics`    | `app/dashboard/analytics/page.tsx`      | 🔒 **UI LOCKED** | Không đổi chart layout.                            |
| `/dashboard/settings`     | `app/dashboard/settings/page.tsx`       | 🔒 **UI LOCKED** | Không đổi form layout.                             |

---

## III. Component & Trạng thái khóa

### 🔒 UI STRUCTURE LOCKED — Tuyệt đối không đổi cấu trúc HTML

| Component                              | File                                            | Chi tiết khóa                                             |
|----------------------------------------|-------------------------------------------------|----------------------------------------------------------|
| **RootLayout**                         | `app/layout.tsx`                                | Cấu trúc `html > body > AuthProvider > LayoutWrapper > {children}`. Không đổi. |
| **LayoutWrapper**                      | `components/layout-wrapper.tsx`                 | Logic show/hide Header/Footer. Không đổi thứ tự render.  |
| **Header**                             | `components/header.tsx`                         | Toàn bộ structure: Logo + Nav + Search + User + Mobile Menu. **KHÔNG ĐỔI.** |
| **Footer**                             | `components/footer.tsx`                         | Grid 3-col: Brand / Links / TMDB. Bottom copyright. **KHÔNG ĐỔI.** |
| **HeroBanner**                         | `components/home/HeroBanner.tsx`                | Carousel backdrop, cinematic gradients, content, nav arrows, dots. **KHÔNG ĐỔI.** |
| **MovieCard + Skeleton**               | `components/shared/MovieCard.tsx`               | Card structure: poster, hover overlay, rating, rank, title. **KHÔNG ĐỔI.** |
| **MovieRow**                           | `components/shared/MovieRow.tsx`                | Section header + scroll row + arrows. **KHÔNG ĐỔI.**     |
| **GenreChips**                         | `components/shared/GenreChips.tsx`              | Grid layout + chip links. **KHÔNG ĐỔI.**                 |
| **SearchBar**                          | `components/shared/SearchBar.tsx`               | Input structure, debounce logic. **KHÔNG ĐỔI.**          |
| **WatchPartyHero**                     | `components/watch-party/WatchPartyHero.tsx`     | Hero banner layout: gradient bg, text, buttons, dialog. **KHÔNG ĐỔI.** |
| **WatchRoomCard**                      | `components/watch-party/WatchRoomCard.tsx`      | Card structure: image, badges, info overlay. **KHÔNG ĐỔI.** |
| **Dashboard Layout**                   | `app/dashboard/layout.tsx`                      | Sidebar + topbar + content area layout. **KHÔNG ĐỔI.**   |

### 🟡 CHỈ ĐƯỢC ĐỔI MÀU — Chỉ thay đổi color values, không đổi structure

| File                        | Phần được đổi                                                       |
|-----------------------------|---------------------------------------------------------------------|
| `app/globals.css`           | Các CSS custom properties (`:root` + `.dark`): `--primary`, `--accent`, `--ring`, `--sidebar-primary`, `--sidebar-ring`, `--gold`, `--chart-*`. |
| `app/globals.css`           | `.glow-primary` → box-shadow color values.                          |
| `app/globals.css`           | `.text-gradient` → gradient color stops.                            |
| `app/globals.css`           | `.card-hover:hover` → box-shadow color values.                      |
| `styles/globals.css`        | CSS variables trong `:root` và `.dark` (backup theme, có thể outdated). |

> **Quy tắc đổi màu Mint Blue:**
> - `--primary` hiện tại: `#8b5cf6` (violet) → đổi sang giá trị mint blue
> - `--accent`: đổi theo primary
> - `--ring`: đổi theo primary
> - `--sidebar-primary` / `--sidebar-ring`: đổi theo primary
> - Shadow values có chứa `rgba(139, 92, 246, ...)` → đổi sang mint blue tương ứng
> - **KHÔNG** đổi `--background`, `--foreground`, `--card`, `--muted`, `--secondary`, `--border`, `--input`, `--destructive`

### 🟢 ĐƯỢC THÊM LOGIC / COMPONENT HỖ TRỢ

| Loại                                    | Quy tắc                                                               |
|-----------------------------------------|------------------------------------------------------------------------|
| **API Routes** (`app/api/*`)            | Tự do thêm mới. Không giới hạn.                                       |
| **Services** (`services/*`)             | Tự do thêm/sửa. Không liên quan UI.                                   |
| **Hooks** (`hooks/*`)                   | Tự do thêm.                                                           |
| **Types** (`types/*`)                   | Tự do thêm/sửa.                                                       |
| **Contexts** (`contexts/*`)             | Được sửa logic auth, thêm context mới.                                |
| **Lib** (`lib/*`)                       | Tự do thêm/sửa utility, watch-party logic, TMDB wrappers.             |
| **UI Components** (`components/ui/*`)   | Shadcn primitives. Được thêm mới, **không đổi** component đã có.      |
| **Dialog / Modal / Toast mới**          | Được thêm mới, không thay thế layout hiện tại.                        |
| **Loading components**                  | Được thêm skeleton, spinner, progress. Phải dùng style nhất quán.     |
| **Error boundaries**                    | Được thêm `error.tsx`, `not-found.tsx`, `loading.tsx` cho các route.   |

---

## IV. CSS / Theme — Chỉ được đổi màu

### File: `app/globals.css`

```
Dòng 6-44 (:root)  →  CHỈ được đổi giá trị color
Dòng 46-79 (.dark)  →  CHỈ được đổi giá trị color

CÁC BIẾN ĐƯỢC ĐỔI:
  --primary         ← đổi sang mint blue
  --accent          ← đổi theo primary
  --ring            ← đổi theo primary
  --sidebar-primary ← đổi theo primary
  --sidebar-ring    ← đổi theo primary
  --chart-1         ← đổi theo primary (nếu muốn)
  --gold            ← GIỮ NGUYÊN (dùng cho rating)

CÁC BIẾN KHÔNG ĐƯỢC ĐỔI:
  --background, --foreground, --card, --card-foreground
  --popover, --popover-foreground, --secondary, --secondary-foreground
  --muted, --muted-foreground, --destructive, --destructive-foreground
  --border, --input, --surface, --glass

Dòng 81-120 (@theme inline)  →  KHÔNG ĐỔI (mapping layer)
Dòng 122-135 (@layer base)   →  KHÔNG ĐỔI
Dòng 137-223 (Utilities)     →  CHỈ đổi color values trong:
  - .glow-primary   (box-shadow rgba values)
  - .text-gradient   (gradient color stops)
  - .card-hover:hover (box-shadow rgba values)
  - KHÔNG đổi timing, transform, sizes
```

### Inline Tailwind Classes trong Components

Khi đổi theme, **KHÔNG** sửa trực tiếp className trong component. Tất cả color phải đi qua CSS variables (`bg-primary`, `text-primary`, `shadow-primary/...`). Nếu component nào dùng hardcoded color (ví dụ `rgba(139, 92, 246, ...)`), chỉ cần đổi giá trị `--primary` trong CSS là toàn bộ sẽ cập nhật — trừ các hardcoded rgba trong:

- `components/shared/MovieCard.tsx` dòng 40: `WebkitTextStroke: '1px rgba(139,92,246,0.3)'` → được đổi giá trị rgba
- `app/globals.css` `.glow-primary`, `.text-gradient`, `.card-hover:hover` → được đổi giá trị rgba

---

## V. Checklist trước khi sửa file

Trước khi thay đổi bất kỳ file nào, kiểm tra:

- [ ] File có nằm trong danh sách **🔒 UI LOCKED** không?
  - **Có** → KHÔNG được đổi HTML structure, className layout, spacing, font
  - Chỉ được sửa: logic JS/TS, data fetching, event handlers, state
- [ ] Thay đổi có ảnh hưởng đến layout visual không?
  - **Có** → DỪNG. Không được thực hiện.
- [ ] Có đổi màu không?
  - **Có** → Chỉ đổi qua CSS variables trong `app/globals.css` `:root` / `.dark`
  - KHÔNG hardcode color mới vào component
- [ ] Có thêm component mới không?
  - **Loại hỗ trợ** (modal, dialog, toast, skeleton) → OK
  - **Loại thay thế UI** → KHÔNG ĐƯỢC
- [ ] Có thêm route mới không?
  - **API route** → OK
  - **Page route mới** → Cần thêm vào NavItem? Nếu có → KHÔNG đổi nav structure, chỉ thêm item vào mảng `NAV_ITEMS`

---

> ⚠️ **Mọi vi phạm UI LOCK sẽ được coi là lỗi nghiêm trọng. Luôn audit file trước khi sửa.**
