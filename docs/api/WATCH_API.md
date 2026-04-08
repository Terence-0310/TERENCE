# Watch API Documentation

> **Base URL**: `/api/watch`  
> **Version**: v1  
> **Last Updated**: 2026-03-31

---

## Endpoints

### 1. GET `/api/watch/bootstrap`

Bootstrap the watch page with all required data.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `movieSlug` | string | ✅ | Movie slug or ID |
| `episode` | string | ❌ | Episode slug (e.g., `tap-1`) or number |

**Response** (`200 OK`):

```json
{
  "movie": {
    "id": "clx...",
    "slug": "tu-chien-tren-khong",
    "title": "Tử Chiến Trên Không",
    "originalTitle": null,
    "description": "...",
    "contentType": "movie",
    "posterUrl": "https://...",
    "backdropUrl": "https://...",
    "thumbUrl": null,
    "year": 2026,
    "quality": "FHD",
    "rating": 7.5,
    "ageRating": "C16",
    "categoryText": "Hành Động, Phiêu Lưu",
    "directorText": "Nguyễn Quang Dũng",
    "actorText": "Trấn Thành, Thu Trang",
    "countryText": "Việt Nam"
  },
  "episodes": [
    {
      "id": "clx...",
      "episodeNumber": 1,
      "episodeName": "Tập 1",
      "episodeSlug": "tap-1",
      "title": "Khởi Đầu",
      "thumbnailUrl": null,
      "duration": 2400,
      "isActive": true
    }
  ],
  "currentEpisode": {
    "episode": { "..." },
    "sources": [
      {
        "id": "src-1",
        "sourceType": "hls",
        "url": "https://.../.m3u8",
        "label": "Main HLS",
        "isPrimary": true,
        "mimeType": "application/x-mpegURL",
        "priority": 10
      },
      {
        "id": "src-2",
        "sourceType": "mp4",
        "url": "https://.../video.mp4",
        "label": "Backup MP4",
        "isPrimary": false,
        "mimeType": "video/mp4",
        "priority": 5
      }
    ],
    "primarySource": { "..." },
    "subtitles": [
      {
        "id": "sub-1",
        "label": "Tiếng Việt",
        "lang": "vi",
        "url": "https://.../vi.vtt",
        "isDefault": true,
        "kind": "subtitles"
      }
    ],
    "nextEpisode": { "..." },
    "prevEpisode": null,
    "servers": [
      {
        "name": "Server #1",
        "episodes": [{ "name": "Tập 1", "slug": "tap-1", "url": "https://..." }]
      }
    ]
  },
  "totalEpisodes": 12,
  "resumeProgress": {
    "episodeId": "clx...",
    "currentTime": 1234,
    "duration": 2400,
    "progress": 51,
    "lastWatchedAt": "2026-03-31T03:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: `movieSlug` not provided
- `404`: Movie not found or not active

---

### 2. POST `/api/watch/progress`

Save watch progress for the authenticated user.

**Authentication**: Required (session cookie)

**Request Body:**

```json
{
  "movieId": "clx...",
  "episodeId": "clx...",
  "currentTime": 1234,
  "duration": 2400,
  "deviceType": "desktop"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `movieId` | string | ✅ | Movie ID |
| `episodeId` | string | ❌ | Episode ID (null for standalone) |
| `currentTime` | number | ✅ | Current playback position (seconds) |
| `duration` | number | ✅ | Total duration (seconds) |
| `deviceType` | string | ❌ | `mobile`, `desktop`, `tablet`, `tv` |

**Response** (`200 OK`):

```json
{
  "ok": true,
  "progress": 51,
  "isCompleted": false
}
```

**Business Rules:**
- Progress < 5s is discarded
- Progress ≥ 92% is auto-marked as completed
- Upserts: creates or updates existing record

---

### 3. POST `/api/watch/complete`

Explicitly mark a movie/episode as completed.

**Authentication**: Required

**Request Body:**

```json
{
  "movieId": "clx...",
  "episodeId": "clx..."
}
```

**Response** (`200 OK`):

```json
{ "ok": true }
```

---

### 4. GET `/api/watch/continue`

Get the continue watching list for the authenticated user.

**Authentication**: Required

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 20 | Max items to return (max 50) |

**Response** (`200 OK`):

```json
{
  "items": [
    {
      "id": "wh-1",
      "movie": {
        "id": "clx...",
        "slug": "tu-chien-tren-khong",
        "title": "Tử Chiến Trên Không",
        "posterUrl": "https://...",
        "contentType": "movie",
        "year": 2026,
        "quality": "FHD"
      },
      "episode": {
        "id": "clx...",
        "episodeNumber": 3,
        "episodeName": "Tập 3",
        "episodeSlug": "tap-3"
      },
      "progress": 51,
      "currentTime": 1234,
      "duration": 2400,
      "lastWatchedAt": "2026-03-31T03:00:00.000Z",
      "isCompleted": false
    }
  ],
  "total": 5
}
```

**Business Rules:**
- Only items with 2% < progress < 95%
- At least 15 seconds watched
- Excluded: completed items
- Deduplicated: most recent episode per movie
- Sorted: most recently watched first

---

## Source Priority

The bootstrap endpoint resolves video sources with this priority:

```
1. HLS (.m3u8)    — highest priority
2. MP4 (.mp4)     — fallback
3. iframe         — last resort (not usable in <video> element)
```

Within each type, sources are sorted by:
1. `isPrimary` (primary first)
2. `priority` (higher first)

---

## Caching

| Endpoint | Cache-Control |
|----------|---------------|
| `GET /bootstrap` | `private, max-age=30` |
| `GET /continue` | `private, max-age=10` |
| `POST /progress` | No cache |
| `POST /complete` | No cache |
