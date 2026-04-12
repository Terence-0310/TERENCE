import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopPosition, TabStopType, Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak } from "docx";
import { writeFileSync, readFileSync } from "fs";

// ── Helpers ──
const br = () => new Paragraph({});
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

const heading = (text, level = HeadingLevel.HEADING_1, opts = {}) =>
  new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 400 : 200, after: 120 },
    children: [new TextRun({ text, bold: true, font: "Times New Roman", size: level === HeadingLevel.HEADING_1 ? 32 : level === HeadingLevel.HEADING_2 ? 28 : 26, ...opts })],
  });

const para = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 360 },
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    indent: opts.noIndent ? undefined : { firstLine: 720 },
    children: [new TextRun({ text, font: "Times New Roman", size: 26, ...opts })],
  });

const paraMulti = (runs, opts = {}) =>
  new Paragraph({
    spacing: { after: 120, line: 360 },
    alignment: AlignmentType.JUSTIFIED,
    indent: opts.noIndent ? undefined : { firstLine: 720 },
    children: runs.map(r => typeof r === "string" ? new TextRun({ text: r, font: "Times New Roman", size: 26 }) : new TextRun({ font: "Times New Roman", size: 26, ...r })),
  });

const bullet = (text, level = 0) =>
  new Paragraph({
    spacing: { after: 60, line: 360 },
    bullet: { level },
    children: [new TextRun({ text, font: "Times New Roman", size: 26 })],
  });

const boldBullet = (label, desc) =>
  new Paragraph({
    spacing: { after: 60, line: 360 },
    bullet: { level: 0 },
    children: [
      new TextRun({ text: label, bold: true, font: "Times New Roman", size: 26 }),
      new TextRun({ text: desc, font: "Times New Roman", size: 26 }),
    ],
  });

const figPlaceholder = (label) =>
  new Paragraph({
    spacing: { before: 200, after: 200 },
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.DASHED, size: 1 }, bottom: { style: BorderStyle.DASHED, size: 1 }, left: { style: BorderStyle.DASHED, size: 1 }, right: { style: BorderStyle.DASHED, size: 1 } },
    children: [new TextRun({ text: `[${label}]`, font: "Times New Roman", size: 24, italics: true, color: "808080" })],
  });

const makeRow = (cells, isHeader = false) =>
  new TableRow({
    tableHeader: isHeader,
    children: cells.map(c => new TableCell({
      width: { size: 100 / cells.length, type: WidthType.PERCENTAGE },
      children: [new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: c, font: "Times New Roman", size: 22, bold: isHeader })] })],
    })),
  });

const makeTable = (headers, rows) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [makeRow(headers, true), ...rows.map(r => makeRow(r))],
  });

// ── Cover Page ──
const coverPage = [
  br(), br(), br(),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TRƯỜNG ĐẠI HỌC CÔNG NGHỆ TP.HCM (HUTECH)", font: "Times New Roman", size: 28, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "KHOA CÔNG NGHỆ THÔNG TIN", font: "Times New Roman", size: 28, bold: true })] }),
  br(), br(), br(),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "BÁO CÁO ĐỒ ÁN MÔN HỌC", font: "Times New Roman", size: 36, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CÔNG NGHỆ PHẦN MỀM", font: "Times New Roman", size: 32, bold: true })] }),
  br(), br(),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ĐỀ TÀI:", font: "Times New Roman", size: 28 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TERENCE — NỀN TẢNG XEM PHIM TRỰC TUYẾN", font: "Times New Roman", size: 32, bold: true })] }),
  br(), br(), br(),
  para("Sinh viên thực hiện : [Họ tên sinh viên]", { noIndent: true }),
  para("MSSV                        : [MSSV]", { noIndent: true }),
  para("Lớp                           : [Mã lớp]", { noIndent: true }),
  para("Giảng viên hướng dẫn: [Họ tên giảng viên]", { noIndent: true }),
  br(), br(),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Năm học: 2025 – 2026", font: "Times New Roman", size: 26 })] }),
  br(),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TP. Hồ Chí Minh, tháng 04 năm 2026", font: "Times New Roman", size: 26, italics: true })] }),
  pageBreak(),
];

