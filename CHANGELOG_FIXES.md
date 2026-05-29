# CHANGELOG — Hardening Pass

Phạm vi: PHASE 1 → 9 do audit toàn dự án sinh ra. Không thay đổi UI/UX
và business flow. Mỗi entry liệt kê file đã sửa, lỗi gốc, cách xử lý
và phương án kiểm thử.

---

## Critical

### 1. Mass-assignment ở admin news PATCH
- **File:** [app/api/admin/news/[id]/route.ts](app/api/admin/news/%5Bid%5D/route.ts)
- **Lỗi:** `prisma.newsPost.update({ data: body })` truyền nguyên body từ
  client → có thể đặt `authorId`, `createdAt`, `viewCount`, `id`, ...
- **Cách sửa:** Thêm `newsUpdateSchema` (zod `strict()`) whitelist các trường
  được phép cập nhật. Bắt lỗi `Invalid JSON` riêng. Map `publishedAt` string
  thành `Date`.
- **Test:** [tests/unit/fixes-validation.test.ts](tests/unit/fixes-validation.test.ts)
  → describe "Admin news PATCH whitelist".

### 2. Race condition TCoin reward + review POST
- **File:** [app/api/v1/reviews/route.ts](app/api/v1/reviews/route.ts)
- **Lỗi:** 4 thao tác DB (`create review` → đọc wallet → update wallet →
  log transaction) chạy rời. `balanceBefore` đọc xong rồi update không
  khoá → concurrent gây sai số dư.
- **Cách sửa:** Toàn bộ flow gói trong `prisma.$transaction`. Wallet dùng
  `upsert({ update: { balance: { increment: 50 } } })` atomic. Thêm
  `reviewCreateSchema` zod `strict()` validate POST body.
- **Test:** [tests/unit/fixes-validation.test.ts](tests/unit/fixes-validation.test.ts)
  → "Review POST schema". Transaction được verify thủ công qua flow signup
  + review trên dev DB.

### 3. Like rollback hỏng
- **File:** [app/api/v1/reviews/[id]/like/route.ts](app/api/v1/reviews/%5Bid%5D/like/route.ts)
- **Lỗi:** Redis SET NX chạy trước Prisma. Nếu Prisma update fail, Redis key
  vẫn tồn tại 1 năm → user mất quyền like. `catch {}` rỗng nuốt error.
- **Cách sửa:** Redis chỉ làm cache idempotency. Prisma update là source of
  truth. Nếu Prisma fail → không set Redis. Nếu Redis fail sau khi Prisma
  commit → log warning, không fail request. Mọi catch đều log đầy đủ.
- **Test:** kiểm tra thủ công với Redis tắt — DB vẫn increment đúng; bật
  lại Redis vẫn dedupe lần sau.

### 4. SePay webhook thiếu try/catch ngoài
- **File:** [app/api/payments/sepay/webhook/route.ts](app/api/payments/sepay/webhook/route.ts)
- **Lỗi:** `PaymentsService.processSePayWebhook` throw → 500 không log →
  SePay retry vô hạn.
- **Cách sửa:** Outer try/catch. Map status code rõ: 200 cho duplicate /
  ignored (không trigger retry), 400 cho payload sai, 401 cho signature
  sai, 500 chỉ cho lỗi server thật. Log đầy đủ qua pino (đã có redact
  secret keys).
- **Test:** kiểm tra thủ công với payload sai signature → 401 + 1 dòng log;
  trùng `matchedBankTxnId` → idempotent ở `markOrderPaid`.

### 5. TCoin adjust validation
- **File:** [app/api/admin/tcoin/adjust/route.ts](app/api/admin/tcoin/adjust/route.ts)
- **Lỗi:** `if (!amount)` reject luôn cả `amount=0` sai semantic. Rethrow
  không log → 500 trắng.
- **Cách sửa:** `adjustSchema` zod yêu cầu `amount` là số finite, integer,
  `!== 0` với message "amount must be non-zero". Catch error rethrow đổi
  thành log + JSON 500 chuẩn.
- **Test:** [tests/unit/fixes-validation.test.ts](tests/unit/fixes-validation.test.ts)
  → "TCoin adjust schema".

