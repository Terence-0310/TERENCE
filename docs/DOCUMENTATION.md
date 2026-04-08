# BÁO CÁO ĐỒ ÁN MÔN HỌC

---

## TRANG BÌA

```
TRƯỜNG ĐẠI HỌC CÔNG NGHỆ TP.HCM (HUTECH)
KHOA CÔNG NGHỆ THÔNG TIN

────────────────────────────────────

BÁO CÁO ĐỒ ÁN MÔN HỌC
CÔNG NGHỆ PHẦN MỀM

ĐỀ TÀI:
TERENCE — NỀN TẢNG XEM PHIM TRỰC TUYẾN

────────────────────────────────────

Sinh viên thực hiện : [Họ tên sinh viên]
MSSV                : [MSSV]
Lớp                 : [Mã lớp]
Giảng viên hướng dẫn: [Họ tên giảng viên]

Năm học: 2025 – 2026

TP. Hồ Chí Minh, tháng 04 năm 2026
```

---

## LỜI MỞ ĐẦU

Trong bối cảnh chuyển đổi số toàn cầu, nhu cầu giải trí trực tuyến đã tăng trưởng vượt bậc. Theo báo cáo của Statista (2025), thị trường video streaming toàn cầu đạt giá trị hơn 100 tỷ USD, với hàng trăm triệu người dùng truy cập hàng ngày. Tại Việt Nam, các nền tảng như Netflix, FPT Play, Galaxy Play đã cho thấy tiềm năng rất lớn của thị trường nội dung số.

Việc xây dựng một nền tảng xem phim trực tuyến hoàn chỉnh không chỉ đòi hỏi kiến thức về lập trình web cơ bản, mà còn yêu cầu sự kết hợp chuyên sâu của nhiều lĩnh vực công nghệ: kiến trúc phần mềm phân tầng, streaming video thích ứng (adaptive bitrate), giao tiếp real-time (WebSocket), quản trị nội dung (CMS), và vận hành hệ thống production.

Đồ án **TERENCE** ra đời nhằm mục tiêu xây dựng một nền tảng xem phim trực tuyến full-stack, áp dụng toàn diện các kiến thức đã học trong môn Công nghệ phần mềm — từ phân tích yêu cầu, thiết kế UML, đến phát triển module và triển khai lên server thực tế. Dự án không chỉ dừng lại ở mức demo học thuật mà hướng tới kiến trúc production-ready với khả năng vận hành và mở rộng trong tương lai.

Trong suốt quá trình thực hiện, nhóm đã áp dụng quy trình phát triển phần mềm chuyên nghiệp: khảo sát yêu cầu, phân tích nghiệp vụ, thiết kế kiến trúc và cơ sở dữ liệu, phát triển từng module theo kiến trúc phân tầng, kiểm thử tích hợp, và triển khai lên server production với domain thực tế.

Báo cáo này trình bày chi tiết quá trình phân tích, thiết kế, xây dựng và triển khai hệ thống TERENCE. Nội dung được tổ chức thành 7 chương, bắt đầu từ tổng quan đề tài, qua phân tích và thiết kế hệ thống, đến thiết kế chi tiết chức năng, công nghệ sử dụng, kết quả đạt được, và hướng phát triển tương lai.

Em xin chân thành cảm ơn giảng viên hướng dẫn đã tận tình hỗ trợ, góp ý và định hướng trong suốt quá trình thực hiện đồ án này.

---

## MỤC LỤC

```
Lời mở đầu

Chương 1. Tổng quan đề tài
    1.1  Lý do chọn đề tài
    1.2  Mục tiêu dự án
    1.3  Phạm vi dự án
    1.4  Định hướng phát triển

Chương 2. Phân tích hệ thống
    2.1  Xác định Actor
    2.2  Use Case Overview
    2.3  User Story
         2.3.1  User Story cho người dùng
         2.3.2  User Story cho Admin
    2.4  Yêu cầu chức năng
    2.5  Yêu cầu phi chức năng

Chương 3. Thiết kế hệ thống
    3.1  Kiến trúc tổng thể
    3.2  Cấu trúc thư mục
    3.3  Cơ sở dữ liệu
    3.4  Sơ đồ quan hệ thực thể (ERD)
    3.5  Tổng quan Sequence Diagram và Activity Diagram

Chương 4. Thiết kế chi tiết chức năng
    4.1  Xem phim (Video Player)
    4.2  Watch History (Lịch sử xem)
    4.3  Watch Party (Xem chung)
    4.4  Review (Đánh giá phim)
    4.5  Admin Dashboard (CMS)
    4.6  Sync dữ liệu (Data Pipeline)
    4.7  TCoin (Tiền ảo)

Chương 5. Công nghệ sử dụng
    5.1  Lý do chọn Next.js làm nền tảng chính
    5.2  Frontend
    5.3  Backend
    5.4  Database
    5.5  External APIs
    5.6  Deploy & Infrastructure

Chương 6. Kết quả đạt được
    6.1  Các tính năng đã hoàn thành
    6.2  Điểm nổi bật so với các đồ án tương tự
    6.3  So sánh với mục tiêu ban đầu

Chương 7. Hướng phát triển
    7.1  Roadmap kỹ thuật
    7.2  Roadmap sản phẩm

Kết luận

Phụ lục
    Phụ lục A: Danh sách Module chính
    Phụ lục B: Quy ước Code
    Phụ lục C: Nhật ký phát triển
    Phụ lục D: Tài khoản kiểm thử
```

---

## DANH MỤC HÌNH

| STT | Tên hình | Vị trí |
|-----|---------|--------|
| Hình 1 | Sơ đồ phân cấp Actor trong hệ thống TERENCE | Chương 2 — Mục 2.1 |
| Hình 2 | Sơ đồ Use Case tổng quan hệ thống | Chương 2 — Mục 2.2 |
| Hình 3 | Sơ đồ kiến trúc tổng thể hệ thống | Chương 3 — Mục 3.1 |
| Hình 4 | Sơ đồ cấu trúc thư mục dự án | Chương 3 — Mục 3.2 |
| Hình 5 | Sơ đồ ERD (Entity Relationship Diagram) | Chương 3 — Mục 3.4 |
| Hình 6 | Sequence Diagram — Luồng xem phim | Chương 3 — Mục 3.5 |
| Hình 7 | Sequence Diagram — Luồng Watch Party | Chương 3 — Mục 3.5 |
| Hình 8 | Sequence Diagram — Luồng sync dữ liệu | Chương 3 — Mục 3.5 |
| Hình 9 | Activity Diagram — Đăng nhập hệ thống | Chương 3 — Mục 3.5 |
| Hình 10 | Activity Diagram — Xem phim | Chương 3 — Mục 3.5 |
| Hình 11 | Activity Diagram — Tạo Watch Party | Chương 3 — Mục 3.5 |
| Hình 12 | Activity Diagram — Sync dữ liệu phim | Chương 3 — Mục 3.5 |
| Hình 13 | Activity Diagram — Quản lý phim (Admin) | Chương 3 — Mục 3.5 |
| Hình 14 | Giao diện trang xem phim (Video Player) | Chương 4 — Mục 4.1 |
| Hình 15 | Giao diện Watch Party (phòng xem chung) | Chương 4 — Mục 4.3 |
| Hình 16 | Giao diện Admin Dashboard — Trang tổng quan | Chương 4 — Mục 4.5 |
| Hình 17 | Giao diện Admin Dashboard — Quản lý phim | Chương 4 — Mục 4.5 |
| Hình 18 | Giao diện trang chủ TERENCE | Chương 6 — Mục 6.1 |
| Hình 19 | Giao diện trang duyệt phim (Browse) | Chương 6 — Mục 6.1 |
| Hình 20 | Giao diện chi tiết phim | Chương 6 — Mục 6.1 |

