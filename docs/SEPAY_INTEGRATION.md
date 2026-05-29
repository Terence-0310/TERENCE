# SePay Webhook Integration — TERENCE

End-to-end guide to configure the SePay bank-transfer integration so that
TCoin top-ups credit the user wallet automatically when the bank account
receives the transfer.

## 1. What this integration does

```
User picks amount  ───►  POST /api/payments/sepay/create
                              │
                              ▼
                         Order row (status PENDING)
                              │
                              ▼
                         QR + bank info shown
                              │
                          (user transfers)
                              │
                              ▼
                    SePay detects deposit
                              │
                              ▼
               POST /api/payments/sepay/webhook
                              │
                  verify auth → match TCOIN_xxx code
                              │
                              ▼
        Order → PAID  +  Wallet credit  (one atomic transaction)
                              │
                              ▼
                 FE polling /status/[id] → success
```

The database is the source of truth. If SePay misses a webhook, calling
`POST /api/payments/sepay/webhook` again with the same `id` is idempotent
— the unique constraint on `TopupOrder.matchedBankTxnId` prevents
double-crediting.

## 2. Environment variables

```dotenv
# REQUIRED — SePay webhook authentication
SEPAY_WEBHOOK_API_KEY=<long-random-string>          # primary (per SePay onboarding)
# SEPAY_WEBHOOK_SECRET=<...>                        # legacy fallback (kept for backward compat)

# REQUIRED if using the SePay-direct QR (`qr.sepay.vn`)
SEPAY_BANK_CODE=<bank-id e.g. ACB / MB / VCB>       # the bank registered with SePay
SEPAY_BANK_ACCOUNT=<account-number>

# OPTIONAL — defaults to `TCOIN` (the prefix this app uses on every order code)
SEPAY_PAYMENT_PREFIX=TCOIN

# OPTIONAL — legacy VietQR fallback (deprecated; SEPAY_BANK_* wins if set)
# Example: VIETQR_BANK_ID=MBBank  /  VIETQR_ACCOUNT_NO=0385272094
VIETQR_BANK_ID=
VIETQR_ACCOUNT_NO=
VIETQR_ACCOUNT_NAME=YOUR NAME

# Public app URL (used in user-facing links)
NEXT_PUBLIC_APP_URL=https://terence.com.vn
```

The webhook verifier accepts the API key in any of these forms — the
SePay UI lets you pick whichever:

| Header | Example |
|---|---|
| `Authorization: Apikey <key>` | `Authorization: Apikey topsecret` |
| `Authorization: Bearer <key>` | `Authorization: Bearer topsecret` |
| `Authorization: <key>` | `Authorization: topsecret` |
| `x-api-key: <key>` | `x-api-key: topsecret` |

## 3. SePay dashboard configuration

1. Log in to the SePay dashboard.
2. Open **Tích hợp → WebHooks** (Integrations → WebHooks).
3. Click **Thêm WebHook mới**.
4. Fill in:
   - **URL**: `https://terence.com.vn/api/payments/sepay/webhook`
   - **Sự kiện** (event): _Có tiền vào_ (incoming transfer only).
   - **Tiền tố lọc nội dung** (content prefix): `TCOIN`
     (so SePay only sends a webhook when the bank message contains the
     `TCOIN_` prefix this app uses on every order — saves bandwidth.)
   - **Bật**: ON
   - **Header / Authorization**:
     - Type: **Authorization Header**
     - Value: `Apikey <SEPAY_WEBHOOK_API_KEY>`
     - (You can use `x-api-key` instead if the form supports it; both work.)
5. Save. SePay will send a test ping; you can verify it in
   `prisma.bankWebhookLog` or in the app log lines tagged
   `SEPAY_WEBHOOK_RECEIVED`.

## 4. API surface

### `POST /api/payments/sepay/create` — free-amount top-up

```jsonc
// Request
{ "amount": 50000 }                   // VND, integer, > 0

// Response (201)
{
  "success": true,
  "paymentId": "cm...cuid...",
  "code": "TCOIN_<userId6>_<ts36>",
  "amount": 50000,
  "tcoinAmount": 500,                 // 1.000đ = 10 TCoin
  "qrUrl": "https://qr.sepay.vn/img?...",
  "qrUrlVietQr": "https://img.vietqr.io/...",
  "transferContent": "TCOIN_AB12CD_LX12NK",
  "expiresAt": "2026-05-22T05:30:00.000Z",
  "bankInfo": {
    "bank": "ACB",
    "account": "0123456789",
    "accountName": "NGUYEN VAN A"
  }
}
```

Auth required (NextAuth session cookie). Amount is validated server-side
(min 1.000đ, max 100.000.000đ).

### `GET /api/payments/sepay/status/[id]`

`[id]` can be either `paymentId` (cuid) or `code` (`TCOIN_xxx`). Caller
must be the owner — 404 otherwise.

```jsonc
{
  "success": true,
  "status": "PENDING",       // PENDING | PAID | FAILED | EXPIRED | CANCELED
  "amount": 50000,
  "tcoinAmount": 500,
  "paidAt": null,
  "expiresAt": "2026-05-22T05:30:00.000Z"
}
```

### `POST /api/payments/sepay/webhook`

