// ============================================
// Image Resolver — Smart visual fallback layer
// ============================================
// Determines the best image to display for news articles,
// watch party rooms, and movie-related components.
// Priority: movie backdrop → movie poster → article image → placeholder
//
// Uses TMDB image URLs via the tmdbImage() helper.
// Null-safe: never returns a broken image URL.

import { tmdbImage } from '@/lib/tmdb-image'

// ── Types ──

export interface ImageResolverInput {
  /** TMDB backdrop path (e.g. "/abc.jpg") */
  backdropPath?: string | null
  /** TMDB poster path (e.g. "/xyz.jpg") */
  posterPath?: string | null
  /** External article image URL */
  articleImage?: string | null
  /** Direct full image URL (already resolved) */
  directUrl?: string | null
}

export interface ResolvedImage {
  /** Final image URL to display */
  url: string
  /** Source type for debugging/analytics */
  source: 'backdrop' | 'poster' | 'article' | 'direct' | 'placeholder'
  /** Whether this is a TMDB image */
  isTmdb: boolean
}

// ── Constants ──

const PLACEHOLDER_GRADIENT = '/placeholder.jpg'

// Known bad image patterns (generic stock photos, broken CDNs)
const BAD_IMAGE_PATTERNS = [
  'placeholder',
  'no-image',
  'default-thumbnail',
  'generic',
  'stock-photo',
]

// ── Core Resolver ──

/**
 * Resolve the best available image from multiple sources.
 * Priority: backdrop → poster → direct → article → placeholder
 */
export function resolveImage(input: ImageResolverInput): ResolvedImage {
  // 1. Backdrop (best for heroes and banners)
  if (input.backdropPath) {
    return {
      url: tmdbImage(input.backdropPath, 'w1280'),
      source: 'backdrop',
      isTmdb: true,
    }
  }

  // 2. Poster (best for cards)
  if (input.posterPath) {
    return {
      url: tmdbImage(input.posterPath, 'w500'),
      source: 'poster',
      isTmdb: true,
    }
  }

  // 3. Direct URL (pre-resolved)
  if (input.directUrl && isValidImageUrl(input.directUrl)) {
    return {
      url: input.directUrl,
      source: 'direct',
      isTmdb: input.directUrl.includes('image.tmdb.org'),
    }
  }

  // 4. Article image (from news APIs)
  if (input.articleImage && isValidImageUrl(input.articleImage)) {
    return {
      url: input.articleImage,
      source: 'article',
      isTmdb: false,
    }
  }

  // 5. Placeholder
  return {
    url: PLACEHOLDER_GRADIENT,
    source: 'placeholder',
    isTmdb: false,
  }
}

/**
 * Get the best backdrop image for hero/banner sections.
 * Falls back through: backdrop → poster (widened) → placeholder
 */
export function resolveHeroImage(input: ImageResolverInput): string {
  if (input.backdropPath) return tmdbImage(input.backdropPath, 'original')
  if (input.posterPath) return tmdbImage(input.posterPath, 'w780')
  if (input.directUrl && isValidImageUrl(input.directUrl)) return input.directUrl
  return PLACEHOLDER_GRADIENT
}

/**
 * Get the best card image (square/portrait format).
 * Falls back through: poster → backdrop → article → placeholder
 */
export function resolveCardImage(input: ImageResolverInput): string {
  if (input.posterPath) return tmdbImage(input.posterPath, 'w342')
  if (input.backdropPath) return tmdbImage(input.backdropPath, 'w780')
  if (input.articleImage && isValidImageUrl(input.articleImage)) return input.articleImage
  if (input.directUrl && isValidImageUrl(input.directUrl)) return input.directUrl
  return PLACEHOLDER_GRADIENT
}

/**
 * Get the best thumbnail for small preview sizes.
 */
export function resolveThumbnail(input: ImageResolverInput): string {
  if (input.posterPath) return tmdbImage(input.posterPath, 'w185')
  if (input.backdropPath) return tmdbImage(input.backdropPath, 'w300')
  if (input.articleImage && isValidImageUrl(input.articleImage)) return input.articleImage
  return PLACEHOLDER_GRADIENT
}

// ── Utilities ──

function isValidImageUrl(url: string): boolean {
  if (!url || url.length < 10) return false
  if (BAD_IMAGE_PATTERNS.some((p) => url.toLowerCase().includes(p))) return false
  try {
    new URL(url)
    return true
  } catch {
    return url.startsWith('/')
  }
}

/**
 * Check if a URL is likely a TMDB image.
 */
export function isTmdbImageUrl(url: string): boolean {
  return url.includes('image.tmdb.org')
}