---

## DANH MỤC BẢNG

| STT | Tên bảng | Vị trí |
|-----|---------|--------|
| Bảng 1.1 | Mục tiêu dự án | Chương 1 — Mục 1.2 |
| Bảng 1.2 | Phạm vi đã thực hiện | Chương 1 — Mục 1.3 |
| Bảng 2.1 | Danh sách Actor | Chương 2 — Mục 2.1 |
| Bảng 2.2 | Nhóm Use Case | Chương 2 — Mục 2.2 |
| Bảng 2.3 | Yêu cầu chức năng | Chương 2 — Mục 2.4 |
| Bảng 2.4 | Yêu cầu phi chức năng | Chương 2 — Mục 2.5 |
| Bảng 3.1 | Các tầng kiến trúc | Chương 3 — Mục 3.1 |
| Bảng 3.2 | Tổng quan entity | Chương 3 — Mục 3.3 |
| Bảng 3.3 | Quan hệ giữa các entity | Chương 3 — Mục 3.4 |
| Bảng 5.1 | Công nghệ Frontend | Chương 5 — Mục 5.2 |
| Bảng 5.2 | Công nghệ Backend | Chương 5 — Mục 5.3 |
| Bảng 5.3 | External APIs | Chương 5 — Mục 5.5 |
| Bảng 5.4 | Deploy & Infrastructure | Chương 5 — Mục 5.6 |
| Bảng 6.1 | Tính năng đã hoàn thành | Chương 6 — Mục 6.1 |
| Bảng 6.2 | So sánh với mục tiêu ban đầu | Chương 6 — Mục 6.3 |
| Bảng 7.1 | Roadmap kỹ thuật | Chương 7 — Mục 7.1 |
| Bảng 7.2 | Roadmap sản phẩm | Chương 7 — Mục 7.2 |

---

## DANH MỤC TỪ VIẾT TẮT

| Từ viết tắt | Giải thích |
|------------|------------|
| API | Application Programming Interface — Giao diện lập trình ứng dụng |
| CMS | Content Management System — Hệ thống quản trị nội dung |
| CRUD | Create, Read, Update, Delete — Các thao tác dữ liệu cơ bản |
| CDN | Content Delivery Network — Mạng phân phối nội dung |
| CSS | Cascading Style Sheets — Ngôn ngữ định kiểu |
| DB | Database — Cơ sở dữ liệu |
| ERD | Entity Relationship Diagram — Sơ đồ quan hệ thực thể |
| HLS | HTTP Live Streaming — Giao thức streaming video thích ứng |
| ORM | Object-Relational Mapping — Ánh xạ đối tượng - quan hệ |
| RBAC | Role-Based Access Control — Kiểm soát truy cập dựa trên vai trò |
| REST | Representational State Transfer — Kiến trúc API |
| RSC | React Server Components — Thành phần React phía server |
| SSL | Secure Sockets Layer — Lớp bảo mật kết nối |
| SSR | Server-Side Rendering — Render phía server |
| TMDB | The Movie Database — Cơ sở dữ liệu phim quốc tế |
| UI | User Interface — Giao diện người dùng |
| UML | Unified Modeling Language — Ngôn ngữ mô hình hóa thống nhất |
| VPS | Virtual Private Server — Máy chủ ảo riêng |
| WAF | Web Application Firewall — Tường lửa ứng dụng web |
| WebRTC | Web Real-Time Communication — Giao tiếp thời gian thực trên web |
| WS | WebSocket — Giao thức giao tiếp hai chiều |

---

## CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI

Chương này trình bày bối cảnh ra đời của đề tài, lý do lựa chọn, các mục tiêu cần đạt được, phạm vi thực hiện và định hướng phát triển lâu dài của dự án TERENCE.

### 1.1 Lý do chọn đề tài

Thị trường video streaming đang phát triển mạnh mẽ trên toàn cầu và tại Việt Nam. Người dùng ngày càng kỳ vọng cao hơn về trải nghiệm xem phim trực tuyến: chất lượng video thích ứng theo băng thông, khả năng xem tiếp từ vị trí dừng lại, và tính năng xã hội như xem phim cùng bạn bè.

Tuy nhiên, phần lớn các dự án đồ án môn học thường chỉ dừng ở mức ứng dụng CRUD cơ bản, chưa giải quyết được các bài toán kỹ thuật phức tạp trong thực tế như:

- **Streaming video**: phát video qua giao thức HLS với adaptive bitrate, tự động chọn chất lượng theo băng thông người dùng
- **Giao tiếp real-time**: đồng bộ trạng thái phát video giữa nhiều người dùng trong cùng một phòng xem chung
- **Tích hợp dữ liệu bên ngoài**: xây dựng pipeline tự động đồng bộ và làm giàu dữ liệu phim từ nhiều nguồn API
- **Quản trị nội dung chuyên nghiệp**: hệ thống CMS với phân quyền đa cấp, audit log, và moderation workflow

Với mong muốn áp dụng toàn diện kiến thức môn Công nghệ phần mềm vào một sản phẩm có giá trị thực tế, nhóm đã chọn đề tài xây dựng nền tảng xem phim trực tuyến **TERENCE** — một hệ thống full-stack hoàn chỉnh từ giao diện người dùng, API backend, cơ sở dữ liệu, đến triển khai production.

### 1.2 Mục tiêu dự án

Dự án đặt ra 6 mục tiêu chính, tất cả đều đã được hoàn thành:

| # | Mục tiêu | Mô tả chi tiết | Trạng thái |
|---|----------|----------------|------------|
| 1 | Xây dựng web app xem phim full-stack | Giao diện người dùng + API + Database + Deploy | ✅ Đạt |
| 2 | Tích hợp nguồn dữ liệu tự động | Pipeline sync từ OPhim/OPhim18 + enrichment từ TMDB | ✅ Đạt |
| 3 | Hệ thống quản trị nội dung (CMS) | Dashboard admin với CRUD, moderation, audit log | ✅ Đạt |
| 4 | Watch Party real-time | Xem phim đồng bộ, chat, voice/video call qua Socket.IO + LiveKit | ✅ Đạt |
| 5 | TCoin tiền ảo | Ví điện tử, earn/spend, transaction history (demo) | ✅ Đạt |
| 6 | Kiến trúc mở rộng | Module-based, layered, sẵn sàng tách microservice | ✅ Đạt |

### 1.3 Phạm vi dự án

**Phạm vi đã thực hiện:**

| Nhóm chức năng | Chi tiết |
|---------------|----------|
| Giao diện người dùng | Trang chủ (hero banner, movie rows), duyệt phim, tìm kiếm, lọc theo thể loại/quốc gia, chi tiết phim, danh sách tập |
| Xem phim | HLS adaptive streaming, resume playback, lưu tiến trình, chuyển tập tự động |
| Xác thực & Phân quyền | Đăng ký / Đăng nhập (email + password), 5 roles (super_admin, admin, staff, editor, user) |
| Tương tác xã hội | Watch Party (sync + chat + call), đánh giá phim (rating + moderation), tin tức phim |
| Gamification | TCoin (earn/spend, wallet, transaction history) |
| Quản trị | Admin Dashboard, CRUD phim/user/news/review/genre/country, upload media, audit log |
| Data pipeline | OPhim catalog sync → TMDB metadata enrichment → DB upsert, SyncJob/SyncLog tracking |
| Triển khai | Production deploy trên Vultr VPS + PM2 + Nginx + Cloudflare |

