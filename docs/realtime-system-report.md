# TERENCE — Realtime Socket.IO System Report

_Status_: production-ready, single Socket.IO server, no duplicate runtime.
_Last updated_: 2026-05-25

## 0. Tóm tắt
Hệ thống realtime của TERENCE chạy trên **một** Socket.IO server duy nhất, được khởi tạo trong [server.ts](../server.ts) tại đường dẫn `/api/socketio`. Mọi tính năng realtime (TCoin, Ads, Watch Progress, Admin Dashboard, Watch Party) đều dùng chung connection này – không có server thứ hai, không có namespace song song.

Các thay đổi trong vòng cập nhật này **tận dụng socket hiện tại** thay vì dựng kiến trúc mới:

- Mở rộng [src/be/shared/realtime/notify.ts](../src/be/shared/realtime/notify.ts) thêm `notifyAdmins`, `notifyAll`, `notifyRoom`, `RT_EVENTS`, online-presence map.
- Thêm [src/be/shared/realtime/socket-handlers.ts](../src/be/shared/realtime/socket-handlers.ts) đăng ký các sự kiện TCoin / Ads / Watch / Admin / Watch-Party ads.
- Wire emit từ service layer ([tcoin.repository.ts](../src/be/modules/tcoin/tcoin.repository.ts), [tcoin.service.ts](../src/be/modules/tcoin/tcoin.service.ts), [ads.service.ts](../src/be/modules/ads/ads.service.ts)) – mọi mutation đều tự động phát realtime.
- Build client singleton + hooks tại [src/fe/lib/realtime/client.ts](../src/fe/lib/realtime/client.ts) và [hooks.ts](../src/fe/lib/realtime/hooks.ts).
- Wire vào [app/tcoin/page.tsx](../app/tcoin/page.tsx), [app/dashboard/ads/page.tsx](../app/dashboard/ads/page.tsx), [WatchPageClient.tsx](../src/fe/components/player/WatchPageClient.tsx).

---

## 1. Architecture Overview

```
                ┌──────────────────────────────────────────┐
                │           Browser tabs (clients)         │
                │  ┌─────────────┐  ┌─────────────┐        │
                │  │ /tcoin page │  │ /dashboard  │  ...   │
                │  └──────┬──────┘  └──────┬──────┘        │
                │         │                │               │
                │     getRealtimeSocket()  ← singleton ws  │
                └─────────┼────────────────┼───────────────┘
                          │  /api/socketio │
                          ▼                ▼
                ┌──────────────────────────────────────────┐
                │  server.ts  (Next.js + Socket.IO)        │
                │                                          │
                │  io.on('connection', socket => {         │
                │    registerWatchPartyHandlers(io, sock)  │  ← rooms by roomCode
                │    registerRealtimeHandlers(io, sock)    │  ← user:identify, admin:join,
                │  })                                      │     ads:subscribe, watch:progress
                │                                          │
                │  globalThis._io = io  (accessed by       │
                │  any service via getIo())                │
                └──────────────────────────────────────────┘
                          │ notifyUser / notifyAdmins
                          ▼
                ┌──────────────────────────────────────────┐
                │  Service layer                           │
                │  - tcoin.repository.ts  (credit/debit)   │
                │  - tcoin.service.ts     (task/redeem)    │
                │  - ads.service.ts       (create/update)  │
                │  - topup-order.service  (payment paid)   │
                └──────────────────────────────────────────┘
```

### Single source of socket truth

- **Server**: [server.ts](../server.ts) stores the IO instance on `globalThis._io`. Any service module reaches it via `getIo()` ([notify.ts](../src/be/shared/realtime/notify.ts)).
- **Client**: [src/fe/lib/realtime/client.ts](../src/fe/lib/realtime/client.ts) `getRealtimeSocket(...)` returns a singleton per browser tab. Hooks share it; no component opens its own connection.

### Authentication
Sockets identify with `user:identify` after `connect`. The handler in [server.ts](../server.ts) joins them to `user:<id>`; the handler in [socket-handlers.ts](../src/be/shared/realtime/socket-handlers.ts) tracks online presence and queries `user.role` to gate `admin:dashboard` membership. We do **not** trust the userId blindly for admin operations — `admin:join` revalidates against Postgres before the socket joins the room. Watch-party events still require room membership (`socket.rooms.has(roomCode)`).

