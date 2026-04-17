import { searchMovies as searchMoviesTMDB } from '@/src/be/services/tmdb/search-service'
import { searchMovies as searchMoviesES } from '@/src/be/modules/search/movie-search-service'
import { getTrending, getPopular, getTopRated, getNowPlaying, getUpcoming, getMoviesByGenre, getMoviesByCountry, getGenres } from '@/src/be/services/tmdb/movie-service'
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

  try {
    if (query) {
      const isEasterEgg = query.trim().toLowerCase() === 'mỹ chi' || query.trim().toLowerCase() === 'my chi'
      const esResult = await searchMoviesES(query, page, 20)
      
      result = {
        items: esResult.items.map((m) => ({
          id: (m.tmdbId || m.slug) as any, // adapt string slug if tmdbId is missing
          title: m.title,
          originalTitle: m.originalTitle || m.title,
          overview: '', // SearchResultItem doesn't need overview
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
        } as any)
      }
      title = `Kết quả cho "${query}"`
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
    <CatalogView
      basePath="/browse"
      title={title}
      query={query}
      genreId={genreId}
      category={category}
      page={page}
      genres={genres}
      result={result}
      emptyStateText={emptyStateText}
    />
  )
}