**Ngoài phạm vi (dành cho giai đoạn phát triển tiếp theo):**

- Tích hợp cổng thanh toán thực tế (VNPay, MoMo)
- Ứng dụng mobile (iOS / Android)
- AI recommendation engine (gợi ý phim thông minh)
- Migrate database sang PostgreSQL

### 1.4 Định hướng phát triển

Dự án được thiết kế theo mô hình **Modular Monolith** — toàn bộ code nằm trong một codebase duy nhất nhưng được tổ chức thành các module độc lập theo domain. Cách tiếp cận này mang lại lợi ích kép: đơn giản trong triển khai và vận hành (chỉ 1 ứng dụng), đồng thời sẵn sàng tách thành microservices khi nhu cầu scale tăng lên.

Các hướng phát triển ưu tiên bao gồm: migrate sang PostgreSQL cho khả năng chịu tải tốt hơn, bổ sung hệ thống testing (unit + E2E), tích hợp AI recommendation, phát triển mobile app, và kết nối cổng thanh toán thực tế.

---

## CHƯƠNG 2: PHÂN TÍCH HỆ THỐNG

Chương này trình bày quá trình phân tích yêu cầu hệ thống, bao gồm: xác định các tác nhân (actor), phân tích use case, xây dựng user story, và đặc tả yêu cầu chức năng — phi chức năng. Đây là nền tảng cho việc thiết kế hệ thống ở Chương 3.

### 2.1 Xác định Actor

Hệ thống TERENCE phục vụ nhiều nhóm người dùng với quyền hạn khác nhau, được phân cấp theo mô hình RBAC (Role-Based Access Control) gồm 5 role chính và 1 tác nhân hệ thống:

| Actor | Mô tả | Quyền hạn chính |
|-------|-------|-----------------|
| **Guest** | Người truy cập chưa đăng nhập | Duyệt phim, tìm kiếm, xem trailer. Không thể xem phim đầy đủ, đánh giá, hay tham gia watch party |
| **User** | Người dùng đã đăng ký và đăng nhập | Toàn bộ tính năng người dùng: xem phim, đánh giá, watch party, TCoin, watch history, yêu thích |
| **Editor** | Biên tập viên nội dung | Quản lý tin tức, duyệt đánh giá. Không có quyền quản lý phim hay người dùng |
| **Staff** | Nhân viên vận hành | Quản lý phim, episodes, users, tin tức, đánh giá. Không có quyền cấu hình hệ thống |
| **Admin** | Quản trị viên | Toàn quyền hệ thống: CRUD tất cả entity, sync dữ liệu, xem audit log, quản lý TCoin |
| **Super Admin** | Quản trị viên cấp cao nhất | Toàn bộ quyền Admin + quản lý admin khác, reset password, cấu hình hệ thống |
| **System** | Tác nhân tự động (hệ thống) | Chạy sync pipeline, scheduled tasks, ghi log tự động |

Hệ thống phân quyền theo nguyên tắc **kế thừa quyền từ thấp đến cao**: User < Editor < Staff < Admin < Super Admin. Mỗi request đến API admin đều được kiểm tra quyền thông qua middleware guard.

> **[HÌNH 1: Sơ đồ phân cấp Actor trong hệ thống TERENCE]**

### 2.2 Use Case Overview

Dựa trên phân tích nghiệp vụ, các use case của hệ thống được nhóm thành 5 nhóm chính:

| Nhóm | Các Use Case | Actor liên quan |
|------|-------------|----------------|
| **Xác thực** | Đăng ký tài khoản, Đăng nhập, Đăng xuất, Quản lý phiên | Guest, User |
| **Khám phá phim** | Duyệt phim (browse), Tìm kiếm, Lọc theo thể loại/quốc gia/năm, Xem chi tiết phim, Xem trailer | Guest, User |
| **Xem phim** | Phát video HLS, Resume playback, Chuyển tập, Lưu lịch sử xem, Xem tiếp (continue watching) | User |
| **Tương tác xã hội** | Đánh giá phim, Xem tin tức, Tạo/Tham gia Watch Party, Chat trong phòng, Gọi voice/video | User |
| **TCoin** | Kiếm TCoin (daily login, review, xem phim), Sử dụng TCoin (premium features), Xem transaction history | User |
| **Quản trị** | CRUD phim/tập/user/news/review/genre/country, Upload media, Duyệt đánh giá, Sync dữ liệu, Xem audit log, Quản lý TCoin | Admin, Staff, System |

> **[HÌNH 2: Sơ đồ Use Case tổng quan hệ thống TERENCE]**
> *(Tham khảo README.md mục 9 — Use Case Overview để xem sơ đồ Mermaid đầy đủ)*

### 2.3 User Story

#### User Story cho Người dùng

**US-01: Duyệt và tìm kiếm phim**
- **Actor:** Người dùng (Guest / User)
- **Mục tiêu:** Tìm phim theo sở thích nhanh chóng
- **Flow:** Truy cập trang chủ → Xem phim trending/featured → Dùng bộ lọc (thể loại, quốc gia, năm) hoặc search bar → Xem danh sách kết quả → Chọn phim
- **Kết quả:** Người dùng tìm được phim phù hợp và truy cập trang chi tiết

**US-02: Xem phim trực tuyến**
- **Actor:** Người dùng đã đăng nhập
- **Mục tiêu:** Xem phim liền mạch với chất lượng tốt nhất
- **Flow:** Chọn phim → Nhấn "Xem phim" → Player tự chọn chất lượng → Xem phim → Tắt tab → Quay lại → Xem tiếp từ vị trí cũ
- **Kết quả:** Phim phát mượt mà, progress được lưu tự động

**US-03: Watch Party — Xem phim cùng bạn bè**
- **Actor:** Người dùng đã đăng nhập
- **Mục tiêu:** Xem phim đồng bộ real-time với bạn bè
- **Flow:** Chọn phim → Tạo phòng Watch Party → Chia sẻ room code → Bạn bè join → Playback đồng bộ → Chat / Voice call
- **Kết quả:** Mọi người xem cùng lúc, tương tác real-time

**US-04: Đánh giá phim**
- **Actor:** Người dùng đã đăng nhập
- **Mục tiêu:** Chia sẻ đánh giá về phim đã xem
- **Flow:** Xem phim → Rating 1-5 sao → Viết comment → Gửi → Chờ duyệt → Hiển thị
- **Kết quả:** Review được lưu, hiển thị sau khi được duyệt

**US-05: TCoin — Kiếm và sử dụng tiền ảo**
- **Actor:** Người dùng đã đăng nhập
- **Mục tiêu:** Kiếm TCoin từ hoạt động và đổi lấy tính năng premium
- **Flow:** Đăng nhập hàng ngày → Nhận TCoin → Viết review / Xem phim → Nhận thêm → Dùng TCoin đổi premium
- **Kết quả:** User tích lũy TCoin và sử dụng trong hệ thống

#### User Story cho Admin

**US-06: Quản lý kho phim**
- **Actor:** Admin / Staff
- **Mục tiêu:** Quản lý nội dung phim trên hệ thống
- **Flow:** Dashboard → Quản lý phim → CRUD phim/tập → Publish/Hide/Archive → Upload media
- **Kết quả:** Kho phim được cập nhật, phim mới hiển thị trên trang chủ

**US-07: Đồng bộ dữ liệu phim**
- **Actor:** Admin
- **Mục tiêu:** Import phim tự động từ nguồn bên ngoài
- **Flow:** Trigger OPhim sync → Fetch catalog → Upsert DB → TMDB enrichment → Cập nhật metadata
- **Kết quả:** Kho phim được làm giàu tự động

