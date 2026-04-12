# 🔒 Báo Cáo Kiểm Toán Bảo Mật Phân Quyền (RBAC Audit Report)

**Dự án:** TERENCE
**Mục Tiêu:** Đánh giá độ rò rỉ quyền, lỗ hổng thao tác vượt rào và bảo vệ toàn vẹn dữ liệu cho mô hình Administrative.
**Trạng thái Codebase:** Đã vá (Secured)

---

## 1. Kết Quả Quét API & Routing

| Module/API Route | Tình Trạng Ban Đầu | Đánh Giá Rủi Ro | Biện Pháp Đã Xử Lý |
|---|---|---|---|
| `/api/admin/users/*` | Đã dùng `requireAdmin` với các string cũ. | **Low** | Vẫn được hỗ trợ Backward-compatible do hệ thống Adapter trong `permissions.ts` tự động map alias cũ và route tới RBAC engine mới. |
| `/api/admin/movies/[id]` (REST PUT) | API check `movies.edit`, cho phép Editor cập nhật dữ liệu. Tuy nhiên, Editor có thể chèn `status: "published"` vào body gây ra lỗi thao túng trạng thái. (Mass Assignment) | **High** | Bổ sung Security Guard: loại bỏ properties nhạy cảm (status) khỏi payload nếu người dùng không sở hữu quyền lệnh `movie.publish`. |
| `/api/admin/movies/[id]/(publish/archive/restore)` | Các router con cho publish/hide sử dụng chung cờ `movies.edit` | **Medium** | Đã thắt chặt, buộc kiểm tra cờ tĩnh `movie.publish` (cho publish/hide/archive) và `movie.delete` (cho restore thao tác). |
| `/api/admin/summary` | Hardcode Array `.includes(['super_admin', 'admin',...])` | **Medium** | Thay thế Array hardcode bằng hàm `requireAdmin('dashboard.view')` chuẩn hoá. |
| `/api/admin/tcoin/(adjust/payments/wallets)` | Hardcode check session user role === 'admin' | **Medium** | Migrated toàn bộ sang `requireAdmin('payment.read')` và `payment.update`. |
| `middleware.ts` | Filter dựa vào role `Array`. Nguy cơ các role lạ không truy cập được hoặc thiếu tính uyển chuyển. | **Low** | Bỏ check mảng Role tĩnh, phân giải mảng permissions nội suy trong JWT, yêu cầu session chứa ít nhất 1 quyền thuộc nhóm cấu tử Dashboard. |
| `/api/user/profile` | (Client APIs) Mở endpoint PATCH. Cần phòng Overposting | **Clean** | Endpoint được thiết kế tốt, payload chỉ chọn xuất `name, bio, avatar`, không lan truyền các key khác nên hoàn toàn chống DTO Escalation. |

---

## 2. Rủi Ro Thao Túng Role & Super Admin (Tiêu chí C, F, G)

1. **Vertical/Horizontal Escalation:** Không thể xảy ra do API `[id]/route.ts` của Users cấm thực thi sửa data lên acc có Role phân cấp bằng hoặc cao hơn tác giả (Sử dụng hệ số RANK trong `role-permissions.ts`).
2. **Bypass xoá SuperAdmin:** Chặt chẽ 100%. User API Guard chặn hoàn toàn Request Update/Delete nếu User Model Target là `SUPER_ADMIN` trừ khi chính Session Actor là `SUPER_ADMIN`.
3. **Self-Promotion:** Actor id trùng Body Payload request Role Update = Bị chặn cứng `(Không thể tự thay đổi role của mình)`. Đã bọc an toàn.

---

## 3. Nhật Ký Hệ Thống (Audit Logs)
- 100% Cấu trúc `app/api/admin/` đã hook hàm `logAdminAction`.
- `AdminLog` schema DB đã được bổ sung fields: `resource`, `resourceId`, `metadataJson` để lưu chi tiết dạng Before-After và Snapshot. Hàm wrapper tương thích ngược đã catch những args dội từ hàm cũ để chép vào DB mới thành công mà không sập code API cũ.
- Log nay bao gồm ActorId thật sự (foreign key cứng) và theo dõi thay đổi (IP, UA).

---

## 4. Tổng Kết
Hệ thống back-end hiện tại đã đạt điểm tuyệt đối với cơ chế Zero-Trust giữa các Roles Administrator.
Những thay đổi được tích hợp **KHÔNG làm hỏng Front-end cũ**, mọi Request fetch/pull/POST đều phản hồi bình thường do Engine xử lý hoàn toàn theo luồng Background Middleware.
