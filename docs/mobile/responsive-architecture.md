# 📱 Mobile Responsive & Cross-Platform UI Architecture (TERENCE)

## 1. Mục tiêu (Objective)
TERENCE đã được quy hoạch kiến trúc Responsive & Mobile UI Audit để đảm bảo:
- Layout không bị "vỡ", tràn viền hay mất tỉ lệ trên tất cả mọi kích thước hiển thị: Web, Tablet, Mobile Small, Desktop Widescreen.
- Thiết kết (Design Patterns) đạt tính tinh gọn, tách rời các UI Block Logic nhằm dọn đường cho việc **Export sang App Mobile Native (React Native, PWA)**.

---

## 2. Nhật Ký Kiểm Toán UI (UI Audit Report)

| Thành Phần (Feature Page) | Cấu Trúc Hiện Tại | Vấn Đề (Issues) | Giải Pháp Đã Áp Dụng (Patches) |
| --- | --- | --- | --- |
| **Trang chủ (Hero Banner)** | `absolute inset` | `height: clamp(600px)` bị vỡ và chèn quá nhiều dọc màn hình trên điên thoại (Small Screens). Chữ title banner to (`3.2rem` default). | Chuyển chiều cao scale về linh hoạt `clamp(400px, 85vh, 820px)`. Đảm bảo Hero Banner vẫn hùng vĩ trên Desktop (min 820px) nhưng vừa miếng với Mobile (85vh). |
| **Header (Main Navbar)** | `md:flex`, `xl:flex` với Menu Hamburger mobile. | Mobile Drawer chưa tối ưu trải nghiệm scroll cho category dài. Khó nhìn icon. | Menu drawer đã kích hoạt Hamburger với `z-[60]`. Input tìm kiếm đã đẩy lên trên cùng. |
| **Movies List (Horizontal Rail)**| CSS flex | Card tràn màn hình nếu không giới hạn flex grid. | Tích hợp container ẩn `scrollbar-hide` và thiết đặt cố định `w-[260px]` cho scroll ngang trên mobile (Swipe Support - Cross Platform Layout PWA). |
| **Movie Details Page** | `grid-cols-2` -> `grid-cols-8` | Khung Grid Cast dễ bị ép mất chữ tên diễn viên. Back icon nằm tại vị trí tap quá tay. | Fixed. Cấu trúc tự hạ cấp (graceful degradation) về 3 cột ở màn hình ngỏ, và scale up lên 8 Cột max. `max-w-7xl` được bọc bên ngoài. |
| **Watch / Player** | `WatchPageContainer` | Thanh "Danh sách tập" vỡ khối nếu FlexWrap bị override. | Sử dụng ngang kéo tay (Horizontal swipe scroll flex `pr-4`) thay vì Grid dọc tránh nhồi nhét trang xem phim. Giữ UI rộng thoải mái với mảng Đen chuẩn rạp. |
| **Admin Dashboard (CRUD)** | Custom CMS View | Bảng Table dễ bị tràn Layout ra khỏi container gây cắt mất Action. | Dashboard Parent Layout (`app/dashboard/layout.tsx`) tự động ẩn Sidebar Drawer ở phiên bản `< 1024px`. Toàn bộ Table được wrap bởi `overflow-x-auto w-[100%]`. |

---

## 3. Kiến Trúc Sẵn Sàng (Cross-Platform / App Native Standard)

Tôi đã thiết lập tiền đề **Data-Driven & Generic UI Component** để sau này có thể dễ dàng port/clone toàn bộ UI Next.js sang React Native (Expo) mà không cần code lại Business logic.

### 3.1 Giao ước Module Wrapper (`AppContainer`)
Tạo base `AppContainer` (`src/fe/components/ui/app-container.tsx`):
- Đồng nhất tất cả mọi màn hình có Padding, Max-Width chung.
- Việc này tương tự như `<SafeAreaView>` trong ReactNative, giúp tránh làm lệch viền notch/camera của thiết bị Mobile hoặc Tablet.

### 3.2 Form Layout Mobile First 1-Col
Các thẻ `div` bọc `Input` từ giờ sẽ mặc định render ở dạng stack-dọc Mobile (`flex-col`), chỉ chuyển sang stack-ngang (Grid hai cột) từ breakpoint `md:` trở đi. Đảm bảo form Đăng nhập cực kỳ to rõ ngón tay.

## 4. Checklist Thực Thi Mở Rộng
* Các TODO cần cho Phase tiếp theo nếu đội ngũ yêu cầu nâng cấp Web PWA (Progressive Web Application):
- [ ] Thêm file `manifest.json`.
- [ ] Xây dựng ServiceWorker (`sw.js`) để chặn cache Movie Metadata, cho phép truy cập Local Offline (Tương tự App).
- [ ] Custom `theme-color` meta tag mapping vào `#0B0F19` để ăn khớp màu UI StatusBar của iOS / Chrome Android.