// ── Lời mở đầu ──
const loiMoDau = [
  heading("LỜI MỞ ĐẦU"),
  para("Trong bối cảnh chuyển đổi số toàn cầu, nhu cầu giải trí trực tuyến đã tăng trưởng vượt bậc. Theo báo cáo của Statista (2025), thị trường video streaming toàn cầu đạt giá trị hơn 100 tỷ USD, với hàng trăm triệu người dùng truy cập hàng ngày. Tại Việt Nam, các nền tảng như Netflix, FPT Play, Galaxy Play đã cho thấy tiềm năng rất lớn của thị trường nội dung số."),
  para("Việc xây dựng một nền tảng xem phim trực tuyến hoàn chỉnh không chỉ đòi hỏi kiến thức về lập trình web cơ bản, mà còn yêu cầu sự kết hợp chuyên sâu của nhiều lĩnh vực công nghệ: kiến trúc phần mềm phân tầng, streaming video thích ứng (adaptive bitrate), giao tiếp real-time (WebSocket), quản trị nội dung (CMS), và vận hành hệ thống production."),
  para("Đồ án TERENCE ra đời nhằm mục tiêu xây dựng một nền tảng xem phim trực tuyến full-stack, áp dụng toàn diện các kiến thức đã học trong môn Công nghệ phần mềm — từ phân tích yêu cầu, thiết kế UML, đến phát triển module và triển khai lên server thực tế."),
  para("Trong suốt quá trình thực hiện, nhóm đã áp dụng quy trình phát triển phần mềm chuyên nghiệp: khảo sát yêu cầu, phân tích nghiệp vụ, thiết kế kiến trúc và cơ sở dữ liệu, phát triển từng module theo kiến trúc phân tầng, kiểm thử tích hợp, và triển khai lên server production với domain thực tế."),
  para("Báo cáo này trình bày chi tiết quá trình phân tích, thiết kế, xây dựng và triển khai hệ thống TERENCE. Nội dung được tổ chức thành 7 chương, bắt đầu từ tổng quan đề tài, qua phân tích và thiết kế hệ thống, đến thiết kế chi tiết chức năng, công nghệ sử dụng, kết quả đạt được, và hướng phát triển tương lai."),
  para("Em xin chân thành cảm ơn giảng viên hướng dẫn đã tận tình hỗ trợ, góp ý và định hướng trong suốt quá trình thực hiện đồ án này."),
  pageBreak(),
];

// ── Chapter 1 ──
const ch1 = [
  heading("CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI"),
  para("Chương này trình bày bối cảnh ra đời của đề tài, lý do lựa chọn, các mục tiêu cần đạt được, phạm vi thực hiện và định hướng phát triển lâu dài của dự án TERENCE."),
  heading("1.1 Lý do chọn đề tài", HeadingLevel.HEADING_2),
  para("Thị trường video streaming đang phát triển mạnh mẽ trên toàn cầu và tại Việt Nam. Người dùng ngày càng kỳ vọng cao hơn về trải nghiệm xem phim trực tuyến: chất lượng video thích ứng theo băng thông, khả năng xem tiếp từ vị trí dừng lại, và tính năng xã hội như xem phim cùng bạn bè."),
  para("Tuy nhiên, phần lớn các dự án đồ án môn học thường chỉ dừng ở mức ứng dụng CRUD cơ bản, chưa giải quyết được các bài toán kỹ thuật phức tạp trong thực tế như:"),
  boldBullet("Streaming video: ", "phát video qua giao thức HLS với adaptive bitrate, tự động chọn chất lượng theo băng thông"),
  boldBullet("Giao tiếp real-time: ", "đồng bộ trạng thái phát video giữa nhiều người dùng trong cùng một phòng xem chung"),
  boldBullet("Tích hợp dữ liệu bên ngoài: ", "xây dựng pipeline tự động đồng bộ và làm giàu dữ liệu phim từ nhiều nguồn API"),
  boldBullet("Quản trị nội dung chuyên nghiệp: ", "hệ thống CMS với phân quyền đa cấp, audit log, và moderation workflow"),
  para("Với mong muốn áp dụng toàn diện kiến thức môn Công nghệ phần mềm vào một sản phẩm có giá trị thực tế, nhóm đã chọn đề tài xây dựng nền tảng xem phim trực tuyến TERENCE — một hệ thống full-stack hoàn chỉnh từ giao diện người dùng, API backend, cơ sở dữ liệu, đến triển khai production."),

  heading("1.2 Mục tiêu dự án", HeadingLevel.HEADING_2),
  para("Dự án đặt ra 6 mục tiêu chính, tất cả đều đã được hoàn thành:"),
  makeTable(["#", "Mục tiêu", "Mô tả chi tiết", "Trạng thái"], [
    ["1", "Xây dựng web app full-stack", "Giao diện + API + Database + Deploy", "✅ Đạt"],
    ["2", "Tích hợp dữ liệu tự động", "Pipeline OPhim + TMDB enrichment", "✅ Đạt"],
    ["3", "CMS cho admin", "Dashboard + CRUD + moderation + audit", "✅ Đạt"],
    ["4", "Watch Party real-time", "Socket.IO + LiveKit voice/video", "✅ Đạt"],
    ["5", "TCoin tiền ảo", "Ví + earn/spend + transaction history", "✅ Đạt"],
    ["6", "Kiến trúc mở rộng", "Module-based, layered, microservice-ready", "✅ Đạt"],
  ]),

  heading("1.3 Phạm vi dự án", HeadingLevel.HEADING_2),
  para("Phạm vi đã thực hiện:"),
  makeTable(["Nhóm chức năng", "Chi tiết"], [
    ["Giao diện người dùng", "Trang chủ, duyệt phim, tìm kiếm, lọc thể loại/quốc gia, chi tiết phim"],
    ["Xem phim", "HLS adaptive streaming, resume playback, lưu tiến trình, chuyển tập tự động"],
    ["Xác thực & Phân quyền", "Đăng ký / Đăng nhập, 5 roles (super_admin → user)"],
    ["Tương tác xã hội", "Watch Party (sync + chat + call), đánh giá phim, tin tức phim"],
    ["Gamification", "TCoin (earn/spend, wallet, transaction history)"],
    ["Quản trị", "Admin Dashboard, CRUD toàn bộ entity, upload media, audit log"],
    ["Data pipeline", "OPhim sync → TMDB enrichment → DB upsert"],
    ["Triển khai", "Production: Vultr VPS + PM2 + Nginx + Cloudflare"],
  ]),
  br(),
  para("Ngoài phạm vi (dành cho giai đoạn phát triển tiếp theo):"),
  bullet("Tích hợp cổng thanh toán thực tế (VNPay, MoMo)"),
  bullet("Ứng dụng mobile (iOS / Android)"),
  bullet("AI recommendation engine"),
  bullet("Migrate database sang PostgreSQL"),

  heading("1.4 Định hướng phát triển", HeadingLevel.HEADING_2),
  para("Dự án được thiết kế theo mô hình Modular Monolith — toàn bộ code nằm trong một codebase duy nhất nhưng được tổ chức thành các module độc lập theo domain. Cách tiếp cận này mang lại lợi ích kép: đơn giản trong triển khai và vận hành, đồng thời sẵn sàng tách thành microservices khi nhu cầu scale tăng lên."),
  para("Các hướng phát triển ưu tiên bao gồm: migrate sang PostgreSQL, bổ sung hệ thống testing (unit + E2E), tích hợp AI recommendation, phát triển mobile app, và kết nối cổng thanh toán thực tế."),
  pageBreak(),
];

