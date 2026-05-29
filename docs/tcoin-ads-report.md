# TCoin & Advertisement — Implementation Report

Date: 2026-05-25
Scope: Hoàn thiện trang TCoin (nhiệm vụ, ví, đổi thưởng) + xây hệ thống Advertisement (admin + player) cho dự án TERENCE.

## 1. Tổng quan

Trước khi sửa, audit cho thấy:

| Mảng | Tình trạng |
|---|---|
| TCoin wallet / transactions / topup | ✅ ~95% hoàn thiện (đã có từ trước) |
| 5/6 reward task functions | ✅ daily-checkin, watch-complete, write-review, verify-email, complete-profile |
| `rewardInvite()` (referral) | ❌ thiếu — đã thêm |
| Spending 6 perks | ✅ remove-ads-7d, hd-upgrade, early-access, exclusive-badge, room-theme, avatar-frame |
| `getActivePerks()` lookup | ✅ trả về perk còn hạn |
| Advertisement model + admin CRUD | ❌ 100% không tồn tại — đã build |
| Public ad-active API | ❌ — đã build |
| Player pre-roll integration | ❌ — đã build |
| Admin UI dashboard | ❌ — đã build |
| Ad-free perk được player tôn trọng | ❌ — đã wire |

Triết lý refactor: **TÁI SỬ DỤNG TỐI ĐA**. Không tạo trùng `Wallet`, `WalletTransaction`, `tcoin.service.ts`, `tcoin.controller.ts`, hay `tcoin.repository.ts`. Chỉ thêm 1 function mới (`rewardInvite`) và toàn bộ Advertisement module mới (vì nó hoàn toàn chưa có).

## 2. Database Schema — đã thêm

[`src/dta/prisma/schema.prisma`](../src/dta/prisma/schema.prisma) — 2 model mới + 1 relation thêm vào User:

```prisma
model Advertisement {
  id              String   @id @default(cuid())
  title           String
  type            String   // VIDEO | IMAGE | BANNER
  placement       String   // PRE_ROLL | MID_ROLL | HOME_BANNER | DETAIL_BANNER
  duration        Int?     // giây — null cho banner
  mediaUrl        String   @db.Text
  targetUrl       String?  @db.Text
  skipAfterSeconds Int?
  priority        Int      @default(0)
  startAt         DateTime?
  endAt           DateTime?
  isActive        Boolean  @default(true)
  impressionCount Int      @default(0)
  clickCount      Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  impressions     AdImpression[]
  @@index([placement, isActive, priority])
  @@index([isActive, startAt, endAt])
}

model AdImpression {
  id        String   @id @default(cuid())
  adId      String
  userId    String?
  event     String   // impression | skip | complete | click
  placement String?
  createdAt DateTime @default(now())
  ad   Advertisement @relation(...)
  user User?         @relation(...)
  @@index([adId, createdAt])
  @@index([userId])
}
```

User model thêm relation:
```
adImpressions  AdImpression[]
```

**Migration applied** via `prisma db push` trên Docker DB. Không cần thay đổi gì cho TCoin models — tất cả đã tồn tại.

## 3. Reward Tasks (Nhiệm vụ nhận TCoin)

| Task | Function | Trigger | Limit | Reward |
|---|---|---|---|---|
| Điểm danh hàng ngày | `claimDailyCheckin` ✅ (cũ) | POST `/api/tcoin/reward/daily-checkin` | 1/ngày | 5 |
| Xem phim hoàn tất | `rewardWatchComplete` ✅ (cũ) | `/api/v1/watch-history/complete` (auto, ≥92%) | 10/ngày | 2 |
| Viết đánh giá phim | `rewardReview` ✅ (cũ) | `/api/v1/reviews` (auto khi approved) | 3/ngày | 10 |
| **Mời bạn bè đăng ký** | **`rewardInvite` 🆕** | `/api/auth/register` (auto khi `referralCode` hợp lệ) | 1 lần/cặp (inviter,invitee) | 100 |
| Xác minh email | `rewardVerifyEmail` ✅ (cũ) | Sau khi verify token thành công | one-time | 20 |
| Hoàn thiện hồ sơ | `rewardCompleteProfile` ✅ (cũ) | Khi update profile có avatar+bio≥10 | one-time | 30 |