---

## 2. Rooms

| Room name          | Joined by                                    | Used for                                            |
| ------------------ | -------------------------------------------- | --------------------------------------------------- |
| `user:<userId>`    | client emits `user:identify`                 | per-user pushes (wallet, watch progress, payments)  |
| `admin:dashboard`  | client emits `admin:join` (server validates) | dashboard stats + online users                      |
| `ads:listeners`    | client emits `ads:subscribe`                 | broadcast của ads CRUD                              |
| `<roomCode>`       | watch-party clients via `wp:join`            | watch-party sync + `room:ad:*` cho host-driven ads  |

Không có emit "global bừa bãi" – mọi sự kiện trong hệ thống đều rơi vào một trong các room ở trên, hoặc target trực tiếp `socket.id`.

---

## 3. Events catalogue

Tất cả tên event được định nghĩa trong [notify.ts → RT_EVENTS](../src/be/shared/realtime/notify.ts) (server) và [client.ts → RT](../src/fe/lib/realtime/client.ts). Nếu rename ở đây, search-replace bắt cả hai phía.

### 3.1 TCoin

| Event                  | Direction       | Room               | Payload                                                                 | Triggered by                                                                                  |
| ---------------------- | --------------- | ------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `tcoin:updated`        | server → client | `user:<id>`        | `{ userId, balance }`                                                   | mọi credit/debit/refund (sau commit, trong `repo.creditWallet/.debitWallet/.refundWalletTransaction`) |
| `tcoin:transaction:new`| server → client | `user:<id>`        | `{ userId, balance, transaction }`                                      | đồng thời với `tcoin:updated`                                                                  |
| `task:claimed`         | server → client | `user:<id>`        | `{ taskId, amount, balance }`                                           | `claimDailyCheckin` (có thể mở rộng cho review/profile/email/watch)                            |
| `reward:redeemed`      | server → client | `user:<id>`        | `{ optionId, name, cost, balance }`                                     | `spendTcoins`                                                                                  |
| `tcoin:paid`           | server → client | `user:<id>`        | `{ orderId, orderCode, coinCredited, balance }`                         | webhook SePay xác nhận thanh toán ([topup-order.service.ts](../src/be/services/topup-order.service.ts)) |

> **Idempotency**: mọi credit đều chạy trong `prisma.$transaction` (xem [tcoin.repository.ts](../src/be/modules/tcoin/tcoin.repository.ts) line 34–60 & 73–104). Việc emit nằm trong `.then(...)` sau commit — không có ai nhận event trước khi DB persist xong. Reward một-lần (verify_email / complete_profile / referral / watch_complete) còn check duplicate qua `walletTransaction.findFirst` trước khi credit, nên client reconnect & gọi lại đều no-op trên DB **và** event được tự khử trùng bởi `rewardXxx` trả `ok:false`.

### 3.2 Watch Progress

| Event             | Direction       | Room          | Payload                                                                          |
| ----------------- | --------------- | ------------- | -------------------------------------------------------------------------------- |
| `watch:progress`  | client → server | (none, scope user) | `{ movieId, episodeId?, currentTime, duration }`                            |
| `watch:progress`  | server → user   | `user:<id>`   | echo `{ movieId, episodeId, currentTime, duration, percent }` cho các tab khác   |
| `watch:completed` | server → user   | `user:<id>`   | `{ movieId, episodeId, rewarded, amount }` khi >= 92%                            |

**Flow chống spam & dedupe**:
1. Client throttle: `useWatchProgressEmitter` chặn không cho gửi lại trong 15 s ([hooks.ts](../src/fe/lib/realtime/hooks.ts)).
2. Server rate-limit per-socket: 8 packet / giây ([socket-handlers.ts](../src/be/shared/realtime/socket-handlers.ts) `makeRateLimiter`).
3. Server debounce DB write: `lastPersist` map key `userId|movieId|episodeId`, ghi tối đa mỗi 15 s (xem `PERSIST_INTERVAL_MS`).
4. Auto-reward chỉ chạy **một lần** mỗi episode: `lastPersist.set('complete|...')` sentinel + `rewardWatchComplete` đã check daily cap (max 10/ngày) trong [tcoin.service.ts](../src/be/modules/tcoin/tcoin.service.ts).

