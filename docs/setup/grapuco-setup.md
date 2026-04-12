# Hướng dẫn setup Grapuco cho TERENCE

## Grapuco là gì?
Grapuco là công cụ ingest codebase của dự án TERENCE, giúp tổng hợp toàn bộ mã nguồn, cấu trúc thư mục và nội dung code hiện tại thành index tối ưu cho AI agents (Antigravity / Cursor). Nhờ đó AI có thể hiểu rõ business logic toàn cục, truy vết đúng luồng dữ liệu (API → Service → Prisma Model → UI) để đưa ra câu trả lời và giải pháp chính xác.

## Khi nào dùng Grapuco?
- Khi onboard thành viên/AI agent mới (Antigravity).
- Khi codebase có lượng lớn file vừa được commit/clone.
- Khi muốn refactor code chéo nhiều module cần AI đọc toàn bộ pattern.
- Cập nhật định kỳ cho AI dễ theo dõi lịch sử và cấu trúc mới.

## Cách sử dụng

### 1. Lấy API key
- Đăng nhập vào Grapuco Dashboard bằng tài khoản công ty.
- Tạo hoặc sao chép **API Key** ở phần cấp phép.

### 2. Login Grapuco
Từ root directory của dự án TERENCE, dùng CLI official để login:
```bash
npx grapuco login --api-key YOUR_API_KEY
# Hoặc nếu đã cài global (npm install -g @bitsness/grapuco-cli)
grapuco login --api-key YOUR_API_KEY
```

### 3. Ingest Codebase
Sau khi login, bạn cần ingest để AI index lại repo mới nhất:
```bash
grapuco ingest
# Hoặc sử dụng npm script được thiết lập sẵn
npm run grapuco:ingest
```
_Quá trình ingest sẽ tự bỏ qua các phần rác như node_modules, dist, .next_

### 4. Đổi máy / Reconnect
Nếu đổi thiết bị hoặc thay key:
1. Generate API Key mới từ Dashboard.
2. Tại root dir, chạy lại `grapuco login --api-key NEW_API_KEY`.
3. Chạy lại `grapuco ingest`.

### 5. Kiểm tra thành công
Sau khi ingest, nếu log xuất hiện `"Ingest successful"`, bạn có thể kiểm tra xem công cụ có báo lỗi không qua lệnh:
```bash
npm run grapuco:check
```
Hoặc test trên Antigravity để hỏi những cấu trúc vừa cập nhật.

## Troubleshooting / Lỗi thường gặp
- **Lỗi `Command not found`:** Kiểm tra xem đã cài `@bitsness/grapuco-cli` chưa. Chú ý dự án dùng Node >= 18.x.
- **Lỗi `Unauthorized`:** API token hết hạn hoặc sai. Hãy thực hiện bước login lại.
- **Fail Ingest / Timeout:** Đảm bảo đường truyền tốt hoặc cấu hình bỏ qua đúng các thư mục như `.next`, `.git`, `node_modules` (thường CLI official sẽ tự ignore theo .gitignore tự động).
