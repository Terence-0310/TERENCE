// ============================================
// AI News Generator — TMDB → Gemini → NewsPost
// ============================================
// Pulls "now playing" / "popular" movies from TMDB, asks Google Gemini to
// write a short Vietnamese editorial piece per movie, and persists each
// result as a NewsPost row (status = 'published', authorId = null so the
// FE knows it's AI-authored).
//
// Free-tier friendly:
//   - Gemini 2.0 Flash: 15 req/min, 1500 req/day on the free tier (Apr 2025).
//   - We process one movie at a time, sleep 200ms between calls.
//   - Idempotent on slug — re-running is safe; existing slugs are skipped.

import { prisma } from '@/src/be/shared/db/prisma'
import { tmdbFetch } from '@/src/be/modules/tmdb/legacy/client'
import { tmdbImage } from '@/lib/tmdb-image'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'ai-news-generator' })

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
// Default to gemini-2.5-flash because gemini-2.0-flash was removed from the
// free tier in May 2026 (returns 429 with `limit: 0` for free-tier keys).
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Fallback chain when the primary model returns 503 ("model overloaded").
// Each fallback is also on the free tier (verified May 2026). We try them
// in order and only give up if all return 5xx — a 4xx error short-circuits
// immediately because retrying won't fix bad input.
const FALLBACK_MODELS = [
  GEMINI_MODEL,
  'gemini-2.5-flash-lite', // smaller / faster — typically less contended
  'gemini-flash-latest',   // Google-managed alias to whichever flash is healthy
]

// ── TMDB types (only fields we use) ──

interface TmdbMovieSummary {
  id: number
  title: string
  original_title?: string
  overview?: string
  release_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  vote_average?: number
  popularity?: number
}

interface TmdbPaginated {
  results: TmdbMovieSummary[]
}

// ── Public API ──

export type AiGenerationSource = 'now_playing' | 'popular' | 'top_rated' | 'upcoming'

export interface GenerationResult {
  created: Array<{ slug: string; title: string; id: string }>
  skipped: Array<{ slug: string; reason: string }>
  errors: Array<{ title: string; error: string }>
}

/**
 * Pull a batch of movies from TMDB and generate one NewsPost per movie via
 * Gemini. Returns counts of created / skipped / errored items so the caller
 * (admin button, cron) can show progress.
 */
export async function generateNewsBatch(opts?: {
  source?: AiGenerationSource
  count?: number
  authorId?: string | null
}): Promise<GenerationResult> {
  const source: AiGenerationSource = opts?.source ?? 'now_playing'
  const count = Math.min(Math.max(opts?.count ?? 5, 1), 20)
  const authorId = opts?.authorId ?? null

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured. See .env.example.')
  }

  // 1) Pull movies from TMDB. We always grab a region-aware list first so VN
  //    audiences see locally-popular titles when possible.
  const endpoint = `/movie/${source}`
  const data = await tmdbFetch<TmdbPaginated>(endpoint, {
    params: { region: 'VN', page: '1' },
    revalidate: 3600,
  }).catch((err) => {
    log.error({ err: err instanceof Error ? err.message : err, source }, 'TMDB fetch failed')
    return null
  })

  const movies = (data?.results ?? [])
    .filter((m) => m.title && m.overview && (m.poster_path || m.backdrop_path))
    .slice(0, count)

  const result: GenerationResult = { created: [], skipped: [], errors: [] }

  for (const movie of movies) {
    const slug = slugify(movie.title) + '-' + movie.id

    // Idempotency: skip if a post for this movie already exists.
    const existing = await prisma.newsPost.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (existing) {
      result.skipped.push({ slug, reason: 'already exists' })
      continue
    }

    try {
      const { title, excerpt, content, tags } = await generateArticle(movie)

      // Cover (hero) prefers a landscape backdrop; poster is used as the
      // mid-article visual. Both come from TMDB (already in env). When only
      // one of them exists we fall back gracefully — never crash on missing
      // images.
      const coverImage =
        tmdbImage(movie.backdrop_path, 'w1280') ||
        tmdbImage(movie.poster_path, 'w780') ||
        null
      const posterImage = tmdbImage(movie.poster_path, 'w500')

      // Append a TMDB attribution + poster reference at the end of the body
      // so the article doesn't end abruptly. The detail page renders the
      // content as plain paragraphs, but the trailing block keeps article
      // length consistent and gives readers a source pointer.
      const movieYear = movie.release_date?.slice(0, 4) || ''
      const movieRating =
        typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : null
      const trailer = [
        '',
        [
          movieRating ? `Phim hiện đang được đánh giá ${movieRating}/10 trên TMDB.` : '',
          movieYear ? ` Lịch chiếu chính thức: ${movie.release_date}.` : '',
        ].join('').trim(),
        'Theo dõi TERENCE để cập nhật trailer, lịch chiếu và bài bình luận mới nhất.',
      ].filter(Boolean).join('\n\n')

      const finalContent = `${content}\n\n${trailer}`

      const post = await prisma.newsPost.create({
        data: {
          slug,
          title,
          excerpt,
          content: finalContent,
          coverImage,
          status: 'published',
          publishedAt: new Date(),
          authorId, // null → FE renders the "AI biên soạn" badge
          // Store poster URL inside tags so the detail page can show it as a
          // sidebar without requiring a schema migration. The first comma-
          // separated entry is a stable `poster:<url>` marker, then the
          // human-readable topical tags follow.
          tags: [posterImage ? `poster:${posterImage}` : '', ...tags].filter(Boolean).join(','),
        },
      })

      result.created.push({ slug, title: post.title, id: post.id })
      log.info({ slug, movieId: movie.id }, 'AI news generated')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error({ slug, err: msg }, 'AI generation failed for one movie — continuing')
      result.errors.push({ title: movie.title, error: msg })
    }

    // Be polite to the free-tier rate limit (15 req/min => ~250ms between).
    await sleep(250)
  }

  return result
}