### Function `rewardInvite()` mới — [src/be/modules/tcoin/tcoin.service.ts](../src/be/modules/tcoin/tcoin.service.ts)

- Kiểm tra trùng credit qua `(walletId, type='referral_reward', referenceId=inviteeUserId)` lookup — gọi 2 lần với cùng cặp không cộng đôi.
- Khước từ self-invite (`inviterUserId === inviteeUserId`).
- Credit qua repo helper hiện có (transaction-safe).

### Signup flow integration — [src/be/modules/auth/auth.controller.ts](../src/be/modules/auth/auth.controller.ts), [app/signup/page.tsx](../app/signup/page.tsx)

1. FE đọc `?ref=<userId>` từ URL → lưu sessionStorage (`terence:referralCode`) để giữ qua các trang.
2. Khi submit register, gửi `referralCode` cùng request body.
3. BE validate qua zod schema (`signupSchema` thêm field optional).
4. Sau khi `createUser` thành công, fire-and-forget gọi `rewardInvite(inviter.id, newUser.id)` — không block latency signup.
5. FE xóa sessionStorage sau khi đăng ký xong.

### UI referral link — [app/tcoin/page.tsx](../app/tcoin/page.tsx)

- Card "Mời bạn bè đăng ký" thay nhãn "Tự động" bằng nút **"Copy link mời"**.
- Click → copy `${origin}/signup?ref=${user.id}` vào clipboard + toast.
- Hiển thị badge `(đã mời N)` dùng `referralCount` đã có sẵn từ `getOverview()`.

## 4. Đổi TCoin lấy ưu đãi (Spend)

Đã có sẵn 6 perks trong `SPEND_OPTIONS` đúng spec — không cần sửa:

| Perk | Cost | Duration |
|---|---|---|
| Xóa quảng cáo 7 ngày | 50 | 7 ngày |
| Nâng HD → Full HD | 30 | 30 ngày |
| Xem sớm 24h | 100 | one-time |
| Huy hiệu đặc biệt | 200 | vĩnh viễn |
| Theme phòng xem chung | 80 | vĩnh viễn |
| Khung viền avatar Neon | 150 | 30 ngày |

Flow đã hoàn thiện từ trước:
- `spendTcoins(userId, optionId)` → debit qua transaction, tạo `WalletTransaction` type=`spend`, direction=`debit`, referenceId=optionId.
- Race condition tránh được nhờ Prisma `$transaction` + `creditWallet`/`debitWallet` helpers.
- `balance` bị refuse nếu < cost (return `{ ok: false, message: 'Không đủ TCoin' }`).
- Modal 2-step confirm trong UI (đã có sẵn): xem balance trước/sau, phí, thời hạn.

## 5. Advertisement System — TOÀN BỘ MỚI

### 5.1 Backend service — [src/be/modules/ads/ads.service.ts](../src/be/modules/ads/ads.service.ts)

- `AD_TYPES = ['VIDEO', 'IMAGE', 'BANNER']`, `AD_PLACEMENTS = ['PRE_ROLL', 'MID_ROLL', 'HOME_BANNER', 'DETAIL_BANNER']`
- `createAd(input)` / `updateAd(id, input)` / `deleteAd(id)` / `toggleAdActive(id)` / `listAds(filter)` / `getAdById(id)`
- `validateAdInput()` — Vietnamese error messages, kiểm tra: title≥3 ký tự, type/placement enum, mediaUrl http(s), VIDEO bắt buộc duration 1-600, skipAfter < duration, startAt < endAt.
- `pickActiveAd(placement, { userHasAdFree })` — chọn ad active matching placement với priority cao nhất, lọc theo schedule window, **short-circuit về `null` khi user có ad-free perk** (tránh query DB cho user không cần).
- `recordAdEvent(adId, event, userId?, placement?)` — best-effort tracking, không throw.

### 5.2 API routes

| Method | Path | Vai trò |
|---|---|---|
| GET | `/api/admin/ads` | List + filter (type, placement, isActive, search, page, limit) — chỉ admin |
| POST | `/api/admin/ads` | Create — chỉ admin |
| GET | `/api/admin/ads/[id]` | Detail — chỉ admin |
| PATCH | `/api/admin/ads/[id]` | Update — chỉ admin |
| PATCH | `/api/admin/ads/[id]?op=toggle` | Bật/tắt — chỉ admin |
| DELETE | `/api/admin/ads/[id]` | Xóa — chỉ admin |
| GET | `/api/ads/active?placement=PRE_ROLL` | Public — player gọi trước playback |
| POST | `/api/ads/events` | Public — log impression/skip/complete/click |