**US-08: Quản lý và duyệt đánh giá**
- **Actor:** Admin / Staff
- **Mục tiêu:** Đảm bảo chất lượng nội dung đánh giá
- **Flow:** Dashboard → Reviews → Pending → Approve / Reject / Flag → Lưu audit log
- **Kết quả:** Chỉ review chất lượng được hiển thị

### 2.4 Yêu cầu chức năng

| # | Yêu cầu | Mô tả | Ưu tiên |
|---|---------|-------|---------|
| FR-01 | Đăng ký / Đăng nhập | Email + password, bcrypt hash, cookie session | Cao |
| FR-02 | Phân quyền RBAC | 5 roles: super_admin, admin, staff, editor, user | Cao |
| FR-03 | Duyệt phim | Trang chủ, browse, filter thể loại/quốc gia/năm | Cao |
| FR-04 | Tìm kiếm | Full-text search (Prisma + optional Elasticsearch) | Cao |
| FR-05 | Xem phim | HLS streaming, adaptive bitrate, multi-source | Cao |
| FR-06 | Resume playback | Lưu tiến trình xem, xem tiếp từ vị trí cũ | Cao |
| FR-07 | Watch Party | Tạo/join phòng, sync playback, chat, voice call | Trung bình |
| FR-08 | Đánh giá phim | Rating + comment, moderation workflow | Trung bình |
| FR-09 | TCoin | Ví điện tử, earn/spend, transaction history | Trung bình |
| FR-10 | Admin CMS | CRUD phim, users, news, reviews, genres, countries | Cao |
| FR-11 | Data sync | OPhim catalog sync, TMDB enrichment pipeline | Cao |
| FR-12 | Audit log | Tracking mọi thao tác admin | Trung bình |
| FR-13 | Tin tức phim | Tổng hợp GNews + TMDB, phân loại | Thấp |

### 2.5 Yêu cầu phi chức năng

| # | Yêu cầu | Mô tả |
|---|---------|-------|
| NFR-01 | **Hiệu năng** | Trang chủ load < 3 giây, video phát trong < 5 giây |
| NFR-02 | **Bảo mật** | Mã hóa password (bcrypt), httpOnly cookie, server-only API keys |
| NFR-03 | **Khả năng mở rộng** | Kiến trúc module-based, sẵn sàng tách microservice |
| NFR-04 | **Tính sẵn sàng** | Deploy trên VPS + PM2 auto-restart, Cloudflare CDN |
| NFR-05 | **Trải nghiệm người dùng** | Responsive design, dark mode, adaptive streaming |
| NFR-06 | **Bảo trì** | Coding convention, README chuẩn, audit log |
| NFR-07 | **Tương thích** | Hỗ trợ Chrome, Firefox, Safari, Edge (desktop + mobile) |

---

## CHƯƠNG 3: THIẾT KẾ HỆ THỐNG

Chương này trình bày thiết kế tổng thể của hệ thống TERENCE, bao gồm: kiến trúc phần mềm, cấu trúc mã nguồn, thiết kế cơ sở dữ liệu, và tổng quan các sơ đồ UML. Thiết kế được xây dựng dựa trên kết quả phân tích ở Chương 2.

### 3.1 Kiến trúc tổng thể

Hệ thống TERENCE sử dụng kiến trúc **Modular Monolith** trên nền tảng Next.js 16 với App Router. Kiến trúc này kết hợp ưu điểm của monolith (đơn giản triển khai, dễ debug) với tính tổ chức của microservices (code tách riêng theo domain module).

**Nguyên tắc kiến trúc:**
- **Server Components (RSC)** xử lý render phía server cho hiệu năng và SEO tốt
- **Client Components** xử lý tương tác người dùng (player video, search, watch party)
- **API Routes** cung cấp REST API cho cả frontend lẫn admin
- **Domain Modules** (`src/server/`) chứa business logic, tách riêng theo nghiệp vụ
- **Socket.IO Server** chạy alongside Next.js cho real-time communication

> **[HÌNH 3: Sơ đồ kiến trúc tổng thể hệ thống TERENCE]**
> *(Tham khảo README.md mục 2 — Kiến trúc hệ thống & mục 17.1 — Production Architecture)*

**Mô tả các tầng kiến trúc:**

| Tầng | Thành phần | Vai trò | Giao tiếp |
|------|-----------|--------|----------|
| **Client** | Next.js App (RSC + Client Components) | Giao diện người dùng, video player, tương tác | HTTP, WebSocket, WebRTC |
| **Edge** | Cloudflare CDN + WAF | Cache static assets, bảo vệ DDoS, SSL termination | HTTPS |
| **Reverse Proxy** | Nginx | SSL termination, gzip compression, proxy pass, WebSocket upgrade | HTTP, WS |
| **Application** | Next.js API Routes + Socket.IO | Business logic, REST API, real-time sync | Internal |
| **Data** | Prisma ORM + SQLite | Lưu trữ dữ liệu, ORM mapping, migrations | SQL |
| **External** | TMDB, OPhim, LiveKit, GNews | Metadata phim, video sources, WebRTC, tin tức | HTTPS |

Kiến trúc này cho phép mở rộng trong tương lai: tách Socket.IO thành standalone service, migrate SQLite sang PostgreSQL, hoặc đưa pipeline sync vào background job queue — mà không cần viết lại toàn bộ ứng dụng.

### 3.2 Cấu trúc thư mục

Mã nguồn được tổ chức theo nguyên tắc **separation of concerns**, tách riêng UI, business logic, data access, và utilities:

```
TERENCE-main/
├── app/                    # Tầng Routing: Next.js App Router (pages + API routes)
│   ├── api/                #   REST API endpoints (admin, auth, v1, watch-party...)
│   ├── browse/             #   Trang duyệt phim (filter, search)
│   ├── movie/[id]/         #   Trang chi tiết phim
│   ├── watch/[id]/         #   Trang xem phim (video player)
│   ├── xem-chung/          #   Trang Watch Party
│   ├── dashboard/          #   Admin panel (CMS)
│   └── ...                 #   Các trang khác (login, signup, genres, news, tcoin...)
│
├── components/             # Tầng UI: React Components
│   ├── ui/                 #   Primitive components (shadcn/ui)
│   ├── shared/             #   Shared components (MovieCard, MovieRow...)
│   ├── player/             #   Video player components (HLS Player)
│   └── watch-party/        #   Watch party UI components
│
├── src/server/             # Tầng Business Logic: Server-side domain modules
│   ├── movies/             #   Movie service, serializers, API helpers
│   ├── ophim/              #   OPhim sync (client, mapper, service)
│   ├── tmdb/               #   TMDB enrichment (client, matcher, service)
│   ├── pipeline/           #   Movie enrichment pipeline (orchestrator)
│   ├── modules/            #   Domain modules phân tầng (controller/service/repo)
│   └── shared/             #   Shared utilities (DB, errors, guards)
│
├── lib/                    # Tầng Utility: Shared libraries (FE + Server)
├── hooks/                  # Custom React Hooks (usePlayer, useHLS, useWatchParty...)
├── prisma/                 # Tầng Data: Schema, migrations, seed
├── server/                 # Custom server (Socket.IO + Watch Party handlers)
├── scripts/                # CLI scripts (sync, enrich, pipeline)
└── docs/                   # Tài liệu kỹ thuật bổ sung
```

> **[HÌNH 4: Sơ đồ cấu trúc thư mục dự án]**

### 3.3 Cơ sở dữ liệu

