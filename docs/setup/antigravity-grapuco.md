# Hướng dẫn tích hợp Antigravity (qua Grapuco MCP)

**Mục tiêu:** Cấu hình để Antigravity có thể sử dụng sức mạnh MCP hiểu toàn bộ codebase TERENCE, đưa ra giải pháp code sát kiến trúc cũ.

## Các bước thiết lập

1. Lấy API key từ Grapuco Dashboard.
2. Tại root của repo TERENCE, dùng terminal chạy lệnh sau để login:
   ```bash
   grapuco login --api-key YOUR_API_KEY
   ```
   *(Thay YOUR_API_KEY bằng key của bạn)*
3. Chạy `grapuco ingest` để agent cập nhật cấu trúc mới nhất.
4. Mở Antigravity / Cursor. Tìm đến phần cấu hình MCP Raw Config (hoặc tại User Settings).
5. Dán đoạn config sau (Hoặc xem `docs/setup/mcp.grapuco.example.json`). Thay `YOUR_API_KEY`:
   ```json
   {
     "mcpServers": {
       "grapuco": {
         "url": "https://api.grapuco.com/mcp",
         "headers": {
           "Authorization": "Bearer YOUR_API_KEY"
         }
       }
     }
   }
   ```
6. **Lưu ý CỰC KỲ QUAN TRỌNG:** Không bao giờ ghi/chèn key của bạn vào repo git. File json bạn vừa sửa không nên được đẩy lên github. `docs/setup/mcp.grapuco.example.json` chỉ đóng vai trò hướng dẫn.
7. Restart IDE / Tool Antigravity nếu cần.

## Kiểm tra (Prompt test nên dùng với TERENCE)
Để đảm bảo Antigravity đã nhận Grapuco, có thể cung cấp các prompt kiểm tra sau:
- Tìm luồng dữ liệu từ trang chi tiết phim tới API backend
- Truy vết logic player lấy stream URL từ đâu
- Tìm các Prisma model liên quan đến movie, episode, user, review
- Phân tích impact trước khi sửa watch party
- Tìm nơi xử lý auth, role, admin guard
