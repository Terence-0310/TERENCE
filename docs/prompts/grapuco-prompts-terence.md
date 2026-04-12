# Thư viện Prompt Grapuco cho TERENCE nội bộ

Danh sách các prompt mẫu chất lượng cao, thiết kế theo cách **mạnh, rõ ràng và có thể dùng gọi AI agent (Antigravity/Cursor)** xử lý ngay dựa trên index Grapuco của TERENCE.

## 1. Trace Data Flow
> "Sử dụng Grapuco MCP, hãy trace luồng dữ liệu của trang Chi tiết phim (Movie Detail) từ route UI/page xuống service layer đến tận Prisma schema. Liệt kê các file đi qua, mô tả vai trò của từng file và lưu ý các middlewares liên quan."

## 2. Tìm Dependency
> "Sử dụng Grapuco MCP, hãy tìm toàn bộ dependency (file/components/utils) của `BasePlayer` và `HLSPlayer` hiện tại. Xác định rõ cái nào render server side, cái nào render client side, và các alias path đang được dùng."

## 3. Phân tích Impact
> "Sử dụng Grapuco MCP, hãy phân tích độ rủi ro và phạm vi ảnh hưởng (impact) nếu tôi muốn refactor tính năng Watch Party (xem chung). Chỉ rõ những file API, UI và logic Socket.IO nào cần được kiểm tra kỹ sau khi thay đổi."

## 4. Xóa trùng lặp
> "Sử dụng Grapuco MCP, hãy rà soát và tìm các điểm có nguy cơ duplicate logic (lặp code) giữa các API dùng riêng cho Admin CMS và API public dành cho người dùng đầu cuối. Đề xuất cách abstract chúng ra `src/server/` layer."

## 5. Security Flow
> "Sử dụng Grapuco MCP, trace toàn bộ Auth flow hiện tại (Login, Sign up, Reset password). Tìm giúp tôi tất cả middleware phân quyền (role guards) ngăn User truy cập vào dashboard của Admin."

## 6. Payment Integration
> "Sử dụng Grapuco MCP, dựa vào kiến trúc của TCoin hiện tại, hãy tìm vị trí hợp lý nhất để gắn thêm một Payment provider nội bộ mới (vd: VNPay) mà không làm vỡ các module cũ và tuân thủ Separation of Concerns."

## 7. Schema Context
> "Sử dụng Grapuco MCP, hãy đọc cấu trúc schema Prisma và các service đang dùng nó để làm rõ mọi quan hệ của dữ liệu Lịch sử xem phim (Watch History) bao gồm cả movie id, episode progress. Giải thích ngắn gọn cách ghi cache (nếu có)."