// ── Chapter 2 ──
const ch2 = [
  heading("CHƯƠNG 2: PHÂN TÍCH HỆ THỐNG"),
  para("Chương này trình bày quá trình phân tích yêu cầu hệ thống, bao gồm: xác định các tác nhân (actor), phân tích use case, xây dựng user story, và đặc tả yêu cầu chức năng — phi chức năng."),

  heading("2.1 Xác định Actor", HeadingLevel.HEADING_2),
  para("Hệ thống TERENCE phục vụ nhiều nhóm người dùng với quyền hạn khác nhau, được phân cấp theo mô hình RBAC gồm 5 role chính và 1 tác nhân hệ thống:"),
  makeTable(["Actor", "Mô tả", "Quyền hạn chính"], [
    ["Guest", "Người truy cập chưa đăng nhập", "Duyệt phim, tìm kiếm, xem trailer"],
    ["User", "Người dùng đã đăng nhập", "Xem phim, đánh giá, watch party, TCoin"],
    ["Editor", "Biên tập viên", "Quản lý tin tức, duyệt đánh giá"],
    ["Staff", "Nhân viên vận hành", "Quản lý phim, episodes, users"],
    ["Admin", "Quản trị viên", "Toàn quyền hệ thống, sync dữ liệu"],
    ["Super Admin", "Quản trị cấp cao nhất", "Toàn quyền + quản lý admin khác"],
    ["System", "Tác nhân tự động", "Sync pipeline, scheduled tasks"],
  ]),
  figPlaceholder("Hình 1: Sơ đồ phân cấp Actor trong hệ thống TERENCE"),

  heading("2.2 Use Case Overview", HeadingLevel.HEADING_2),
  makeTable(["Nhóm", "Các Use Case", "Actor liên quan"], [
    ["Xác thực", "Đăng ký, Đăng nhập, Đăng xuất", "Guest, User"],
    ["Khám phá phim", "Duyệt, Tìm kiếm, Lọc, Chi tiết, Trailer", "Guest, User"],
    ["Xem phim", "Phát HLS, Resume, Chuyển tập, Lịch sử", "User"],
    ["Tương tác", "Đánh giá, Tin tức, Watch Party, Call", "User"],
    ["TCoin", "Kiếm, Sử dụng, Xem transaction history", "User"],
    ["Quản trị", "CRUD, Upload, Duyệt, Sync, Audit log", "Admin, Staff, System"],
  ]),
  figPlaceholder("Hình 2: Sơ đồ Use Case tổng quan hệ thống TERENCE"),

  heading("2.3 User Story", HeadingLevel.HEADING_2),
  heading("2.3.1 User Story cho người dùng", HeadingLevel.HEADING_3),
  paraMulti([{ text: "US-01: Duyệt và tìm kiếm phim. ", bold: true }, "Người dùng truy cập trang chủ → Xem phim trending → Dùng bộ lọc hoặc search → Xem kết quả → Chọn phim. Kết quả: Tìm được phim phù hợp."]),
  paraMulti([{ text: "US-02: Xem phim trực tuyến. ", bold: true }, "Chọn phim → Player tự chọn chất lượng → Xem phim → Tắt tab → Quay lại → Xem tiếp. Kết quả: Phim phát mượt, progress tự động lưu."]),
  paraMulti([{ text: "US-03: Watch Party. ", bold: true }, "Chọn phim → Tạo phòng → Chia sẻ room code → Bạn join → Playback đồng bộ → Chat/Call. Kết quả: Mọi người xem cùng lúc."]),
  paraMulti([{ text: "US-04: Đánh giá phim. ", bold: true }, "Rating 1-5 sao → Viết comment → Gửi → Chờ duyệt → Hiển thị. Kết quả: Review chất lượng được hiển thị."]),
  paraMulti([{ text: "US-05: TCoin. ", bold: true }, "Đăng nhập hàng ngày → Nhận TCoin → Viết review → Nhận thêm → Đổi premium. Kết quả: User tích lũy và sử dụng TCoin."]),

  heading("2.3.2 User Story cho Admin", HeadingLevel.HEADING_3),
  paraMulti([{ text: "US-06: Quản lý kho phim. ", bold: true }, "Dashboard → CRUD phim/tập → Publish/Hide/Archive. Kết quả: Kho phim được cập nhật."]),
  paraMulti([{ text: "US-07: Đồng bộ dữ liệu. ", bold: true }, "Trigger sync → Fetch OPhim → Upsert DB → TMDB enrichment. Kết quả: Kho phim làm giàu tự động."]),
  paraMulti([{ text: "US-08: Duyệt đánh giá. ", bold: true }, "Dashboard → Pending reviews → Approve/Reject/Flag → Audit log. Kết quả: Chỉ review chất lượng hiển thị."]),

  heading("2.4 Yêu cầu chức năng", HeadingLevel.HEADING_2),
  makeTable(["#", "Yêu cầu", "Mô tả", "Ưu tiên"], [
    ["FR-01", "Đăng ký / Đăng nhập", "Email + password, bcrypt, cookie session", "Cao"],
    ["FR-02", "Phân quyền RBAC", "5 roles: super_admin → user", "Cao"],
    ["FR-03", "Duyệt phim", "Trang chủ, browse, filter", "Cao"],
    ["FR-04", "Tìm kiếm", "Full-text search", "Cao"],
    ["FR-05", "Xem phim", "HLS streaming, adaptive bitrate", "Cao"],
    ["FR-06", "Resume playback", "Lưu tiến trình, xem tiếp", "Cao"],
    ["FR-07", "Watch Party", "Tạo/join phòng, sync, chat, call", "Trung bình"],
    ["FR-08", "Đánh giá phim", "Rating + comment + moderation", "Trung bình"],
    ["FR-09", "TCoin", "Ví, earn/spend, transaction history", "Trung bình"],
    ["FR-10", "Admin CMS", "CRUD toàn bộ entity", "Cao"],
    ["FR-11", "Data sync", "OPhim + TMDB pipeline", "Cao"],
    ["FR-12", "Audit log", "Tracking thao tác admin", "Trung bình"],
  ]),

  heading("2.5 Yêu cầu phi chức năng", HeadingLevel.HEADING_2),
  makeTable(["#", "Yêu cầu", "Mô tả"], [
    ["NFR-01", "Hiệu năng", "Trang chủ load < 3 giây, video phát < 5 giây"],
    ["NFR-02", "Bảo mật", "Bcrypt, httpOnly cookie, server-only API keys"],
    ["NFR-03", "Khả năng mở rộng", "Module-based, sẵn sàng tách microservice"],
    ["NFR-04", "Tính sẵn sàng", "PM2 auto-restart, Cloudflare CDN"],
    ["NFR-05", "Trải nghiệm", "Responsive, dark mode, adaptive streaming"],
    ["NFR-06", "Bảo trì", "Coding convention, README chuẩn, audit log"],
  ]),
  pageBreak(),
];

