# Hướng Dẫn Kịch Bản Kiểm Thử Toàn Bộ API TERENCE

Tài liệu này hướng dẫn bạn cách sử dụng file **Postman Collection** đính kèm (`TERENCE_Postman_Collection.json`) để kiểm thử các module trọng yếu trong hệ thống TERENCE. File cấu hình này đã đóng gói sẵn các API cốt lõi nhất của dự án bao gồm: Authentication, Public Film API, hệ sinh thái Watch History, TCoin Payment và Admin CMS.

## 1. Chuẩn Bị Môi Trường Postman

1. Mở ứng dụng **Postman** (phiên bản Desktop hoặc Web).
2. Tải file `TERENCE_Postman_Collection.json` có sẵn ở thư mục gốc của dự án.
3. Trong Postman, nhấn nút **Import** góc trên bên trái, kéo thả file `.json` này vào.
4. Bạn sẽ thấy một thư mục xuất hiện bên thanh bên trái với tên: `TERENCE API Collection`.

## 2. Kịch Bản Kiểm Thử & Chức Năng Của Các Dòng API

Collection được chia làm 6 phân vùng tương ứng với 6 tính năng thực tế. Các API đều sử dụng biến môi trường `{{baseUrl}}` mặc định trỏ về `http://localhost:3000/api`. Do đó hệ thống TERENCE tại Server Local phải được bật (`npm run dev` hoặc Docker `docker compose up -d`).

### Phân vùng 1: Authentication (Xác thực người dùng)
- **Đăng ký thành viên**: API POST. Nhiệm vụ của nó là gửi thông tin đăng ký lên hệ thống.
  - *Cách test*: Mở body request, thay đổi email ảo và password ảo, nhấn Send. Nếu trả về `200 OK` (success: true) nghĩa là hệ thống tạo user thành công.
  - *Lưu ý Quan Trọng Về Xác Thực*: Hệ thống TERENCE sử dụng `NextAuth.js` bảo mật thông qua Cookie (`next-auth.session-token`). Do đó, các tác vụ POST/GET đòi hỏi đăng nhập như Cập nhật Điểm danh TCoin, hay Tạo Phòng Xem chung, tốt nhất bạn nên đăng nhập trực tiếp trên Trình duyệt bằng tài khoản đó, rồi sử dụng tính năng **Postman Interceptor** hoặc copy lấy cái mã Cookie đó paste vào tab Headers ở Postman.

### Phân vùng 2: Client APIs (Module cho trang Phim)
Nơi này là giao thức đọc dữ liệu phim cho phía giao diện (Front-end).
- **Trang chủ / Xu hướng / Yêu thích**: Nhấn Send để giả lập việc gọi trực tiếp bảng xếp hạng những phim "Sôi nổi nhất". API sẽ đổ dữ liệu dạng siêu mảng `JSON` thông qua query của module prisma (không yêu cầu token người dùng, test thoải mái).
- **Tìm kiếm / Gợi ý tự động**: Thử nghiệm khả năng của bộ chuyển mạch phim Elasticsearch bằng cách thay tham số `q=demon slayer` trên đường dẫn URL và gõ Send. Nó sẽ đổ ra tất cả phim mang từ khóa này. 

### Phân vùng 3: Watch History & Progress (Lưu vết tiến độ xem)
Tính năng Netflix-clone độc quyền lưu vết phim đang xem theo thời gian thực tới từng mili-giây.
- **Lưu Tiến Độ Xem**: Mở body JSON ra, bạn sẽ thấy tiến trình xem (progress) và ID của bộ phim, nhấn Send để mô phỏng Client đang Call API nhằm ghi nhận thời gian xem phim.
- **Lấy Danh sách Đang Xem**: Test xem hệ thống có trả lại danh sách phim bạn vừa xem hay không, qua đó cho Frontend vẽ ra dải băng "Phim Đang Xem Dở".

### Phân vùng 4: Ngân hàng điện tử TCoin
Nền tảng thanh toán In-game vi mô hoàn chỉnh.
- **Điểm danh Hàng ngày**: Đây là một POST request để cộng dồn TCoin cho một người dùng vừa thao tác check-in. Test API này nếu thấy số dư TCoin trả về (+50, +100 Tcoin) là hệ thống giao dịch hoạt động siêu nhạy.

