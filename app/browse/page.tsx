import { searchMovies as searchMoviesES, isLikelyPersonName } from '@/src/be/modules/search/movie-search-service'
import { getTrending, getPopular, getTopRated, getNowPlaying, getUpcoming, getMoviesByGenre, getMoviesByCountry, getGenres } from '@/src/be/services/tmdb/movie-service'
import { searchTmdbPersonWithCredits } from '@/src/be/modules/tmdb/legacy/person-search'
import { CatalogView } from '@/src/fe/components/shared/CatalogView'
import type { Metadata } from 'next'
import type { Genre } from '@/types/movie'

interface PageProps {
  searchParams: Promise<{ q?: string; genre?: string; category?: string; page?: string; country?: string }>
}

export const metadata: Metadata = {
  title: 'Khám phá phim — Terence',
  description: 'Tìm kiếm và khám phá kho phim phong phú trên Terence.',
}

const CATEGORY_LABELS: Record<string, string> = {
  trending: 'Xu hướng',
  popular: 'Phổ biến',
  'top-rated': 'Đánh giá cao',
  'now-playing': 'Đang chiếu',
  upcoming: 'Sắp ra mắt',
}

export default async function BrowsePage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q || ''
  const genreId = params.genre ? Number(params.genre) : null
  const category = params.category || ''
  const country = params.country || ''
  const page = Number(params.page) || 1

  let genres: Genre[] = []
  try { genres = await getGenres() } catch {}

  let result: any = { items: [], page: 1, totalPages: 0, totalResults: 0, source: 'tmdb' }
  let title = 'Phim phổ biến'
  // Banner state — populated when we fall back to TMDB person credits
  // (real-time person filmography) because the query looks like a name.
  let personBanner: { name: string; knownFor: string; total: number } | null = null

  try {
    if (query) {
      const isEasterEgg = query.trim().toLowerCase() === 'mỹ chi' || query.trim().toLowerCase() === 'my chi'

      // When the query looks like a person's name (≥2 capitalised tokens),
      // ask TMDB directly for their filmography. Most user searches for an
      // actor (e.g. "Jack Reynor") never had a chance via ES because their
      // films aren't synced into our DB. Falling back to TMDB gives the
      // authoritative list; the /movie/[id] and /tv/[id] pages lazy-create
      // the DB row when the user clicks through.
      let personResult: Awaited<ReturnType<typeof searchTmdbPersonWithCredits>> | null = null
      if (isLikelyPersonName(query)) {
        try {
          personResult = await searchTmdbPersonWithCredits(query)
        } catch {
          personResult = null
        }
      }

      if (personResult && personResult.credits.length > 0) {
        const perPage = 20
        const totalResults = personResult.credits.length
        const totalPages = Math.ceil(totalResults / perPage)
        const start = (page - 1) * perPage
        const slice = personResult.credits.slice(start, start + perPage)

        result = {
          items: slice,
          page,
          totalPages,
          totalResults,
          source: 'tmdb-person',
        }
        personBanner = {
          name: personResult.person.name,
          knownFor: personResult.person.knownFor,
          total: totalResults,
        }
        title = `Phim của ${personResult.person.name}`
      } else {
        const esResult = await searchMoviesES(query, page, 20)

        result = {
          items: esResult.items.map((m) => ({
            id: (m.tmdbId || m.slug) as string | number,
            title: m.title,
            originalTitle: m.originalTitle || m.title,
            overview: '',
            posterUrl: m.posterUrl || m.thumbUrl,
            backdropUrl: m.thumbUrl || m.posterUrl,
            releaseDate: m.year ? `${m.year}-01-01` : '',
            year: m.year || 0,
            voteAverage: m.rating || 0,
            voteCount: 0,
            popularity: 0,
            genreIds: [],
            genres: m.categories.map((c) => ({ id: 0, name: c, slug: c })),
            runtime: 0,
            runtimeFormatted: '',
            mediaType: (m.contentType === 'movie' ? 'movie' : 'tv') as 'movie' | 'tv',
          })),
          page: esResult.page,
          totalPages: esResult.totalPages,
          totalResults: esResult.total,
          source: esResult.source,
        }

        if (isEasterEgg && page === 1) {
          result.items.unshift({
            id: 'mychi',
            title: 'Mỹ Chi - 💖 Món quà bí mật',
            originalTitle: 'Bấm vào kết quả đầu tiên này nhé!',
            overview: '',
            posterUrl: 'https://i.pinimg.com/originals/b7/c6/4a/b7c64aca651271c52087f58276bd1de1.gif',
            backdropUrl: 'https://i.pinimg.com/originals/b7/c6/4a/b7c64aca651271c52087f58276bd1de1.gif',
            releaseDate: '3000-01-01',
            year: 3000,
            voteAverage: 10,
            voteCount: 999999,
            popularity: 100,
            genreIds: [],
            genres: [{ id: 1, name: 'Easter Egg', slug: 'easter-egg' }],
            runtime: 0,
            runtimeFormatted: '',
            mediaType: 'movie',
            customUrl: '/mychi/index.html'
          } as unknown as typeof result.items[number])
        }
        title = `Kết quả cho "${query}"`
      }
    } else if (country) {
      result = await getMoviesByCountry(country, page)
      title = `Phim từ: ${country}`
    } else if (genreId) {
      result = await getMoviesByGenre(genreId, page)
      const gn = genres.find((g) => g.id === genreId)?.name || ''
      title = gn ? `Thể loại: ${gn}` : 'Thể loại phim'
    } else if (category === 'trending') {
      result = await getTrending(page)
    } else if (category === 'top-rated') {
      result = await getTopRated(page)
    } else if (category === 'now-playing') {
      result = await getNowPlaying(page)
    } else if (category === 'upcoming') {
      result = await getUpcoming(page)
    } else {
      result = await getPopular(page)
    }
    if (category && CATEGORY_LABELS[category]) title = CATEGORY_LABELS[category]
  } catch {
    result = { items: [], page: 1, totalPages: 0, totalResults: 0, source: 'error' }
  }

  const emptyStateText = {
    noSearch: 'Không tìm thấy kết quả',
    noSearchSub: `Không có phim nào khớp với "${query}". Thử từ khóa khác hoặc duyệt theo thể loại.`,
    noData: 'Chưa có phim nào',
    noDataSub: 'Vui lòng kiểm tra kết nối TMDB API.'
  }

  return (
    <>
      {personBanner && (
        <div className="mx-auto mt-4 max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="rounded-xl border border-primary/20 bg-primary/[0.05] px-4 py-3 text-sm text-primary/90">
            <p>
              Diễn viên{' '}
              <strong className="font-semibold text-white">{personBanner.name}</strong>
              {personBanner.knownFor ? ` · ${personBanner.knownFor}` : ''}{' '}
              · <span className="text-white/70">{personBanner.total} tác phẩm (TMDB)</span>
            </p>
          </div>
        </div>
      )}
      <CatalogView
        basePath="/browse"
        title={title}
        query={query}
        genreId={genreId}
        category={category}
        country={country}
        page={page}
        genres={genres}
        result={result}
        emptyStateText={emptyStateText}
      />
    </>
  )
}