// ── Chapter 3 ──
const ch3 = [
  heading("CHƯƠNG 3: THIẾT KẾ HỆ THỐNG"),
  para("Chương này trình bày thiết kế tổng thể của hệ thống TERENCE, bao gồm: kiến trúc phần mềm, cấu trúc mã nguồn, thiết kế cơ sở dữ liệu, và tổng quan các sơ đồ UML."),

  heading("3.1 Kiến trúc tổng thể", HeadingLevel.HEADING_2),
  para("Hệ thống sử dụng kiến trúc Modular Monolith trên nền tảng Next.js 16 với App Router. Kiến trúc kết hợp ưu điểm của monolith (đơn giản, dễ debug) với tính tổ chức của microservices (code tách theo domain)."),
  figPlaceholder("Hình 3: Sơ đồ kiến trúc tổng thể hệ thống TERENCE"),
  makeTable(["Tầng", "Thành phần", "Vai trò"], [
    ["Client", "Next.js (RSC + Client Components)", "Giao diện, video player"],
    ["Edge", "Cloudflare CDN + WAF", "Cache, DDoS protection, SSL"],
    ["Reverse Proxy", "Nginx", "SSL termination, gzip, proxy pass"],
    ["Application", "Next.js API + Socket.IO", "Business logic, REST API, real-time"],
    ["Data", "Prisma ORM + SQLite", "Lưu trữ, ORM mapping"],
    ["External", "TMDB, OPhim, LiveKit, GNews", "Metadata, video, WebRTC, tin tức"],
  ]),

  heading("3.2 Cấu trúc thư mục", HeadingLevel.HEADING_2),
  para("Mã nguồn được tổ chức theo nguyên tắc separation of concerns:"),
  figPlaceholder("Hình 4: Sơ đồ cấu trúc thư mục dự án"),
  bullet("app/ — Next.js App Router (routes + API routes)"),
  bullet("components/ — React Components (UI, shared, player, watch-party)"),
  bullet("src/server/ — Server-side domain modules (movies, ophim, tmdb, pipeline)"),
  bullet("lib/ — Shared libraries (auth, utils, player)"),
  bullet("hooks/ — Custom React Hooks (usePlayer, useHLS, useWatchParty)"),
  bullet("prisma/ — Database schema, migrations, seed"),
  bullet("server/ — Custom server (Socket.IO + Watch Party)"),
  bullet("scripts/ — CLI automation scripts"),

  heading("3.3 Cơ sở dữ liệu", HeadingLevel.HEADING_2),
  para("Database Engine: SQLite qua Prisma ORM 6. Lựa chọn phù hợp cho giai đoạn phát triển, trong roadmap sẽ migrate sang PostgreSQL."),
  makeTable(["Nhóm", "Entity", "Mô tả"], [
    ["Người dùng", "User, Session", "Tài khoản (5 roles), phiên đăng nhập"],
    ["Nội dung phim", "Movie, Episode, VideoSource", "Phim, tập phim, nguồn video HLS"],
    ["Metadata", "Genre, Country, Person", "Thể loại, quốc gia, diễn viên (M:N)"],
    ["Tương tác", "WatchHistory, Favorite, Review", "Lịch sử xem, yêu thích, đánh giá"],
    ["Watch Party", "Room, Participant, State, Message", "Phòng, thành viên, trạng thái, chat"],
    ["TCoin", "Wallet, WalletTransaction", "Ví tiền ảo, giao dịch"],
    ["CMS", "NewsPost, Short, Upload", "Tin tức, video ngắn, file upload"],
    ["Hệ thống", "AdminLog, SyncJob, SyncLog", "Audit log, pipeline tracking"],
  ]),

  heading("3.4 Sơ đồ quan hệ thực thể (ERD)", HeadingLevel.HEADING_2),
  figPlaceholder("Hình 5: Sơ đồ ERD (Entity Relationship Diagram) đầy đủ"),
  makeTable(["Quan hệ", "Loại", "Mô tả"], [
    ["User → Session", "1:N", "Một user có nhiều phiên đăng nhập"],
    ["User → WatchHistory", "1:N", "Một user có nhiều lịch sử xem"],
    ["User → Wallet", "1:1", "Mỗi user có đúng 1 ví TCoin"],
    ["Movie → Episode", "1:N", "Một phim bộ có nhiều tập"],
    ["Episode → VideoSource", "1:N", "Một tập có nhiều nguồn video"],
    ["Movie ↔ Genre", "M:N", "Phim ↔ Thể loại (bảng trung gian)"],
    ["Movie ↔ Person", "M:N", "Phim ↔ Diễn viên/Đạo diễn"],
    ["WatchPartyRoom → State", "1:1", "Mỗi phòng có 1 trạng thái playback"],
    ["WatchPartyRoom → Message", "1:N", "Mỗi phòng có nhiều tin nhắn"],
  ]),

  heading("3.5 Tổng quan Sequence Diagram và Activity Diagram", HeadingLevel.HEADING_2),
  para("Hệ thống được thiết kế với 3 sequence diagram và 5 activity diagram cho các chức năng chính:"),
  figPlaceholder("Hình 6: Sequence Diagram — Luồng xem phim"),
  figPlaceholder("Hình 7: Sequence Diagram — Luồng Watch Party"),
  figPlaceholder("Hình 8: Sequence Diagram — Luồng sync dữ liệu"),
  figPlaceholder("Hình 9: Activity Diagram — Đăng nhập hệ thống"),
  figPlaceholder("Hình 10: Activity Diagram — Xem phim"),
  figPlaceholder("Hình 11: Activity Diagram — Tạo Watch Party"),
  figPlaceholder("Hình 12: Activity Diagram — Sync dữ liệu phim"),
  figPlaceholder("Hình 13: Activity Diagram — Quản lý phim (Admin)"),
  pageBreak(),
];

