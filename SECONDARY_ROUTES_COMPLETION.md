# 🛠️ SECONDARY ROUTES COMPLETION

> Ngày: 2026-03-15
> Mục tiêu: Hoàn thiện các route phụ, giữ nguyên giao diện gốc

---

## 1. Tổng quan thay đổi

| Route | Trạng thái trước | Thay đổi | Ảnh hưởng UI |
|-------|------------------|---------|--------------|
| `/reviews` | Mock data inline trong page | Tách mock → `lib/data/reviews.ts` | ❌ Không |
| `/countries` | Chưa có | **Tạo mới** — grid quốc gia, link `/browse?country=XX` | — |
| `/people` | Chưa có | **Tạo mới** — TMDB /person/popular, grid cards | — |
| `/schedule` | Chưa có | **Tạo mới** — demo schedule model, day tabs | — |
| `/browse` | Có, thiếu country filter | Thêm `?country=` support | ❌ Không |
| SearchBar | Debounce 500ms, no loading | Debounce 400ms + loading spinner | ❌ Không (icon thay đổi khi loading) |
| `/login` | ✅ Đã ổn | Không thay đổi | ❌ Không |
| `/signup` | Dùng `login()` thay `signup()` | Đổi sang `signup()` method | ❌ Không |
| Auth context | Inline logic | Tách helpers, thêm `signup()`, `isAuthenticated` | ❌ Không |

---

## 2. Reviews — tách data layer

### Trước:
```tsx
// app/reviews/page.tsx
const REVIEWS: ReviewItem[] = [...]  // mock data inline
```

### Sau:
```tsx
// lib/data/reviews.ts
export function getReviews(): ReviewItem[]
export function getReviewById(id: string): ReviewItem | undefined

// app/reviews/page.tsx
import { getReviews } from '@/lib/data/reviews'
const reviews = getReviews()  // clean import
```

**UI giữ nguyên 100%** — ReviewCard, grid layout, styling không đổi.

---

## 3. Countries — `/countries`

**File:** `app/countries/page.tsx`

- Grid 20 quốc gia phổ biến (US, KR, JP, CN, VN...)
- Mỗi card: flag emoji + tên quốc gia
- Click → `/browse?country=XX` (TMDB discover by origin country)

**File:** `services/tmdb/movie-service.ts`
- Thêm `getMoviesByCountry(code, page)` — TMDB `/discover/movie?with_origin_country=XX`

**File:** `app/browse/page.tsx`
- Thêm `?country=` param support trong data fetching logic

---

## 4. People — `/people`

**File:** `app/people/page.tsx`

- TMDB `/person/popular` endpoint
- Grid cards: avatar (2:3 ratio) + name + department + known_for movies
- Fallback: User icon khi không có profile image
- Pagination: prev/next links

---

## 5. Schedule — `/schedule`

**File:** `lib/data/schedule.ts`
- Demo schedule model: 7 ngày, 4-6 suất/ngày
- `ScheduleSlot { movieTitle, time, cinema, format, price }`
- `ScheduleDay { date, label, isToday, slots[] }`
- Deterministic data (no Math.random)

**File:** `app/schedule/page.tsx`
- Day selector tabs (horizontal scroll)
- Slot cards: time, cinema, format badge, price
- Empty state: Calendar icon + "Chưa có lịch chiếu"

---

## 6. Search — loading state

**File:** `components/shared/SearchBar.tsx`

| Feature | Trước | Sau |
|---------|-------|-----|
| Debounce | 500ms | 400ms |
| Loading | Không | ✅ Search icon → Spinner (useTransition) |
| Clear | ✅ | ✅ (giữ nguyên) |
| Submit | ✅ | ✅ (giữ nguyên) |
| Empty state | Push /browse | Push /browse (giữ nguyên) |

**UI giữ nguyên** — chỉ icon search → spinner khi pending.

---

## 7. Auth — cleanup

**File:** `contexts/auth-context.tsx`

### Trước:
- `login()` inline, any email accepted, role by string match
- No `signup()` method
- Storage key: `terence_user`

### Sau:
| Thay đổi | Chi tiết |
|---------|---------|
| Constants tách riêng | `STORAGE_KEY`, `DEMO_DELAY_MS`, `DEMO_ACCOUNTS` |
| `signup()` method | Validates name/email/password, min 8 chars |
| `isAuthenticated` flag | Boolean shorthand |
| `useCallback` | login/signup/logout memoized |
| `loadUser()`/`persistUser()` | Tách helper functions |
| `resolveUser()` | Centralized user resolution logic |
| Window guard | `typeof window !== 'undefined'` checks |
| Storage key | `terence:auth-user` (namespaced) |

**Login/Signup pages: UI giữ nguyên 100%.** Chỉ signup đổi `login()` → `signup()`.

Demo accounts:
- `admin@terence.vn` (password: bất kỳ) → role admin
- `user@terence.vn` (password: bất kỳ) → role user
- Bất kỳ email khác → role user (có "admin" trong email → role admin)

---

## 8. File summary

### Tạo mới (5 files):
| File | Vai trò |
|------|---------|
| `lib/data/reviews.ts` | Data layer cho editorial reviews |
| `lib/data/schedule.ts` | Demo schedule model (7 ngày) |
| `app/countries/page.tsx` | Country grid → browse filter |
| `app/people/page.tsx` | TMDB popular people |
| `app/schedule/page.tsx` | Cinema schedule demo |

### Sửa (5 files):
| File | Thay đổi |
|------|----------|
| `app/reviews/page.tsx` | Import từ data layer thay inline mock |
| `app/browse/page.tsx` | Thêm `?country=` filter support |
| `app/signup/page.tsx` | Dùng `signup()` thay `login()` |
| `services/tmdb/movie-service.ts` | Thêm `getMoviesByCountry()` |
| `components/shared/SearchBar.tsx` | useTransition loading state |

### Rewrite (1 file):
| File | Thay đổi |
|------|----------|
| `contexts/auth-context.tsx` | Tách helpers, thêm signup, isAuthenticated, useCallback |

---

## 9. Xác nhận an toàn

| Kiểm tra | Kết quả |
|----------|---------|
| Login page UI giữ nguyên | ✅ |
| Signup page UI giữ nguyên | ✅ |
| Reviews page UI giữ nguyên | ✅ |
| Browse page UI giữ nguyên | ✅ |
| SearchBar UI giữ nguyên (chỉ icon đổi khi loading) | ✅ |
| Không đổi header/footer/nav | ✅ |
| Country filter tích hợp vào browse sẵn có | ✅ |
| People page dùng TMDB data thật | ✅ |
| Schedule page có empty fallback | ✅ |
| Auth backward compatible (localStorage migration) | ✅ |