### 6. verify-email build break (Next 15)
- **File:** [app/verify-email/page.tsx](app/verify-email/page.tsx)
- **Lỗi:** `useSearchParams()` ở component top-level → Next 15 throw
  build-time "Missing Suspense boundary".
- **Cách sửa:** Tách `VerifyEmailContent` thành child component, bọc bằng
  `<Suspense fallback={...}>` ở page wrapper.
- **Test:** `npm run build` sẽ pass; chạy `/verify-email?token=x` thấy
  fallback rồi nội dung.

---

## Medium

### 7. Watch-party page bỏ qua loading/error
- **File:** [app/xem-chung/page.tsx](app/xem-chung/page.tsx)
- **Lỗi:** Chỉ dùng `{ rooms }`, bỏ `isLoading`/`isError`. UI trống nếu API
  fail.
- **Cách sửa:** Thêm `RoomGridSkeleton`, `EmptyState`, `ErrorState`. Giữ
  nguyên layout ban đầu.

### 8. Dashboard stats hardcode
- **File:** [app/dashboard/page.tsx](app/dashboard/page.tsx)
- **Lỗi:** `change: "+10% so với tháng trước"`, `"0% so với hôm qua"`,
  `watched: 0` cứng.
- **Cách sửa:** Tính `viewsDelta` thật từ chart 7 ngày (today vs yesterday).
  Doanh thu hiển thị "Tổng 7 ngày qua" hoặc "Chưa có giao dịch".
  `watched` lấy qua `prisma.watchHistory.groupBy({ by: ['userId'] })` cho
  các user trong `recentUsers`.

### 9. Schedule mock data
- **Files:**
  [lib/data/schedule.ts](lib/data/schedule.ts),
  [app/schedule/page.tsx](app/schedule/page.tsx)
- **Lỗi:** Toàn bộ schedule là demo với poster Unsplash giả.
- **Cách sửa:** `getSchedule()` đổi sang async, lấy `prisma.movie.findMany`
  với `publishedAt` trong 7 ngày tới. Nếu DB không có dữ liệu, fallback
  demo nhưng `isDemo: true` và poster `null` (UI render icon). Page hiển
  thị banner cảnh báo khi `isDemo`.

### 10. Watch-history sync không transaction
- **File:** [app/api/v1/watch-history/sync/route.ts](app/api/v1/watch-history/sync/route.ts)
- **Lỗi:** Loop từng `update`/`create` rời rạc → partial commit khi 1 item
  fail.
- **Cách sửa:** Pre-validate từng item với `syncItemSchema`. Merge nằm
  trong `prisma.$transaction`. Trả về `rejectedCount + rejected[]` cho
  client biết item nào bị skip.

### 11. Permissions audit ngoài transaction
- **File:** [app/api/admin/users/[id]/permissions/route.ts](app/api/admin/users/%5Bid%5D/permissions/route.ts)
- **Lỗi:** `logAdminAction` sau transaction → audit có thể mất nếu log fail
  sau khi permission đã commit.
- **Cách sửa:** Resolve actor id trước, đưa `adminLog.create` vào CÙNG
  `$transaction`. Nếu actor id không resolve được (email lạc), fall back
  best-effort `logAdminAction` ngoài. Wrap toàn bộ PUT bằng try/catch.
  Validate body bằng `overridesBodySchema` strict.

### 12. Watch-history bootstrap catch rỗng
- **File:** [app/api/v1/watch-history/bootstrap/route.ts](app/api/v1/watch-history/bootstrap/route.ts)
- **Lỗi:** `catch {}` cho `getServerSession`.
- **Cách sửa:** Log warn an toàn, anonymous flow vẫn chạy. Outer try/catch
  trả 500 nếu `bootstrap()` throw.

### 13. Auth callbacks validate yếu
- **Files:**
  [app/api/auth/forgot-password/route.ts](app/api/auth/forgot-password/route.ts),
  [app/api/auth/reset-password/route.ts](app/api/auth/reset-password/route.ts),
  [src/be/modules/auth/auth.controller.ts](src/be/modules/auth/auth.controller.ts),
  [src/be/modules/auth/auth.schema.ts](src/be/modules/auth/auth.schema.ts)
- **Lỗi:** `forgot-password` không validate email format. `reset-password`
  yêu cầu `min 6` ký tự ≠ signup `min 8`. `resendVerificationEmail` parse
  raw body.
