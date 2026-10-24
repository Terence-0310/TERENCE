// ============================================
// Movie Search Indexer
// ============================================
// Builds ES documents from Prisma data and handles index lifecycle.

import { PrismaClient } from '@prisma/client'
import { getClient, getMoviesIndex, moviesIndexDefinition, isAvailable, isServerless } from './elastic-client'
import { logger } from '@/src/be/shared/utils/logger'
import { normalizeVietnamese, stripDiacritics, joinAscii } from '@/lib/search/normalize'

const prisma = new PrismaClient()
const log = logger.child({ module: 'movie-search-indexer' })

// ─── Document Builder ───────────────────────────────────────────

interface MovieForIndex {
  id: string
  slug: string
  title: string
  originalTitle: string | null
  description: string | null
  shortDescription: string | null
  tags: string | null
  seoKeywords: string | null
  people?: Array<{ role: string; character?: string | null; person: { name: string } }>

  year: number | null
  tmdbId: number | null
  contentType: string
  quality: string | null
  language: string | null
  thumbUrl: string | null
  posterUrl: string | null
  backdropUrl: string | null
  rating: number | null
  viewCount: number
  episodeCurrent: string | null
  episodeTotal: number | null
  isActive: boolean
  isFeatured: boolean
  isTrending: boolean
  publishedAt: Date | null
  updatedAt: Date
  genres?: Array<{ genre: { name: string; slug: string } }>
  countries?: Array<{ country: { name: string; slug: string } }>
  // Approved reviews — only the top-N highest-rated ones, fetched
  // alongside the movie row to keep indexing in a single batch.
  reviews?: Array<{ title: string | null; content: string | null }>
}

type PersonRel = { role: string; character?: string | null; person: { name: string; originalName?: string | null } }

function namesByRole(people: PersonRel[] | undefined, role: string): string[] {
  if (!people?.length) return []
  // Combine the localised name with the originalName alias so the index
  // catches users typing either spelling. Falls back to just `name` when
  // there's no alias (or it matches).
  return people
    .filter((p) => p.role === role)
    .flatMap((p) => {
      const out = [p.person.name]
      if (p.person.originalName && p.person.originalName !== p.person.name) {
        out.push(p.person.originalName)
      }
      return out
    })
}

function joinNames(names: string[]): string {
  return names.filter((n) => n && n.trim()).join(', ')
}

function buildCharacters(people: PersonRel[] | undefined): string {
  if (!people?.length) return ''
  return people
    .filter((p) => p.character && p.character.trim())
    .map((p) => p.character!.trim())
    .join(', ')
}

/**
 * Build the ES document shape from a Prisma Movie + relations row.
 *
 * Every Vietnamese-bearing text field gets a sibling `*Ascii` field built
 * via `normalizeVietnamese()`. The search query uses the ASCII fields to
 * match no-diacritics input ("nguoi nhen") while still scoring exact
 * diacritic-aware matches highest.
 */