Called by SePay. Returns:
- `200` — success / duplicate / ignored (so SePay doesn't retry).
- `400` — malformed JSON body.
- `401` — bad / missing API key.
- `500` — genuine server error (SePay will retry).

The handler:
1. Verifies the auth header.
2. Persists the raw payload to `bankWebhookLog` for audit (with secret redacted).
3. Skips non-incoming transfers.
4. Extracts the `TCOIN_xxx` code from the bank `content` / `description`.
5. Looks up the matching order by `transferContent`.
6. Refuses to credit short payments (logs `SEPAY_AMOUNT_INVALID`).
7. Calls `markOrderPaid()` — atomic order update + wallet credit via Prisma `$transaction`.

### Legacy mirror

`POST /api/webhooks/sepay` is the older mirror endpoint and keeps working
unchanged. Both point at the same processing logic. Production should
configure the new path; the old one is kept so historical webhook
deliveries don't 404.

## 5. Database schema (reused, no migration needed)

```prisma
model TopupOrder {
  id                 String    @id @default(cuid())
  code               String    @unique        // == transferContent for free-amount flow
  userId             String
  packageId          String                   // sentinel "free-amount" package for FE flow
  provider           String                   // BANK_QR
  amountVnd          Int
  coinAmount         Int                      // == tcoinAmount in the API response
  bonusAmount        Int                      // 0 for free-amount, >0 for packages
  transferContent    String                   // TCOIN_xxx
  qrImageUrl         String?
  status             String                   // PENDING | PAID | FAILED | EXPIRED | CANCELED
  matchedBankTxnId   String?   @unique        // PROVIDES IDEMPOTENCY — never credit twice
  matchedBankAccount String?
  matchedBankAmount  Int?
  matchedBankContent String?
  paidAt             DateTime?
  expiresAt          DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}
```

The `matchedBankTxnId @unique` constraint plus the early-return on
`order.status === 'PAID'` in `markOrderPaid()` jointly guarantee that
the same SePay webhook can fire any number of times without crediting
the user twice.

## 6. Logging

Every webhook step emits a structured log line with a `tag` field — easy
to filter in pino / Loki / CloudWatch.

| Tag | When |
|---|---|
| `SEPAY_WEBHOOK_RECEIVED` | Body decoded, processing started. |
| `SEPAY_WEBHOOK_UNAUTHORIZED` | Auth header missing / wrong. |
| `SEPAY_WEBHOOK_IGNORED` | Out-transfer / no `TCOIN_` code / non-PENDING order. |
| `SEPAY_PAYMENT_NOT_FOUND` | `TCOIN_xxx` extracted but no order matched. |
| `SEPAY_AMOUNT_INVALID` | User transferred less than the order amount. |
| `SEPAY_PAYMENT_PAID` | Wallet credited successfully. |
| `SEPAY_DUPLICATE_TRANSACTION` | Webhook retry — same `matchedBankTxnId` already PAID. |
| `SEPAY_WEBHOOK_ERROR` | Unhandled exception (500 to SePay). |

Secrets are never logged. The Authorization header is recorded only as
`(redacted: present)` / `(missing)` in `bankWebhookLog.signature`.

## 7. Testing it end-to-end

### Locally — without real bank

```bash
# 1. Spin up app + DB + ES
npm run docker:up

# 2. Hit the create endpoint as a logged-in user (use the session cookie
#    from your browser). Pick any amount.
curl -X POST http://localhost:3000/api/payments/sepay/create \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"amount": 50000}'

# 3. Simulate SePay calling the webhook (use your dev API key):
curl -X POST http://localhost:3000/api/payments/sepay/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Apikey ${SEPAY_WEBHOOK_API_KEY}" \
  -d '{
    "id": 999999,
    "gateway": "ACB",
    "transactionDate": "2026-05-22 12:00:00",
    "accountNumber": "0123456789",
    "transferType": "in",
    "transferAmount": 50000,
    "content": "Chuyen khoan TCOIN_AB12CD_LX12NK",
    "referenceCode": "FT99",
    "description": "TCOIN_AB12CD_LX12NK"
  }'

# 4. Poll the status endpoint — should be PAID.
curl http://localhost:3000/api/payments/sepay/status/<paymentId> \
  -H "Cookie: next-auth.session-token=..."
```

### In production — with a real transfer

1. From the FE, create an order at `/tcoin` (or via API).
2. Use the displayed `transferContent` (e.g. `TCOIN_AB12CD_LX12NK`) as
   the bank-transfer note. Transfer the exact `amount`.
3. Within ~30 s, SePay will fire the webhook. The order moves to PAID and
   the user's wallet increments by `tcoinAmount`.

If anything goes wrong, the row in `bankWebhookLog` shows exactly which
step failed (parse / auth / amount / order-not-found / DB error).

## 8. Things deliberately NOT done

- No DB migration. The existing `TopupOrder` schema already covers every
  field requested by the spec — code, amount, tcoinAmount (= `coinAmount`),
  status, provider, providerTxnId (= `matchedBankTxnId`), qrUrl
  (= `qrImageUrl`), paidAt, timestamps.
- The legacy package-based flow at `/api/tcoin/topup/create-bank-order`
  is **left untouched**. The current FE at `/tcoin` continues to use it.
  Free-amount flow at `/api/payments/sepay/create` sits beside it.
- No payment-provider abstraction. SePay is the only configured channel,
  so we keep the integration explicit and inline. If a second provider is
  added later, refactor at that point — not before.
