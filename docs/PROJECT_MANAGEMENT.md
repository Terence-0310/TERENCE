# 📋 QUẢN LÝ DỰ ÁN TERENCE — KẾ HOẠCH PHÁT TRIỂN 4 TUẦN

> **Dự án:** TERENCE — Nền tảng xem phim trực tuyến
> **Môn học:** Công nghệ phần mềm — Đại học HUTECH
> **Thời gian:** 4 tuần (22/03/2026 – 18/04/2026)
> **Project Manager / Leader:** Nguyễn Đức Anh Tài

---

## 📌 A. THÔNG TIN TEAM & PHÂN BỔ WORKLOAD

| # | Thành viên | Vai trò | Chuyên môn | Workload |
|---|-----------|---------|-----------|----------|
| 1 | **Nguyễn Đức Anh Tài** | Leader / Backend + System | Backend API, Database, Auth, Kiến trúc, DevOps, Sync Pipeline | **60%** |
| 2 | **Lê Tấn Tài** | Member / Frontend | React Components, Pages, API Integration, Player | **20%** |
| 3 | **Trần Hồng Đức** | Member / Frontend + UI | UI/UX Design, Responsive Layout, Admin Dashboard UI | **20%** |

**Quy ước:**
- 🔴 = Ưu tiên cao (phải xong trong tuần)
- 🟡 = Ưu tiên trung bình
- 🟢 = Ưu tiên thấp / bonus

---

## 📅 B. BẢNG PHÂN CÔNG CHI TIẾT 4 TUẦN

---

### 🗓️ WEEK 1 (22/03 – 28/03): KHỞI TẠO DỰ ÁN & NỀN TẢNG

**🎯 Goal:** Setup project, thiết kế database schema, dựng layout cơ bản, xác thực người dùng.