// ── Internals ──

interface GeneratedArticle {
  title: string
  excerpt: string
  content: string
  tags: string[]
}

async function generateArticle(movie: TmdbMovieSummary): Promise<GeneratedArticle> {
  const year = movie.release_date?.slice(0, 4) || ''
  const rating = typeof movie.vote_average === 'number' ? movie.vote_average.toFixed(1) : null

  // The prompt is intentionally structured: we ask for STRICT JSON so we
  // don't have to fight markdown / preamble. Gemini's JSON mode (response_mime_type)
  // makes this contract reliable.
  const prompt = `Bạn là biên tập viên điện ảnh của TERENCE — một website xem phim tiếng Việt.
Viết một bài giới thiệu phim bằng tiếng Việt cho bộ phim sau, văn phong gần gũi, hấp dẫn, có cá tính.

Thông tin phim:
- Tên tiếng Việt: ${movie.title}
- Tên gốc: ${movie.original_title ?? movie.title}
- Năm phát hành: ${year || 'không rõ'}
- Điểm TMDB: ${rating ?? 'chưa có'}
- Mô tả: ${movie.overview ?? 'không có'}

Yêu cầu output: JSON object đúng schema sau, KHÔNG kèm markdown, KHÔNG có \`\`\`:
{
  "title": "<tiêu đề bài viết — gợi mở, dưới 90 ký tự, KHÔNG dùng emoji>",
  "excerpt": "<mô tả ngắn 1-2 câu, dưới 200 ký tự>",
  "content": "<thân bài 250-400 từ, chia 3-4 đoạn, mỗi đoạn cách nhau 2 dòng trống. KHÔNG có markdown headers (# ##), KHÔNG có dấu * hay danh sách. Văn phong là biên tập viên người Việt nói chuyện với khán giả Việt Nam.>",
  "tags": ["<3-5 thẻ ngắn liên quan: thể loại, năm, đạo diễn, từ khóa>"]
}`

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.85,
      // Vietnamese consumes ~2-3x more tokens than English per character.
      // A 400-word VN body can easily hit 2000-2500 output tokens. Keep this
      // generous — Gemini only bills what's actually produced.
      maxOutputTokens: 4096,
      // gemini-2.5-flash defaults to using "thinking" tokens that count
      // toward maxOutputTokens. News generation doesn't need deep reasoning,
      // so disabling thinking gives us the full budget for body text and
      // also cuts latency roughly in half.
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  // Try the primary model first; on 5xx ("overloaded") roll forward through
  // the fallback chain. A 4xx (quota, bad input, auth) short-circuits — no
  // retry can fix those, and retrying wastes the daily quota.
  let lastError = ''
  let raw: any = null
  for (const model of FALLBACK_MODELS) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_API_KEY}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      raw = await res.json()
      break
    }

    const errText = await res.text().catch(() => '')
    lastError = `Gemini ${model} ${res.status}: ${errText.slice(0, 300)}`
    if (res.status < 500) {
      // 4xx — quota / auth / bad input — stop trying, propagate immediately.
      throw new Error(lastError)
    }
    // 5xx — back off ~700ms then try the next fallback model.
    await sleep(700)
  }

  if (!raw) {
    throw new Error(lastError || 'Gemini: all fallback models failed')
  }

  const text: string | undefined = raw?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error('Gemini returned no text')
  }

  let parsed: Partial<GeneratedArticle>
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(`Gemini returned non-JSON: ${text.slice(0, 200)}`)
  }

  const title = (parsed.title || movie.title).trim().slice(0, 200)
  const excerpt = (parsed.excerpt || movie.overview || '').trim().slice(0, 300)
  const content = (parsed.content || movie.overview || '').trim()
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
    : []

  if (content.length < 50) {
    throw new Error('Generated content is too short')
  }

  return { title, excerpt, content, tags }
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