// ── Chapter 4 ──
const funcSection = (num, title, objective, components, flow, data, result, figures = []) => [
  heading(`4.${num} ${title}`, HeadingLevel.HEADING_2),
  paraMulti([{ text: "Mục tiêu: ", bold: true }, objective]),
  ...figures.map(f => figPlaceholder(f)),
  paraMulti([{ text: "Thành phần kỹ thuật: ", bold: true }]),
  ...components.map(c => bullet(c)),
  paraMulti([{ text: "Luồng xử lý: ", bold: true }]),
  ...flow.map((f, i) => bullet(`${i + 1}. ${f}`)),
  paraMulti([{ text: "Dữ liệu liên quan: ", bold: true }, data]),
  paraMulti([{ text: "Kết quả đầu ra: ", bold: true }, result]),
];

const ch4 = [
  heading("CHƯƠNG 4: THIẾT KẾ CHI TIẾT CHỨC NĂNG"),
  para("Chương này trình bày thiết kế chi tiết cho 7 chức năng cốt lõi. Mỗi chức năng mô tả theo: mục tiêu, thành phần, luồng xử lý, dữ liệu, và kết quả."),

  ...funcSection(1, "Xem phim (Video Player)",
    "Cho phép người dùng xem phim trực tuyến với chất lượng tự động điều chỉnh theo băng thông, hỗ trợ xem tiếp từ vị trí đã dừng.",
    ["EnhancedVideoPlayer.tsx — Player chính", "useHLS.ts — HLS.js integration", "usePlayer.ts — Player state", "/api/v1/watch/[movieId] — Watch bootstrap API"],
    ["User mở trang phim → API trả chi tiết + episodes", "Nhấn 'Xem phim' → API trả WatchBootstrap (streamUrl, progress)", "HLS.js khởi tạo → Adaptive streaming tự chọn chất lượng", "Progress lưu tự động mỗi 30 giây (DB + localStorage)", "Hỗ trợ resume playback, chuyển tập tự động"],
    "Movie, Episode, VideoSource, WatchHistory",
    "Video phát mượt mà, tiến trình lưu liên tục, hỗ trợ resume.",
    ["Hình 14: Giao diện trang xem phim (Video Player)"]),

  ...funcSection(2, "Watch History (Lịch sử xem)",
    "Theo dõi tiến trình xem phim qua nhiều phiên, hỗ trợ 'xem tiếp' trên trang chủ.",
    ["watch-history-service.ts — Lưu/đọc history", "useContinueWatching.ts — Hook", "watch-progress.ts — localStorage backup"],
    ["Mỗi 30 giây → POST /api/v1/progress", "WatchHistory UPSERT vào DB", "Backup vào localStorage (offline support)", "Khi mở lại → API kiểm tra progress → Resume"],
    "WatchHistory (movieId, episodeId, currentTime, duration)",
    "Người dùng thấy 'Xem tiếp' trên trang chủ với đúng phim và vị trí.",
    []),

  ...funcSection(3, "Watch Party (Xem chung)",
    "Cho phép nhóm người dùng xem phim đồng bộ real-time, chat và gọi voice/video.",
    ["server/watch-party/ — Repository, Service, Socket handlers", "components/watch-party/ — UI", "LiveKit SDK — Voice/video call"],
    ["Host tạo phòng → Backend sinh roomCode → Socket.IO room", "Guest nhập roomCode → Join → Đồng bộ video hiện tại", "Host play/pause/seek → Broadcast → All participants sync", "Chat qua Socket.IO → Persist WatchPartyMessage", "Voice/Video call qua LiveKit WebRTC"],
    "WatchPartyRoom, Participant, State, Message",
    "Tất cả participants xem cùng thời điểm, chat real-time, voice/video call.",
    ["Hình 15: Giao diện Watch Party (phòng xem chung)"]),

  ...funcSection(4, "Review (Đánh giá phim)",
    "Cho phép đánh giá phim với quy trình moderation đảm bảo chất lượng.",
    ["src/server/modules/reviews/ — Service, repository", "/api/admin/reviews/ — Admin moderation API"],
    ["User chọn rating 1-5 sao + viết comment → POST", "Review lưu DB với status 'pending'", "Admin xem pending → Approve / Reject / Flag", "Chỉ review 'approved' hiển thị trên trang phim"],
    "Review (userId, movieId, rating, comment, status)",
    "Chỉ review đã duyệt hiển thị. Admin có moderation workflow + audit trail.",
    []),

  ...funcSection(5, "Admin Dashboard (CMS)",
    "Hệ thống quản trị nội dung hoàn chỉnh với phân quyền đa cấp và tracking.",
    ["Dashboard tổng quan (thống kê)", "CRUD phim, episodes, users", "Quản lý tin tức, đánh giá, thể loại", "Upload media, audit logs"],
    ["Admin đăng nhập → Middleware kiểm tra role", "Dashboard hiển thị statistics", "CRUD phim → Zod validate → DB → AdminLog", "Moderation workflow cho reviews, news"],
    "Toàn bộ entity, AdminLog",
    "Admin vận hành hệ thống qua giao diện web, mọi thao tác có audit trail.",
    ["Hình 16: Admin Dashboard — Trang tổng quan", "Hình 17: Admin Dashboard — Quản lý phim"]),

  ...funcSection(6, "Sync dữ liệu (Data Pipeline)",
    "Tự động hóa việc nhập và làm giàu dữ liệu phim từ nguồn bên ngoài.",
    ["src/server/ophim/ — OPhim sync client, mapper", "src/server/tmdb/ — TMDB enrichment", "src/server/pipeline/ — Orchestrator"],
    ["Admin trigger sync → Tạo SyncJob (running)", "Fetch catalog từ OPhim API → Validate + Map", "UPSERT Movie + Episodes + Genres + Countries", "TMDB enrichment: search → match → fetch metadata", "Update Movie → UPSERT cast/crew", "Ghi SyncLog cho mọi thao tác"],
    "Movie, Episode, Genre, Country, Person, SyncJob, SyncLog",
    "Kho phim cập nhật tự động với metadata đầy đủ (poster HD, cast, trailer).",
    []),

  ...funcSection(7, "TCoin (Tiền ảo)",
    "Tạo cơ chế gamification để tăng engagement người dùng.",
    ["src/server/modules/tcoin/ — Service", "Model: Wallet, WalletTransaction"],
    ["User đăng nhập hàng ngày → Nhận TCoin", "Viết review / Xem phim → Nhận thêm", "Dùng TCoin đổi premium features", "Transaction history lưu đầy đủ"],
    "Wallet (userId, balance), WalletTransaction (type, amount, reason)",
    "Người dùng tích lũy TCoin, sử dụng cho premium features.",
    []),
  pageBreak(),
];

