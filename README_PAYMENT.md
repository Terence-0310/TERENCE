# Hệ Thống Nạp TCoin: VietQR + SePay
Tài liệu hướng dẫn hệ thống nạp TCoin tự động (production-ready) bằng mã QR động và webhook SePay.

## 1. Kiến trúc VietQR + SePay

- **VietQR**: Dùng để render **Ảnh QR tự động** (thông qua API `img.vietqr.io`). Mã QR sẽ được gán kèm tự động **Số Tiền** + **Nội Dung Chuyển Khoản** theo từng đơn hàng.
- **SePay**: Dịch vụ đóng vai trò nhận biến động số dư ngân hàng và gửi **Webhook** về hệ thống TERENCE. Webhook này chứa nội dung giao dịch, giúp TERENCE tự động gạch nợ (mark as paid) và cộng TCoin cho user.
- **Frontend / Client**: Chỉ gọi lệnh tạo Order, sau đó tự động poll (truy vấn) trạng thái đến Backend mỗi 5s. Tuyệt đối KHÔNG có nút "Tôi đã thanh toán" để chống bypass. Mọi quá trình cộng xu đều do webhook chạy ngầm ở Backend quyết định.

## 2. Flow tạo Order

1. User vào `/tcoin`, nhấn nút mua một gói TCoin.
2. Frontend gọi POST `/api/tcoin/topup/create-bank-order` chứa `packageId`.
3. Backend:
   - Truy xuất thông tin `TCoinPackage`.
   - Sinh `orderCode` ngẫu nhiên (VD: `A3B8K12`).
   - Thiết lập `transferContent` theo định dạng (VD: `TCOIN_A3B8K12`).
   - Tạo mới `TopupOrder` (trạng thái `PENDING`), thời hạn sống 15 phút.
   - Gọi hàm builder của thư viện VietQR để ghép chuỗi url dạng: `https://img.vietqr.io/image/<bank>-<acc>-<template>.png?amount=...&addInfo=...`
   - Trả order data kèm `qrImageUrl` về cho frontend.
4. Frontend sẽ mở Modal và nhúng thẻ `<img>` src là `qrImageUrl`.

## 3. Flow Webhook xác nhận (SePay)

1. Khi người dùng dùng App Ngân Hàng quét ảnh mã QR, ứng dụng tự điền sẵn số tiền và nội dung chuyển khoản.
2. Người dùng nhấn chuyển tiền, tiền bay vào tài khoản thật.
3. SePay phát hiện thay đổi số dư, gửi HTTP POST Webhook chứa payload JSON (`transferType` = "in", `transferAmount`, `content`).
4. Endpoint `POST /api/payments/sepay/webhook` tại Backend bắt Webhook:
   - Verify chữ ký `signature` (so sánh với `SEPAY_WEBHOOK_SECRET`).
   - Lưu Log vào bảng `BankWebhookLog` (để dùng đối soát).
   - Truy vấn toàn bộ Order đang `PENDING`.
   - Đối chiếu **nội dung ngân hàng nhận được** xem có chứa **transferContent** của order không.
   - Nếu có chứa, và **khớp chính xác số tiền** (`transferAmount` == `order.amountVnd`), tiến hành xử lý thanh toán.
   - Chuyển `TopupOrder` sang `PAID`, cập nhật `matchedBankTxnId` để chống trùng lặp lặp (idempotent).
   - Gọi `WalletService` để cộng Coin qua Prisma `$transaction`. Tạo thêm 1 record `WalletTransaction`.
5. Frontend poll `/api/tcoin/orders/[id]`, nhận thấy `status === 'PAID'` thì hiện Toast thành công và load lại số dư!

## 4. Cách hoạt động Ảnh QR Chính thức

Mã QR thay vì tĩnh sẽ được tạo sống (dynamic) theo params qua thư viện `/src/lib/payments/vietqr.ts`.
Do đó, mã QR hoàn toàn đảm bảo:
- Đúng ngân hàng VietinBank.
- Đúng tài khoản và Tên của Admin.
- Đúng chính xác số tiền theo VNĐ của gói (tránh người dùng tự sửa amount).
- Đúng mã Order để Backend map được lệnh nạp.