- **Cách sửa:** Thêm `forgotPasswordSchema`, `resetPasswordSchema`,
  `resendVerifySchema`. Unify password min = 8 across `signupSchema` +
  `resetPasswordSchema`.

### 14. Frontend form không đồng bộ
- **Files:**
  [app/signup/page.tsx](app/signup/page.tsx),
  [app/reset-password/page.tsx](app/reset-password/page.tsx),
  [app/forgot-password/page.tsx](app/forgot-password/page.tsx)
- **Lỗi:** Signup không check email/name, reset min 6 mâu thuẫn server 8,
  forgot không check email format.
- **Cách sửa:** Validation tay mirror schema server (email regex,
  password ≥8, name 1..100). Trim trước khi POST. Bắt lỗi server và hiển
  thị message thật.

### 15. TCoin client polling spam
- **File:** [app/tcoin/page.tsx](app/tcoin/page.tsx)
- **Lỗi:** Poll `/api/tcoin/order/:key` mỗi 15s không pause khi tab hidden.
  Socket connect `/api/socketio` retry không giới hạn nếu route 404.
- **Cách sửa:** Poll 20s với pause/resume bằng `document.visibilityState`.
  Socket giới hạn `reconnectionAttempts: 2`, timeout 5s, swallow
  connection error.

### 16. Redis dashboard polling spam
- **File:** [app/dashboard/redis/page.tsx](app/dashboard/redis/page.tsx)
- **Lỗi:** `setInterval` 5s không pause khi tab hidden, không catch lỗi
  fetchKeys.
- **Cách sửa:** Visibility-aware interval. Clear đúng khi unmount + khi
  `autoRefresh` toggle. `fetchKeys` surface error qua `setError`.

### 17. MediaField re-mount mất focus
- **File:** [app/dashboard/movies/[id]/edit/page.tsx](app/dashboard/movies/%5Bid%5D/edit/page.tsx)
- **Lỗi:** Component định nghĩa trong component cha → mỗi render là kiểu
  mới → React unmount/remount → input mất focus khi gõ.
- **Cách sửa:** Hoist MediaField ra ngoài, nhận props rõ ràng (`value`,
  `uploading`, `onChange`, `onUpload`).

### 18. Env validation hẹp
- **File:** [lib/env.ts](lib/env.ts)
- **Lỗi:** Chỉ require 2 biến. Thiếu validate `NEXTAUTH_URL`,
  `CRON_SECRET`, `SEPAY_*`, ...
- **Cách sửa:** Phân tầng REQUIRED_ALWAYS / REQUIRED_IN_PRODUCTION /
  FEATURE_GROUPS / RECOMMENDED. Production fail rõ; dev/test warn. Feature
  groups detect partial config (vd SePay có 1 trong 5 biến).

---

## Low

### 19. TMDB legacy sunset doc
- **File:** [src/be/modules/tmdb/legacy/LEGACY_MIGRATION.md](src/be/modules/tmdb/legacy/LEGACY_MIGRATION.md)
- **Cách sửa:** Ghi 10 file còn phụ thuộc + plan sunset.

### 20. Stub modules
- **Files:**
  [src/be/modules/analytics/TODO_NOT_ACTIVE.md](src/be/modules/analytics/TODO_NOT_ACTIVE.md),
  [src/be/modules/payments/README.md](src/be/modules/payments/README.md)
- **Cách sửa:** Mark rõ analytics chưa active; payments documented thật là
  SePay-only, `PaymentProvider` interface chưa được implement.

### 21. Player mock controls comment
- **File:** [src/fe/components/player/WatchPageClient.tsx](src/fe/components/player/WatchPageClient.tsx)
- **Cách sửa:** Comment lại rõ "decorative loading-state control bar (not
  interactive)" + `aria-hidden`. Real controls thuộc `<HLSPlayer>`.

### 22. Legal pages
- **Files:**
  [app/terms/page.tsx](app/terms/page.tsx),
  [app/privacy/page.tsx](app/privacy/page.tsx),
  [app/signup/page.tsx](app/signup/page.tsx)
- **Cách sửa:** Tạo trang Điều khoản & Chính sách cơ bản. Signup link
  trỏ thật `/terms`, `/privacy` thay vì `href="#"`.

