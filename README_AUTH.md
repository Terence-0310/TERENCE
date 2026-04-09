# Auth & Security Documentation (NextAuth + Prisma)

## 1. Tổng quan kiến trúc auth
TERENCE sử dụng **Auth.js** (thông dụng với tên gọi NextAuth.js) kết hợp với **Prisma Adapter** để xử lý quản lý đăng nhập thông qua nhiều kênh (Providers) một cách đồng bộ nhất:
- **CredentialsProvider**: Dành cho đăng nhập và đăng ký qua Email/Password thông thường, dùng `bcryptjs` để hash mật khẩu.
- **GoogleProvider**: Cho phép người đăng nhập vào Google.

Mô hình lưu trữ dựa trên JSON Web Tokens (JWT) vì vậy không phụ thuộc cơ sở dữ liệu để tra soát từng Request. Adapter Prisma tạo liên kết (link) các `Account` vào `User` giúp trải nghiệm "như web thật".

## 2. Flow Login Credentials
- Người dùng thực hiện đăng nhập tại `/login`.
- Gửi lên API `/api/auth/callback/credentials` được xử lí bởi hàm `authorize` trong `lib/auth.ts`.
- Tìm User -> Kiểm tra mật khẩu (hash bcrypt) -> Nếu khớp thì cấp JWT Token -> Trả Session.
- Nếu tài khoản bị block (`isActive: false`), NextAuth sẽ throw exception và từ chối cấp Session.

## 3. Flow Login Google
- Người dùng click "Tiếp tục với Google" trên `/login`.
- Mở link của Google, chọn tài khoản.
- Callback trở lại API: `api/auth/callback/google`.
- Prisma Config tự động:
  - Kiểm tra nếu `email` đã tồn tại -> Liên kết `account` vào thay vì tạo user mới (hạn chế duplicate).
  - Nếu `email` chưa tồn tại -> Tạo user mới với dữ liệu profile có tên, hình đại diện và lập tức cung cấp Session đã đăng nhập.
  - Quá trình đăng nhập Google sẽ gán user mặc định cờ `isEmailVerified: true` và `isActive: true`.

## 4. Flow Forgot & Reset Password
- Quên mật khẩu: Nhập email tại `/forgot-password`, server gọi API `/api/auth/forgot-password`, tìm database và sinh ngẫu nhiên Token rồi gửi SMTP Mail bằng thư viện `nodemailer`.
- Khôi phục: Nhập mật khẩu mới tại `/reset-password?token=XXX`, xử lí tại `/api/auth/reset-password`, kiểm tra hết hạn, đổi `passwordHash` vào token, hủy các phiên giao dịch.

## 5. Env Cần Cấu Hình
Để chạy môi trường Auth hoàn chỉnh:
```dotenv
DATABASE_URL="postgresql://.../terence"

NEXTAUTH_SECRET="YOUR_RANDOM_SECRET" # bắt buộc, sinh bằng "openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"

GOOGLE_CLIENT_ID="947278186685-hfa8rvju91abn79vdeebsudfremes83q.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="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"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_USER="ntai9712@gmail.com"
SMTP_PASS="byrs nukh lgsp avhy"
EMAIL_FROM_NAME="TERENCE"
EMAIL_FROM_ADDRESS="ntai9712@gmail.com"
```

## 6. Cách cấu hình Google Cloud OAuth
- Truy cập [Google Cloud Console](https://console.cloud.google.com/).
- Tạo dự án mới, vào mục `APIs & Services > Credentials`.
- Bấm "Create Credentials" -> "OAuth Client ID".
- Loại ứng dụng: **Web application**.

## 7. Callback URLs Cần Thêm (Cực kỳ quan trọng)
* Authorized JavaScript origins:
  - `http://localhost:3000`
  - `https://terence.com.vn`

* Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://terence.com.vn/api/auth/callback/google`

## 8. Cấu hình Gmail App Password
Do Google bật 2FA, để dùng nodemailer cấu hình SMTP (`SMTP_PASS`), bạn không dùng password thật:
1. Đăng nhập Google Account (`ntai9712@gmail.com`).
2. Vào Security -> 2-Step Verification.
3. Kéo xuống cuối phần "App passwords" -> Tạo app tên "terence-mailer".
4. Copy đoạn mã 16 chữ số và dán vào `SMTP_PASS` trong thư mục `.env` của bạn. (Trong ví dụ này là `byrs nukh lgsp avhy`).

## 9. Cập Nhật Prisma Migration
Vì chúng ta đã sửa Database Schema thêm bảng `Account`, `VerificationToken` và biến `passwordHash` thành nullable, cần áp dụng vào database:
```bash
npx prisma format
npx prisma generate
npx prisma migrate dev --name init_auth_google
```

## 10. Start Local server
- `npm install`
- Chạy hệ thống local: `npm run dev`

## 11. Cách Test Google Login
1. Chắc chắn bạn đã add User vào "Testing Accounts" trong OAuth Consent Screen của Google Cloud (nếu project đang ở chế độ Testing/Chưa Publish).
2. Xóa sạch session hoặc sử dụng Ẩn Danh.
3. Vào `http://localhost:3000/login` -> "Tiếp tục với Google".
4. Xác nhận đăng nhập. Bạn sẽ được điều hướng vào web ngay lập tức (không form thêm mới).

## 12. Ý tưởng Test Forgot Password
1. Truy cập `/forgot-password`, nhập email.
2. Kiểm tra log hiển thị gửi thành công hoặc kiểm tra inbox Gmail của bạn.
3. Click URL gắn token trong Email (`http://localhost:3000/reset-password?token=XYZ...`)
4. Trải nghiệm thay đổi bằng mật khẩu `12345678`, sau đó logout khỏi trang web.
5. Kiểm nghiệm kết thúc quy trình qua `/login` bằng tay nhập lại mật khẩu mới vừa đổi.