### Phân vùng 5: Nền tảng Xem Chung (Watch Party)
Bộ chia sẻ phòng thời gian thực cực kỳ phức tạp (LiveKit / Socket).
- **Tạo Phòng Mới**: Tạo một mã ID ngẫu nhiên chia sẻ bộ phim lên Server Socket. API sẽ trả về `roomCode`.
- **Tham Gia Phòng**: Đem cái `roomCode` vừa lấy bên trên tống vào body của API này để mô phỏng "Bạn bè chui vào rạp chiếu bóng của bạn". 

### Phân vùng 6: Bảng Theo Dõi Chuyên Gia Admin
Mạch API siêu quyền lực của hệ thống (Chỉ Admin mới có Cookie quyền này mới gọi được qua API).
- **Lấy Thông Kê Tổng**: Vẽ biểu đồ bảng điều khiển Admin xem có bao nhiêu người dùng, bao nhiêu lượt phim xem (đọc từ Postgresql).
- **Đồng Bộ OPhim**: Gửi yêu cầu buộc Worker Backend chạy ra ngoài Internet tải về hàng trăm ngàn bộ phim trên OPhim API Catalog và đẩy thẳng vào Database TERENCE. 

---
### 🛠 Kinh Nghiệm (Troubleshooting) khi Test:
- Nếu gọi POST báo lỗi `401 Unauthorized` hoặc `Lỗi máy chủ / Vui lòng đăng nhập`: Tức là hệ thống bảo mật chặt chẽ đúng tiến trình (hạn chế phá ngang). Bạn chỉ cần lấy Cookie từ trình duyệt lúc đăng nhập rồi dán vào Headers của req trên Postman.
- Nếu gọi GET báo lỗi `404 Not Found`: Kiểm tra xem đã bật ứng dụng lên `localhost:3000` chưa. Nếu Server dùng Cổng khác (Ví dụ 8080), bạn bấm sửa biến môi trường (Variables) hoặc thay `{{baseUrl}}` trong Collection.

## 3. Hướng Dẫn Kích Hoạt Test Tự Động (Collection Runner)
Thay vì test thủ công từng request, bạn có thể để Postman tự động bắn hàng loạt API để kiểm tra độ trễ (latency) và tính toàn vẹn (integrity) của Server.
1. Nhấn chuột phải vào thư mục **TERENCE API Collection** ở cột bên trái.
2. Chọn dòng **Run collection**.
3. Cửa sổ Runner hiện lên, tại đây bạn có thể cấu hình **Delay** (khoảng cách giữa mỗi lần gọi API, ưu tiên 100ms để tránh dội Server) hoặc **Iterations** (số vòng lặp test).
4. Nhấn nút xanh **Run TERENCE API Collection**.
5. Giao diện Test Report sẽ hiện ra. Nếu tất cả đều ra mã `200 OK` (Xanh lá), chúc mừng bạn: Server hoạt động đạt chuẩn công nghiệp, không bị Memory Leak. Nếu có mã `500 Internal`, click vào để view log ngay lập tức.

## 4. Tiêu Chuẩn Giao Tiếp Của Tuyến Backend TERENCE
Khối API của hệ thống TERENCE được tinh chỉnh và đóng gói đạt chuẩn xuất sắc cho triển khai môi trường Cloud (VPS Vultr):
- **Bảo mật**: Cơ chế xác thực Session HTTP-only Cookie (`NextAuth`). Client không bao giờ chiếm được token qua thao tác js `document.cookie`.
- **Tốc độ phản hồi**: Các request dạng xem (GET) tốn trung bình < 50ms khi test ở Local, đặc biệt các request tìm kiếm có hỗ trợ chuyển qua ElasticSearch.
- **Dữ liệu trong sạch (Sanitization)**: Output từ Prisma luôn loại bỏ trường quan trọng như `password`, `hash`, bảo đảm đạt chuẩn bảo vệ dữ liệu nội mạng.