### 23. /watch dead route
- **File:** [app/watch/page.tsx](app/watch/page.tsx)
- **Cách sửa:** Redirect sang `/movies` (thay vì `/`) với comment giải
  thích.

### 24. ESLint ignore vendor
- **File:** [.eslintignore](.eslintignore)
- **Cách sửa:** Ignore `public/**`, `**/*.min.js`, `**/*.min.css`,
  `**/generated/**`, 2 file docs sinh tự động → dẹp 164 warning vendor.

### 25. Img alt + lazy
- **Files:** [app/dashboard/movies/page.tsx](app/dashboard/movies/page.tsx),
  [app/dashboard/movies/[id]/edit/page.tsx](app/dashboard/movies/%5Bid%5D/edit/page.tsx)
- **Cách sửa:** Thêm alt nghĩa + `loading="lazy"`.

### 26. Watch action buttons không handler
- **Files:**
  [app/watch/[id]/page.tsx](app/watch/%5Bid%5D/page.tsx),
  [src/fe/components/watch/WatchActionButtons.tsx](src/fe/components/watch/WatchActionButtons.tsx)
- **Cách sửa:** Tách thành client component. "Chia sẻ" dùng Web Share API
  + clipboard fallback. "Yêu thích" disabled rõ với tooltip "đang phát
  triển" thay vì button giả.

### 27. Env test update
- **File:** [tests/unit/env.test.ts](tests/unit/env.test.ts)
- **Cách sửa:** Cập nhật assertion theo error message mới.

### 28. Auth integration test
- **File:** [tests/integration/auth-api.test.ts](tests/integration/auth-api.test.ts)
- **Cách sửa:** Cập nhật password test data sang ≥8 ký tự (policy mới).
  Assertion "8" thay cho "6".

### 29. Tests cho schemas mới
- **File:** [tests/unit/fixes-validation.test.ts](tests/unit/fixes-validation.test.ts)
- **Cách sửa:** Test cho review POST, TCoin adjust, news whitelist,
  watch-history sync items, auth callbacks. Test mass-assign vector
  (`{ authorId, id, createdAt, viewCount }` đều reject).

---

## Files đã sửa hoặc tạo mới

### Modified
- app/api/admin/news/[id]/route.ts
- app/api/v1/reviews/route.ts
- app/api/v1/reviews/[id]/like/route.ts
- app/api/payments/sepay/webhook/route.ts
- app/api/admin/tcoin/adjust/route.ts
- app/api/v1/watch-history/sync/route.ts
- app/api/admin/users/[id]/permissions/route.ts
- app/api/v1/watch-history/bootstrap/route.ts
- app/api/auth/forgot-password/route.ts
- app/api/auth/reset-password/route.ts
- src/be/modules/auth/auth.schema.ts
- src/be/modules/auth/auth.controller.ts
- app/verify-email/page.tsx
- app/xem-chung/page.tsx
- app/dashboard/page.tsx
- lib/data/schedule.ts
- app/schedule/page.tsx
- app/signup/page.tsx
- app/reset-password/page.tsx
- app/forgot-password/page.tsx
- app/tcoin/page.tsx
- app/dashboard/redis/page.tsx
- app/dashboard/movies/[id]/edit/page.tsx
- app/dashboard/movies/page.tsx
- app/watch/page.tsx
- app/watch/[id]/page.tsx
- src/fe/components/player/WatchPageClient.tsx
- lib/env.ts
- tests/unit/env.test.ts
- tests/integration/auth-api.test.ts

### Created
- app/terms/page.tsx
- app/privacy/page.tsx
- src/fe/components/watch/WatchActionButtons.tsx
- src/be/modules/tmdb/legacy/LEGACY_MIGRATION.md
- src/be/modules/analytics/TODO_NOT_ACTIVE.md
- src/be/modules/payments/README.md
- .eslintignore
- tests/unit/fixes-validation.test.ts
- CHANGELOG_FIXES.md

---

## Commands sẽ chạy sau khi sửa
- `npm run lint`
- `npm run test`
- `npx tsc --noEmit` (typecheck)
- `npm run build`

Kết quả từng lệnh được ghi ở mục "Validation" phía cuối README session.