**Database Engine:** SQLite — database dạng file, được truy vấn thông qua Prisma ORM 6. Lựa chọn SQLite phù hợp cho giai đoạn phát triển và deployment với quy mô vừa (đơn giản, không cần cài đặt database server riêng). Trong roadmap, hệ thống sẽ migrate sang PostgreSQL khi cần scale.

**Tổng quan 25+ entity chính:**

| Nhóm | Entity | Mô tả |
|------|--------|-------|
| **Người dùng** | User, Session | Tài khoản (name, email, role, status), phiên đăng nhập (cookie-based, 30 ngày) |
| **Nội dung phim** | Movie, Episode, VideoSource, SubtitleTrack | Phim (tiêu đề, loại, trạng thái), tập phim (stream URL, chất lượng), nguồn video, phụ đề |
| **Metadata phim** | Genre, Country, Person + bảng trung gian (MovieGenre, MovieCountry, MoviePerson) | Thể loại, quốc gia, diễn viên/đạo diễn — quan hệ nhiều-nhiều (M:N) |
| **Tương tác** | WatchHistory, Favorite, Review | Lịch sử xem (vị trí, thời lượng), phim yêu thích, đánh giá (rating + moderation) |
| **Watch Party** | WatchPartyRoom, WatchPartyParticipant, WatchPartyState, WatchPartyMessage | Phòng xem chung, thành viên, trạng thái playback, tin nhắn chat |
| **TCoin** | Wallet, WalletTransaction, PaymentOrder | Ví tiền ảo, giao dịch (earn/spend), đơn thanh toán |
| **CMS** | NewsPost, Short, Upload | Bài tin tức, video ngắn, tracking file upload |
| **Hệ thống** | AdminLog, PageView, SyncJob, SyncLog, MovieSource | Audit log, analytics, tracking pipeline sync, nguồn metadata |

### 3.4 Sơ đồ quan hệ thực thể (ERD)

Sơ đồ ERD thể hiện mối quan hệ giữa các entity chính trong hệ thống. Các quan hệ được thiết kế theo chuẩn hóa cơ sở dữ liệu, sử dụng bảng trung gian cho quan hệ nhiều-nhiều.

> **[HÌNH 5: Sơ đồ ERD (Entity Relationship Diagram) đầy đủ]**
> *(Tham khảo README.md mục 6.2 — ERD Mermaid diagram)*

**Các quan hệ chính:**

| Quan hệ | Loại | Mô tả |
|---------|------|-------|
| User → Session | 1:N | Một user có nhiều phiên đăng nhập |
| User → WatchHistory | 1:N | Một user có nhiều lịch sử xem |
| User → Review | 1:N | Một user viết nhiều đánh giá |
| User → Wallet | 1:1 | Mỗi user có đúng 1 ví TCoin |
| Wallet → WalletTransaction | 1:N | Một ví có nhiều giao dịch |
| Movie → Episode | 1:N | Một phim bộ có nhiều tập |
| Episode → VideoSource | 1:N | Một tập có nhiều nguồn video (quality khác nhau) |
| Movie ↔ Genre | M:N | Phim có nhiều thể loại, thể loại chứa nhiều phim |
| Movie ↔ Country | M:N | Phim thuộc nhiều quốc gia |
| Movie ↔ Person | M:N | Phim có nhiều diễn viên/đạo diễn, mỗi người tham gia nhiều phim |
| WatchPartyRoom → WatchPartyState | 1:1 | Mỗi phòng có 1 trạng thái playback |
| WatchPartyRoom → WatchPartyMessage | 1:N | Mỗi phòng có nhiều tin nhắn |
| Movie → SyncJob | 1:N | Mỗi phim có nhiều lần sync |

### 3.5 Tổng quan Sequence Diagram và Activity Diagram

Để mô tả chi tiết luồng tương tác giữa các thành phần và luồng hoạt động nghiệp vụ, hệ thống được thiết kế với 3 sequence diagram và 5 activity diagram cho các chức năng chính:

**Sequence Diagram** (luồng tương tác giữa các thành phần):

> **[HÌNH 6: Sequence Diagram — Luồng xem phim]** *(README mục 10.1)*
>
> Mô tả: User → Frontend → API → MovieService → DB → HLS.js Player. Bao gồm cả luồng auto-save progress mỗi 30 giây.

> **[HÌNH 7: Sequence Diagram — Luồng Watch Party]** *(README mục 10.2)*
>
> Mô tả: Host tạo phòng → Guest join → Socket.IO đồng bộ playback → Chat → LiveKit voice/video call. Chia 4 giai đoạn rõ ràng.

> **[HÌNH 8: Sequence Diagram — Luồng sync dữ liệu]** *(README mục 10.3)*
>
> Mô tả: Admin trigger → Pipeline → OPhim API fetch → TMDB enrichment → DB upsert → SyncLog tracking.

**Activity Diagram** (luồng hoạt động nghiệp vụ):

> **[HÌNH 9: Activity Diagram — Đăng nhập hệ thống]** *(README mục 11.1)*
>
> Mô tả: Nhập email/password → Validate → Kiểm tra tài khoản → Bcrypt verify → Tạo session → Redirect.

> **[HÌNH 10: Activity Diagram — Xem phim]** *(README mục 11.2)*
>
> Mô tả: Chi tiết phim → Chọn tập → HLS player → Resume playback → Auto-save → Chuyển tập tự động.

> **[HÌNH 11: Activity Diagram — Tạo Watch Party]** *(README mục 11.3)*
>
> Mô tả: Tạo phòng → Sinh room code → Guest join → Sync video → Chat → Voice/Video call.

> **[HÌNH 12: Activity Diagram — Sync dữ liệu phim]** *(README mục 11.4)*
>
> Mô tả: Trigger sync → Fetch OPhim → Validate/Map → Upsert DB → TMDB enrichment → SyncLog.

> **[HÌNH 13: Activity Diagram — Quản lý phim (Admin)]** *(README mục 11.5)*
>
> Mô tả: RBAC check → Danh sách phim → CRUD → Zod validation → DB → AdminLog audit trail.

---

## CHƯƠNG 4: THIẾT KẾ CHI TIẾT CHỨC NĂNG

Chương này trình bày thiết kế chi tiết cho 7 chức năng cốt lõi của hệ thống. Mỗi chức năng được mô tả theo cấu trúc: mục tiêu, thành phần kỹ thuật, luồng xử lý, dữ liệu liên quan, và kết quả đầu ra.

### 4.1 Xem phim (Video Player)

**Mục tiêu:** Cho phép người dùng xem phim trực tuyến với chất lượng tự động điều chỉnh theo băng thông, hỗ trợ xem tiếp từ vị trí đã dừng trước đó.

> **[HÌNH 14: Giao diện trang xem phim (Video Player)]**

**Thành phần:**
- `components/player/EnhancedVideoPlayer.tsx` — Player chính
- `hooks/useHLS.ts` — HLS.js integration
- `hooks/usePlayer.ts` — Player state management
- `lib/player/` — Source adapter, HLS initialization
- `/api/v1/watch/[movieId]` — Watch bootstrap API

**Flow:**
1. User mở trang phim → API trả chi tiết phim + episodes
2. User nhấn "Xem phim" → API trả WatchBootstrap (streamUrl, progress)
3. HLS.js khởi tạo → Adaptive streaming tự chọn chất lượng
4. Progress lưu tự động mỗi 30 giây (DB + localStorage)
5. Hỗ trợ resume playback, chuyển tập tự động

**Dữ liệu liên quan:** Movie, Episode, VideoSource, WatchHistory

**Kết quả đầu ra:** Video phát mượt mà với chất lượng phù hợp, tiến trình xem được lưu liên tục, hỗ trợ resume khi quay lại.

### 4.2 Watch History (Lịch sử xem)

