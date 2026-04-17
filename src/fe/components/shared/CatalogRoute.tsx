import { CatalogView } from '@/src/fe/components/shared/CatalogView'
import { searchMovies } from '@/src/be/services/tmdb/search-service'
import { getTrending, getPopular, getTopRated, getNowPlaying, getUpcoming, getMoviesByGenre, getMoviesByCountry, getGenres } from '@/src/be/services/tmdb/movie-service'
import { searchTv, getTvPopular, getTvTrending, getTvTopRated, getTvByGenre, getTvByCountry, getTvGenres } from '@/src/be/services/tmdb/tv-service'

interface CatalogRouteProps {
  type: 'movies' | 'series'
  searchParams: { q?: string; genre?: string; category?: string; page?: string; country?: string }
}

const CATEGORY_LABELS: Record<string, string> = {
  trending: 'Xu hướng',
  popular: 'Phổ biến',
  'top-rated': 'Đánh giá cao',
  'now-playing': 'Đang chiếu',
  upcoming: 'Sắp ra mắt',
}

export async function CatalogRoute({ type, searchParams }: CatalogRouteProps) {
  const query = searchParams.q || ''
  const genreId = searchParams.genre ? Number(searchParams.genre) : null
  const category = searchParams.category || ''
  const country = searchParams.country || ''
  const page = Number(searchParams.page) || 1

  let genres: { id: number; name: string }[] = []
  try {
    genres = type === 'movies' ? await getGenres() : await getTvGenres()
  } catch {}

  let result
  let title = type === 'movies' ? 'Phim Lẻ Phổ Biến' : 'Phim Bộ Phổ Biến'

  try {
    if (query) {
      result = type === 'movies' ? await searchMovies(query, page) : await searchTv(query, page)
      title = `Kết quả cho "${query}"`
    } else if (country) {
      result = type === 'movies' ? await getMoviesByCountry(country, page) : await getTvByCountry(country, page)
      title = `${type === 'movies' ? 'Phim' : 'Phim bộ'} từ: ${country}`
    } else if (genreId) {
      result = type === 'movies' ? await getMoviesByGenre(genreId, page) : await getTvByGenre(genreId, page)
      const gn = genres.find((g) => g.id === genreId)?.name || ''
      title = gn ? `Thể loại: ${gn}` : `Thể loại phim${type === 'series' ? ' bộ' : ''}`
    } else if (category === 'trending') {
      result = type === 'movies' ? await getTrending(page) : await getTvTrending(page)
    } else if (category === 'top-rated') {
      result = type === 'movies' ? await getTopRated(page) : await getTvTopRated(page)
    } else if (category === 'now-playing' && type === 'movies') {
      result = await getNowPlaying(page)
    } else if (category === 'upcoming' && type === 'movies') {
      result = await getUpcoming(page)
    } else {
      result = type === 'movies' ? await getPopular(page) : await getTvPopular(page)
    }
    if (category && CATEGORY_LABELS[category]) title = CATEGORY_LABELS[category]
  } catch {
    result = { items: [], page: 1, totalPages: 0, totalResults: 0 }
  }

  const emptyStateText = {
    noSearch: 'Không tìm thấy kết quả',
    noSearchSub: `Không có ${type === 'movies' ? 'phim' : 'phim bộ'} nào khớp với "${query}". Thử từ khóa khác hoặc duyệt theo thể loại.`,
    noData: `Chưa có ${type === 'movies' ? 'phim' : 'phim bộ'} nào`,
    noDataSub: 'Vui lòng kiểm tra kết nối TMDB API.'
  }

  return (
    <CatalogView
      basePath={`/${type}`}
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
  )
}