export function buildDocument(movie: MovieForIndex) {
  const categorySlugs = movie.genres ? movie.genres.map((c) => c.genre.slug) : []
  const countrySlugs = movie.countries ? movie.countries.map((c) => c.country.slug) : []
  const categoryNames = movie.genres ? movie.genres.map((c) => c.genre.name) : []
  const countryNames = movie.countries ? movie.countries.map((c) => c.country.name) : []

  const actorNames = namesByRole(movie.people, 'actor')
  const directorNames = namesByRole(movie.people, 'director')
  const actorText = joinNames(actorNames)
  const directorText = joinNames(directorNames)

  const characters = buildCharacters(movie.people)

  // Title suggest: include both diacritic + ascii forms in one field so the
  // edge_ngram analyser can prefix-match either input style.
  const titleSuggestParts = [movie.title]
  if (movie.originalTitle && movie.originalTitle !== movie.title) {
    titleSuggestParts.push(movie.originalTitle)
  }
  const titleSuggest = `${titleSuggestParts.join(' ')} ${stripDiacritics(titleSuggestParts.join(' '))}`

  const actorsSuggest = actorNames.length
    ? `${joinNames(actorNames)} ${stripDiacritics(joinNames(actorNames))}`
    : ''

  const charactersSuggest = characters
    ? `${characters} ${stripDiacritics(characters)}`
    : ''

  // Aggregate approved reviews into one searchable blob. Title + content
  // are concatenated; nothing else (rating, isSpoiler, status flags
  // shouldn't influence the text index). Empty string if no reviews —
  // ES handles missing text fields cheaply.
  const reviewParts = (movie.reviews || [])
    .map((r) => [r.title, r.content].filter(Boolean).join(' '))
    .filter((s) => s.length > 0)
  const reviewText = reviewParts.join(' \n ')

  return {
    id: movie.id,
    slug: movie.slug,

    // Titles
    title: movie.title,
    titleAscii: normalizeVietnamese(movie.title),
    originalTitle: movie.originalTitle,
    originalTitleAscii: normalizeVietnamese(movie.originalTitle),
    titleSuggest,

    // People — `actorText`/`directorText` (analysed) + ASCII sibling
    actorText,
    actorTextAscii: joinAscii(actorNames),
    directorText,
    directorTextAscii: joinAscii(directorNames),
    actorsSuggest,
    characters,
    charactersSuggest,

    // Categories / countries (slugs as keyword + analysed names + ASCII)
    categories: categorySlugs,
    countries: countrySlugs,
    categoryText: categoryNames.join(', '),
    categoryTextAscii: joinAscii(categoryNames),
    countryText: countryNames.join(', '),
    countryTextAscii: joinAscii(countryNames),

    // Description / content — `content` aggregates short+long+tags+SEO so a
    // single field hit can cover all "long text" matches at boost 3.
    description: movie.description,
    shortDescription: movie.shortDescription,
    content: [movie.shortDescription, movie.description, movie.tags, movie.seoKeywords]
      .filter(Boolean)
      .join(' '),
    contentAscii: joinAscii([movie.shortDescription, movie.description, movie.tags, movie.seoKeywords]),

    // Aggregated review text — populated from approved reviews fetched
    // alongside the movie. Empty string when the movie has none.
    reviewText,
    reviewTextAscii: normalizeVietnamese(reviewText),

    // Subtitle text — left empty here. The dedicated background script
    // `npm run search:sync-subtitles` fills this via partial ES updates
    // so the bulk reindex stays fast.

    tags: movie.tags,
    seoKeywords: movie.seoKeywords,

    year: movie.year,
    tmdbId: movie.tmdbId,
    contentType: movie.contentType,
    quality: movie.quality,
    language: movie.language,
    thumbUrl: movie.thumbUrl,
    posterUrl: movie.posterUrl,
    backdropUrl: movie.backdropUrl,
    rating: movie.rating || 0,
    viewCount: movie.viewCount || 0,
    // Popularity is a simple derived float so the function_score can
    // multiply by it cheaply. Tweak the formula here only — do not invent
    // alternates in the query layer.
    popularity: Math.log10((movie.viewCount || 0) + 1) + (movie.rating || 0) * 0.1,
    episodeCurrent: movie.episodeCurrent,
    episodeTotal: movie.episodeTotal,
    isActive: movie.isActive,
    isFeatured: movie.isFeatured,
    isTrending: movie.isTrending,
    publishedAt: movie.publishedAt?.toISOString() || null,
    updatedAt: movie.updatedAt.toISOString(),
  }
}

// ─── Index Lifecycle ────────────────────────────────────────────

/**
 * Create or recreate the movies index with mapping.
 * @param force If true, delete existing index first
 */
export async function createIndex(force: boolean = false): Promise<void> {
  const client = getClient()
  const index = getMoviesIndex()

  const exists = await client.indices.exists({ index })
  if (exists) {
    if (!force) {
      log.info({ index }, 'Index already exists. Use force=true to recreate.')
      return
    }
    log.info({ index }, 'Deleting existing index')
    await client.indices.delete({ index })
  }

  const serverless = await isServerless()
  log.info({ index, serverless }, 'Creating index with mapping')
  await client.indices.create({ index, ...moviesIndexDefinition(serverless) })
  log.info({ index }, 'Index created successfully')
}

/**
 * Delete the entire movies index. Used by `npm run search:clear`.
 * No-ops if the index doesn't exist.
 */
export async function clearIndex(): Promise<{ deleted: boolean }> {
  const client = getClient()
  const index = getMoviesIndex()
  const exists = await client.indices.exists({ index })
  if (!exists) {
    log.info({ index }, 'clearIndex: index does not exist, nothing to do')
    return { deleted: false }
  }
  log.info({ index }, 'clearIndex: deleting index')
  await client.indices.delete({ index })
  return { deleted: true }
}

/**
 * Index a single movie by ID.
 */