// ── Chapters 5-7 + Conclusion + Appendix ──
const ch5 = [
  heading("CHƯƠNG 5: CÔNG NGHỆ SỬ DỤNG"),
  para("Chương này trình bày chi tiết các công nghệ được sử dụng. Việc lựa chọn dựa trên: hiệu năng, cộng đồng hỗ trợ, khả năng mở rộng, phù hợp nghiệp vụ."),
  heading("5.1 Lý do chọn Next.js", HeadingLevel.HEADING_2),
  para("Next.js 16 được chọn vì khả năng kết hợp frontend/backend trong cùng codebase, hỗ trợ Server Components cho hiệu năng, App Router cho routing hiện đại, và API Routes cho REST API."),
  heading("5.2 Frontend", HeadingLevel.HEADING_2),
  makeTable(["Công nghệ", "Mục đích"], [
    ["Next.js 16 (App Router)", "Framework chính, SSR/RSC, routing"], ["TypeScript 5.7", "Type-safe development"],
    ["Tailwind CSS 4", "Utility-first CSS"], ["Radix UI + shadcn/ui", "Accessible components"],
    ["HLS.js", "Video streaming adaptive"], ["SWR", "Client-side caching"],
    ["React Hook Form", "Form handling"], ["Recharts 2.15", "Charts"], ["Google Fonts (Inter)", "Typography"],
  ]),
  heading("5.3 Backend", HeadingLevel.HEADING_2),
  makeTable(["Công nghệ", "Mục đích"], [
    ["Next.js API Routes", "REST API"], ["Prisma ORM 6", "Database ORM, migrations"],
    ["bcryptjs", "Password hashing"], ["Zod", "Input validation"],
    ["Socket.IO 4.8", "Real-time (Watch Party)"], ["LiveKit", "WebRTC voice/video"],
  ]),
  heading("5.4 Database", HeadingLevel.HEADING_2),
  makeTable(["Công nghệ", "Mục đích"], [["SQLite", "Primary database"], ["Prisma Migrate", "Schema migrations"], ["Prisma Studio", "Database GUI"]]),
  heading("5.5 External APIs", HeadingLevel.HEADING_2),
  makeTable(["API", "Mục đích"], [["TMDB API v3", "Metadata phim"], ["OPhim / OPhim18", "Nguồn dữ liệu + video"], ["GNews API", "Tin tức phim"], ["LiveKit Cloud", "WebRTC signaling"]]),
  heading("5.6 Deploy & Infrastructure", HeadingLevel.HEADING_2),
  makeTable(["Công nghệ", "Mục đích"], [["Vultr VPS", "Production server"], ["PM2", "Process manager"], ["Nginx", "Reverse proxy, SSL, gzip"], ["Cloudflare", "CDN, DNS, WAF"], ["GitHub Actions", "CI pipeline"]]),
  pageBreak(),
];

