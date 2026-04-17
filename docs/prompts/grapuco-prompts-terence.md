# Thư viện Prompt Grapuco cho TERENCE nội bộ

Danh sách các prompt mẫu chất lượng cao, thiết kế theo cách **mạnh, rõ ràng và có thể dùng gọi AI agent (Antigravity/Cursor)** xử lý ngay dựa trên cấu trúc siêu dữ liệu của TERENCE.

## 1. Trace Data Flow (Dò vết luồng Dữ liệu)
> "Sử dụng Grapuco MCP, hãy trace luồng dữ liệu của trang Chi tiết phim (Movie Detail) từ route UI/page xuống service layer đến tận Prisma schema. Liệt kê các file đi qua, mô tả vai trò của từng file và lưu ý các middlewares liên quan."

## 2. Tìm Dependency (Quan hệ Phụ thuộc)
> "Sử dụng Grapuco MCP, hãy tìm toàn bộ dependency (file/components/utils) của component `BasePlayer` và `HLSPlayer` hiện tại. Xác định rõ cái nào render server-side, cái nào render client-side, và các alias path đang được dùng."

## 3. Phân tích Impact (Tầm ảnh hưởng)
> "Sử dụng Grapuco MCP, hãy phân tích độ rủi ro và phạm vi ảnh hưởng (impact) nếu tôi muốn refactor tính năng Watch Party (xem chung). Chỉ rõ những file API, UI và logic mạng (Socket/Polling) nào cần được kiểm tra kỹ sau khi thay đổi."

## 4. Kiểm tra Cấu trúc Trùng lặp (DRY)
> "Sử dụng Grapuco MCP, hãy rà soát và tìm các điểm có nguy cơ duplicate logic (lặp code) giữa các API dùng phụ trách Phim Bộ và Phim Lẻ. Đề xuất cách abstract chúng ra logic Utils dùng chung để giảm tải số lượng Code."

## 5. Security & Authentication Flow
> "Sử dụng Grapuco MCP, trace toàn bộ Auth flow hiện tại (Login, Sign up, Reset password, Email Verification). Tìm giúp tôi tất cả middleware phân quyền (Role guards) đang dùng trong NextAuth Session để ngăn User truy cập vào dashboard Admin."

## 6. Payment Integration (Tích hợp Thanh toán)
> "Sử dụng Grapuco MCP, dựa vào kiến trúc của TCoin hiện tại, hãy tìm vị trí hợp lý nhất để phát triển cổng Payment provider quốc tế (vd: PayPal, Stripe) mà không làm vỡ logic Schema Wallet và tuân thủ Separation of Concerns."

## 7. Schema Context (Đọc nhanh Sơ đồ CSDL)
> "Sử dụng Grapuco MCP, hãy đọc cấu trúc schema Prisma và các service đang dùng nó để làm rõ mọi quan hệ của dữ liệu Lịch sử xem phim (Watch History) bao gồm cả movie id, episode progress. Giải thích ngắn gọn cách ghi cache (nếu có)."

## 8. Sinh Unit/Integration Test (Tạo Test tự động)
> "Sử dụng Grapuco MCP, hãy đọc logic hiện tại của `api/v1/movies/route.ts` và tự động sinh ra một file Integration Test bằng Vitest. Mock DB Prisma bằng thư viện sẵn có của project và test 3 case chuẩn: Success (có NextCursor), Missing query, và Empty Results."

## 9. Phân Tích & Tối Ưu UI/UX (Aesthetics & Performance)
> "Sử dụng Grapuco MCP, quét toàn bộ thư mục `/src/fe/components/layout` và `/app`. Hãy chỉ ra các Component chưa áp dụng cơ chế Responsive an toàn hoặc đang dùng giá trị Pixel ứng cứng (Hardcoded pixels). Đề xuất cách viết lại bằng TailwindCSS theo rem/em và flexbox."

## 10. SEO & Metadata Debugging
> "Sử dụng Grapuco MCP, hãy quét qua các trang chính như HomePage, Movie Catalog, và Review Detail. Đánh giá xem hệ thống Metadata (Next/Head hoặc Route Metadata API) có cấu hình đủ Open Graph và Twitter Cards chuẩn SEO hay chưa. Nếu thiếu, hãy Code cho tôi đoạn setup Dynamic Metadata an toàn."

## 11. Debug Docker & Hạ Tầng CI/CD
> "Sử dụng Grapuco MCP, phân tích kịch bản Docker-Compose và Workflow deployment hiện tại. Phát hiện xem có Container nào đang rò rỉ Port không mong muốn ra ngoài Internet. Viết lại cấu trúc block Reverse Proxy hoặc Environment configs để ổn định Cluster cục bộ của TERENCE."
