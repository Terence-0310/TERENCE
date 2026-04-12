# 🛡️ Chi Tiết Matrix Phân Quyền (RBAC Permission Matrix)

Dự án TERENCE áp dụng cấu trúc Role mặc định theo Policy của Doanh nghiệp. Bảng matrix dưới đây liệt kê chính xác cấu hình `Role <-> Permission` ở trạng thái nguyên thủy nhất trước khi bất kỳ User nào được Custom bằng DB (`userPermissions`).

> **Lưu ý:** `SUPER_ADMIN` có quyền truy cập **toàn bộ** quyền (All Permissions) và được Hardcode Bypass ở nhiều tầng Guard để miễn nhiễm với việc bị lock hoặc revoke nhầm.

## 1. Hệ thống Quyền (Permissions Pool)
| Nhóm (Module) | Permission Key | Mô tả |
|---|---|---|
| **Dashboard** | `dashboard.view` | Quyền xem trang tổng quan Admin nội bộ |
| **Movie** | `movie.read` | Quyền đọc danh sách và chi tiết Movies |
| **Movie** | `movie.create` | Quyền tạo Movie mới |
| **Movie** | `movie.update` | Quyền chính sửa Metadata nội dung phim |
| **Movie** | `movie.delete` | Quyền xoá vĩnh viễn hoặc đưa phim vào thùng rác |
| **Movie** | `movie.publish` | Quyền đổi status phim (Publish/Hide/Archive/Feature) |
| **Episode** | `episode.read` | Quyền xem tập phim |
| **Episode** | `episode.create` | Quyền tạo tập phim hoặc Sync từ Nguồn |
| **Episode** | `episode.update` | Quyền sửa link tập phim/Subtitle |
| **Episode** | `episode.delete` | Quyền xoá tập phim |
| **Review** | `review.read` | Quyền đọc đánh giá cộng đồng |
| **Review** | `review.moderate` | Quyền duyệt đánh giá hoặc xoá đánh giá vi phạm (Admin) |
| **User** | `user.read` | Quyền xem danh sách user và thông tin chi tiết |
| **User** | `user.update` | Quyền sửa thông tin cơ bản của User (Admin) |
| **User** | `user.block` | Quyền khoá/mở khoá User vi phạm |
| **User** | `user.role.update` | Quyền cấp bậc: thay đổi phân quyền User khác |
| **System** | `payment.read` | Quyền xem lịch sử Nạp TCoin/Order |
| **System** | `payment.update` | Quyền duyệt/từ chối giao dịch TCoin |
| **System** | `adminlog.read` | Quyền xem lịch sử Audit Tracking nội bộ |
| **System** | `settings.read` | Quyền xem cấu hình hệ thống |
| **System** | `settings.update` | Quyền lưu và khởi động lại System Variables |

## 2. Policy Matrix

| Tính năng | ADMIN | STAFF | EDITOR | USER |
|---|:---:|:---:|:---:|:---:|
| `dashboard.view` | ✅ | ✅ | ✅ | ❌ |
| `movie.read` | ✅ | ✅ | ✅ | ❌ (Chỉ xem giao diện User) |
| `movie.create` | ✅ | ✅ | ❌ | ❌ |
| `movie.update` | ✅ | ✅ | ✅ | ❌ |
| `movie.delete` | ❌ | ❌ | ❌ | ❌ |
| `movie.publish` | ✅ | ❌ | ❌ | ❌ |
| `episode.read` | ✅ | ✅ | ✅ | ❌ (Client side ok) |
| `episode.create`| ✅ | ✅ | ❌ | ❌ |
| `episode.update`| ✅ | ✅ | ✅ | ❌ |
| `episode.delete`| ✅ | ❌ | ❌ | ❌ |
| `review.read` | ✅ | ✅ | ✅ | ✅ (Own/Public) |
| `review.moderate`| ✅ | ❌ | ❌ | ❌ |
| `user.read` | ✅ | ❌ | ❌ | ❌ |
| `user.update` | ✅ | ❌ | ❌ | ❌ |
| `user.block` | ✅ | ❌ | ❌ | ❌ |
| `user.role.update`| ✅ | ❌ | ❌ | ❌ |
| `payment.read` | ✅ | ❌ | ❌ | ❌ |
| `payment.update`| ✅ | ❌ | ❌ | ❌ |
| `adminlog.read` | ✅ | ❌ | ❌ | ❌ |
| `settings.read` | ✅ | ❌ | ❌ | ❌ |
| `settings.update`| ❌ | ❌ | ❌ | ❌ |

*(Các ngoại lệ như ADMIN không thể xoá movie là policy an toàn từ CTO để tránh các lệnh Mass-Delete vô ý)*
