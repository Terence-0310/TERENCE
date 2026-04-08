# TCoin Flow — Architecture

> **Last Updated**: 2026-03-31

---

## Overview

TCoin is the virtual currency of the TERENCE platform. Users earn TCoins through daily check-ins, watching movies, writing reviews, and referrals. They can spend TCoins on premium features or purchase more through payment packages.

---

## System Architecture

```mermaid
graph TD
    subgraph "Earn TCoins"
        A["Daily Checkin"] -->|"5 TCoin"| W["Wallet"]
        B["Watch Complete"] -->|"2 TCoin"| W
        C["Write Review"] -->|"10 TCoin"| W
        D["Invite Friend"] -->|"100 TCoin"| W
        E["Admin Adjust"] -->|"±N TCoin"| W
    end

    subgraph "Purchase TCoins"
        F["User"] -->|"1. Select package"| G["POST /payments/create-order"]
        G -->|"2. Create"| H["PaymentOrder (pending)"]
        I["Payment Gateway"] -->|"3. Webhook"| J["POST /payments/callback"]
        J -->|"4. Confirm"| H
        J -->|"5. Credit"| W
    end

    subgraph "Spend TCoins"
        K["User"] -->|"1. Select option"| L["POST /tcoin/spend"]
        L -->|"2. Check balance"| W
        L -->|"3. Debit"| M["WalletTransaction"]
    end

    W -->|"Store"| N["Wallet DB"]
    M -->|"Audit"| O["WalletTransaction DB"]
```

---

## Data Flow: Daily Check-in

```mermaid
sequenceDiagram
    participant User
    participant API as /api/tcoin/reward/daily-checkin
    participant Service as tcoin.service
    participant Repo as tcoin.repository
    participant DB as Prisma DB

    User->>API: POST (authenticated)
    API->>Service: claimDailyCheckin(userId)
    Service->>Repo: getOrCreateWallet(userId)
    Repo->>DB: wallet.upsert()
    DB-->>Repo: wallet
    Service->>Repo: hasCheckedInToday(walletId)
    Repo->>DB: walletTransaction.count(category=daily_checkin, today)

    alt Already checked in
        Service-->>API: { ok: false, message: "Đã điểm danh" }
    else First check-in today
        Service->>Repo: creditWallet(walletId, 5, "daily_checkin")
        Repo->>DB: $transaction [wallet.update + transaction.create]
        Note over DB: balanceBefore = 245<br>balanceAfter = 250
        DB-->>Repo: { wallet, transaction }
        Service-->>API: { ok: true, amount: 5, balance: 250 }
    end

    API-->>User: JSON response
```

---

## Data Flow: Purchase TCoins

```mermaid
sequenceDiagram
    participant User
    participant CreateAPI as /api/payments/create-order
    participant Callback as /api/payments/callback
    participant Service as tcoin.service
    participant DB as Prisma DB
    participant Gateway as Payment Gateway

    User->>CreateAPI: POST { packageId: "popular" }
    CreateAPI->>Service: createPurchaseOrder(userId, "popular")
    Service->>DB: paymentOrder.create(pending, 79000₫, 550 tcoins)
    DB-->>Service: order
    Service-->>CreateAPI: { orderId, amount, tcoins }
    CreateAPI-->>User: Order created

    Note over User,Gateway: User pays via bank transfer / e-wallet

    Gateway->>Callback: POST { orderId, providerTxnId, status: "completed" }
    Callback->>Service: processPaymentCallback(orderId, txnId, "completed")
    Service->>DB: paymentOrder.update(status: "completed", paidAt)
    Service->>Service: creditWallet(userId, 550, "purchase")
    Service->>DB: $transaction [wallet + transaction]
    Note over DB: balanceBefore = 250<br>balanceAfter = 800
    Service-->>Callback: { ok: true, tcoins: 550 }
```

---

## Data Flow: Spend TCoins

```mermaid
sequenceDiagram
    participant User
    participant API as /api/tcoin/spend
    participant Service as tcoin.service
    participant DB as Prisma DB

    User->>API: POST { optionId: "remove-ads-7d" }
    API->>Service: spendTcoins(userId, "remove-ads-7d")
    Service->>Service: Find option (cost: 50)
    Service->>DB: wallet.findUnique()

    alt Balance >= 50
        Service->>DB: $transaction [wallet.update - 50, transaction.create]
        Note over DB: type: "debit"<br>category: "spend"<br>balanceBefore: 800<br>balanceAfter: 750
        Service-->>API: { ok: true, balance: 750 }
    else Balance < 50
        Service-->>API: { ok: false, message: "Không đủ TCoin" }
    end
```