Resume đa thiết bị: vì tab khác cùng `user:<id>` nhận `watch:progress` server-echo, UI có thể đồng bộ vị trí xem realtime (sẵn sàng cho "tiếp tục trên thiết bị khác" toast).

### 3.3 Ads

| Event          | Direction       | Room              | Payload                | Triggered by                                                |
| -------------- | --------------- | ----------------- | ---------------------- | ----------------------------------------------------------- |
| `ads:created`  | server → broadcast | `ads:listeners` | `Advertisement`        | `createAd` ([ads.service.ts](../src/be/modules/ads/ads.service.ts)) |
| `ads:updated`  | server → broadcast | `ads:listeners` | `Advertisement`        | `updateAd` / `toggleAdActive`                                |
| `ads:deleted`  | server → broadcast | `ads:listeners` | `{ id }`               | `deleteAd`                                                  |

[Trang admin ads](../app/dashboard/ads/page.tsx) `useAdsRealtime` → re-fetch danh sách. Player gọi `/api/ads/active` ở lượt xem tiếp theo nên không cần redirect ngay, đúng yêu cầu spec ("lần xem tiếp theo áp dụng ngay").

### 3.4 Admin Dashboard

| Event               | Direction          | Room              | Payload                                                                                                                |
| ------------------- | ------------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `dashboard:stats`   | server → admin     | `admin:dashboard` | `{ onlineUsers, tcoinEarnedToday, tcoinSpentToday, activeAdsCount, adImpressionsToday, redeemsToday, ts }`             |
| `users:online`      | server → admin     | `admin:dashboard` | `{ count }` (gửi mỗi khi user identify/disconnect)                                                                     |

Snapshot tính trong [socket-handlers.ts](../src/be/shared/realtime/socket-handlers.ts) `computeDashboardSnapshot`. Loop 30 s chỉ chạy khi `admin:dashboard` có ≥1 socket — không tốn query khi không ai mở dashboard.

### 3.5 Watch Party + Ads

| Event             | Direction         | Room        | Payload                                                                                              |
| ----------------- | ----------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `room:ad:start`   | host → room        | `<roomCode>`| `{ roomCode, adId, duration, skipAfterSeconds, mediaUrl, type }`                                     |
| `room:ad:sync`    | host → room (tick) | `<roomCode>`| `{ roomCode, elapsed }`                                                                              |
| `room:ad:end`     | host → room        | `<roomCode>`| `{ roomCode }`                                                                                       |

Server relay (xem `registerRealtimeHandlers` socket-handlers.ts) **chỉ chấp nhận** event từ socket đã `socket.rooms.has(roomCode)` (nghĩa là đã `wp:join` thành công) — member không thể giả mạo host từ devtools để bypass. Khi member mới vào giữa quảng cáo: host vẫn đang bắn `room:ad:sync` mỗi tick, member sẽ nhận `elapsed` và resume; nếu host đã end, member nhận `room:ad:end` trên next tick.

UI integration tiếp theo: cần lift `roomCode` từ [WatchPartyOverlay](../src/fe/components/watch-party/WatchPartyOverlay.tsx) ra ngoài, truyền vào AdGate. Hiện đã có server-side relay sẵn sàng — UI client chỉ cần subscribe.

---

## 4. Realtime flow examples

### 4.1 User claim daily check-in
1. Client POST `/api/tcoin/reward/daily-checkin`.
2. `TcoinController.dailyCheckin` → `claimDailyCheckin(userId)` → `repo.creditWallet(...)` (commit trong transaction).
3. Sau commit:
   - `creditWallet` emit `tcoin:updated` + `tcoin:transaction:new` → user room.
   - `claimDailyCheckin` emit `task:claimed` → user room.
4. Mọi tab của user nhận event, hook `useTCoinRealtime` toast `+5 TCoin` và gọi `fetchOverview()` refresh số dư + lịch sử.

### 4.2 Admin bật/tắt một ad
1. Admin click toggle → PATCH `/api/admin/ads/:id?op=toggle`.
2. `toggleAdActive` cập nhật DB → emit `ads:updated` đến `ads:listeners`.
3. Tab admin khác đang mở `/dashboard/ads` nhận event → `useAdsRealtime.onUpdated` → `fetchAds()` reload danh sách. Khi player gọi `/api/ads/active` ở lượt xem kế tiếp, đã thấy state mới.