Auth pattern dùng `requireAdmin()` từ shared guard với `if (guard instanceof NextResponse) return guard` (chuẩn của codebase).

### 5.3 Admin UI — [app/dashboard/ads/page.tsx](../app/dashboard/ads/page.tsx)

- Header: count + nút "Thêm quảng cáo".
- Filters bar: tìm theo title/URL + 3 select (type / placement / status).
- Table 8 cột: Tiêu đề + URL, Loại, Vị trí, Thời lượng, Priority, Stats (views/clicks), Status (toggleable), Actions (preview / edit / delete).
- Loading skeleton.
- Empty state khi chưa có ad.
- Toggle bật/tắt inline (PATCH ?op=toggle).
- Preview modal: video player hoặc image overlay, hiện target URL.

[app/dashboard/ads/_components/AdFormModal.tsx](../app/dashboard/ads/_components/AdFormModal.tsx) — modal create/edit:
- Field reactive: chuyển type→IMAGE/BANNER tự blank duration + skipAfterSeconds.
- Validate client-side trước khi POST.
- Datetime-local cho startAt/endAt.
- Priority + isActive checkbox.

Sidebar [app/dashboard/layout.tsx](../app/dashboard/layout.tsx) thêm mục **"Quảng cáo"** với icon `Megaphone`, ngay dưới "Thanh toán & TCoin".

### 5.4 Player integration — [src/fe/components/player/AdGate.tsx](../src/fe/components/player/AdGate.tsx)

Wrapper component đặt **TRƯỚC** `<HLSPlayer>`:

```tsx
<AdGate placement="PRE_ROLL">
  <WatchPartyOverlay ...>
    <HLSPlayer ... />
  </WatchPartyOverlay>
</AdGate>
```

Flow:
1. Mount → fetch `/api/ads/active?placement=PRE_ROLL`.
2. Response `adFree:true` hoặc `ad:null` → render children ngay (bỏ qua ad).
3. Có ad → render `<AdOverlay>` thay vì children.
4. AdOverlay:
   - Video: autoplay (muted theo browser policy), timeupdate-driven countdown, `ended` → finish.
   - Image/Banner: setInterval countdown đến `duration` (default 15s).
   - Skip button hiện khi `elapsed >= skipAfterSeconds` (nếu có).
   - Click target → mở tab mới + log event `click`.
   - "Bỏ qua" button → log `skip` + finish.
   - Footer subtle TCoin upsell: "Xóa quảng cáo với 50 TCoin (7 ngày)".
5. Finish → unmount overlay, mount children (HLSPlayer).

HLSPlayer **không thay đổi** — wrapper hoàn toàn external.

## 6. Test thủ công

```bash
# 1. Apply schema (Docker DB)
$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/terence_dev?schema=public'
npx prisma db push --skip-generate --accept-data-loss --schema=src/dta/prisma/schema.prisma

# 2. Rebuild Docker app container
docker compose up -d --build app

# 3. Seed sample ads (3 video PRE_ROLL + 2 banner)
docker compose exec app npx tsx src/dta/scripts/seed-ads.ts
# hoặc: npm run seed:ads

# 4. Smoke endpoints
curl http://localhost:3000/api/ads/active?placement=PRE_ROLL
curl http://localhost:3000/api/ads/active?placement=HOME_BANNER
curl http://localhost:3000/api/admin/ads               # → 401 nếu chưa login

# 5. Mở UI
http://localhost:3000/dashboard/ads                    # admin CRUD
http://localhost:3000/tcoin                            # user wallet + tasks
http://localhost:3000/watch/<id>                       # player auto pre-roll
http://localhost:3000/signup?ref=<userId>              # referral test
```

### Test cases đã verify trên Docker

