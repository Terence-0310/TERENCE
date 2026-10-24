import { searchMovies as searchMoviesES, isLikelyPersonName, type SearchResultItem } from '@/src/be/modules/search/movie-search-service'
import { getTrending, getPopular, getTopRated, getNowPlaying, getUpcoming, getMoviesByGenre, getMoviesByCountry, getGenres } from '@/src/be/services/tmdb/movie-service'
import { searchMovies as searchTmdbMovies } from '@/src/be/services/tmdb/search-service'
import { searchTv as searchTmdbTv } from '@/src/be/services/tmdb/tv-service'
import { searchTmdbPersonWithCredits } from '@/src/be/modules/tmdb/legacy/person-search'
import { CatalogView } from '@/src/fe/components/shared/CatalogView'
import type { Metadata } from 'next'
import type { Genre, Movie } from '@/types/movie'

// Map one Elasticsearch hit (our owned, watchable catalog) into the Movie
// shape the catalog grid renders. `customUrl` points at the title's detail page
// and the enrichment fields (director / cast / quality / episodes) let the
// card show full info. isExternal:false marks it as a real, watchable title.
function esItemToMovie(m: SearchResultItem): Movie {
  return {
    id: (m.tmdbId || m.slug) as unknown as number,
    title: m.title,
    originalTitle: m.originalTitle || m.title,
    overview: '',
    posterUrl: m.posterUrl || m.thumbUrl || null,
    backdropUrl: m.backdropUrl || m.thumbUrl || m.posterUrl || null,
    releaseDate: m.year ? `${m.year}-01-01` : '',
    year: m.year || 0,
    voteAverage: Math.round((m.rating || 0) * 10) / 10,
    voteCount: 0,
    popularity: 0,
    genreIds: [],
    genres: m.categories.map((c) => ({ id: 0, name: c, slug: c })),
    runtime: 0,
    runtimeFormatted: '',
    mediaType: m.contentType === 'series' ? 'tv' : 'movie',
    slug: m.slug,
    customUrl: `/movie/${m.slug}`,
    isExternal: false,
    quality: m.quality,
    director: m.director,
    castNames: m.actors ? m.actors.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4) : [],
    episodeLabel: m.contentType === 'series'
      ? (m.episodeCurrent || (m.episodeTotal && m.episodeTotal > 1 ? `${m.episodeTotal} tập` : null))
      : null,
  }
}

// Normalise a TMDB discovery item (movie OR tv — the tv mapper uses
// `firstAirDate` and omits genres/runtime) into the Movie shape, flagged as a
// trailer-only external result.
function externalToMovie(m: Record<string, unknown>): Movie {
  return {
    id: m.id as number,
    title: (m.title as string) || '',
    originalTitle: (m.originalTitle as string) || (m.title as string) || '',
    overview: (m.overview as string) || '',
    posterUrl: (m.posterUrl as string) ?? null,
    backdropUrl: (m.backdropUrl as string) ?? null,
    releaseDate: (m.releaseDate as string) || (m.firstAirDate as string) || '',
    year: (m.year as number) || 0,
    voteAverage: (m.voteAverage as number) || 0,
    voteCount: (m.voteCount as number) || 0,
    popularity: (m.popularity as number) || 0,
    genreIds: (m.genreIds as number[]) || [],
    genres: (m.genres as Genre[]) || [],
    runtime: (m.runtime as number) ?? null,
    runtimeFormatted: (m.runtimeFormatted as string) || '',
    mediaType: (m.mediaType as 'movie' | 'tv') || 'movie',
    isExternal: true,
  }
}

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
        // ── Hybrid search ───────────────────────────────────────────
        // 1) Elasticsearch = our watchable catalog (ranked, full info) → first.
        // 2) TMDB title search = "đầy đủ" supplement so titles we don't own yet
        //    (trailer-only, e.g. brand-new films) are still findable. Deduped
        //    against ES by tmdbId and flagged isExternal so the card labels them.
        const esResult = await searchMoviesES(query, page, 20)
        const esIds = new Set(esResult.items.map((i) => i.tmdbId).filter(Boolean) as number[])

        // Fetch the TMDB supplement on page 1 always; on deeper pages only when
        // ES has nothing (keeps pagination stable when ES is the primary list).
        let externals: Movie[] = []
        let tmdbTotalPages = 0
        let tmdbTotalResults = 0
        if (page === 1 || esResult.items.length === 0) {
          const [mv, tv] = await Promise.all([
            searchTmdbMovies(query, page).catch(() => null),
            searchTmdbTv(query, page).catch(() => null),
          ])
          const seen = new Set<number>()
          externals = ([...(mv?.items || []), ...(tv?.items || [])] as unknown as Array<Record<string, unknown>>)
            .filter((m) => {
              const id = m.id as number
              return id && !esIds.has(id) && !seen.has(id) && (seen.add(id), true)
            })
            .sort((a, b) => ((b.popularity as number) || 0) - ((a.popularity as number) || 0))
            .map(externalToMovie)
          tmdbTotalPages = Math.max(mv?.totalPages || 0, tv?.totalPages || 0)
          tmdbTotalResults = (mv?.totalResults || 0) + (tv?.totalResults || 0)
        }

        const esMapped = esResult.items.map(esItemToMovie)

        if (esMapped.length === 0) {
          // Nothing watchable → show the TMDB catalogue so the title is never
          // "not found" (the click-through detail page works via TMDB).
          result = { items: externals, page, totalPages: tmdbTotalPages, totalResults: tmdbTotalResults, source: 'tmdb' }
        } else {
          // Watchable first, then up to 12 trailer-only extras on page 1.
          result = {
            items: page === 1 ? [...esMapped, ...externals.slice(0, 12)] : esMapped,
            page: esResult.page,
            totalPages: esResult.totalPages,
            totalResults: esResult.total,
            source: esResult.source,
          }
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
