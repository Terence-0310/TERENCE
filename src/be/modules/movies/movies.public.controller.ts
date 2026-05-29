import { NextRequest } from 'next/server'
import { getMovieList, type MovieListParams, getMovieBySlug, getMostLikedMovies, getTrendingMovies } from './movie-service'
import { serializeMovieCard, serializeMovieDetail } from './serializers'
import { parseIntParam, parseStringParam, parseBoolParam } from './api-helpers'
import { getUpcomingMovies } from '@/src/be/modules/news/tmdb-news'
import { ok, serverError, badRequest, notFound, paginated } from '@/src/be/shared/api-handler'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'movies-public-controller' })

const ALLOWED_TYPES = ['movie', 'series', 'anime']
const ALLOWED_SORTS = ['newest', 'oldest', 'popular', 'rating', 'year', 'title']

export class MoviesPublicController {
  // GET /api/v1/movies
  static async getList(req: NextRequest) {
    try {
      const sp = req.nextUrl.searchParams

      const params: MovieListParams = {
        page: parseIntParam(sp.get('page'), 1, 1, 1000),
        perPage: parseIntParam(sp.get('perPage'), 24, 1, 100),
        cursor: parseStringParam(sp.get('cursor')),
        noCount: parseBoolParam(sp.get('noCount')),
        category: parseStringParam(sp.get('category')),
        country: parseStringParam(sp.get('country')),
        year: sp.get('year') ? parseIntParam(sp.get('year'), 0, 1900, 2100) || undefined : undefined,
        contentType: parseStringParam(sp.get('type'), ALLOWED_TYPES),
        featured: parseBoolParam(sp.get('featured')),
        trending: parseBoolParam(sp.get('trending')),
        sort: (parseStringParam(sp.get('sort'), ALLOWED_SORTS) as MovieListParams['sort']) || 'newest',
      }

      const { movies, total, page, perPage } = await getMovieList(params)
      const serialized = movies.map((m: any) => serializeMovieCard(m))

      return paginated(serialized, total, page, perPage)
    } catch (error) {
      log.error({ err: error instanceof Error ? error.message : error }, 'getList error')
      return serverError()
    }
  }

  // GET /api/v1/movies/[slug]
  static async getDetail(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
      const { slug } = await params

      if (!slug || slug.trim() === '') {
        return badRequest('Missing slug parameter')
      }

      const movie = await getMovieBySlug(slug)
      if (!movie) {
        return notFound('Không tìm thấy phim')
      }

      return ok(serializeMovieDetail(movie as unknown as Record<string, unknown>))
    } catch (error) {
      log.error({ err: error instanceof Error ? error.message : error }, 'getDetail error')
      return serverError()
    }
  }

  // GET /api/v1/movies/most-liked
  static async getMostLiked(_req: NextRequest) {
    try {
      const data = await getMostLikedMovies()
      return ok(data)
    } catch (error) {
      log.error({ err: error instanceof Error ? error.message : error }, 'getMostLiked error')
      return serverError('Không thể tải phim yêu thích nhất')
    }
  }

  // GET /api/v1/movies/trending-stats
  static async getTrendingStats(_req: NextRequest) {
    try {
      const data = await getTrendingMovies()
      return ok(data)
    } catch (error) {
      log.error({ err: error instanceof Error ? error.message : error }, 'getTrendingStats error')
      return serverError('Không thể tải phim sôi nổi')
    }
  }

  // GET /api/movies/upcoming
  static async getUpcoming(req: NextRequest) {
    const { searchParams } = new URL(req.url)

    const region = searchParams.get('region') || 'VN'
    const pageStr = searchParams.get('page')
    const page = pageStr ? Math.max(parseInt(pageStr, 10) || 1, 1) : 1

    try {
      const { items, total } = await getUpcomingMovies(region, page)
      return ok({ items, total, source: 'tmdb', fetchedAt: new Date().toISOString() })
    } catch {
      return ok({ items: [], total: 0, source: 'tmdb', fetchedAt: new Date().toISOString() })
    }
  }
}
