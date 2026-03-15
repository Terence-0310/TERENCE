# 🎥 WATCH PLAYER & RESUME PLAYBACK

> Ngày: 2026-03-15
> Mục tiêu: HLS.js player + resume playback, giữ nguyên watch page layout

---

## 1. Kiến trúc player

```
Watch Page (Server Component)
└── Player area (aspect-video container) ← GIỮA NGUYÊN
    ├── youtube/iframe → <iframe> (không đổi)
    ├── mp4/hls → <VideoPlayer> (MỚI — client component)
    └── no source → placeholder UI (không đổi)

VideoPlayer (Client Component)
├── HLS.js (dynamic import)
├── Custom controls (play/pause/seek/volume/fullscreen)
├── Resume prompt (localStorage)
├── Loading spinner
├── Error state + retry
└── Keyboard shortcuts
```

---

## 2. Files

| File | Vai trò | Thay đổi? |
|------|---------|-----------|
| `components/watch/VideoPlayer.tsx` | HLS/MP4 player + controls + resume | **MỚI** |
| `lib/watch-progress.ts` | localStorage persistence helper | **MỚI** |
| `app/watch/[id]/page.tsx` | Tích hợp VideoPlayer | Sửa (thay inline video/hls bằng VideoPlayer) |
| `package.json` | Thêm `hls.js` dependency | Sửa |

---

## 3. VideoPlayer (`components/watch/VideoPlayer.tsx`)

### Props

| Prop | Type | Mô tả |
|------|------|-------|
| `src` | `string` | Video URL (`.m3u8` hoặc `.mp4`) |
| `type` | `'hls' \| 'mp4'` | Loại source |
| `poster` | `string?` | Backdrop image |
| `movieId` | `number` | TMDB movie ID (cho resume) |
| `episodeId` | `string?` | Episode slug (cho resume) |
| `subtitles` | `SubtitleTrack[]?` | Subtitle tracks |

### Features

| Feature | Chi tiết |
|---------|---------|
| **HLS playback** | Dynamic import `hls.js`, auto quality (`startLevel: -1`), buffer 30-60s |
| **MP4 playback** | Native `<video>` element |
| **Safari HLS** | Native `<video src="...m3u8">` khi `Hls.isSupported()` = false |
| **Play/Pause** | Click video hoặc nút ▶ / ⏸ |
| **Seek** | Range input bar, gradient fill |
| **Volume** | Mute/unmute toggle |
| **Fullscreen** | Container fullscreen (không chỉ video) |
| **Loading** | Spinner overlay khi buffering |
| **Error** | Error icon + "Thử lại" button |
| **Time display** | `MM:SS / MM:SS` hoặc `HH:MM:SS / HH:MM:SS` |
| **Auto-hide controls** | Ẩn sau 3s mouse idle khi đang phát |
| **Keyboard shortcuts** | Space/K (play), F (fullscreen), M (mute), ←→ (seek ±10s), ↑↓ (volume) |

---

## 4. Resume Playback (`lib/watch-progress.ts`)

### Storage

```
localStorage key: "terence:watch-progress"
value: JSON { "movieId": SavedProgress, "movieId:episodeId": SavedProgress }
```

### SavedProgress

```typescript
{
  movieId: 550,
  episodeId?: "tap-1",
  currentTime: 1234,    // seconds
  duration: 7200,
  percentage: 17,
  updatedAt: "2026-03-15T14:00:00.000Z"
}
```

### Logic

| Khi nào | Gì xảy ra |
|---------|-----------|
| Đang xem (mỗi 5s) | `saveWatchProgress()` lưu currentTime |
| Rời trang (unmount) | Lưu lần cuối |
| `currentTime < 5s` | Không lưu (mới bắt đầu) |
| `percentage >= 95%` | Không lưu (xem xong) |
| Mở trang xem + có progress | Hiện prompt "Tiếp tục xem?" |
| User chọn "Tiếp tục" | `video.currentTime = saved` |
| User chọn "Xem lại từ đầu" | Play từ 0:00 |
| Max entries | 100 (auto evict cũ nhất) |

---

## 5. Watch page thay đổi

### Trước:
```tsx
// MP4: inline <video> với browser controls
<video src={...} controls autoPlay className="..." poster={...}>
  <track ... />
</video>

// HLS: placeholder spinner
<div>
  <Loader2 ... />
  <p>Đang tải nguồn HLS...</p>
</div>
```

### Sau:
```tsx
// MP4 + HLS: cùng dùng VideoPlayer
<VideoPlayer
  src={source.playback.url}
  type={source.playback.type}     // 'mp4' | 'hls'
  poster={movie.backdropUrl}
  movieId={movie.id}
  episodeId={episodeSlug}
  subtitles={source.playback.subtitles}
/>
```

### Giữ nguyên:
- ✅ `<iframe>` cho youtube/iframe sources
- ✅ Placeholder UI "Đang cập nhật nguồn phát" khi không có source
- ✅ Player area container (`aspect-video max-h-[85vh]`)
- ✅ Back navigation
- ✅ Info bar
- ✅ Episode list
- ✅ Related movies
- ✅ Action buttons

---

## 6. Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` / `K` | Play / Pause |
| `F` | Toggle fullscreen |
| `M` | Toggle mute |
| `←` | Seek -10s |
| `→` | Seek +10s |
| `↑` | Volume +10% |
| `↓` | Volume -10% |

---

## 7. Dependency

```
hls.js — installed via npm install hls.js
```

HLS.js được **dynamic import** (`await import('hls.js')`) nên không ảnh hưởng bundle size cho các page không dùng player.

---

## 8. Xác nhận an toàn

| Kiểm tra | Kết quả |
|----------|---------|
| Watch page outer layout giữ nguyên | ✅ |
| YouTube sources vẫn dùng iframe | ✅ |
| No-source placeholder vẫn hiển thị đúng | ✅ |
| HLS playback hoạt động (khi có .m3u8 source) | ✅ |
| MP4 playback hoạt động (custom controls thay browser native) | ✅ |
| Resume prompt hiển thị khi có saved progress | ✅ |
| Progress lưu mỗi 5s + unmount | ✅ |
| Không xô layout khi error/loading | ✅ |
| VideoPlayer là internal component, không expose ra ngoài | ✅ |
| HLS.js chỉ loaded khi thực sự cần | ✅ |