Frontend KHÔNG BAO GIỜ dùng `curl` ở trình duyệt. Mọi thứ là request tạo order gọi từ Server Next.js. `qrImageUrl` trả ra là một link PNG thuần túy có thể dùng thẳng ở `<img>`.

## 5. Môi trường cần thiết (.env)

Vui lòng copy đoạn sau vào file `.env` của hệ thống:

```env
# ----- VIETQR CONFIG -----
VIETQR_BANK_ID=970415
VIETQR_ACCOUNT_NO=100600272094
VIETQR_ACCOUNT_NAME=NGUYEN DUC ANH TAI
VIETQR_TEMPLATE=compact2

# ----- SEPAY CONFIG -----
SEPAY_API_KEY=YOUR_SEPAY_API_KEY
SEPAY_WEBHOOK_SECRET=YOUR_SEPAY_WEBHOOK_SECRET
```

## 6. Cách cấu hình SePay webhook
1. Đăng nhập trang quản trị SePay.
2. Tại mục Webhook, điền URL Webhook của dự án khi deploy thật (VD: `https://terence.app/api/payments/sepay/webhook`).
3. Điền chuỗi mật khẩu Secret tại SePay tương ứng với giá trị lưu trong biến `SEPAY_WEBHOOK_SECRET`. SePay sẽ đính kèm chuỗi này ở thẻ Header `Authorization`.

## 7. Cách Test Local
- **Postman/ThunderClient**: 
  - Sau khi tạo order trên Web dưới localhost, hãy lấy cái `transferContent` (VD: `TCOIN_XYZ`).
  - Dùng Postman tạo POST request bắn lên `http://localhost:3000/api/payments/sepay/webhook` với JSON Payload tự giả lập:
  ```json
  {
     "id": 1234567,
     "transferType": "in",
     "transferAmount": 19000,
     "content": "TCOIN_XYZ",
     "accountNumber": "100600272094"
  }
  ```
  - Nếu đúng, endpoint trả `{ success: true }` và xu tự nhảy lên.

## 8. Cách Test chuyển khoản thật
- Chạy hệ thống bằng `ngrok` hoặc deploy hệ thống lên con IP Server (Vercel).
- Trỏ URL của SePay Webhook vào webhook endpoint Vercel.
- Lấy điện thoại mở App MBBank/Vietin quét mã, chuyển khoản, mất 3s hệ thống tự đóng Modal và cộng xu.

## 9. Các Edge case đã xử lý
- **Lừa đảo mức giá**: Nếu khách hàng sửa số tiền trước khi bấm chuyển, SePay sẽ gửi `transferAmount` bị thấp. Hệ thống check nếu `order.amountVnd !== payload.transferAmount`, bỏ qua (vào Log mồ côi). Khách hàng mất tiền nhưng không được cộng xu.
- **Thanh toán đúp (Idempotent)**: Hàm `$transaction` trong WalletService kiểm tra mã `matchedBankTxnId` và đã khoá unique, không cho phép 1 mã SePay ID cộng xu nhiều lần.
- **Lệnh hết hạn**: Nếu khách hàng treo Modal quá lâu (hơn 15 phút), service `expireStaleOrders()` sẽ chuyển đơn sang `EXPIRED`, khách hàng không thể thanh toán tiếp mã QR đó nữa. Order polling Frontend sẽ báo đỏ.

## 10. Lưu ý Production
- SePay khuyến cáo verify IP của Webhook để tránh fake Request. Hiện tại mình check signature qua `SEPAY_WEBHOOK_SECRET`, do đó việc bảo mật secret là cốt lõi.
- Chạy Production cần lưu ý Docker network nếu kết nối Prisma Postgres trên cùng server. Khi restart, Next.js build có thể cần Prisma Engine mới nhất. Dùng lệnh `npm run build` bình thường.
