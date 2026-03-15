# FEATURE_EXPANSION_MASTER_NOTES

> Tài liệu ghi nhận tất cả tính năng đã mở rộng cho TERENCE.
> Thời gian: 15/03/2026

---

## Quy tắc đã tuân thủ

- ❌ KHÔNG thay đổi UI/UX structure hiện tại
- ❌ KHÔNG rebuild homepage
- ❌ KHÔNG thay layout gốc (header/footer chỉ thêm items)
- ✅ Chỉ thêm routes, navigation, data layers, components phụ trợ
- ✅ Giữ nguyên logic TMDB, auth, và routing hiện có

---

## 1. News (Tin tức)

| Mục | Chi tiết |
|-----|----------|
| **Route** | `/news` (đã tồn tại, refactored) |
| **Data** | `lib/data/news.ts` — tách data layer, 6 items với categories |
| **Component** | `app/news/page.tsx` — grid cards, category badges, empty state |
| **Dữ liệu** | Demo/editorial (không từ API) |
| **Chờ nâng cấp** | Kết nối CMS hoặc news API khi có backend |

---

## 2. Thể loại (Genres)

| Mục | Chi tiết |
|-----|----------|
| **Route** | `/genres` (trước đây redirect → `/browse`, giờ là trang thật) |
| **Data** | TMDB API `/genre/movie/list` + fallback static data |
| **Component** | `app/genres/page.tsx` — grid cards với emoji icons |
| **Link** | Mỗi thể loại dẫn tới `/browse?genre={id}` |
| **Dữ liệu** | ✅ TMDB API thật, cache 24h |

---

## 3. Quốc gia (Countries)

| Mục | Chi tiết |
|-----|----------|
| **Route** | `/countries` (đã tồn tại, giữ nguyên) |
| **Data** | Static list 20 quốc gia với ISO codes |
| **Component** | `app/countries/page.tsx` — grid cards, link → `/browse?country={code}` |
| **Dữ liệu** | Static data (TMDB hỗ trợ filter theo country) |
| **Chờ nâng cấp** | Có thể fetch danh sách từ TMDB `/configuration/countries` |

---

## 4. Diễn viên (People)

| Mục | Chi tiết |
|-----|----------|
| **Route** | `/people` (đã tồn tại, giữ nguyên) |
| **Data** | TMDB API `/person/popular` |
| **Component** | `app/people/page.tsx` — grid cards, pagination, empty state |
| **Dữ liệu** | ✅ TMDB API thật |
| **Chờ nâng cấp** | Trang chi tiết diễn viên `/people/[id]` |

---

## 5. Lịch chiếu (Schedule)

| Mục | Chi tiết |
|-----|----------|
| **Route** | `/schedule` (đã tồn tại, giữ nguyên) |
| **Data** | Demo schedule data layer |
| **Dữ liệu** | Demo/fallback |
| **Chờ nâng cấp** | Kết nối API lịch chiếu khi có nguồn dữ liệu |

---

## 6. Review

| Mục | Chi tiết |
|-----|----------|
| **Route** | `/reviews` (đã tồn tại, giữ nguyên) |
| **Data** | `lib/data/reviews.ts` — editorial data layer, 4 items |
| **Component** | `app/reviews/page.tsx` — grid cards |
| **Dữ liệu** | Editorial (hand-written) |
| **Chờ nâng cấp** | User-generated reviews, rating system |

---

## 7. TCoin

| Mục | Chi tiết |
|-----|----------|
| **Route** | `/tcoin` (MỚI) |
| **Data** | `lib/data/tcoin.ts` — packages, rewards, spend, transactions |
| **Component** | `app/tcoin/page.tsx` — balance, mua xu, kiếm xu, đổi xu, lịch sử |
| **Dữ liệu** | Demo data + localStorage cho balance |
| **Chờ nâng cấp** | Backend API cho real transactions, payment gateway |

---

## Navigation Updates

### Header (Desktop)
- 5 items chính: Trang chủ, Khám phá, Xu hướng, Đánh giá cao, Xem chung
- Dropdown **"Thêm ▿"**: Tin tức, Thể loại, Quốc gia, Diễn viên, Lịch chiếu, Review, TCoin
- Click outside để đóng dropdown
- Active state highlight khi đang ở trang phụ

### Header (Mobile)
- Tất cả items hiển thị flat (không dropdown)
- Separator giữa items chính và phụ

### Footer
- Cột "Khám phá": thêm Thể loại, Quốc gia, Diễn viên
- Cột "Tính năng": thêm Lịch chiếu, TCoin

---

## Files đã tạo mới

| File | Mô tả |
|------|--------|
| `lib/data/news.ts` | News data layer |
| `lib/data/tcoin.ts` | TCoin data layer |
| `app/tcoin/page.tsx` | Trang TCoin |

## Files đã cập nhật

| File | Thay đổi |
|------|----------|
| `app/news/page.tsx` | Refactor: đọc từ data layer, thêm category badges, empty state |
| `app/genres/page.tsx` | Thay redirect bằng trang thật, TMDB API + fallback |
| `components/header.tsx` | Thêm "Thêm" dropdown, MORE_ITEMS, mobile menu |
| `components/footer.tsx` | Thêm links cho tính năng mới |

## Routes lõi KHÔNG thay đổi

- `/` — Homepage ✅ giữ nguyên
- `/browse` — Browse/search ✅ giữ nguyên
- `/movie/[id]` — Chi tiết phim ✅ giữ nguyên
- `/watch/[id]` — Xem phim ✅ giữ nguyên
- `/xem-chung` — Xem chung ✅ giữ nguyên

---

## Dữ liệu thật vs Demo

| Feature | Source | Loại |
|---------|--------|------|
| Thể loại | TMDB `/genre/movie/list` | ✅ API thật |
| Diễn viên | TMDB `/person/popular` | ✅ API thật |
| Browse/search | TMDB multiple endpoints | ✅ API thật |
| Quốc gia | Static list | 📋 Static data |
| News | `lib/data/news.ts` | 📋 Demo data |
| Review | `lib/data/reviews.ts` | 📋 Demo data |
| Lịch chiếu | Demo schedule | 📋 Demo data |
| TCoin | `lib/data/tcoin.ts` + localStorage | 📋 Demo data |