**Mục tiêu:** Theo dõi tiến trình xem phim của người dùng qua nhiều phiên, hỗ trợ tính năng "xem tiếp" (continue watching) trên trang chủ.

**Thành phần:**
- `src/server/watch/watch-history-service.ts` — Lưu/đọc history
- `hooks/useContinueWatching.ts` — Continue watching hook
- `lib/watch-progress.ts` — LocalStorage backup

**Flow:**
1. Mỗi 30 giây → POST /api/v1/progress lưu {movieId, episodeId, currentTime, duration}
2. WatchHistory được UPSERT vào DB
3. Backup vào localStorage (offline support)
4. Khi mở lại → API kiểm tra progress → Resume từ vị trí cũ

**Dữ liệu liên quan:** WatchHistory (movieId, episodeId, currentTime, duration, updatedAt)

**Kết quả đầu ra:** Người dùng thấy "Xem tiếp" trên trang chủ với đúng phim và vị trí đã dừng, cả khi chuyển thiết bị.

### 4.3 Watch Party (Xem chung)

**Mục tiêu:** Cho phép nhóm người dùng xem phim đồng bộ real-time trong cùng một phòng ảo, với khả năng chat và gọi voice/video.

> **[HÌNH 15: Giao diện Watch Party (phòng xem chung)]**

**Thành phần:**
- `server/watch-party/` — Repository, Service, Socket handlers
- `components/watch-party/` — UI components
- `hooks/useWatchParty.ts`, `hooks/useWatchSync.ts` — Client hooks
- `lib/watch-party/` — Store, sync client
- LiveKit SDK — Voice/video call

**Flow:**
1. Host tạo phòng → Backend sinh roomCode → Socket.IO tạo room
2. Guest nhập roomCode → Join phòng → Đồng bộ trạng thái video hiện tại
3. Host play/pause/seek → Socket.IO broadcast → Tất cả participants đồng bộ
4. Chat real-time qua Socket.IO → Persist WatchPartyMessage vào DB
5. Voice/Video call qua LiveKit WebRTC (tách riêng server app)

**Dữ liệu liên quan:** WatchPartyRoom, WatchPartyParticipant, WatchPartyState, WatchPartyMessage

**Kết quả đầu ra:** Tất cả participants xem cùng thời điểm video, chat real-time, có thể voice/video call. Trạng thái persist khi reconnect.

### 4.4 Review (Đánh giá phim)

**Mục tiêu:** Cho phép người dùng chia sẻ đánh giá về phim đã xem, với quy trình moderation đảm bảo chất lượng nội dung.

**Thành phần:**
- `src/server/modules/reviews/` — Service, repository
- `/api/admin/reviews/` — Admin moderation API

**Flow:**
1. User chọn rating (1-5 sao) + viết comment → POST review
2. Review lưu vào DB với status `pending`
3. Admin vào dashboard → Xem pending reviews → Approve / Reject / Flag
4. Chỉ review `approved` hiển thị trên trang phim

**Dữ liệu liên quan:** Review (userId, movieId, rating, comment, status: pending/approved/rejected/flagged)

**Kết quả đầu ra:** Chỉ review đã duyệt hiển thị trên trang phim. Admin có toàn bộ moderation workflow với audit trail.

### 4.5 Admin Dashboard (CMS)

**Mục tiêu:** Cung cấp hệ thống quản trị nội dung hoàn chỉnh cho đội ngũ vận hành, với phân quyền đa cấp và tracking hành động.

> **[HÌNH 16: Giao diện Admin Dashboard — Trang tổng quan]**

> **[HÌNH 17: Giao diện Admin Dashboard — Quản lý phim]**

**Chức năng chính:**
- Dashboard tổng quan (thống kê users, phim, revenue, page views)
- CRUD phim (tạo, sửa, xóa, publish, hide, archive, feature, trending)
- Quản lý episodes (video sources, subtitles, quality levels)
- Quản lý users (block/unblock, reset password, phân quyền)
- Quản lý tin tức, đánh giá, thể loại, quốc gia
- Upload media (poster, backdrop, thumbnail, video)
- Audit logs (ai làm gì, lúc nào)

**Bảo mật:** Middleware kiểm tra session + role trên mọi route `/dashboard/*` và `/api/admin/*`.

**Dữ liệu liên quan:** Toàn bộ entity trong hệ thống, AdminLog

**Kết quả đầu ra:** Admin vận hành được hệ thống hoàn toàn qua giao diện web, mọi thao tác đều có audit trail.

### 4.6 Sync dữ liệu (Data Pipeline)

**Mục tiêu:** Tự động hóa việc nhập và làm giàu dữ liệu phim từ nguồn bên ngoài, giảm thiểu thao tác thủ công cho admin.

**Thành phần:**
- `src/server/ophim/` — OPhim sync client, mapper
- `src/server/tmdb/` — TMDB enrichment, matcher
- `src/server/pipeline/` — Orchestrator

**Flow:**
1. Admin trigger sync → Tạo SyncJob (status: running)
2. Fetch catalog từ OPhim API → Validate + Map qua OPhimMapper
3. UPSERT Movie + Episodes + Genres + Countries vào DB
4. TMDB enrichment: search → match → fetch metadata (poster, cast, trailer)
5. Update Movie với TMDB data → UPSERT cast/crew
6. Ghi SyncLog cho mọi thao tác → Cập nhật SyncJob status

**Dữ liệu liên quan:** Movie, Episode, Genre, Country, Person, MovieSource, SyncJob, SyncLog

**Kết quả đầu ra:** Kho phim được cập nhật tự động với metadata đầy đủ (poster HD, cast, trailer), có SyncLog tracking cho mọi thao tác.

### 4.7 TCoin (Tiền ảo)

**Mục tiêu:** Tạo cơ chế gamification để tăng engagement, khuyến khích người dùng tương tác thường xuyên với hệ thống.

**Thành phần:**
- `src/server/modules/tcoin/` — Service
- Model: Wallet, WalletTransaction

**Cơ chế:**
- **Earn:** daily login, viết review, xem phim, mời bạn
- **Spend:** xóa quảng cáo, nâng chất lượng, xem phim sớm
- Transaction history với audit trail
- Payment orders (demo mode)

**Dữ liệu liên quan:** Wallet (userId, balance), WalletTransaction (type, amount, reason, createdAt)

**Kết quả đầu ra:** Người dùng có ví TCoin riêng, kiếm token từ hoạt động, sử dụng cho premium features. Mọi giao dịch có trail rõ ràng.

---

## CHƯƠNG 5: CÔNG NGHỆ SỬ DỤNG

Chương này trình bày chi tiết các công nghệ được sử dụng trong dự án. Việc lựa chọn công nghệ dựa trên các tiêu chí: hiệu năng, cộng đồng hỗ trợ, khả năng mở rộng, và phù hợp với yêu cầu nghiệp vụ.

### 5.1 Lý do chọn Next.js làm nền tảng chính

Next.js 16 được chọn làm framework chính vì khả năng kết hợp frontend và backend trong cùng một codebase (full-stack), hỗ trợ Server Components cho hiệu năng cao, App Router cho routing hiện đại, và API Routes cho REST API — giảm đáng kể độ phức tạp khi triển khai so với việc tách riêng frontend/backend.

### 5.2 Frontend

| Công nghệ | Mục đích |
|-----------|---------|
| **Next.js 16** (App Router) | Framework chính, SSR/RSC, routing, API routes |
| **TypeScript 5.7** | Type-safe development |
| **Tailwind CSS 4** | Utility-first CSS framework |
| **Radix UI + shadcn/ui** | Accessible UI components |
| **HLS.js** | Video streaming (adaptive bitrate) |
| **SWR** | Client-side data fetching + caching |
| **React Hook Form** | Form handling |
| **Recharts 2.15** | Charts cho admin dashboard |
| **Google Fonts (Inter)** | Typography (Latin + Vietnamese) |

