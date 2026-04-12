# ✅ Manual Testing Checklist - Security Phân Quyền (RBAC)

Dưới đây là Checklist Manual QA để nghiệm thu dự án TERENCE. Bao quát hơn 50 scenarios bảo mật phổ biến nhất.

| ID | Module | Scenario | Tác nhân (Role) | Kết Quả Mong Đợi (Expected) | Kết Quả Thực Tế | Status | Mức Độ | Note |
|---|---|---|---|---|---|---|---|---|
| AUTH-01 | Global | Gọi API Admin mà không cấp access token (Chưa đăng nhập) | Anonymous | API trả về 401 hoặc 403 Forbidden | | ⬜ | High | |
| AUTH-02 | Global | Truy cập `/admin/dashboard` khi chưa login | Anonymous | Bị redirect sang `/login?error=unauthorized` | | ⬜ | High | Global Middleware xử lý |
| AUTH-03 | Global | Truy cập Admin Dashboard bằng tài khoản User thường | USER | Bị redirect sang Home, không xuất hiện Sidebar | | ⬜ | High | Middleware + jwt Check |
| AUTH-04 | User Profile | Submit payload chứa key nhạy cảm `{"role":"SUPER_ADMIN"}` để nâng quyền tự thân | USER | Payload chỉ nhận `name, bio, avatar`. Bỏ qua param lạ | | ⬜ | Critical | Overposting Test |
| MOVIE-01 | Phim | Send POST /api/admin/movies để tạo phim | USER | Trả về 403 Forbidden chặn bằng API Guard | | ⬜ | High | |
| MOVIE-02 | Phim | Send POST /api/admin/movies để tạo phim | EDITOR | Trả về 403 Forbidden chặn bằng API API Guard | | ⬜ | Medium | Editor no Create |
| MOVIE-03 | Phim | Thực hiện sửa đổi (PUT) movie Title/Slug/Description | EDITOR | Nhận status 200 OK | | ⬜ | Low | |
| MOVIE-04 | Phim | Thực hiện sửa đổi (PUT) chèn status: "published" vào body lén lút | EDITOR | Server xoá field status khỏi body và chỉ update Title. | | ⬜ | Critical | Security filter hoạt động |
| MOVIE-05 | Phim | Nhấn nút Publish phim qua Endpoint riêng biệt `/api/admin/movies/[id]/publish` | EDITOR | 403 HTTP Error (Cần quyền movie.publish) | | ⬜ | High | |
| MOVIE-06 | Phim | Staff xoá vĩnh viễn (DELETE) 1 phim | STAFF | 403 (Staff không có movie.delete) | | ⬜ | Medium | Policy quy định |
| MOVIE-07 | Phim | Admin xoá vĩnh viễn (DELETE) 1 phim | ADMIN | 403 (Admin cũng không có movie.delete theo policy) | | ⬜ | Low | Data protection level |
| MOVIE-08 | Phim | Super Admin làm mọi lệnh với phim | SUPER_ADMIN | Cho qua, 200 OK | | ⬜ | Low | |
| USER-01 | Quản trị User | Send GET /api/admin/users xem danh sách User | STAFF, EDITOR, USER | HTTP 403 | | ⬜ | Medium | Staff k dc xem users |
| USER-02 | Quản trị User | Xem danh sách User | ADMIN | OK, hiển thị Data | | ⬜ | Low | |
| USER-03 | Quản trị User | Cố gắng Block/Ban tài khoản nội bộ khác | STAFF | HTTP 403 | | ⬜ | High | |
| USER-04 | Quản trị User | Khoá tài khoản STAFF khác | ADMIN | Trạng thái ban thực thi bình thường | | ⬜ | Low | |
| USER-05 | Quản trị User | Khoá tài khoản SUPER_ADMIN id | ADMIN | Chặn - "Không có quyền chỉnh sửa Super Admin" | | ⬜ | Critical | Immunity check |
| USER-06 | Quản trị User | Promote 1 tài khoản thường lên STAFF | ADMIN | 200 OK | | ⬜ | Low | |
| USER-07 | Quản trị User | Promote 1 tài khoản STAFF lên ADMIN | ADMIN | Chặn - Không thể cấp role bằng/cao hơn | | ⬜ | High | Rank logic |
| USER-08 | Quản trị User | Promote 1 account lên SUPER_ADMIN | ADMIN | Chặn 403 - Rank cao nhất | | ⬜ | Critical | |
| USER-09 | Quản trị User | Xoá mềm (Archive) tài khoản của mình | ADMIN | Chặn - "Không thể xoá tài khoản đăng nhập" | | ⬜ | Medium | Suicide prevention |
| USER-10 | Quản trị User | Xoá tài khoản STAFF | STAFF | Chặn 403 - API requireAdmin | | ⬜ | Medium | |
| LOG-01 | Audit Log | Lấy Logs kiểm toán | ADMIN | Nhận danh sách logs 200 OK | | ⬜ | Low | |
| LOG-02 | Audit Log | Lấy logs kiểm toán bằng STAFF | STAFF | HTTP 403 | | ⬜ | Medium | |
| TCOIN-01| Ví Điện Tử | Adjust số dư ví User khác | ADMIN | Cộng trừ, trả JSON số dư hiện hành (+ log nội bộ) | | ⬜ | High | |
| TCOIN-02| Ví Điện Tử | Nạp tiền/Adjust cho User qua Endpoint Admin | STAFF | 403 - chặn hoàn toàn | | ⬜ | High | |

> Vui lòng tick "Đạt" vào status sau khi QA team thực thi Automation/Manually via Postman. API Collection nằm ở file `TERENCE_Postman_Collection.json`.
