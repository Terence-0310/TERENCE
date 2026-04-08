# Admin CMS API Documentation

> **Base URL**: `/api/admin/*`  
> **Authorization**: All endpoints require admin role (EDITOR+)  
> **Last Updated**: 2026-03-31

---

## Existing Endpoints (Already Built)

### Movies
| Method | Endpoint | Min Role | Description |
|--------|----------|----------|-------------|
| GET | `/api/admin/movies` | EDITOR | List movies (search, filter, sort, pagination) |
| GET | `/api/admin/movies/[id]` | EDITOR | Get movie details |
| POST | `/api/admin/movies` | EDITOR | Create movie |
| PATCH | `/api/admin/movies/[id]` | EDITOR | Update movie |
| DELETE | `/api/admin/movies/[id]` | ADMIN | Soft delete movie |
| POST | `/api/admin/movies/[id]/publish` | EDITOR | Publish movie |
| POST | `/api/admin/movies/[id]/hide` | EDITOR | Hide movie |
| POST | `/api/admin/movies/[id]/archive` | EDITOR | Archive movie |
| POST | `/api/admin/movies/[id]/restore` | ADMIN | Restore soft-deleted movie |
| POST | `/api/admin/movies/[id]/feature` | EDITOR | Toggle featured flag |
| POST | `/api/admin/movies/[id]/trending` | EDITOR | Toggle trending flag |
| POST | `/api/admin/movies/[id]/recommend` | EDITOR | Toggle recommended flag |

### Episodes
| Method | Endpoint | Min Role | Description |
|--------|----------|----------|-------------|
| GET | `/api/admin/episodes` | EDITOR | List episodes |
| POST | `/api/admin/episodes` | EDITOR | Create episode |
| PATCH | `/api/admin/episodes/[id]` | EDITOR | Update episode |
| DELETE | `/api/admin/episodes/[id]` | ADMIN | Delete episode |

### Video Sources
| Method | Endpoint | Min Role | Description |
|--------|----------|----------|-------------|
| GET | `/api/admin/video-sources` | EDITOR | List video sources |

### Users
| Method | Endpoint | Min Role | Description |
|--------|----------|----------|-------------|
| GET | `/api/admin/users` | ADMIN | List users (search, filter, sort) |
| POST | `/api/admin/users` | ADMIN | Create user |
| PATCH | `/api/admin/users/[id]` | ADMIN | Update user |
| DELETE | `/api/admin/users/[id]` | ADMIN | Soft delete user |
| POST | `/api/admin/users/[id]/block` | ADMIN | Block user (with reason) |
| POST | `/api/admin/users/[id]/unblock` | ADMIN | Unblock user |
| POST | `/api/admin/users/[id]/restore` | ADMIN | Restore soft-deleted user |
| POST | `/api/admin/users/[id]/reset-password` | ADMIN | Reset user password |

### Logs
| Method | Endpoint | Min Role | Description |
|--------|----------|----------|-------------|
| GET | `/api/admin/logs` | ADMIN | List admin logs (filter by action, target, date) |

### TCoin
| Method | Endpoint | Min Role | Description |
|--------|----------|----------|-------------|
| GET | `/api/admin/tcoin/wallets` | ADMIN | List all wallets |
| GET | `/api/admin/tcoin/payments` | ADMIN | List payment orders |
| POST | `/api/admin/tcoin/adjust` | ADMIN | Manual balance adjustment |

### Uploads
| Method | Endpoint | Min Role | Description |
|--------|----------|----------|-------------|
| POST | `/api/admin/uploads/movie-poster` | EDITOR | Upload poster |
| POST | `/api/admin/uploads/movie-backdrop` | EDITOR | Upload backdrop |
| POST | `/api/admin/uploads/movie-thumbnail` | EDITOR | Upload thumbnail |
| POST | `/api/admin/uploads/movie-media` | EDITOR | Upload media |

---

## New Endpoints (CMS Enhancement)

### Genres
| Method | Endpoint | Min Role | Description |
|--------|----------|----------|-------------|
| GET | `/api/admin/genres` | EDITOR | List genres with movie counts |
| POST | `/api/admin/genres` | EDITOR | Create genre |
| PATCH | `/api/admin/genres/[id]` | EDITOR | Update genre |
| DELETE | `/api/admin/genres/[id]` | ADMIN | Delete genre |

**GET Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |
| `search` | string | - | Search by name |

### Countries
| Method | Endpoint | Min Role | Description |
|--------|----------|----------|-------------|
| GET | `/api/admin/countries` | EDITOR | List countries with movie counts |
| POST | `/api/admin/countries` | EDITOR | Create country |
| PATCH | `/api/admin/countries/[id]` | EDITOR | Update country |
| DELETE | `/api/admin/countries/[id]` | ADMIN | Delete country |

### Reviews Moderation
| Method | Endpoint | Min Role | Description |
|--------|----------|----------|-------------|
| GET | `/api/admin/reviews` | MODERATOR | List reviews (filter by status) |
| PATCH | `/api/admin/reviews/[id]` | MODERATOR | Update status (approve/reject) |
| DELETE | `/api/admin/reviews/[id]` | MODERATOR | Delete review |

**GET Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | - | Filter: `pending`, `approved`, `rejected` |
| `search` | string | - | Search by content or user name |

### News Posts
| Method | Endpoint | Min Role | Description |
|--------|----------|----------|-------------|
| GET | `/api/admin/news` | EDITOR | List news posts |
| POST | `/api/admin/news` | EDITOR | Create news post |
| PATCH | `/api/admin/news/[id]` | EDITOR | Update news post |
| DELETE | `/api/admin/news/[id]` | ADMIN | Delete news post |

---

## Role Hierarchy

```
SUPER_ADMIN (5) — Full access
    ↑
  ADMIN (4)  — CRUD all + delete + user management
    ↑
  STAFF (3)  — Extended editing
    ↑
 EDITOR (2)  — Content CRUD (create, read, update)
    ↑
MODERATOR (1) — Reviews moderation only
    ↑
  USER (0)   — No admin access
```

---

## Admin Logging

Every admin action writes to `AdminLog`:

```json
{
  "actorId": "clx...",
  "action": "create | update | delete | publish | hide | block | ...",
  "targetType": "movie | user | genre | review | news | ...",
  "targetId": "clx...",
  "metadata": { "title": "...", "field": "status" },
  "ipAddress": "1.2.3.4"
}
```

View logs at `/dashboard/logs` with full filter/search.
