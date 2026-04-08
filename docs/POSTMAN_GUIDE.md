# 🧪 HƯỚNG DẪN TEST API VỚI POSTMAN — TERENCE

## 📥 Bước 1: Import vào Postman

1. Mở **Postman** → Click **Import**
2. Kéo thả 2 file vào:
   - `docs/TERENCE_API.postman_collection.json` — Collection (50+ requests)
   - `docs/TERENCE_Local.postman_environment.json` — Environment
3. Chọn Environment **"TERENCE Local"** ở góc trên bên phải

## 🚀 Bước 2: Chạy server

```bash
npm run dev
```

Server chạy tại `http://localhost:3000`

## 🔐 Bước 3: Login để lấy Cookie

> **QUAN TRỌNG:** Postman tự động quản lý cookie. Sau khi login, cookie `terence_session` sẽ được gửi kèm cho tất cả request tiếp theo.

### Test User:
Chạy **1.2 Login (Đăng nhập User)** với body:
```json
{
  "email": "testuser@terence.com",
  "password": "Test@12345"
}
```

### Test Admin:
Chạy **1.3 Login (Đăng nhập Admin)** với body:
```json
{
  "email": "admin@terence.com",
  "password": "Admin@12345"
}
```

> Nếu chưa có tài khoản, chạy **1.1 Register** trước, hoặc dùng account từ seed data.

---

## 📋 Danh sách API Tests (50+ requests)

### 🔐 1. Authentication (7 tests)
| # | Request | Method | Endpoint | Mô tả |
|---|---------|--------|----------|--------|
| 1.1 | Register | POST | `/api/auth/signup` | Đăng ký tài khoản mới |
| 1.2 | Login User | POST | `/api/auth/login` | Đăng nhập (user thường) |
| 1.3 | Login Admin | POST | `/api/auth/login` | Đăng nhập (admin) |
| 1.4 | Get Me | GET | `/api/auth/me` | Kiểm tra session hiện tại |
| 1.5 | Logout | POST | `/api/auth/logout` | Đăng xuất |
| 1.6 | Login sai MK | POST | `/api/auth/login` | Test 401 Unauthorized |
| 1.7 | Register thiếu field | POST | `/api/auth/signup` | Test 400 Bad Request |

### 🎬 2. Movie API — Public (7 tests)
| # | Request | Method | Endpoint | Mô tả |
|---|---------|--------|----------|--------|
| 2.1 | Movie List | GET | `/api/v1/movies` | Danh sách phim (paginated) |
| 2.2 | Filter type | GET | `/api/v1/movies?type=series` | Lọc theo loại phim |
| 2.3 | Filter category | GET | `/api/v1/movies?category=hanh-dong` | Lọc theo thể loại + quốc gia |
| 2.4 | Filter year | GET | `/api/v1/movies?year=2024&featured=true` | Lọc theo năm + nổi bật |
| 2.5 | Movie Detail | GET | `/api/v1/movies/{slug}` | Chi tiết 1 phim |
| 2.6 | Not Found | GET | `/api/v1/movies/xxx` | Test 404 |
| 2.7 | Home Data | GET | `/api/v1/home` | Dữ liệu trang chủ |

### 🔍 3. Search API (4 tests)
| # | Request | Method | Endpoint | Mô tả |
|---|---------|--------|----------|--------|
| 3.1 | Full-text search | GET | `/api/v1/search?q=phim` | Tìm kiếm phim |
| 3.2 | Search + filter | GET | `/api/v1/search?q=avengers&type=movie` | Search có filter |
| 3.3 | Missing query | GET | `/api/v1/search` | Test 400 thiếu param |
| 3.4 | Suggest | GET | `/api/v1/search/suggest?q=ac` | Autocomplete gợi ý |

### 📺 4. Watch & Progress (7 tests) — ⚠️ Cần đăng nhập
| # | Request | Method | Endpoint | Mô tả |
|---|---------|--------|----------|--------|
| 4.1 | Save Progress | POST | `/api/v1/progress` | Lưu tiến trình xem phim |
| 4.2 | Get Progress | GET | `/api/v1/progress?movieId=xxx` | Lấy tiến trình đã xem |
| 4.3 | Upsert History | POST | `/api/v1/watch-history` | Cập nhật lịch sử xem |
| 4.4 | List History | GET | `/api/v1/watch-history` | Danh sách đã xem |
| 4.5 | Continue Watching | GET | `/api/v1/watch-history?mode=continue` | Phim đang xem dở |
| 4.6 | Continue (dedicated) | GET | `/api/v1/continue-watching` | Endpoint riêng xem tiếp |
| 4.7 | Unauthorized | GET | `/api/v1/watch-history` | Test 401 chưa login |