---

## Transaction Audit Trail

Every transaction records:

```
┌─────────────────────────────────────────────────┐
│ WalletTransaction                               │
├─────────────────────────────────────────────────┤
│ id: "clx..."                                    │
│ walletId: "clx..."                              │
│ type: "credit" | "debit"                        │
│ category: "daily_checkin" | "purchase" | ...     │
│ amount: 5                                       │
│ balanceBefore: 245  ◄── snapshot before          │
│ balanceAfter: 250   ◄── snapshot after           │
│ description: "Điểm danh hàng ngày: +5 TCoin"   │
│ referenceId: null | "orderId" | "adminId"       │
│ referenceType: null | "payment_order" | "admin" │
│ createdAt: 2026-03-31T03:00:00Z                │
└─────────────────────────────────────────────────┘
```

This enables:
- **Audit**: Trace exactly how balance changed
- **Reconciliation**: Sum all balanceAfter should match wallet.balance
- **Debugging**: If balance is wrong, find the discrepancy transaction

---

## Module Architecture

```
src/server/modules/tcoin/
  ├─ index.ts                     ← Barrel export
  ├─ tcoin.types.ts               ← All type definitions
  ├─ tcoin.service.ts             ← Business logic
  │    ├─ REWARD_CONFIGS          ← Reward definitions
  │    ├─ SPEND_OPTIONS           ← Spend definitions
  │    ├─ TCOIN_PACKAGES          ← Purchase packages
  │    ├─ getWallet()             ← User wallet info
  │    ├─ getTransactions()       ← Transaction history
  │    ├─ claimDailyCheckin()     ← Daily reward
  │    ├─ rewardWatchComplete()   ← Watch reward
  │    ├─ rewardReview()          ← Review reward
  │    ├─ spendTcoins()           ← Spend TCoins
  │    ├─ createPurchaseOrder()   ← Purchase flow
  │    ├─ processPaymentCallback()← Payment confirmation
  │    ├─ adminAdjust()           ← Admin manual adjust
  │    ├─ getAdminWallets()       ← Admin wallet list
  │    └─ getAdminPaymentOrders() ← Admin orders list
  └─ tcoin.repository.ts         ← Prisma queries only
       ├─ creditWallet()          ← Atomic credit (interactive txn)
       ├─ debitWallet()           ← Atomic debit (interactive txn)
       ├─ hasCheckedInToday()     ← Cooldown check
       ├─ countTodayRewards()     ← Daily limit check
       └─ ...CRUD operations
```

---

## API Routes

```
app/api/
  ├─ tcoin/
  │    ├─ wallet/route.ts              GET  — User wallet info
  │    ├─ transactions/route.ts        GET  — Transaction history
  │    ├─ reward/daily-checkin/route.ts POST — Daily check-in
  │    └─ spend/route.ts               POST — Spend TCoins
  ├─ payments/
  │    ├─ create-order/route.ts        POST — Create purchase order
  │    └─ callback/route.ts            POST — Payment webhook
  └─ admin/tcoin/
       ├─ wallets/route.ts             GET  — Admin: all wallets
       ├─ payments/route.ts            GET  — Admin: all orders
       └─ adjust/route.ts             POST — Admin: manual adjust
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `Wallet` | 1:1 per user, stores `balance` |
| `WalletTransaction` | Every credit/debit with `balanceBefore`/`balanceAfter` |
| `PaymentOrder` | Purchase orders with status lifecycle |

---

## Security Considerations

1. **Atomic operations**: `creditWallet` / `debitWallet` use Prisma interactive transactions — balance is read + updated in the same transaction, preventing race conditions.
2. **Daily limits**: Check-in is once/day, watch rewards max 10/day, review rewards max 3/day.
3. **Balance validation**: Spending always checks `wallet.balance >= cost` inside the transaction.
4. **Admin audit**: Admin adjustments record the admin's userId in `referenceId`.
5. **Payment idempotency**: `processPaymentCallback` checks `order.status !== 'pending'` to prevent double-processing.

---

## Future: Payment Gateway Integration

The current implementation uses `provider: "manual"` with admin confirmation. To integrate a real payment gateway (VNPay, MoMo, ZaloPay):

1. Replace `createPurchaseOrder()` to generate a redirect URL to the gateway
2. Implement HMAC signature verification in `/api/payments/callback`
3. Add webhook retry handling
4. Add refund flow