const ch6 = [
  heading("CHƯƠNG 6: KẾT QUẢ ĐẠT ĐƯỢC"),
  para("Chương này tổng kết các kết quả đã đạt được, đối chiếu với mục tiêu ban đầu và nêu bật điểm nổi bật."),
  figPlaceholder("Hình 18: Giao diện trang chủ TERENCE"),
  figPlaceholder("Hình 19: Giao diện trang duyệt phim (Browse)"),
  figPlaceholder("Hình 20: Giao diện chi tiết phim"),
  heading("6.1 Các tính năng đã hoàn thành", HeadingLevel.HEADING_2),
  para("Tổng cộng 15 nhóm tính năng đã hoàn thành và triển khai trên production:"),
  makeTable(["#", "Tính năng", "Trạng thái"], [
    ["1", "Trang chủ (Hero Banner, movie rows)", "✅"], ["2", "Duyệt phim + filter", "✅"],
    ["3", "Tìm kiếm full-text", "✅"], ["4", "Chi tiết phim", "✅"],
    ["5", "Video player HLS adaptive", "✅"], ["6", "Watch history + Continue watching", "✅"],
    ["7", "Auth + Phân quyền 5 roles", "✅"], ["8", "Watch Party (sync + chat + call)", "✅"],
    ["9", "Đánh giá phim + moderation", "✅"], ["10", "TCoin (earn/spend/wallet)", "✅"],
    ["11", "Tin tức phim", "✅"], ["12", "Admin Dashboard + CMS", "✅"],
    ["13", "Data sync pipeline", "✅"], ["14", "Audit log", "✅"],
    ["15", "Deploy production (VPS + PM2 + Nginx + CDN)", "✅"],
  ]),
  heading("6.2 Điểm nổi bật", HeadingLevel.HEADING_2),
  boldBullet("Kiến trúc production-ready: ", "Module-based, layered architecture — không chỉ là demo CRUD"),
  boldBullet("Watch Party real-time: ", "Đồng bộ playback + chat + voice/video call qua WebRTC"),
  boldBullet("Data Pipeline tự động: ", "Sync OPhim + TMDB enrichment với SyncJob/SyncLog tracking"),
  boldBullet("Admin CMS hoàn chỉnh: ", "Dashboard, CRUD, moderation, audit log"),
  boldBullet("HLS Adaptive Streaming: ", "Player tự chọn chất lượng, resume playback"),
  boldBullet("Deploy thực tế: ", "VPS + domain + SSL + CDN — không chỉ localhost"),
  heading("6.3 So sánh với mục tiêu ban đầu", HeadingLevel.HEADING_2),
  makeTable(["Mục tiêu đề ra", "Kết quả", "Đánh giá"], [
    ["Web app full-stack", "15+ tính năng hoàn chỉnh", "Vượt kỳ vọng"],
    ["Tích hợp dữ liệu tự động", "OPhim + TMDB pipeline", "Đạt yêu cầu"],
    ["CMS cho admin", "Dashboard + CRUD + Audit", "Vượt kỳ vọng"],
    ["Watch Party real-time", "Socket.IO + LiveKit", "Vượt kỳ vọng"],
    ["TCoin tiền ảo", "Wallet + Earn/Spend + History", "Đạt yêu cầu"],
    ["Kiến trúc mở rộng", "Module-based + docs", "Đạt yêu cầu"],
  ]),
  pageBreak(),
];