### 5.3 Backend

Backend logic nằm trong Next.js API Routes kết hợp với custom server cho Socket.IO. Lựa chọn này cho phép share code giữa frontend và backend (TypeScript types, validation schemas).

| Công nghệ | Mục đích |
|-----------|---------|
| **Next.js API Routes** | REST API endpoints |
| **Prisma ORM 6** | Database ORM, migrations, type-safe queries |
| **bcryptjs** | Password hashing |
| **Zod** | Input validation schemas |
| **Socket.IO 4.8** | Real-time communication (Watch Party) |
| **LiveKit** | WebRTC voice/video call |

### 5.4 Database

| Công nghệ | Mục đích |
|-----------|---------|
| **SQLite** | Primary database (development + production) |
| **Prisma Migrate** | Schema migrations management |
| **Prisma Studio** | Database GUI |

### 5.5 External APIs

| API | Mục đích |
|-----|---------|
| **TMDB API v3** | Metadata phim (poster, cast, trailer, rating) |
| **OPhim / OPhim18 API** | Nguồn dữ liệu phim + video sources |
| **GNews API** | Tin tức phim |
| **LiveKit Cloud** | WebRTC signaling server |

### 5.6 Deploy & Infrastructure

| Công nghệ | Mục đích |
|-----------|---------|
| **Vultr VPS** | Production server |
| **PM2** | Process manager (auto-restart, cluster mode) |
| **Nginx** | Reverse proxy, SSL termination, gzip |
| **Cloudflare** | CDN, DNS, WAF, DDoS protection |
| **Docker** | Containerization (optional) |
| **GitHub Actions** | CI pipeline (lint, type check) |

---

## CHƯƠNG 6: KẾT QUẢ ĐẠT ĐƯỢC

Chương này tổng kết các kết quả đã đạt được sau quá trình phát triển, đối chiếu với mục tiêu ban đầu và nêu bật những điểm nổi bật của dự án.

> **[HÌNH 18: Giao diện trang chủ TERENCE]**

> **[HÌNH 19: Giao diện trang duyệt phim (Browse)]**

> **[HÌNH 20: Giao diện chi tiết phim]**

### 6.1 Các tính năng đã hoàn thành

Tổng cộng **15 nhóm tính năng** đã được phát triển và triển khai thành công trên môi trường production:

| # | Tính năng | Trạng thái |
|---|----------|------------|
| 1 | Trang chủ với Hero Banner, movie rows (trending, popular, mới) | ✅ Hoàn thành |
| 2 | Duyệt phim với filter (thể loại, quốc gia, năm, sắp xếp) | ✅ Hoàn thành |
| 3 | Tìm kiếm phim (full-text search + suggestions) | ✅ Hoàn thành |
| 4 | Chi tiết phim (poster, backdrop, cast, crew, phim tương tự) | ✅ Hoàn thành |
| 5 | Video player (HLS adaptive, resume playback, multi-source) | ✅ Hoàn thành |
| 6 | Watch history + Continue watching | ✅ Hoàn thành |
| 7 | Đăng ký / Đăng nhập / Phân quyền 5 roles | ✅ Hoàn thành |
| 8 | Watch Party (sync playback, chat, voice/video call) | ✅ Hoàn thành |
| 9 | Đánh giá phim (rating + moderation) | ✅ Hoàn thành |
| 10 | TCoin (earn, spend, wallet, transaction history) | ✅ Hoàn thành |
| 11 | Tin tức phim (GNews + TMDB aggregation) | ✅ Hoàn thành |
| 12 | Admin Dashboard (statistics, CRUD phim/user/news/review) | ✅ Hoàn thành |
| 13 | Data sync pipeline (OPhim → TMDB → DB) | ✅ Hoàn thành |
| 14 | Audit log (admin action tracking) | ✅ Hoàn thành |
| 15 | Deploy production (VPS + PM2 + Nginx + Cloudflare) | ✅ Hoàn thành |

### 6.2 Điểm nổi bật so với các đồ án tương tự

So với các đồ án xem phim thông thường (thường chỉ dừng ở CRUD phim + player đơn giản), TERENCE có nhiều điểm nổi trội:

1. **Kiến trúc production-ready:** Module-based, layered architecture với separation of concerns rõ ràng — không chỉ là ứng dụng demo
2. **Watch Party real-time:** Tính năng xem phim chung với đồng bộ playback + chat + voice/video call qua WebRTC — hiếm thấy trong đồ án môn học
3. **Data Pipeline tự động:** Hệ thống sync từ OPhim, enrichment từ TMDB, với SyncJob/SyncLog tracking — không cần nhập dữ liệu thủ công
4. **Admin CMS hoàn chỉnh:** Dashboard thống kê, CRUD đầy đủ, moderation workflow, audit log — đủ để vận hành thực tế
5. **HLS Adaptive Streaming:** Player tự chọn chất lượng theo băng thông, resume playback — trải nghiệm ngang nền tảng thương mại
6. **Deploy production thực tế:** Đã triển khai lên VPS với domain riêng, SSL certificate, CDN Cloudflare — không chỉ chạy localhost

### 6.3 So sánh với mục tiêu ban đầu

| Mục tiêu đề ra | Kết quả | Đánh giá |
|----------------|---------|----------|
| Web app xem phim full-stack | 15+ tính năng hoàn chỉnh | Vượt kỳ vọng |
| Tích hợp nguồn dữ liệu tự động | OPhim + TMDB pipeline | Đạt yêu cầu |
| CMS cho admin | Dashboard + CRUD + Audit | Vượt kỳ vọng |
| Watch Party real-time | Socket.IO + LiveKit | Vượt kỳ vọng |
| TCoin tiền ảo | Wallet + Earn/Spend + History | Đạt yêu cầu |
| Kiến trúc mở rộng | Module-based, layered, có docs | Đạt yêu cầu |

---

## CHƯƠNG 7: HƯỚNG PHÁT TRIỂN

Chương này trình bày các định hướng phát triển cho cả hai mặt: kỹ thuật (infrastructure, performance, testing) và sản phẩm (tính năng mới cho người dùng). Roadmap được chia theo quý để dễ theo dõi và đánh giá tiến độ.

### 7.1 Roadmap kỹ thuật

| Giai đoạn | Thời gian | Mục tiêu |
|-----------|-----------|----------|
| Foundation | Q2/2026 | PostgreSQL migration, unit tests, health check, rate limiting |
| Performance | Q3/2026 | Redis cache, BullMQ job queue, Meilisearch, monitoring |
| Features | Q3-Q4/2026 | Payment gateway (VNPay), object storage, CDN media |
| Intelligence | Q4/2026 | AI recommendation engine, advanced analytics |
| Architecture | Q4/2026 | Admin subdomain, modular monolith, microservices evaluation |

### 7.2 Roadmap sản phẩm

| # | Tính năng | Mô tả | Ưu tiên |
|---|----------|-------|---------|
| 1 | PostgreSQL Migration | Migrate SQLite → PostgreSQL cho production scale | Cao |
| 2 | Testing | Unit tests (Vitest) + E2E tests (Playwright) | Cao |
| 3 | AI Recommendation | Gợi ý phim dựa trên lịch sử xem (collaborative filtering) | Trung bình |
| 4 | Mobile App | React Native hoặc Flutter cho iOS/Android | Trung bình |
| 5 | Payment Gateway | VNPay/MoMo cho thanh toán TCoin thực tế | Trung bình |
| 6 | Elasticsearch | Full-text search chuyên sâu | Trung bình |
| 7 | Message Queue | BullMQ cho background jobs | Thấp |
| 8 | Redis Cache | Caching layer cho performance | Thấp |
| 9 | Microservices | Tách Watch Party, Sync Pipeline thành service riêng | Thấp |