### ⚙️ 5. Admin — Movies CRUD (6 tests) — ⚠️ Cần role admin
| # | Request | Method | Endpoint | Mô tả |
|---|---------|--------|----------|--------|
| 5.1 | List Movies | GET | `/api/admin/movies` | Danh sách phim (admin) |
| 5.2 | Search + Filter | GET | `/api/admin/movies?search=xxx` | Tìm + lọc phim |
| 5.3 | Create Movie | POST | `/api/admin/movies` | Tạo phim mới |
| 5.4 | Get Movie | GET | `/api/admin/movies/{id}` | Chi tiết phim (admin) |
| 5.5 | Update Movie | PUT | `/api/admin/movies/{id}` | Cập nhật phim |
| 5.6 | Delete Movie | DELETE | `/api/admin/movies/{id}` | Xóa mềm phim |

### 👥 6. Admin — Users (9 tests) — ⚠️ Cần role admin
| # | Request | Method | Endpoint | Mô tả |
|---|---------|--------|----------|--------|
| 6.1 | List Users | GET | `/api/admin/users` | Danh sách users |
| 6.2 | Filter role | GET | `/api/admin/users?role=admin` | Lọc theo role |
| 6.3 | Create User | POST | `/api/admin/users` | Tạo user mới |
| 6.4 | Get User | GET | `/api/admin/users/{id}` | Chi tiết user |
| 6.5 | Change Role | PATCH | `/api/admin/users/{id}` | Đổi role |
| 6.6 | Block User | PATCH | `/api/admin/users/{id}` | Khóa tài khoản |
| 6.7 | Unblock User | PATCH | `/api/admin/users/{id}` | Mở khóa |
| 6.8 | Reset Password | PATCH | `/api/admin/users/{id}` | Đặt lại mật khẩu |
| 6.9 | Delete User | DELETE | `/api/admin/users/{id}` | Xóa mềm user |

### 🔄 7. Admin — Sync Pipeline (5 tests) — ⚠️ Cần role admin
| # | Request | Method | Endpoint | Mô tả |
|---|---------|--------|----------|--------|
| 7.1 | Sync OPhim Catalog | POST | `/api/admin/sync/ophim/catalog` | Sync danh mục OPhim |
| 7.2 | Sync Single Movie | POST | `/api/admin/sync/ophim/movie/{slug}` | Sync 1 phim |
| 7.3 | Enrich TMDB | POST | `/api/admin/sync/tmdb/{movieId}` | Bổ sung TMDB metadata |
| 7.4 | Sync Logs | GET | `/api/admin/sync/logs` | Xem sync logs |
| 7.5 | Sync Summary | GET | `/api/admin/sync/summary` | Thống kê sync |

### 📊 8. Admin — Dashboard & Logs (9 tests) — ⚠️ Cần role admin
| # | Request | Method | Endpoint | Mô tả |
|---|---------|--------|----------|--------|
| 8.1 | Dashboard Summary | GET | `/api/admin/summary` | Thống kê tổng quan |
| 8.2 | Audit Logs | GET | `/api/admin/logs` | Tất cả admin logs |
| 8.3 | Logs filter action | GET | `/api/admin/logs?action=create` | Lọc theo action |
| 8.4 | Logs date range | GET | `/api/admin/logs?dateFrom=...` | Lọc theo ngày |
| 8.5 | Genres | GET | `/api/admin/genres` | Danh sách thể loại |
| 8.6 | Countries | GET | `/api/admin/countries` | Danh sách quốc gia |
| 8.7 | Reviews | GET | `/api/admin/reviews` | Danh sách đánh giá |
| 8.8 | News | GET | `/api/admin/news` | Danh sách tin tức |
| 8.9 | Shorts | GET | `/api/admin/shorts` | Danh sách short video |

---

## 🔧 Thứ tự test khuyến nghị

```
1. Register (1.1) → tạo tài khoản test
2. Login User (1.2) → lấy cookie session
3. Movie List (2.1) → lấy movieSlug, movieId
4. Movie Detail (2.5) → test chi tiết phim
5. Search (3.1, 3.4) → test tìm kiếm
6. Save Progress (4.1) → test lưu tiến trình
7. Watch History (4.4, 4.5) → test lịch sử
8. Logout (1.5) → đăng xuất

9. Login Admin (1.3) → chuyển sang test admin
10. Admin Movies (5.1 → 5.6) → CRUD phim
11. Admin Users (6.1 → 6.9) → quản lý user
12. Sync Pipeline (7.1 → 7.5) → đồng bộ dữ liệu
13. Dashboard & Logs (8.1 → 8.9) → thống kê + logs
```

## 📝 Auto-test Scripts

Các request quan trọng đã có sẵn **Test Scripts** tự động:
- ✅ Check status code (200, 400, 401, 404)
- ✅ Validate response structure
- ✅ Tự động lưu `movieId`, `movieSlug`, `userId` vào variables

---

**Tổng cộng: 54 API requests** covering toàn bộ backend TERENCE.