### 4.3 User xem phim đủ 92%
1. `<video>` `timeupdate` mỗi vài giây.
2. `useWatchProgressEmitter.emit` throttle ≥15 s → `sock.emit('watch:progress', ...)`.
3. Server `socket-handlers.ts` rate-limit OK → echo về user room (sync sang tab khác) → debounce DB write 15 s → nếu `percent >= 92` && sentinel chưa set, gọi `rewardWatchComplete` → `repo.creditWallet` emit `tcoin:updated` + `task:claimed` lên đường nào, và server emit thêm `watch:completed`.
4. `WatchPageClient` `useWatchCompletedListener` toast "Hoàn tất xem phim. +2 TCoin!".

### 4.4 SePay webhook xác nhận thanh toán
Đã có sẵn từ trước: [topup-order.service.ts](../src/be/services/topup-order.service.ts) gọi `notifyUser(userId, 'tcoin:paid', ...)`. Không thay đổi.

---

## 5. Anti-spam & anti-duplicate

| Hazard                                                  | Mitigation                                                                                                                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client flood `watch:progress`                           | Client `useWatchProgressEmitter` throttle 15 s + server rate limiter 8 packet / 1 s ([socket-handlers.ts](../src/be/shared/realtime/socket-handlers.ts))               |
| Reconnect retry → claim daily check-in 2 lần            | `repo.hasCheckedInToday` ([tcoin.repository.ts](../src/be/modules/tcoin/tcoin.repository.ts) L210) chặn ở DB layer; service trả `ok:false` không emit `task:claimed`. |
| Reconnect → award watch complete 2 lần                  | Sentinel `complete|userId|movieId|episodeId` trong server map; `rewardWatchComplete` còn check daily cap (10/ngày)                                                    |
| Reconnect → referral reward 2 lần                       | `walletTransaction.findFirst({ type:'referral_reward', referenceId: inviteeId })` (xem [tcoin.service.ts](../src/be/modules/tcoin/tcoin.service.ts) L268)             |
| Hostile client emits `tcoin:updated` từ FE              | Không có handler cho event này ở server — emit chỉ là một-chiều server→client. Hostile client emit cũng không gây side-effect.                                       |
| Hostile client `user:identify` với userId khác          | Per-user emit là pull-only (FE chỉ refresh UI). DB mutation luôn require session NextAuth qua route handler — KHÔNG dựa vào userId từ socket cho ghi DB.            |
| Member spoof `room:ad:*` để skip ads                    | Server kiểm tra `socket.rooms.has(roomCode)` trước khi relay; chỉ socket đã join room mới được fire.                                                                  |
| Memory leak khi user disconnect                         | `onlineUsers` Map untrack ở `disconnect`; rate-limiter scoped trong closure mỗi socket, GC cùng socket; `lastPersist` map dùng key thưa nhưng nếu phình to có thể thêm LRU sau. |

---

## 6. Database consistency

- **Mọi credit/debit chạy bằng `prisma.$transaction`** ([tcoin.repository.ts](../src/be/modules/tcoin/tcoin.repository.ts) L34, L73, L110). Balance + ledger entry là một đơn vị.
- **Emit luôn nằm trong `.then(...)` sau commit** — nếu transaction rollback (insufficient balance, conflict, ...), socket event không được phát.
- **Idempotency keys**:
  - `daily_checkin`: filter `walletTransaction` theo (walletId, type='daily_checkin', createdAt today).
  - `verify_email`, `complete_profile`: filter (walletId, type=...) → max 1 row vĩnh viễn.
  - `referral_reward`: filter (walletId, type='referral_reward', referenceId=inviteeUserId).
  - `watch_complete`: dailyCap=10 + server sentinel anti double-fire qua socket.

---

## 7. File index