export async function indexMovie(movieId: string): Promise<boolean> {
  if (!(await isAvailable())) {
    log.warn('Elasticsearch unavailable, skipping indexing')
    return false
  }

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: {
      genres: { include: { genre: { select: { name: true, slug: true } } } },
      countries: { include: { country: { select: { name: true, slug: true } } } },
      people: { select: { role: true, character: true, person: { select: { name: true, originalName: true } } } },
      reviews: {
        where: { status: 'approved' },
        select: { title: true, content: true },
        // Cap to keep doc size reasonable — top 20 most-recent approved
        // reviews are plenty to surface review-phrase matches.
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!movie) {
    log.warn({ movieId }, 'Movie not found')
    return false
  }

  // Only PUBLISHED movies are searchable. Skip (and evict) inactive,
  // soft-deleted, or not-yet-published (draft/hidden/archived) movies so
  // search never surfaces titles the user can't actually open elsewhere.
  if (!movie.isActive || movie.deletedAt || movie.status !== 'published') {
    await deleteMovieFromIndex(movieId)
    return false
  }

  const client = getClient()
  const index = getMoviesIndex()
  const doc = buildDocument(movie)

  await client.index({ index, id: movie.id, document: doc, refresh: 'wait_for' })
  log.info({ title: movie.title, id: movie.id }, 'Indexed')
  return true
}

/**
 * Delete a movie from the index.
 */
export async function deleteMovieFromIndex(movieId: string): Promise<void> {
  if (!(await isAvailable())) return
  const client = getClient()
  try {
    await client.delete({ index: getMoviesIndex(), id: movieId, refresh: 'wait_for' })
  } catch {
    // Ignore 404
  }
}

/**
 * Fire-and-forget helper used by admin CRUD routes. Failures are logged but
 * never propagate — the database transaction is the source of truth.
 */
export function syncMovieAsync(movieId: string, op: 'upsert' | 'delete' = 'upsert'): void {
  const work = async () => {
    try {
      if (op === 'delete') {
        await deleteMovieFromIndex(movieId)
      } else {
        await indexMovie(movieId)
      }
    } catch (err) {
      log.warn(
        { err: err instanceof Error ? err.message : err, movieId, op },
        'Background ES sync failed (DB write already committed)',
      )
    }
  }
  // Don't await — caller continues immediately.
  void work()
}

/**
 * Full reindex: rebuild the entire index from database.
 */
export async function reindexAll(batchSize: number = 100): Promise<{ total: number; indexed: number; errors: number }> {
  const client = getClient()
  const index = getMoviesIndex()
  const stats = { total: 0, indexed: 0, errors: 0 }

  // Recreate index
  await createIndex(true)

  // Count total (published only — must match the search-visible set).
  stats.total = await prisma.movie.count({
    where: { isActive: true, deletedAt: null, status: 'published' },
  })

  log.info({ total: stats.total, batchSize }, 'Reindexing movies in batches')

  let cursor: string | undefined = undefined

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findArgs: any = {
      where: { isActive: true, deletedAt: null, status: 'published' },
      include: {
        genres: { include: { genre: { select: { name: true, slug: true } } } },
        countries: { include: { country: { select: { name: true, slug: true } } } },
        people: { select: { role: true, character: true, person: { select: { name: true, originalName: true } } } },
      },
      orderBy: { id: 'asc' },
      take: batchSize,
    }
    if (cursor) {
      findArgs.skip = 1
      findArgs.cursor = { id: cursor }
    }
    const movies = await prisma.movie.findMany(findArgs)

    if (movies.length === 0) break

    // Bulk index
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operations = movies.flatMap((movie: any) => {
      const doc = buildDocument(movie)
      return [
        { index: { _index: index, _id: movie.id } },
        doc,
      ]
    })

    const { errors, items } = await client.bulk({ operations, refresh: false })

    if (errors) {
      const failedItems = items?.filter((item) => item.index?.error) || []
      stats.errors += failedItems.length
      for (const item of failedItems.slice(0, 3)) {
        log.error({ err: item.index?.error }, 'Bulk error')
      }
    }

    stats.indexed += movies.length - (errors ? (items?.filter((i) => i.index?.error).length || 0) : 0)

    cursor = movies[movies.length - 1].id
    log.info({ indexed: stats.indexed, total: stats.total }, 'Progress')

    // Background Job optimization: nhường CPU cho event loop xử lý request khác (non-blocking)
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  // Refresh index
  await client.indices.refresh({ index })

  return stats
}

export async function disconnect() {
  await prisma.$disconnect()
}
