// ============================================
// Vietnamese Text Normalization
// ============================================
// Single source of truth for ASCII-folding Vietnamese strings before they
// hit Elasticsearch. The indexer writes one normalised field per source
// field (titleAscii, actorTextAscii, ...); the search service normalises
// the user query the same way before constructing the ES query so that
// "nguoi nhen" and "Người Nhện" hit the same documents.
//
// Why not rely on ES `asciifolding` alone:
//   - asciifolding only strips diacritics, it doesn't normalise punctuation
//     spacing or collapse repeated whitespace.
//   - Having an explicit `*Ascii` field lets us match it exactly (boost 90)
//     versus matching the analysed `title` field (boost 100). That tiered
//     boosting is hard to express with a single analysed field.
//   - The same function is reusable for Prisma fallback when ES is down.

/**
 * Aggressive Vietnamese normaliser used for `*Ascii` index fields.
 * - NFD-decompose then strip combining marks (đ/Đ handled explicitly).
 * - lowercase + trim.
 * - collapse whitespace and most punctuation to single spaces.
 *
 * Examples:
 *   "Người Nhện: Vũ trụ mới"  → "nguoi nhen vu tru moi"
 *   "  CON  TRAI  ÚT  của BA  " → "con trai ut cua ba"
 */
export function normalizeVietnamese(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')      // combining marks
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    // Replace anything that isn't a letter/digit with a space, then collapse.
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Light normaliser: lowercase + strip diacritics, but keep the original
 * spacing and punctuation. Used when we still want to feed the result into
 * an analysed text field (vs the strict `*Ascii` keyword-style field).
 */
export function stripDiacritics(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
}

/**
 * Split a normalised query into tokens, dropping empties and any single
 * character noise. Used by the search query builder to decide between
 * exact-term and phrase-style clauses.
 */
export function vietnameseTokens(input: string | null | undefined): string[] {
  const norm = normalizeVietnamese(input)
  if (!norm) return []
  return norm.split(' ').filter((t) => t.length > 0)
}

/**
 * Combine multiple optional fields into one ASCII blob. Used to build
 * `actorTextAscii` from a list of actor names, etc. Empty inputs are
 * dropped so the result is never `", , ,"`.
 */
export function joinAscii(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => normalizeVietnamese(p))
    .filter((s) => s.length > 0)
    .join(' ')
}