---

## KẾT LUẬN

Sau quá trình phân tích, thiết kế, phát triển và triển khai, đồ án **TERENCE** đã hoàn thành đầy đủ 6/6 mục tiêu đề ra ban đầu. Hệ thống đã được triển khai thành công trên môi trường production thực tế, chứng minh khả năng áp dụng kiến thức lý thuyết vào xây dựng sản phẩm phần mềm có giá trị.

**Kết quả đạt được:**

- Xây dựng thành công hệ thống full-stack hoàn chỉnh với **15 nhóm tính năng**, từ giao diện người dùng, video streaming, đến quản trị nội dung
- Triển khai kiến trúc **Modular Monolith** với phân tầng rõ ràng (UI → API → Service → Data), sẵn sàng mở rộng thành microservices
- Phát triển tính năng **Watch Party** — xem phim chung real-time với đồng bộ playback, chat, và voice/video call — đây là tính năng nổi bật hiếm thấy trong đồ án môn học
- Xây dựng **Data Pipeline** tự động đồng bộ và làm giàu dữ liệu phim từ OPhim và TMDB, với hệ thống tracking (SyncJob/SyncLog)
- Thiết lập hệ thống **Admin CMS** hoàn chỉnh với RBAC 5 cấp, audit log, moderation workflow
- **Deploy production** thực tế trên VPS với Nginx, PM2, Cloudflare CDN, SSL
- Xây dựng **tài liệu kỹ thuật** đầy đủ (README chuẩn công ty, có UML, ERD, System Design)

**Hạn chế còn tồn tại:**

- **SQLite** chưa phù hợp cho quy mô lớn: không hỗ trợ concurrent writes, cần migrate sang PostgreSQL
- **Chưa có automated testing**: thiếu unit tests và E2E tests, tăng rủi ro khi refactor
- **Một số module code còn phân tán**: TMDB logic ở 3 nơi, watch history ở 2 nơi — cần gom lại
- **Chưa có rate limiting**: API dễ bị abuse, cần bổ sung middleware bảo vệ

**Bài học kinh nghiệm:**

- **Thiết kế kiến trúc từ đầu** giúp tiết kiệm rất nhiều thời gian refactor về sau. Việc tổ chức code theo domain modules đã cho phép nhóm phát triển song song nhiều tính năng mà không xung đột
- **Tài liệu hóa liên tục** (README-driven development) giúp mọi thành viên hiểu rõ hệ thống tại mọi thời điểm, giảm thiểu knowledge gap
- **Triển khai production sớm** (không chờ đến cuối) giúp phát hiện sớm các vấn đề về CORS, SSL, WebSocket, performance mà môi trường local không thể hiện
- **Sử dụng TypeScript** với Zod validation giúp bắt lỗi tại compile-time, giảm đáng kể bug runtime

**Đánh giá tổng quan:** Dự án TERENCE không chỉ đáp ứng yêu cầu đồ án mà còn vượt qua mức kỳ vọng ở nhiều khía cạnh. Kiến trúc và mã nguồn đã sẵn sàng để tiếp tục phát triển thành sản phẩm hoàn chỉnh trong tương lai, với lộ trình kỹ thuật rõ ràng từ migrate database, bổ sung testing, đến tích hợp AI recommendation và payment gateway.

---

## PHỤ LỤC

### Phụ lục A: Danh sách Module chính

| Module | Đường dẫn | Chức năng |
|--------|-----------|-----------|
| Movies | `src/server/movies/` | Movie service, serializers, API helpers |
| OPhim | `src/server/ophim/` | OPhim sync client, mapper, service |
| TMDB | `src/server/tmdb/` | TMDB enrichment, matcher, service |
| Pipeline | `src/server/pipeline/` | Movie enrichment pipeline orchestrator |
| Watch | `src/server/watch/` | Watch history service |
| Auth | `lib/auth/` | Session, password, permissions, RBAC |
| Watch Party | `server/watch-party/` | Repository, service, socket handlers |
| Admin | `src/server/modules/admin/` | Admin guard, dashboard |
| News | `src/server/modules/news/` | News CMS service |
| Reviews | `src/server/modules/reviews/` | Review moderation service |
| TCoin | `src/server/modules/tcoin/` | TCoin wallet, transactions |
| Users | `src/server/modules/users/` | User management service |

### Phụ lục B: Quy ước Code

| Loại | Quy ước | Ví dụ |
|------|---------|-------|
| File component | PascalCase | `MovieCard.tsx` |
| File hook | camelCase, prefix `use` | `usePlayer.ts` |
| File service | kebab-case | `movie-service.ts` |
| API route | kebab-case folders | `app/api/watch-party/create/` |
| DB model | PascalCase (Prisma) | `WatchPartyRoom` |
| Constants | UPPER_SNAKE_CASE | `MOBILE_BREAKPOINT` |

**Import rules:** Sử dụng alias `@/` (root project). Không circular imports.

**API response format:**
- Success: `{ data, pagination? }`
- Error: `{ error: string }`

### Phụ lục C: Nhật ký phát triển

| Ngày | Chức năng | Module ảnh hưởng |
|------|-----------|-----------------|
| 2026-03-22 | Khởi tạo dự án, auth, TMDB | app/, lib/auth, services/ |
| 2026-03-23 | Refactor navigation, browse | components/, app/browse |
| 2026-03-24 | Error boundaries, loading states, OPhim integration | app/, components/, src/server/ophim |
| 2026-03-25 | HLS player, deploy production | components/player, deploy |
| 2026-03-26 | Watch Party + LiveKit | watch-party, server/ |
| 2026-03-30 | Full debugging + stabilization | toàn bộ codebase |
| 2026-03-31 | Admin CMS: genres, countries, reviews, news | app/api/admin, dashboard |
| 2026-04-03 | Refactor kiến trúc + Nâng cấp README | toàn bộ codebase |

### Phụ lục D: Tài khoản kiểm thử

| Email | Mật khẩu | Quyền |
|-------|----------|-------|
| admin@terence.vn | Admin@12345 | Super Admin |
| staff@terence.vn | Staff@12345 | Staff |
| user@terence.vn | User@12345 | User |

---

## TÀI LIỆU THAM KHẢO

1. Next.js Documentation — https://nextjs.org/docs (truy cập: 03/2026)
2. Prisma ORM Documentation — https://www.prisma.io/docs (truy cập: 03/2026)
3. Socket.IO Documentation — https://socket.io/docs (truy cập: 03/2026)
4. TMDB API Documentation — https://developer.themoviedb.org/docs (truy cập: 03/2026)
5. LiveKit Documentation — https://docs.livekit.io (truy cập: 03/2026)
6. HLS.js GitHub — https://github.com/video-dev/hls.js (truy cập: 03/2026)
7. Tailwind CSS Documentation — https://tailwindcss.com/docs (truy cập: 03/2026)
8. shadcn/ui Documentation — https://ui.shadcn.com (truy cập: 03/2026)
9. Zod Documentation — https://zod.dev (truy cập: 03/2026)
10. OPhim API — https://ophim1.com/api (truy cập: 03/2026)

---

*Tài liệu này được đồng bộ với README.md của dự án TERENCE tại thời điểm 04/2026.*

*Cuối tài liệu*
