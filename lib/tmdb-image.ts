// ============================================
// TMDB Image URL helper — SINGLE SOURCE OF TRUTH
// ============================================
// Every poster / backdrop / card / hero / profile image
// in the app MUST go through tmdbImage().
//
// poster_path from TMDB already contains a leading slash,
// e.g. "/kqjL17yufvn9OVLyXYpvtyrFfak.jpg"
//
// DO NOT .replace("/") or .slice(1) on the path.
// Just pass it directly to tmdbImage().
// ============================================

/**
 * Build a fully-qualified TMDB image URL.
 *
 * @example
 *   tmdbImage("/abc.jpg")           → "https://image.tmdb.org/t/p/w500/abc.jpg"
 *   tmdbImage("/abc.jpg", "w780")   → "https://image.tmdb.org/t/p/w780/abc.jpg"
 *   tmdbImage(null)                 → "/placeholder.jpg"
 */
export function tmdbImage(path: string | null | undefined, size = 'w500'): string {
  if (!path) return '/placeholder.jpg'
  return `https://image.tmdb.org/t/p/${size}${path}`
}
