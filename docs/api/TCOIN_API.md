# TCoin API Documentation

> **Base URL**: `/api/tcoin` (user) + `/api/payments` (purchase) + `/api/admin/tcoin` (admin)  
> **Version**: v1  
> **Last Updated**: 2026-03-31

---

## User Endpoints

### 1. GET `/api/tcoin/wallet`

Get current user's wallet info.

**Authentication**: Required

**Response** (`200 OK`):

```json
{
  "balance": 250,
  "userId": "clx...",
  "createdAt": "2026-03-31T03:00:00.000Z",
  "totalEarned": 350,
  "totalSpent": 100
}
```

---

### 2. GET `/api/tcoin/transactions`

Get paginated transaction history.

**Authentication**: Required

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `perPage` | number | 20 | Items per page (max 50) |
| `category` | string | - | Filter: `daily_checkin`, `watch_reward`, `review_reward`, `purchase`, `spend`, `admin_adjustment` |

**Response** (`200 OK`):

```json
{
  "transactions": [
    {
      "id": "clx...",
      "type": "credit",
      "category": "daily_checkin",
      "amount": 5,
      "balanceBefore": 245,
      "balanceAfter": 250,
      "description": "Điểm danh hàng ngày: +5 TCoin",
      "referenceId": null,
      "referenceType": null,
      "createdAt": "2026-03-31T03:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "perPage": 20
}
```

---

### 3. POST `/api/tcoin/reward/daily-checkin`

Claim daily check-in reward (5 TCoin/day).

**Authentication**: Required

**Response** (`200 OK`):

```json
{
  "ok": true,
  "amount": 5,
  "balance": 255,
  "message": "Nhận 5 TCoin! Quay lại ngày mai nhé."
}
```

**Already claimed**:
```json
{
  "ok": false,
  "amount": 0,
  "balance": 250,
  "message": "Bạn đã điểm danh hôm nay rồi!",
  "nextCheckinAt": "2026-04-01T00:00:00.000Z"
}
```

---

### 4. POST `/api/tcoin/spend`

Spend TCoins on predefined options.

**Authentication**: Required

**Request Body:**

```json
{
  "optionId": "remove-ads-7d"
}
```

**Available Options:**

| ID | Name | Cost | Description |
|----|------|------|-------------|
| `remove-ads-7d` | Xóa quảng cáo 7 ngày | 50 | Trải nghiệm không quảng cáo |
| `hd-upgrade` | Nâng HD → Full HD | 30 | Xem phim chất lượng cao hơn |
| `early-access` | Xem sớm 24h | 100 | Xem phim mới trước cộng đồng |
| `exclusive-badge` | Huy hiệu đặc biệt | 200 | Nhận badge hiển thị khi chat |
| `room-theme` | Theme phòng xem chung | 80 | Tùy chỉnh giao diện phòng |

**Success Response:**
```json
{
  "ok": true,
  "amount": 50,
  "balance": 200,
  "message": "Đã đổi \"Xóa quảng cáo 7 ngày\" thành công!"
}
```

**Insufficient Balance:**
```json
{
  "ok": false,
  "amount": 0,
  "balance": 20,
  "message": "Không đủ TCoin. Cần 50, hiện có 20."
}
```

---

## Payment Endpoints

### 5. POST `/api/payments/create-order`

Create a payment order to purchase TCoins.

**Authentication**: Required

**Request Body:**

```json
{
  "packageId": "popular"
}
```

**Available Packages:**

| ID | Name | TCoins | Bonus | Price (VND) |
|----|------|--------|-------|-------------|
| `starter` | Gói Khởi Đầu | 100 | 0 | 19,000₫ |
| `popular` | Gói Phổ Biến | 500 | 50 | 79,000₫ |
| `premium` | Gói Premium | 1,200 | 200 | 169,000₫ |
| `vip` | Gói VIP | 3,000 | 600 | 399,000₫ |

**Response:**
```json
{
  "ok": true,
  "orderId": "clx...",
  "amount": 79000,
  "tcoins": 550,
  "provider": "manual"
}
```

---

### 6. POST `/api/payments/callback`

Process payment confirmation (webhook or admin manual).

**Request Body:**

```json
{
  "orderId": "clx...",
  "providerTxnId": "txn-12345",
  "status": "completed"
}
```

| Field | Values | Description |
|-------|--------|-------------|
| `status` | `completed`, `failed` | Payment result |

**On `completed`**: Order is updated, TCoins are credited to the user's wallet.

**Error Cases:**
- `404`: Order not found
- `409`: Order already processed

---

## Admin Endpoints

### 7. GET `/api/admin/tcoin/wallets`

List all user wallets with aggregates.

**Authorization**: Admin role required

| Param | Default | Description |
|-------|---------|-------------|
| `page` | 1 | Page number |
| `perPage` | 20 | Items per page |

**Response:**
```json
{
  "items": [
    {
      "userId": "clx...",
      "userName": "Nguyễn Văn A",
      "email": "a@example.com",
      "balance": 250,
      "totalEarned": 350,
      "totalSpent": 100,
      "transactionCount": 42,
      "lastActivity": "2026-03-31T03:00:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "perPage": 20
}
```

---

### 8. GET `/api/admin/tcoin/payments`

List all payment orders.

**Authorization**: Admin role required

| Param | Default | Description |
|-------|---------|-------------|
| `page` | 1 | Page number |
| `perPage` | 20 | Items per page |
| `status` | - | Filter: `pending`, `completed`, `failed` |

---

### 9. POST `/api/admin/tcoin/adjust`

Manually adjust a user's TCoin balance.

**Authorization**: Admin role required

**Request Body:**

```json
{
  "targetUserId": "clx...",
  "amount": 100,
  "reason": "Hoàn tiền đơn hàng lỗi"
}
```

- Positive `amount` → credit (cộng)
- Negative `amount` → debit (trừ)
- Full audit trail: `balanceBefore`, `balanceAfter`, admin userId in `referenceId`

---

## Transaction Categories

| Category | Description | Type |
|----------|-------------|------|
| `daily_checkin` | Điểm danh hàng ngày | credit |
| `watch_reward` | Xem phim hoàn tất | credit |
| `review_reward` | Viết đánh giá phim | credit |
| `referral_reward` | Mời bạn bè | credit |
| `welcome_bonus` | Chào mừng thành viên mới | credit |
| `purchase` | Nạp TCoin (mua) | credit |
| `spend` | Đổi TCoin | debit |
| `admin_adjustment` | Admin điều chỉnh | credit/debit |
| `refund` | Hoàn trả | credit |

---

## Business Rules

### Earning (Credit)
- **Daily checkin**: 5 TCoin/ngày, 1 lần/ngày
- **Xem phim**: 2 TCoin/phim, tối đa 10/ngày
- **Viết review**: 10 TCoin/review, tối đa 3/ngày
- **Mời bạn**: 100 TCoin/lần

### Spending (Debit)
- Check balance ≥ cost trước khi trừ
- Nếu không đủ → trả lỗi, không tạo transaction

### Transaction Audit
- Mọi giao dịch đều ghi `balanceBefore` và `balanceAfter`
- Admin adjustment ghi `referenceId` = admin userId
- Purchase ghi `referenceId` = payment order ID