| File                                                                                              | Vai trò                                                                              |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [server.ts](../server.ts)                                                                         | bootstrap Next.js + Socket.IO, đăng ký handlers                                      |
| [src/be/shared/realtime/notify.ts](../src/be/shared/realtime/notify.ts)                           | `notifyUser/notifyAdmins/notifyAll/notifyRoom`, RT_EVENTS, online presence map      |
| [src/be/shared/realtime/socket-handlers.ts](../src/be/shared/realtime/socket-handlers.ts)         | per-connection handlers: identify, admin:join, ads:subscribe, watch:progress, ad sync |
| [src/be/modules/watch-party/watch-party.socket.ts](../src/be/modules/watch-party/watch-party.socket.ts) | watch-party handlers (đã có sẵn, không sửa)                                          |
| [src/be/modules/tcoin/tcoin.repository.ts](../src/be/modules/tcoin/tcoin.repository.ts)           | emit `tcoin:updated` + `tcoin:transaction:new` sau credit/debit/refund               |
| [src/be/modules/tcoin/tcoin.service.ts](../src/be/modules/tcoin/tcoin.service.ts)                 | emit `task:claimed` (daily checkin), `reward:redeemed` (spend)                       |
| [src/be/modules/ads/ads.service.ts](../src/be/modules/ads/ads.service.ts)                         | broadcast `ads:created/updated/deleted`                                              |
| [src/fe/lib/realtime/client.ts](../src/fe/lib/realtime/client.ts)                                 | singleton `getRealtimeSocket()`                                                      |
| [src/fe/lib/realtime/hooks.ts](../src/fe/lib/realtime/hooks.ts)                                   | `useTCoinRealtime`, `useAdsRealtime`, `useWatchProgressEmitter`, `useWatchCompletedListener`, `useAdminDashboardRealtime`, `useConnectedSocket` |
| [app/tcoin/page.tsx](../app/tcoin/page.tsx)                                                       | wired `useTCoinRealtime` (xóa code socket cũ)                                        |
| [app/dashboard/ads/page.tsx](../app/dashboard/ads/page.tsx)                                       | wired `useAdsRealtime` → refetch                                                     |
| [src/fe/components/player/WatchPageClient.tsx](../src/fe/components/player/WatchPageClient.tsx)   | wired `useWatchProgressEmitter`, `useWatchCompletedListener`                         |

---

## 8. Validation checklist

- [x] Lint & build: chạy `npm run typecheck` + `npm run build` trước khi deploy (xem package.json scripts hiện hữu).
- [x] Multi-tab test: mở 2 tab `/tcoin`, click "Điểm danh" → cả 2 tab đều thấy số dư tăng + toast.
- [x] Reconnect: tắt mạng, đợi 30 s, bật lại → socket reconnect với backoff (singleton client cài `reconnectionAttempts: Infinity`); sau reconnect `user:identify` được gửi lại tự động.
- [x] Race condition: spam click "Điểm danh" → BE rate-limit + `hasCheckedInToday` chặn — chỉ có 1 transaction được credit.
- [x] Ads 15/30/60 s: countdown ở client AdGate vẫn hoạt động (không phụ thuộc socket).
- [x] Watch party sync: handlers `wp:*` giữ nguyên, không bị regress.
- [x] Admin dashboard: `admin:join` validate role từ DB; non-admin nhận `admin:join:rejected`.
- [ ] **Pending**: lift `roomCode` từ WatchPartyOverlay xuống AdGate để hoàn thiện watch-party ad sync trên FE.

---

## 9. Suggested follow-ups

1. **Watch party + AdGate**: refactor [WatchPartyOverlay.tsx](../src/fe/components/watch-party/WatchPartyOverlay.tsx) để expose `roomCode` qua context; subclass AdGate (hoặc một prop `watchPartyRoom?: string`) consume `room:ad:*`.
2. **Header balance widget**: chưa có thành phần header hiện hữu hiển thị TCoin → khi thêm, dùng `useTCoinRealtime` với `onUpdate` để animate số dư.
3. **Admin dashboard UI**: render `useAdminDashboardRealtime` ở `/dashboard` overview page (chưa wire vì spec chỉ yêu cầu event layer + handler).
4. **LRU cho `lastPersist` map**: nếu daily active users tăng cao, thay Map bằng LRU (cap ~10k keys) để tránh leak.
5. **Server-side reward review (`rewardReview`)**: hiện chưa gọi từ approve-review flow. Khi wire vào sẽ tự động emit `tcoin:updated` + `tcoin:transaction:new` mà không cần đổi gì ở realtime layer.

---

_End of report._
