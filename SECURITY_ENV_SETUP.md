# 🔐 SECURITY & ENV SETUP

> Ngày: 2026-03-15
> Mục tiêu: Audit bảo mật env, chuẩn hóa config, đảm bảo không leak secrets

---

## 1. Audit Results

### ✅ PASS — Không tìm thấy vấn đề bảo mật

| Kiểm tra | Kết quả | Chi tiết |
|----------|---------|---------|
| API key hard-code trong source | ✅ An toàn | Không có `api_key=...` trong *.ts/*.tsx |
| Token hard-code | ✅ An toàn | Không có JWT/bearer token hard-code |
| URL chứa `api_key=` | ✅ An toàn | `client.ts` dùng `url.searchParams.set()` — URL tạo runtime |
| `console.log` leak secrets | ✅ An toàn | Chỉ log endpoint path, KHÔNG log full URL (chứa api_key) |
| Hash/hex hard-code (32+ chars) | ✅ An toàn | Không có |
| `.env` trong git | ✅ An toàn | `.gitignore` có `.env`, `.env*.local` |

### Observations

1. **`lib/tmdb/client.ts` line 78**: `console.error(\`[TMDB] HTTP ${response.status} — ${endpoint}\`)` — ✅ chỉ log endpoint, không log URL có key.
2. **`lib/tmdb/config.ts`**: Đọc từ `process.env` — ✅ không hard-code.
3. **Node_modules**: Có `console.log(data.password)` trong `zod` test files — bình thường (test code, không phải app code).

---

## 2. Architecture

```
.env.local (SECRETS — gitignored)
     │
     ▼
lib/env.ts (centralized typed config with validation)
     │
     ├── ENV.tmdb.apiKey
     ├── ENV.tmdb.readAccessToken
     ├── ENV.tmdb.baseUrl
     ├── ENV.tmdb.imageBaseUrl
     ├── ENV.tmdb.language
     ├── ENV.tmdb.region
     ├── ENV.app.url
     ├── ENV.app.isDev
     └── ENV.app.isProd
     │
     ▼
lib/tmdb/config.ts (TMDB_CONFIG — reads from ENV)
     │
     ▼
lib/tmdb/client.ts (tmdbFetch — uses TMDB_CONFIG)
     │
     ▼
services/tmdb/* (all TMDB service functions)
```

---

## 3. Files

### Tạo mới

| File | Vai trò |
|------|---------|
| `lib/env.ts` | Centralized typed env config + runtime validation |

### Sửa

| File | Thay đổi |
|------|----------|
| `lib/tmdb/config.ts` | Import từ `lib/env.ts` thay direct `process.env` |
| `.gitignore` | Thêm `.env.production`, `.env.development`, `.env.staging` |

### Đã có

| File | Trạng thái |
|------|-----------|
| `.env.example` | ✅ Chỉ chứa placeholder — an toàn commit |

---

## 4. ENV Module (`lib/env.ts`)

### API

```typescript
import { ENV } from '@/lib/env'

// TMDB
ENV.tmdb.apiKey          // TMDB_API_KEY
ENV.tmdb.readAccessToken // TMDB_READ_ACCESS_TOKEN
ENV.tmdb.baseUrl         // TMDB_BASE_URL (default: api.themoviedb.org/3)
ENV.tmdb.imageBaseUrl    // NEXT_PUBLIC_TMDB_IMAGE_BASE_URL
ENV.tmdb.language        // NEXT_PUBLIC_TMDB_LANGUAGE (default: vi-VN)
ENV.tmdb.region          // NEXT_PUBLIC_REGION (default: VN)

// App
ENV.app.url     // NEXT_PUBLIC_APP_URL
ENV.app.env     // NODE_ENV
ENV.app.isDev   // boolean
ENV.app.isProd  // boolean
```

### Validation

Server startup tự kiểm tra:
- Nếu thiếu cả `TMDB_API_KEY` lẫn `TMDB_READ_ACCESS_TOKEN` → warning console
- Missing required env → `console.warn` (không throw — app vẫn chạy)

---

## 5. `.env.example`

```
TMDB_API_KEY=
TMDB_READ_ACCESS_TOKEN=
TMDB_BASE_URL=https://api.themoviedb.org/3
NEXT_PUBLIC_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
NEXT_PUBLIC_REGION=VN
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- ✅ Chỉ placeholder — không secret
- ✅ An toàn commit vào git
- Instructions: copy → `.env.local` → fill values

---

## 6. `.gitignore` rules

```gitignore
# Secrets — NEVER commit
.env
.env.local
.env*.local
.env.production
.env.development
.env.staging

# Safe to commit
# .env.example (contains only placeholders)
```

---

## 7. Security best practices được tuân thủ

| Practice | Status |
|----------|--------|
| Env chỉ đọc từ centralized module | ✅ |
| Không hard-code secret trong component | ✅ |
| Client code không access SECRET env | ✅ (chỉ NEXT_PUBLIC_*) |
| Console.error không log URL/key/token | ✅ |
| `.env.example` chỉ placeholders | ✅ |
| `.gitignore` bao phủ tất cả env patterns | ✅ |
| Runtime validation cảnh báo thiếu config | ✅ |