const ch7 = [
  heading("CHƯƠNG 7: HƯỚNG PHÁT TRIỂN"),
  para("Chương này trình bày các định hướng phát triển cho cả hai mặt: kỹ thuật và sản phẩm."),
  heading("7.1 Roadmap kỹ thuật", HeadingLevel.HEADING_2),
  makeTable(["Giai đoạn", "Thời gian", "Mục tiêu"], [
    ["Foundation", "Q2/2026", "PostgreSQL, unit tests, health check, rate limiting"],
    ["Performance", "Q3/2026", "Redis cache, BullMQ job queue, Meilisearch, monitoring"],
    ["Features", "Q3-Q4/2026", "Payment gateway (VNPay), object storage, CDN media"],
    ["Intelligence", "Q4/2026", "AI recommendation engine, advanced analytics"],
    ["Architecture", "Q4/2026", "Admin subdomain, modular monolith, microservices evaluation"],
  ]),
  heading("7.2 Roadmap sản phẩm", HeadingLevel.HEADING_2),
  makeTable(["#", "Tính năng", "Mô tả", "Ưu tiên"], [
    ["1", "PostgreSQL Migration", "SQLite → PostgreSQL", "Cao"],
    ["2", "Testing", "Vitest + Playwright", "Cao"],
    ["3", "AI Recommendation", "Collaborative filtering", "Trung bình"],
    ["4", "Mobile App", "React Native / Flutter", "Trung bình"],
    ["5", "Payment Gateway", "VNPay/MoMo", "Trung bình"],
    ["6", "Elasticsearch", "Full-text search chuyên sâu", "Trung bình"],
    ["7", "Message Queue", "BullMQ background jobs", "Thấp"],
    ["8", "Redis Cache", "Caching layer", "Thấp"],
    ["9", "Microservices", "Tách Watch Party, Sync Pipeline", "Thấp"],
  ]),
  pageBreak(),
];

const conclusion = [
  heading("KẾT LUẬN"),
  para("Sau quá trình phân tích, thiết kế, phát triển và triển khai, đồ án TERENCE đã hoàn thành đầy đủ 6/6 mục tiêu đề ra ban đầu. Hệ thống đã được triển khai thành công trên môi trường production thực tế."),
  paraMulti([{ text: "Kết quả đạt được:", bold: true }]),
  bullet("Hệ thống full-stack hoàn chỉnh với 15 nhóm tính năng"),
  bullet("Kiến trúc Modular Monolith phân tầng rõ ràng, sẵn sàng mở rộng"),
  bullet("Watch Party — xem phim chung real-time với đồng bộ playback, chat, voice/video call"),
  bullet("Data Pipeline tự động đồng bộ và làm giàu dữ liệu phim"),
  bullet("Admin CMS hoàn chỉnh với RBAC 5 cấp, audit log, moderation workflow"),
  bullet("Deploy production thực tế trên VPS với Nginx, PM2, Cloudflare CDN, SSL"),
  paraMulti([{ text: "Hạn chế:", bold: true }]),
  bullet("SQLite chưa phù hợp quy mô lớn — cần migrate PostgreSQL"),
  bullet("Chưa có automated testing — cần unit + E2E tests"),
  bullet("Một số module code phân tán — cần gom lại"),
  paraMulti([{ text: "Bài học kinh nghiệm:", bold: true }]),
  bullet("Thiết kế kiến trúc từ đầu giúp tiết kiệm thời gian refactor"),
  bullet("Tài liệu hóa liên tục giảm thiểu knowledge gap"),
  bullet("Triển khai production sớm phát hiện vấn đề CORS, SSL, WebSocket"),
  bullet("TypeScript + Zod validation giảm đáng kể bug runtime"),
  para("Dự án TERENCE không chỉ đáp ứng yêu cầu đồ án mà còn vượt kỳ vọng ở nhiều khía cạnh. Kiến trúc và mã nguồn sẵn sàng tiếp tục phát triển thành sản phẩm hoàn chỉnh trong tương lai."),
  pageBreak(),
];

// ── Build document ──
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Times New Roman", size: 26 } },
      heading1: { run: { font: "Times New Roman", size: 32, bold: true } },
      heading2: { run: { font: "Times New Roman", size: 28, bold: true } },
      heading3: { run: { font: "Times New Roman", size: 26, bold: true } },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 },
      },
    },
    children: [
      ...coverPage,
      ...loiMoDau,
      ...ch1,
      ...ch2,
      ...ch3,
      ...ch4,
      ...ch5,
      ...ch6,
      ...ch7,
      ...conclusion,
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
const outPath = "docs/TERENCE_BAO_CAO_DO_AN.docx";
writeFileSync(outPath, buffer);
console.log(`✅ Created: ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