| Case | Kết quả |
|---|---|
| `GET /api/ads/active?placement=PRE_ROLL` (anon) | Trả Trailer 15s priority 90 ✓ |
| `GET /api/ads/active?placement=HOME_BANNER` | Trả banner ad ✓ |
| `GET /api/admin/ads` (no auth) | HTTP 401 ✓ |
| `/dashboard/ads` page | HTTP 200, 35KB ✓ |
| `/tcoin` page | HTTP 200, 34KB ✓ |
| DB Advertisement count | 5 rows (3 PRE_ROLL VIDEO + 1 HOME_BANNER + 1 DETAIL_BANNER) ✓ |

## 7. Files đã thay đổi

### Mới (10 file)

- [src/dta/prisma/schema.prisma](../src/dta/prisma/schema.prisma) — thêm `Advertisement`, `AdImpression`, relation `User.adImpressions`
- [src/be/modules/ads/ads.service.ts](../src/be/modules/ads/ads.service.ts) — service + selection logic
- [app/api/admin/ads/route.ts](../app/api/admin/ads/route.ts) — GET list / POST create
- [app/api/admin/ads/[id]/route.ts](../app/api/admin/ads/[id]/route.ts) — GET/PATCH/DELETE/toggle
- [app/api/ads/active/route.ts](../app/api/ads/active/route.ts) — public select
- [app/api/ads/events/route.ts](../app/api/ads/events/route.ts) — public tracking
- [app/dashboard/ads/page.tsx](../app/dashboard/ads/page.tsx) — admin table + filter + toggle
- [app/dashboard/ads/_components/AdFormModal.tsx](../app/dashboard/ads/_components/AdFormModal.tsx) — create/edit modal
- [src/fe/components/player/AdGate.tsx](../src/fe/components/player/AdGate.tsx) — pre-roll wrapper + overlay
- [src/dta/scripts/seed-ads.ts](../src/dta/scripts/seed-ads.ts) — idempotent seed

### Sửa (6 file)

- [src/be/modules/tcoin/tcoin.service.ts](../src/be/modules/tcoin/tcoin.service.ts) — thêm `rewardInvite()`
- [src/be/modules/auth/auth.controller.ts](../src/be/modules/auth/auth.controller.ts) — wire `rewardInvite` vào signup
- [src/be/modules/auth/auth.schema.ts](../src/be/modules/auth/auth.schema.ts) — thêm optional `referralCode`
- [app/signup/page.tsx](../app/signup/page.tsx) — capture `?ref=` query, persist sessionStorage, forward khi register
- [app/tcoin/page.tsx](../app/tcoin/page.tsx) — nút "Copy link mời" trên referral card
- [src/fe/components/player/WatchPageClient.tsx](../src/fe/components/player/WatchPageClient.tsx) — wrap player với `<AdGate>`
- [app/dashboard/layout.tsx](../app/dashboard/layout.tsx) — thêm sidebar item "Quảng cáo"
- [package.json](../package.json) — thêm `seed:ads` script

## 8. Out-of-scope / Future work

- **Mid-roll**: model hỗ trợ enum `MID_ROLL` nhưng chưa wire vào player (cần custom event ở HLSPlayer level).
- **VAST/VPAID**: nếu cần serve ads từ ad network thay vì self-hosted media, cần thêm adapter.
- **Frequency capping**: ad cùng user có thể lặp lại — cần cookie/localStorage cap nếu muốn limit "1 ad / 30 phút".
- **A/B testing**: hiện tại priority-based; muốn split traffic cần thêm field `weight` + weighted random.
- **Real-time impressions chart**: AdImpression đã ghi, chart admin chưa build (out of spec).
- **Frontend rendering for HOME_BANNER / DETAIL_BANNER**: `AdGate` chỉ dùng PRE_ROLL. Để banner hiện trên homepage/movie detail, cần thêm component dùng `pickActiveAd('HOME_BANNER')` server-side hoặc client-side fetch — chưa nằm trong spec hiện tại.

## 9. Cách deploy lên prod

```bash
# 1. Sync code
.deploy/sync_missing.py    # cập nhật FILES list trước

# 2. Apply schema
ssh root@host "cd /var/www/TERENCE && npx prisma db push --skip-generate --accept-data-loss"

# 3. Build + restart
ssh root@host "cd /var/www/TERENCE && npm run build && pm2 restart terence --update-env"

# 4. Seed ads (optional, có thể admin tạo qua UI)
ssh root@host "cd /var/www/TERENCE && npm run seed:ads"
```