| # | Người thực hiện | Task | Mô tả chi tiết | Output | Ưu tiên |
|---|----------------|------|----------------|--------|---------|
| 1.1 | Anh Tài (Leader) | Khởi tạo dự án Next.js | `npx create-next-app` với TypeScript, App Router, Tailwind CSS, ESLint. Cấu hình alias `@/`, folder structure | Project boilerplate chạy được | 🔴 |
| 1.2 | Anh Tài | Thiết kế Database Schema | Prisma schema: User, Session, Movie, Episode, VideoSource, Genre, Country, Person + bảng trung gian (MovieGenre, MovieCountry, MoviePerson) | `prisma/schema.prisma` hoàn chỉnh | 🔴 |
| 1.3 | Anh Tài | Tạo Prisma migration + seed | Chạy `prisma migrate dev`, viết seed data (5 genres, 5 countries, 2 users mẫu) | DB SQLite hoạt động, có data mẫu | 🔴 |
| 1.4 | Anh Tài | API Auth — Đăng ký | `POST /api/auth/register`: validate email/password (Zod), hash bcrypt, insert User, trả success | API register hoạt động | 🔴 |
| 1.5 | Anh Tài | API Auth — Đăng nhập | `POST /api/auth/login`: verify email + bcrypt compare, tạo Session, set cookie httpOnly 30 ngày | API login + cookie session | 🔴 |
| 1.6 | Anh Tài | API Auth — Đăng xuất + Session check | `POST /api/auth/logout` + middleware `getSession()` kiểm tra cookie | Auth flow hoàn chỉnh | 🔴 |
| 1.7 | Anh Tài | Thiết kế phân quyền RBAC | Enum Role (super_admin, admin, staff, editor, user), helper `requireRole()`, middleware guard | RBAC system | 🟡 |
| 1.8 | Anh Tài | Setup Git workflow | Tạo repo GitHub, branch strategy (main/develop/feature/*), `.gitignore`, PR template | Repo + workflow | 🟡 |
| 1.9 | Tấn Tài (FE) | Dựng layout chính | Layout: Header (logo, nav, search icon, auth buttons), Footer, Sidebar responsive | `components/layout/` | 🔴 |
| 1.10 | Tấn Tài | Trang Đăng nhập | Form login (email, password), validation client-side, gọi API `/api/auth/login`, redirect on success | `/login` page | 🔴 |
| 1.11 | Tấn Tài | Trang Đăng ký | Form register (name, email, password, confirm), validation, gọi API register | `/signup` page | 🔴 |
| 1.12 | Tấn Tài | Auth Context | React Context quản lý trạng thái đăng nhập, hook `useAuth()`, auto-check session on mount | `contexts/AuthContext.tsx` | 🟡 |
| 1.13 | Hồng Đức (UI) | Thiết kế Design System | Xác định color palette (dark theme), typography (Inter font), spacing scale, border radius | Design tokens trong `globals.css` | 🔴 |
| 1.14 | Hồng Đức | Cài đặt shadcn/ui | Install Radix UI + shadcn/ui, config `components.json`, add components: Button, Input, Card, Dialog, Toast | UI component library | 🔴 |
| 1.15 | Hồng Đức | Trang chủ — Hero Banner | Component HeroBanner: background image full-width, overlay gradient, title + tagline + CTA button, responsive | `components/home/HeroBanner.tsx` | 🔴 |
| 1.16 | Hồng Đức | Component MovieCard | Card hiển thị poster phim: image, title, year, rating badge, hover effect (scale + overlay) | `components/shared/MovieCard.tsx` | 🔴 |

**📦 Deliverable Week 1:**
- ✅ Project chạy được trên localhost
- ✅ Database schema + migration + seed
- ✅ Auth system hoàn chỉnh (register/login/logout/session)
- ✅ Layout header/footer responsive
- ✅ Trang login + signup hoạt động
- ✅ Design system + UI components cơ bản
- ✅ Hero Banner + MovieCard component

---

### 🗓️ WEEK 2 (29/03 – 04/04): API CỐT LÕI & GIAO DIỆN PHIM

**🎯 Goal:** Hoàn thành API movie, tích hợp OPhim data, dựng trang chủ + browse + chi tiết phim.

| # | Người thực hiện | Task | Mô tả chi tiết | Output | Ưu tiên |
|---|----------------|------|----------------|--------|---------|
| 2.1 | Anh Tài | API Movie CRUD | `GET /api/v1/movies` (paginate, filter genre/country/year/sort), `GET /api/v1/movies/[id]` chi tiết + episodes + cast | API movie endpoints | 🔴 |
| 2.2 | Anh Tài | API Genre + Country | `GET /api/v1/genres`, `GET /api/v1/countries` — trả danh sách cho filter UI | API metadata endpoints | 🔴 |
| 2.3 | Anh Tài | API Search | `GET /api/v1/search?q=...` — full-text search theo title, originalTitle, Prisma contains | API search endpoint | 🔴 |
| 2.4 | Anh Tài | OPhim Sync Client | Service gọi OPhim API (`GET /danh-sach`, `GET /phim/{slug}`), mapping response sang schema nội bộ | `src/server/ophim/` module | 🔴 |
| 2.5 | Anh Tài | OPhim Sync Pipeline | API `POST /api/admin/sync/ophim` — fetch catalog, validate, UPSERT Movie + Episode + Genre + Country | Sync pipeline hoạt động | 🔴 |
| 2.6 | Anh Tài | SyncJob + SyncLog tracking | Model SyncJob (status: running/completed/failed), SyncLog (entity, action, result) — ghi log mọi thao tác sync | Audit trail cho sync | 🟡 |
| 2.7 | Anh Tài | TMDB Enrichment | Service gọi TMDB API v3 (`/search/movie`, `/movie/{id}`), match OPhim → TMDB, fetch poster HD + cast + trailer | `src/server/tmdb/` module | 🟡 |
| 2.8 | Tấn Tài | Trang chủ — Movie Rows | Component MovieRow: title + horizontal scroll list MovieCard. Trang chủ gồm 4 rows: Trending, Mới cập nhật, Phim Bộ, Phim Lẻ | Trang chủ hoàn chỉnh | 🔴 |
| 2.9 | Tấn Tài | Trang Browse (Duyệt phim) | Page `/browse`: grid MovieCard, filter sidebar (genre, country, year, sort), pagination, responsive | `/browse` page | 🔴 |
| 2.10 | Tấn Tài | Trang Chi tiết phim | Page `/movie/[id]`: backdrop image, poster, title, mô tả, cast, genres, năm, quốc gia, danh sách tập, nút "Xem phim" | `/movie/[id]` page | 🔴 |
| 2.11 | Tấn Tài | API Integration — SWR | Cấu hình SWR (stale-while-revalidate), custom hooks: `useMovies()`, `useMovie(id)`, `useGenres()` | `hooks/useMovies.ts` etc. | 🟡 |
| 2.12 | Hồng Đức | Component MovieRow | Horizontal scroll với snap, arrow buttons trái/phải, skeleton loading, responsive (mobile: swipe, desktop: buttons) | `components/shared/MovieRow.tsx` | 🔴 |
| 2.13 | Hồng Đức | Search UI | Search bar trong header: input với debounce 300ms, dropdown suggestions, highlight keyword, click → navigate chi tiết | `components/shared/SearchBar.tsx` | 🔴 |
| 2.14 | Hồng Đức | Filter UI cho Browse | Sidebar filter: multi-select genre, dropdown country, range year, sort options (mới nhất, rating, A-Z) | `components/browse/FilterSidebar.tsx` | 🔴 |
| 2.15 | Hồng Đức | Loading & Error states | Skeleton loading cho MovieCard, MovieRow; Error boundary component; Empty state "Không tìm thấy phim" | Loading + error components | 🟡 |

**📦 Deliverable Week 2:**
- ✅ API movie listing + detail + search hoạt động
- ✅ OPhim sync pipeline chạy được (import phim thật)
- ✅ Trang chủ có movie rows từ data thật
- ✅ Trang browse với filter + pagination
- ✅ Trang chi tiết phim đầy đủ thông tin
- ✅ Search hoạt động end-to-end

---

### 🗓️ WEEK 3 (05/04 – 11/04): VIDEO PLAYER & TÍNH NĂNG CHÍNH

**🎯 Goal:** HLS video player, watch history, review, short video, và các tính năng tương tác.

| # | Người thực hiện | Task | Mô tả chi tiết | Output | Ưu tiên |
|---|----------------|------|----------------|--------|---------|
| 3.1 | Anh Tài | API Watch Bootstrap | `GET /api/v1/watch/[movieId]` — trả streamUrl (HLS), progress (currentTime), episode info, related movies | Watch API endpoint | 🔴 |
| 3.2 | Anh Tài | API Save Progress | `POST /api/v1/progress` — nhận {movieId, episodeId, currentTime, duration}, UPSERT WatchHistory | Progress save endpoint | 🔴 |
| 3.3 | Anh Tài | Watch History Service | Service layer: getHistory(userId), getContinueWatching(userId), getRecentlyWatched(userId) | Watch history logic | 🔴 |
| 3.4 | Anh Tài | API Review | `POST /api/v1/reviews` (tạo review, status=pending), `GET /api/v1/movies/[id]/reviews` (approved only) | Review endpoints | 🔴 |
| 3.5 | Anh Tài | Model Short Video | Schema: Short (id, title, videoUrl, thumbnailUrl, userId, viewCount, createdAt). API `GET /api/v1/shorts`, `POST /api/admin/shorts` | Short video backend | 🟡 |
| 3.6 | Anh Tài | Upload Service | API `POST /api/admin/upload` — nhận file (poster/banner/thumbnail), lưu vào `public/uploads/`, trả URL | Upload endpoint | 🟡 |
| 3.7 | Anh Tài | Model NewsPost + API | Schema NewsPost (title, content, thumbnailUrl, category). API CRUD cho admin, GET listing cho user | News backend | 🟡 |
| 3.8 | Tấn Tài | Trang Xem phim — HLS Player | Page `/watch/[id]`: tích hợp HLS.js, controls (play/pause/seek/volume/fullscreen), quality selector, responsive | `/watch/[id]` page | 🔴 |
| 3.9 | Tấn Tài | Player — Resume Playback | Khi mở player, gọi API lấy progress → seek tới vị trí cũ, mỗi 30s gửi POST progress | Resume + auto-save | 🔴 |
| 3.10 | Tấn Tài | Player — Episode List | Sidebar danh sách tập: highlight tập đang xem, click chuyển tập, auto next episode khi hết | Episode navigation | 🔴 |
| 3.11 | Tấn Tài | Trang Lịch sử xem | Page `/history`: danh sách phim đã xem, tiến trình %, nút "Xem tiếp", phân trang | `/history` page | 🟡 |
| 3.12 | Hồng Đức | Component Review | Form đánh giá: rating stars (1-5), textarea comment, submit button. Danh sách reviews dưới chi tiết phim | `components/review/` | 🔴 |
| 3.13 | Hồng Đức | Trang Short Video | Page `/shorts`: vertical swipe feed (kiểu TikTok), video player mini, like count, share button | `/shorts` page | 🟡 |
| 3.14 | Hồng Đức | Continue Watching Row | Component trên trang chủ: row "Xem tiếp" hiển thị phim đang xem dở, progress bar dưới poster, click → resume | Continue watching UI | 🔴 |
| 3.15 | Hồng Đức | Trang Tin tức phim | Page `/news`: grid bài tin tức, thumbnail + title + excerpt, click → chi tiết bài | `/news` page | 🟡 |

**📦 Deliverable Week 3:**
- ✅ HLS video player hoạt động (phát phim thật)
- ✅ Resume playback (lưu + khôi phục tiến trình)
- ✅ Chuyển tập tự động
- ✅ Hệ thống đánh giá phim
- ✅ Trang short video cơ bản
- ✅ Upload poster/banner hoạt động
- ✅ Continue Watching trên trang chủ

---

### 🗓️ WEEK 4 (12/04 – 18/04): ADMIN DASHBOARD & HOÀN THIỆN

**🎯 Goal:** Admin CMS hoàn chỉnh, deploy production, tối ưu UX, hoàn thiện tài liệu.

| # | Người thực hiện | Task | Mô tả chi tiết | Output | Ưu tiên |
|---|----------------|------|----------------|--------|---------|
| 4.1 | Anh Tài | Admin API — Movie CRUD | `POST/PATCH/DELETE /api/admin/movies` với Zod validation, permission guard (admin/staff only) | Admin movie API | 🔴 |
| 4.2 | Anh Tài | Admin API — User Management | `GET /api/admin/users` (paginate, filter role), `PATCH /api/admin/users/[id]` (block/unblock, change role) | Admin user API | 🔴 |
| 4.3 | Anh Tài | Admin API — Review Moderation | `PATCH /api/admin/reviews/[id]` — approve/reject/flag review, ghi AdminLog | Review moderation API | 🔴 |
| 4.4 | Anh Tài | Admin API — Dashboard Stats | `GET /api/admin/dashboard` — trả tổng users, tổng movies, tổng reviews, recent activity, page views chart | Dashboard data API | 🔴 |
| 4.5 | Anh Tài | AdminLog Audit Trail | Middleware ghi AdminLog (adminId, action, entity, entityId, details, ip, createdAt) cho mọi thao tác admin | Audit log system | 🔴 |
| 4.6 | Anh Tài | Deploy Production | Build Next.js standalone, setup PM2 ecosystem, Nginx reverse proxy + SSL, Cloudflare DNS | Production server chạy | 🔴 |
| 4.7 | Anh Tài | Nâng cấp README.md | Cập nhật README chuẩn công ty: architecture, ERD, sequence diagram, user story, coding convention | README hoàn chỉnh | 🟡 |
| 4.8 | Anh Tài | Bug fixing & performance | Fix lỗi từ testing, optimize Prisma queries (select/include), check memory leaks, response time | Stable codebase | 🟡 |
| 4.9 | Tấn Tài | Admin — Trang tổng quan | Page `/dashboard`: cards thống kê (users, movies, reviews), chart Recharts (page views 7 ngày), recent activity list | Dashboard overview page | 🔴 |
| 4.10 | Tấn Tài | Admin — Quản lý phim | Page `/dashboard/movies`: table phim (search, filter, sort), form thêm/sửa phim (dialog), nút xóa, trạng thái (publish/hide) | Movie management page | 🔴 |
| 4.11 | Tấn Tài | Admin — Quản lý users | Page `/dashboard/users`: table users (search, filter role), nút block/unblock, change role dropdown | User management page | 🔴 |
| 4.12 | Tấn Tài | Admin — Sync trigger UI | Page `/dashboard/sync`: nút "Sync OPhim", progress indicator, hiển thị kết quả (totalSynced, errors) | Sync management page | 🟡 |
| 4.13 | Hồng Đức | Admin — Layout Dashboard | Layout riêng cho admin: sidebar navigation (Dashboard, Movies, Users, Reviews, Settings), topbar (user info, logout) | Admin layout component | 🔴 |
| 4.14 | Hồng Đức | Admin — Duyệt đánh giá | Page `/dashboard/reviews`: table pending reviews, nút Approve/Reject/Flag, preview review content | Review moderation page | 🔴 |
| 4.15 | Hồng Đức | Admin — Upload media | Component upload: drag-and-drop zone, preview image, progress bar, copy URL sau upload | Upload component | 🟡 |
| 4.16 | Hồng Đức | Polish UI toàn bộ | Rà soát responsive (mobile/tablet/desktop), hover effects, transition animations, dark mode consistency | UI polish hoàn chỉnh | 🔴 |

**📦 Deliverable Week 4:**
- ✅ Admin Dashboard hoàn chỉnh (overview, movies, users, reviews)
- ✅ Audit log tracking mọi thao tác admin
- ✅ Deploy production (domain + SSL + CDN)
- ✅ README chuẩn công ty
- ✅ Responsive + UI polish toàn bộ
- ✅ Bug-free stable release

---

## 📊 C. TIẾN ĐỘ DỰ ÁN THEO TUẦN

| Tuần | % Hoàn thành | Milestone | Trạng thái |
|------|-------------|-----------|-----------|
| Week 1 | **25%** | Project setup + Auth + Layout + Design System | ✅ Hoàn thành |
| Week 2 | **50%** | API Movie + OPhim Sync + Trang chủ + Browse + Detail | ✅ Hoàn thành |
| Week 3 | **75%** | HLS Player + Watch History + Review + Short + Upload | ✅ Hoàn thành |
| Week 4 | **100%** | Admin CMS + Deploy + Polish + Documentation | ✅ Hoàn thành |

---

## 📝 D. BÁO CÁO TUẦN

---

### 📝 BÁO CÁO TUẦN 1 (22/03 – 28/03)

**Chủ đề: Khởi tạo dự án và nền tảng hệ thống**

#### 1. Công việc đã thực hiện

| Thành viên | Task hoàn thành | Ghi chú |
|-----------|----------------|---------|
| **Anh Tài** | Khởi tạo project Next.js 16 + TypeScript + Tailwind | Hoàn thành đúng tiến độ |
| **Anh Tài** | Thiết kế Prisma schema (12 models cơ bản) | Schema pass type check |
| **Anh Tài** | Migration + Seed data mẫu | SQLite hoạt động |
| **Anh Tài** | API Auth (register/login/logout) + RBAC | Cookie session httpOnly |
| **Anh Tài** | Setup Git repo + branch strategy | PR template có sẵn |
| **Tấn Tài** | Layout Header/Footer responsive | Dark theme, mobile hamburger |
| **Tấn Tài** | Trang Login + Signup | Validation + API integration |
| **Tấn Tài** | Auth Context + useAuth hook | Auto session check |
| **Hồng Đức** | Design System (colors, typography, spacing) | Dark mode palette |
| **Hồng Đức** | Cài đặt shadcn/ui (8 components) | Button, Input, Card, Dialog... |
| **Hồng Đức** | Hero Banner component | Full-width, gradient overlay |
| **Hồng Đức** | MovieCard component | Hover effect, rating badge |

#### 2. Kết quả đạt được
- Project chạy ổn định trên localhost:3000
- Auth system hoàn chỉnh: register → login → session → logout
- Phân quyền RBAC 5 roles hoạt động
- Layout responsive trên mobile/tablet/desktop
- Design system thống nhất toàn project
- Tiến độ: **25% — Đúng kế hoạch**

#### 3. Vấn đề gặp phải
- Cài đặt Prisma trên Windows cần cấu hình `binaryTargets` cho SQLite
- shadcn/ui v2 thay đổi cách config so với v1, cần update `components.json`
- Cookie httpOnly không gửi cross-origin khi test → cần set `sameSite=lax`

#### 4. Hướng giải quyết
- Thêm `binaryTargets = ["native", "windows"]` trong Prisma schema
- Update config shadcn/ui theo docs mới nhất
- Set cookie options: `httpOnly: true, secure: false (dev), sameSite: "lax"`

#### 5. Kế hoạch tuần 2
- Phát triển API movie listing + detail + search
- Tích hợp OPhim sync pipeline để có data phim thật
- Dựng trang chủ, browse, chi tiết phim

---

### 📝 BÁO CÁO TUẦN 2 (29/03 – 04/04)

**Chủ đề: API cốt lõi và giao diện khám phá phim**

#### 1. Công việc đã thực hiện

| Thành viên | Task hoàn thành | Ghi chú |
|-----------|----------------|---------|
| **Anh Tài** | API Movie (listing + detail + search) | Pagination + filter hoạt động |
| **Anh Tài** | API Genre + Country endpoints | Trả data cho filter UI |
| **Anh Tài** | OPhim Sync Client + Mapper | Fetch + validate + transform |
| **Anh Tài** | OPhim Sync Pipeline + SyncJob/SyncLog | Import ~50 phim thành công |
| **Anh Tài** | TMDB Enrichment (poster HD, cast) | Match ~80% phim OPhim → TMDB |
| **Tấn Tài** | Trang chủ — 4 Movie Rows | Trending, Mới, Phim Bộ, Phim Lẻ |
| **Tấn Tài** | Trang Browse + Pagination | Grid layout + filter hoạt động |
| **Tấn Tài** | Trang Chi tiết phim | Backdrop, poster, cast, episodes |
| **Tấn Tài** | SWR hooks (useMovies, useMovie) | Client-side caching |
| **Hồng Đức** | MovieRow component (horizontal scroll) | Snap scroll + arrow buttons |
| **Hồng Đức** | SearchBar (debounce + suggestions) | Dropdown suggestions hoạt động |
| **Hồng Đức** | FilterSidebar cho Browse | Multi-select genre, sort options |
| **Hồng Đức** | Skeleton loading + Error states | UX mượt khi loading |

#### 2. Kết quả đạt được
- Hệ thống có ~50 phim thật từ OPhim + poster HD từ TMDB
- Trang chủ hiển thị 4 hàng phim với data thật, responsive
- Browse page với filter genre/country/year/sort hoạt động end-to-end
- Search real-time có suggestions
- Chi tiết phim hiển thị đầy đủ thông tin + danh sách tập
- Tiến độ: **50% — Đúng kế hoạch**

#### 3. Vấn đề gặp phải
- OPhim API rate limit → cần delay 200ms giữa mỗi request
- Một số phim OPhim thiếu metadata (poster, year) → TMDB enrich bù
- Horizontal scroll MovieRow bị giật trên Safari mobile

#### 4. Hướng giải quyết
- Thêm `sleep(200)` trong loop fetch OPhim, retry tối đa 3 lần
- Pipeline: OPhim lấy data cơ bản → TMDB bổ sung poster HD + cast
- Fix MovieRow: thêm `-webkit-overflow-scrolling: touch` cho Safari

#### 5. Kế hoạch tuần 3
- Phát triển HLS video player
- Tính năng watch history + resume playback
- Hệ thống đánh giá phim + short video

---

### 📝 BÁO CÁO TUẦN 3 (05/04 – 11/04)

**Chủ đề: Video Player và tính năng tương tác**

#### 1. Công việc đã thực hiện

| Thành viên | Task hoàn thành | Ghi chú |
|-----------|----------------|---------|
| **Anh Tài** | API Watch Bootstrap | StreamUrl + progress + related |
| **Anh Tài** | API Save Progress | UPSERT WatchHistory mỗi 30s |
| **Anh Tài** | Watch History Service | getContinueWatching, getRecent |
| **Anh Tài** | API Review (create + list) | Status pending → approved |
| **Anh Tài** | Model Short Video + API | CRUD shorts + view count |
| **Anh Tài** | Upload Service | File upload → public/uploads/ |
| **Anh Tài** | NewsPost model + API | CRUD tin tức |
| **Tấn Tài** | HLS Player (HLS.js) | Adaptive bitrate, controls đầy đủ |
| **Tấn Tài** | Resume Playback | Seek vị trí cũ, auto-save 30s |
| **Tấn Tài** | Episode List + Auto Next | Sidebar tập, chuyển tập tự động |
| **Tấn Tài** | Trang Lịch sử xem | Danh sách phim đã xem + progress |
| **Hồng Đức** | Review Form + Rating Stars | 1-5 sao, textarea, submit |
| **Hồng Đức** | Short Video page | Vertical swipe feed |
| **Hồng Đức** | Continue Watching row | Progress bar, click resume |
| **Hồng Đức** | News page | Grid tin tức |

#### 2. Kết quả đạt được
- HLS player phát video thật từ OPhim sources, adaptive bitrate
- Resume playback: tắt tab → mở lại → xem tiếp đúng chỗ cũ
- Chuyển tập tự động khi hết episode
- Trang chủ có "Xem tiếp" row với progress bar
- Hệ thống review hoạt động (user post → admin duyệt)
- Trang short video với vertical swipe feed
- Upload poster/banner hoạt động
- Tiến độ: **75% — Đúng kế hoạch**

#### 3. Vấn đề gặp phải
- HLS.js memory leak khi chuyển tập liên tục → cần destroy instance cũ
- Progress save bị duplicate request khi user seek nhanh
- Video short bị lag trên mobile khi preload nhiều

#### 4. Hướng giải quyết
- `useEffect` cleanup: `hls.destroy()` khi unmount hoặc đổi source
- Debounce progress save 2s, skip nếu diff < 5 giây
- Short video: lazy load, chỉ preload video hiện tại + 1 video tiếp

#### 5. Kế hoạch tuần 4
- Admin Dashboard hoàn chỉnh (overview, CRUD, moderation)
- Deploy production (VPS + Nginx + SSL)
- Polish UI + bug fixing + tài liệu

---

### 📝 BÁO CÁO TUẦN 4 (12/04 – 18/04)

**Chủ đề: Admin Dashboard, Deploy và Hoàn thiện**

#### 1. Công việc đã thực hiện

| Thành viên | Task hoàn thành | Ghi chú |
|-----------|----------------|---------|
| **Anh Tài** | Admin API (Movie CRUD, Users, Reviews) | Zod validation + RBAC guard |
| **Anh Tài** | Dashboard Stats API | Users, movies, reviews, chart data |
| **Anh Tài** | AdminLog audit trail | Ghi log mọi thao tác admin |
| **Anh Tài** | Deploy production (VPS + PM2 + Nginx + SSL) | Domain hoạt động |
| **Anh Tài** | Nâng cấp README.md (chuẩn công ty) | UML, ERD, Architecture |
| **Anh Tài** | Bug fixing + performance optimization | Prisma select/include tối ưu |
| **Tấn Tài** | Admin — Trang tổng quan (Dashboard) | Cards stats + Recharts chart |
| **Tấn Tài** | Admin — Quản lý phim | Table + form CRUD + status toggle |
| **Tấn Tài** | Admin — Quản lý users | Table + block/unblock + role |
| **Tấn Tài** | Admin — Sync trigger UI | Button sync + progress + result |
| **Hồng Đức** | Admin — Sidebar Layout | Navigation + topbar + responsive |
| **Hồng Đức** | Admin — Duyệt đánh giá | Table reviews + Approve/Reject |
| **Hồng Đức** | Admin — Upload component | Drag-drop + preview + progress |
| **Hồng Đức** | Polish UI toàn bộ (responsive + animation) | Mobile/tablet/desktop check |

#### 2. Kết quả đạt được
- Admin Dashboard hoàn chỉnh: overview, CRUD phim, quản lý user, duyệt review
- Audit log tracking mọi thao tác admin (ai, làm gì, lúc nào)
- Deploy production thành công: domain + HTTPS + CDN Cloudflare
- README cập nhật chuẩn công ty (17 mục, có UML, ERD, System Design)
- UI responsive trên mọi thiết bị, animations mượt
- Bug-free stable release
- Tiến độ: **100% — HOÀN THÀNH**

#### 3. Vấn đề gặp phải
- Next.js standalone build thiếu static files → 404 CSS/JS trên production
- PM2 cluster mode xung đột với Socket.IO → fallback fork mode
- Nginx WebSocket proxy cần config `proxy_http_version 1.1` + `Upgrade`

#### 4. Hướng giải quyết
- Copy `.next/static/` vào `standalone/.next/static/`, copy `public/` vào `standalone/public/`
- PM2 dùng `exec_mode: "fork"` thay `"cluster"` cho ứng dụng có WebSocket
- Nginx: thêm `proxy_set_header Upgrade $http_upgrade` + `Connection "upgrade"`

#### 5. Hướng phát triển tiếp theo
- Migrate SQLite → PostgreSQL cho production scale
- Bổ sung unit tests (Vitest) + E2E tests (Playwright)
- Tích hợp Watch Party (Socket.IO + LiveKit)
- AI Recommendation Engine
- Mobile App (React Native)

---

## 🎯 E. ĐÁNH GIÁ HIỆU SUẤT THÀNH VIÊN

### Nhận xét của Project Manager

---

### 1. Nguyễn Đức Anh Tài — Leader / Backend + System

| Tiêu chí | Điểm (1-10) |
|---------|------------|
| Khối lượng công việc | **9/10** |
| Chất lượng code | **9/10** |
| Đúng tiến độ | **9/10** |
| Giao tiếp & phối hợp | **8/10** |
| Khả năng giải quyết vấn đề | **9/10** |
| **Tổng** | **44/50** |

**Nhận xét:** Anh Tài đảm nhận vai trò Leader xuất sắc, chịu trách nhiệm 60% khối lượng công việc bao gồm toàn bộ backend, database, kiến trúc hệ thống và deployment. Thiết kế database schema chặt chẽ, API clean và có validation đầy đủ. Đặc biệt ấn tượng với OPhim sync pipeline và TMDB enrichment — giải quyết bài toán dữ liệu phim hoàn toàn tự động. Deploy production thành công với PM2 + Nginx + SSL cho thấy kinh nghiệm DevOps tốt. Điểm cần cải thiện: nên viết unit test cho các service layer.

---

### 2. Lê Tấn Tài — Frontend Developer

| Tiêu chí | Điểm (1-10) |
|---------|------------|
| Khối lượng công việc | **8/10** |
| Chất lượng code | **8/10** |
| Đúng tiến độ | **9/10** |
| Giao tiếp & phối hợp | **8/10** |
| Khả năng giải quyết vấn đề | **8/10** |
| **Tổng** | **41/50** |

**Nhận xét:** Tấn Tài hoàn thành tốt các page chính: trang chủ, browse, chi tiết phim, video player, admin dashboard. Tích hợp HLS.js player phức tạp với resume playback và auto-save progress — đây là tính năng kỹ thuật đòi hỏi hiểu biết về video streaming. Admin pages (CRUD phim, users) hoàn chỉnh. Điểm mạnh: làm việc đúng tiến độ, API integration sạch sẽ qua SWR hooks. Điểm cần cải thiện: nên tối ưu re-render performance với React.memo / useMemo.

---

### 3. Trần Hồng Đức — Frontend + UI Developer

| Tiêu chí | Điểm (1-10) |
|---------|------------|
| Khối lượng công việc | **8/10** |
| Chất lượng code | **8/10** |
| Đúng tiến độ | **8/10** |
| Giao tiếp & phối hợp | **9/10** |
| Khả năng giải quyết vấn đề | **7/10** |
| **Tổng** | **40/50** |

**Nhận xét:** Hồng Đức đóng vai trò quan trọng trong việc xây dựng design system và trải nghiệm người dùng. Từ việc setup shadcn/ui, thiết kế Hero Banner, MovieCard, đến các component phức tạp như MovieRow (horizontal scroll + snap), SearchBar (debounce + suggestions) — tất cả đều có chất lượng UI cao. Admin layout sidebar chuyên nghiệp. Điểm mạnh: mắt thẩm mỹ tốt, responsive design đúng chuẩn. Điểm cần cải thiện: nên tìm hiểu thêm về accessibility (ARIA labels, keyboard navigation).

---

### Tổng kết đánh giá Team

| Thành viên | Workload | Điểm | Đánh giá |
|-----------|----------|------|----------|
| Nguyễn Đức Anh Tài | 60% | 44/50 | ⭐ Xuất sắc |
| Lê Tấn Tài | 20% | 41/50 | ⭐ Tốt |
| Trần Hồng Đức | 20% | 40/50 | ⭐ Tốt |
| **Team trung bình** | **100%** | **41.7/50** | **⭐ Tốt** |

---

## 🔧 F. ĐỀ XUẤT CẢI TIẾN DỰ ÁN

### Cải tiến kỹ thuật (ưu tiên cao → thấp)

| # | Đề xuất | Lý do | Ưu tiên |
|---|---------|-------|---------|
| 1 | **Migrate SQLite → PostgreSQL** | SQLite không hỗ trợ concurrent writes, không phù hợp production scale | 🔴 Cao |
| 2 | **Bổ sung Unit Tests (Vitest)** | Đảm bảo regression, an toàn khi refactor | 🔴 Cao |
| 3 | **Thêm Rate Limiting** | Bảo vệ API khỏi abuse, DDoS | 🟡 TB |
| 4 | **Redis Cache Layer** | Cache homepage, movie detail, session → giảm tải DB | 🟡 TB |
| 5 | **Background Job Queue (BullMQ)** | Sync pipeline chạy async, không block request | 🟡 TB |
| 6 | **Health Check endpoint** | `/api/health` cho monitoring | 🟢 Thấp |

### Cải tiến sản phẩm

| # | Đề xuất | Giá trị | Ưu tiên |
|---|---------|---------|---------|
| 1 | **Watch Party (Xem chung)** | Xem phim đồng bộ real-time — tính năng nổi bật | 🔴 Cao |
| 2 | **TCoin Gamification** | Tăng engagement, user retention | 🟡 TB |
| 3 | **AI Recommendation** | Gợi ý phim thông minh theo sở thích | 🟡 TB |
| 4 | **Mobile App** | Mở rộng platform (React Native) | 🟢 Thấp |
| 5 | **Payment Gateway (VNPay)** | Monetization thực tế | 🟢 Thấp |

---

## 📌 G. TỔNG KẾT

Dự án TERENCE đã hoàn thành **100% mục tiêu đề ra** trong thời gian 4 tuần với team 3 người. Các thành viên đã phối hợp hiệu quả, phân công hợp lý theo chuyên môn, và giao tiếp tốt qua quy trình PR review.

**Điểm mạnh của team:**
- Kiến trúc hệ thống được thiết kế vượt trội so với mức đồ án thông thường
- Data pipeline tự động (OPhim + TMDB) — không cần nhập dữ liệu thủ công
- Deploy production thực tế — không chỉ chạy localhost
- UI/UX chất lượng cao, responsive, dark mode nhất quán

**Khuyến nghị:**
- Duy trì momentum phát triển → ưu tiên Watch Party và PostgreSQL migration
- Bổ sung testing trước khi thêm tính năng mới
- Cân nhắc tách thêm 1 member cho DevOps/Testing nếu scale team

---

*Tài liệu này được lập bởi Project Manager — Nguyễn Đức Anh Tài*
*Ngày lập: 18/04/2026*
*Phiên bản: 1.0*
