# Báo cáo Kiểm thử tự động (Unit / Integration Tests) - Dự án TERENCE

**Công cụ kiểm thử (Test Runner):** Vitest + Supertest/Mocks
**Môi trường:** Node.js (v20) & Next.js App Router
**Trạng thái Pipeline:** Hoàn thành

---

## 1. Tóm tắt kết quả (Summary)
**Kết quả chung:** **PASS (Thành công 100%)**
- **Tổng số file kiểm thử (Test Suites):** `18 pass`
- **Tổng số luồng kiểm thử (Test Cases):** `246 pass`
- **Thời gian chạy trung bình:** `~ 2.30s`
- **Tình trạng:** Không ghi nhận lỗi/Crashed/Skipped trong các luồng chính.

---

## 2. Chi tiết các luồng đã được kiểm thử (Test Coverage)

### 2.1 Luồng Xác thực (Authentication): `tests/unit/auth.test.ts` & `tests/integration/auth-api.test.ts`
Toàn bộ API và Helper liên quan đến đăng nhập/đăng ký đã được Verify:
- **`POST /api/auth/login`**:
  - `Trạng thái 400`: Khi Client không cung cấp rỗng các trường email hoặc mật khẩu.
  - `Trạng thái 401`: Bảo mật và chặn ngay lập tức tài khoản ma hoặc nhầm mật khẩu.
  - `Trạng thái 403`: Không cho Auth token nếu tài khoản đã bị Vô hiệu hóa (Inactive).
  - `Trạng thái 200`: Verify mật khẩu (Bcrypt hashing works!) hợp lệ và tạo session.
- **`POST /api/auth/signup`**:
  - Chống đăng ký lặp: Trả ngay mã `409 Conflict` nếu email đã bị chiếm đoạt. Tự động Regex để Trim+Lowercase ngăn khoảng trắng mã độc.
  - Từ chối tự động (`400`) nếu mật khẩu chuỗi nhập ngắn hơn 8 ký tự.
  - Trả về payload JWT Token & User profile cho user vừa mới đăng kí khởi tạo `200`.

### 2.2 Luồng API Danh sách Phim (Catalog): `tests/integration/movie-api.test.ts` (Mới tạo)
Kiểm thử chuyên cho Endpoint cấp phát Metadata trang `browse` / `movies`:
- **`GET /api/v1/movies`**:
  - **Dọn dẹp Request Queries (Sanitization):** Nếu app User vô tình nện `?page=-5` hoặc `?perPage=1000` -> API tự động ép kiểu giới hạn (min 1 page, max 100 max) (đã test PASS!).
  - Trả về `200` với Pagination tiêu chuẩn khi vào page không có params. Phân trang hoàn chỉnh với Object { page, totalPages, total }.
  - Chuyển phát Query Filters `year=2024&category=hanh-dong` xuống Service Prisam mapping an toàn.
  - Lắng nghe kịch bản sập Database: API tự Return `500 Json Response` để Catch Error (Không xì khói lộ StackTrace cấu trúc máy chủ ra frontend mảng).

### 2.3 Luồng bổ trợ (Security, Session & Rate Limit)
Các cơ chế Core liên quan đến "Bảo mật & Hiệu suất" đều vượt qua Testing:
- **Rate Limit (`rate-limit.test.ts`)**: Hàm bộ nhớ Map Sliding-Window đã chạy tốt. Trả về đúng `status 429` ngăn khi IP spam lố 5/1min hoặc 60/1min.
- **Phân quyền Backend (`auth.test.ts`)**: Hàm `hasPermission()` pass 100% qua những check case gắt gao giữa Role SuperAdmin <-> Staff <-> Cấm tiệt User thường. 
- **Session Parsing (`session.test.ts`)**: Hàm get Header / Cookie không gặp lỗi kể cả khi String Cookie có chứa kí tự trắng hay UUID phức tạp.

---

## 3. Khuyến nghị Kỹ thuật
Bên cạnh kết quả Pass tuyệt đối cho API Unit Tests và API Integration Mocking, dự kiến các bước tiếp theo dành cho đội phát triển:
- **Tích hợp Github Actions:** Đưa lệnh `npm run test` nằm tự động bên trong block CI trước khi Merge.
- **Test Streaming E2E:** Tương lai cần kiểm thử End-to-end các luồng kéo Video Slice M3u8 Player trên trình duyệt ảo (Playwright).
