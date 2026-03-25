// ============================================
// Movie Search Indexer
// ============================================
// Builds ES documents from Prisma data and handles index lifecycle.

import { PrismaClient } from '@prisma/client'
import { getClient, getMoviesIndex, MOVIES_INDEX_MAPPING, isAvailable } from './elastic-client'

const prisma = new PrismaClient()

// ─── Document Builder ───────────────────────────────────────────

interface MovieForIndex {
  id: string
  slug: string
  title: string
  originalTitle: string | null
  description: string | null
  actorText: string | null
  directorText: string | null
  categoryText: string | null
  countryText: string | null
  year: number | null
  contentType: string
  quality: string | null
  language: string | null
  thumbUrl: string | null
  posterUrl: string | null
  rating: number | null
  viewCount: number
  episodeCurrent: string | null
  episodeTotal: number | null
  isActive: boolean
  isFeatured: boolean
  isTrending: boolean
  publishedAt: Date | null
  updatedAt: Date
  categories?: Array<{ category: { name: string; slug: string } }>
  countries?: Array<{ country: { name: string; slug: string } }>
}

function normalizeForSuggest(title: string, originalTitle: string | null): string {
  // Combine both titles, strip diacritics for better autocomplete
  const parts = [title]
  if (originalTitle && originalTitle !== title) parts.push(originalTitle)
  return parts
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function splitText(text: string | null): string[] {
  if (!text) return []
  return text.split(',').map(s => s.trim()).filter(Boolean)
}

export function buildDocument(movie: MovieForIndex) {
  const categorySlugs = movie.categories
    ? movie.categories.map(c => c.category.slug)
    : splitText(movie.categoryText)
  const countrySlugs = movie.countries
    ? movie.countries.map(c => c.country.slug)
    : splitText(movie.countryText)

  return {
    id: movie.id,
    slug: movie.slug,
    title: movie.title,
    originalTitle: movie.originalTitle,
    titleSuggest: normalizeForSuggest(movie.title, movie.originalTitle),
    description: movie.description,
    actors: movie.actorText || '',
    directors: movie.directorText || '',
    categories: categorySlugs,
    countries: countrySlugs,
    year: movie.year,
    contentType: movie.contentType,
    quality: movie.quality,
    language: movie.language,
    thumbUrl: movie.thumbUrl,
    posterUrl: movie.posterUrl,
    rating: movie.rating || 0,
    viewCount: movie.viewCount || 0,
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
      console.log(`[ES] Index "${index}" already exists. Use force=true to recreate.`)
      return
    }
    console.log(`[ES] Deleting existing index "${index}"...`)
    await client.indices.delete({ index })
  }

  console.log(`[ES] Creating index "${index}" with mapping...`)
  await client.indices.create({ index, ...MOVIES_INDEX_MAPPING })
  console.log(`[ES] Index "${index}" created successfully.`)
}

/**
 * Index a single movie by ID.
 */
export async function indexMovie(movieId: string): Promise<boolean> {
  if (!(await isAvailable())) {
    console.warn('[ES] Elasticsearch unavailable, skipping indexing')
    return false
  }

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: {
      categories: { include: { category: { select: { name: true, slug: true } } } },
      countries: { include: { country: { select: { name: true, slug: true } } } },
    },
  })

  if (!movie) {
    console.warn(`[ES] Movie not found: ${movieId}`)
    return false
  }

  const client = getClient()
  const index = getMoviesIndex()
  const doc = buildDocument(movie)

  await client.index({ index, id: movie.id, document: doc, refresh: 'wait_for' })
  console.log(`[ES] Indexed: "${movie.title}" (${movie.id})`)
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
 * Full reindex: rebuild the entire index from database.
 */
export async function reindexAll(batchSize: number = 100): Promise<{ total: number; indexed: number; errors: number }> {
  const client = getClient()
  const index = getMoviesIndex()
  const stats = { total: 0, indexed: 0, errors: 0 }

  // Recreate index
  await createIndex(true)

  // Count total
  stats.total = await prisma.movie.count({
    where: { isActive: true, deletedAt: null },
  })

  console.log(`[ES] Reindexing ${stats.total} movies in batches of ${batchSize}...`)

  let cursor: string | undefined = undefined

  while (true) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findArgs: any = {
      where: { isActive: true, deletedAt: null },
      include: {
        categories: { include: { category: { select: { name: true, slug: true } } } },
        countries: { include: { country: { select: { name: true, slug: true } } } },
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
      const failedItems = items?.filter(item => item.index?.error) || []
      stats.errors += failedItems.length
      for (const item of failedItems.slice(0, 3)) {
        console.error(`[ES] Bulk error:`, item.index?.error)
      }
    }

    stats.indexed += movies.length - (errors ? (items?.filter(i => i.index?.error).length || 0) : 0)

    cursor = movies[movies.length - 1].id
    console.log(`[ES] Progress: ${stats.indexed}/${stats.total} indexed`)
  }

  // Refresh index
  await client.indices.refresh({ index })

  return stats
}

export async function disconnect() {
  await prisma.$disconnect()
}
