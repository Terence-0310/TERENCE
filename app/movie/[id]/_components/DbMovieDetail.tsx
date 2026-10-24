import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Star, Clock, Calendar, Play, ArrowLeft, Film, Eye, ListVideo, Clapperboard } from 'lucide-react'
import { prisma } from '@/src/be/shared/db/prisma'
import { PUBLISHED_FILTER } from '@/src/be/modules/movies/movie-service'
import { MovieRow } from '@/src/fe/components/shared/MovieRow'
import { MovieComments } from '@/src/fe/components/shared/MovieComments'
import { RelatedNews } from '@/src/fe/components/news/RelatedNews'
import { PageViewTracker } from '@/src/fe/components/analytics/PageViewTracker'
import { FavoriteButton } from '@/src/fe/components/shared/FavoriteButton'
import type { Movie } from '@/types/movie'

// Detail ("giới thiệu") page for titles that live in our own catalog
// (OPhim/KKPhim sync or admin-created), addressed by slug or DB id. Cards link
// here; the "Xem phim" button / episode list are what open the player.

const CONTENT_TYPE_LABEL: Record<string, string> = {
  movie: 'Phim lẻ',
  series: 'Phim bộ',
  anime: 'Hoạt hình',
  trailer: 'Trailer',
  short: 'Video ngắn',
}

export function findCatalogMovie(ref: string) {
  return prisma.movie.findFirst({
    where: { OR: [{ slug: ref }, { id: ref }], isActive: true, deletedAt: null },
    include: {
      genres: { include: { genre: true } },
      countries: { include: { country: true } },
      people: {
        where: { isActive: true },
        include: { person: true },
        orderBy: { sortOrder: 'asc' },
      },
      episodes: {
        where: { isActive: true, isPublished: true },
        select: { id: true, slug: true, episodeSlug: true, episodeName: true, title: true, episodeNumber: true, serverName: true },
        orderBy: [{ episodeNumber: 'asc' }, { sortOrder: 'asc' }],
      },
    },
  })
}

function youtubeEmbed(trailerKey: string | null, trailerSite: string | null, trailerUrl: string | null): string | null {
  if (trailerKey && (!trailerSite || trailerSite.toLowerCase() === 'youtube')) {
    return `https://www.youtube.com/embed/${trailerKey}`
  }
  const match = trailerUrl?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : null
}

function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m} phút`
}

export async function DbMovieDetail({ refId }: { refId: string }) {
  const movie = await findCatalogMovie(refId)
  if (!movie) notFound()

  const watchHref = `/watch/${movie.slug}`
  const genres = movie.genres.map((g) => g.genre)
  const countries = movie.countries.map((c) => c.country)
  const directors = movie.people.filter((p) => p.role === 'director')
  const cast = movie.people.filter((p) => p.role === 'actor')
  const trailerEmbed = youtubeEmbed(movie.trailerKey, movie.trailerSite, movie.trailerUrl)
  const duration = formatDuration(movie.duration)
  const rating = movie.rating ? Math.round(movie.rating * 10) / 10 : 0

  // Episode list: one server is enough to pick an episode (the player lets
  // the viewer switch servers); fall back to all rows when servers are unnamed.
  const firstServer = movie.episodes[0]?.serverName ?? null
  const episodes = movie.episodes.filter((e) => e.serverName === firstServer)
  const isMultiEpisode = episodes.length > 1

  const shorts = await prisma.short.findMany({
    where: { movieId: movie.id, status: 'published' },
    select: { id: true, title: true, thumbnailUrl: true, viewCount: true },
    orderBy: [{ likeCount: 'desc' }, { publishedAt: 'desc' }],
    take: 10,
  })

  const related = genres.length
    ? await prisma.movie.findMany({
        where: {
          ...PUBLISHED_FILTER,
          id: { not: movie.id },
          genres: { some: { genreId: { in: genres.map((g) => g.id) } } },
        },
        select: { id: true, slug: true, title: true, originalTitle: true, posterUrl: true, backdropUrl: true, thumbUrl: true, year: true, rating: true, quality: true, contentType: true },
        orderBy: { viewCount: 'desc' },
        take: 12,
      })
    : []
  const relatedMovies = related.map((m) => ({
    id: m.slug,
    slug: m.slug,
    customUrl: `/movie/${m.slug}`,
    title: m.title,
    originalTitle: m.originalTitle || m.title,
    overview: '',
    posterUrl: m.posterUrl || m.thumbUrl,
    backdropUrl: m.backdropUrl || m.thumbUrl || m.posterUrl,
    releaseDate: '',
    year: m.year || 0,
    voteAverage: m.rating ? Math.round(m.rating * 10) / 10 : 0,
    voteCount: 0,
    popularity: 0,
    genreIds: [],
    genres: [],
    runtime: null,
    runtimeFormatted: '',
    mediaType: m.contentType === 'movie' ? 'movie' : 'tv',
    quality: m.quality,
  })) as unknown as Movie[]

  const backdrop = movie.backdropUrl || movie.thumbUrl

  return (
    <main className="min-h-screen bg-background">
      <PageViewTracker path={`/movie/${movie.slug}`} />

      {/* ═══════ HERO BACKDROP ═══════ */}
      <section className="relative h-[55vh] min-h-[420px] overflow-hidden md:h-[65vh]">
        {backdrop ? (
          <Image src={backdrop} alt={movie.title} fill className="object-cover object-top" priority sizes="100vw" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        <div className="absolute bottom-0 h-40 w-full bg-gradient-to-t from-background to-transparent" />

        <Link
          href="/"
          className="absolute left-4 top-5 z-10 inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium text-white/80 border border-white/10 transition hover:bg-white/10 hover:text-white md:left-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Trang chủ</span>
        </Link>
      </section>

      {/* ═══════ MOVIE INFO ═══════ */}
      <section className="relative z-10 mx-auto -mt-48 max-w-7xl px-5 md:-mt-52 md:px-8 lg:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:gap-10">
          {/* Poster */}
          <div className="mx-auto w-44 flex-shrink-0 md:mx-0 md:w-60 lg:w-72">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/50 glow-primary">
              <Image
                src={movie.posterUrl || movie.thumbUrl || '/placeholder.jpg'}
                alt={movie.title}
                width={288}
                height={432}
                className="h-auto w-full object-cover"
                priority
                unoptimized
              />
            </div>

            {rating > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-card border border-white/5 px-4 py-3">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-black text-white">{rating}</span>
                <span className="text-xs text-muted-foreground">/ 10</span>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  {movie.viewCount.toLocaleString('vi-VN')}
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="text-3xl font-black leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
                {movie.title}
              </h1>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="mt-1.5 text-sm text-muted-foreground">{movie.originalTitle}</p>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-lg bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary border border-primary/20">
                {CONTENT_TYPE_LABEL[movie.contentType] ?? movie.contentType}
              </span>
              {movie.year && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 border border-white/5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {movie.year}
                </span>
              )}
              {duration && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 border border-white/5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {duration}
                </span>
              )}
              {movie.episodeCurrent && (
                <span className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white/80 border border-white/5">
                  {movie.episodeCurrent}
                  {movie.episodeTotal ? ` / ${movie.episodeTotal} tập` : ''}
                </span>
              )}
              {movie.quality && (
                <span className="rounded-lg bg-white/5 px-3 py-1.5 text-sm font-bold uppercase text-white/80 border border-white/5">{movie.quality}</span>
              )}
              {movie.language && (
                <span className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-muted-foreground border border-white/5">{movie.language}</span>
              )}
              {movie.ageRating && (
                <span className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-muted-foreground border border-white/5">{movie.ageRating}</span>
              )}
            </div>

            {/* Genres & countries */}
            {(genres.length > 0 || countries.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {genres.map((g) =>
                  g.tmdbId ? (
                    <Link
                      key={g.id}
                      href={`/browse?genre=${g.tmdbId}`}
                      className="rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/15"
                    >
                      {g.name}
                    </Link>
                  ) : (
                    <span key={g.id} className="rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary">
                      {g.name}
                    </span>
                  ),
                )}
                {countries.map((c) =>
                  c.code ? (
                    <Link
                      key={c.id}
                      href={`/browse?country=${c.code}`}
                      className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                    >
                      {c.name}
                    </Link>
                  ) : (
                    <span key={c.id} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-xs font-semibold text-white/70">
                      {c.name}
                    </span>
                  ),
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={watchHref}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/35 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-white transition-transform group-hover:scale-110" />
                Xem phim
              </Link>
              {trailerEmbed && (
                <a
                  href="#trailer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/80 border border-white/10 transition hover:bg-white/10 hover:text-white"
                >
                  <Film className="h-4 w-4" />
                  Trailer
                </a>
              )}
              <FavoriteButton
                movieId={movie.id}
                className="inline-flex items-center justify-center rounded-xl bg-white/5 px-5 py-3.5 text-white/70 border border-white/10 transition hover:bg-white/10 hover:text-white"
              />
            </div>

            {/* Overview */}
            {(movie.description || movie.shortDescription) && (
              <div className="rounded-xl bg-card/50 border border-white/[0.04] p-5">
                <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wider text-white/50">Nội dung</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">
                  {movie.description || movie.shortDescription}
                </p>
              </div>
            )}

            {/* Director & cast summary */}
            {(directors.length > 0 || cast.length > 0) && (
              <div className="grid gap-4 sm:grid-cols-2">
                {directors.length > 0 && (
                  <div className="rounded-xl bg-card/30 border border-white/[0.04] p-4">
                    <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Đạo diễn</h3>
                    <p className="text-sm font-semibold text-white">{directors.map((d) => d.person.name).join(' · ')}</p>
                  </div>
                )}
                {cast.length > 0 && (
                  <div className="rounded-xl bg-card/30 border border-white/[0.04] p-4">
                    <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Diễn viên chính</h3>
                    <p className="text-sm text-white/80">{cast.slice(0, 4).map((c) => c.person.name).join(' · ')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════ EPISODES ═══════ */}
      {isMultiEpisode && (
        <section className="mx-auto mt-14 max-w-7xl px-5 md:px-8 lg:px-10">
          <h2 className="mb-4 text-lg font-bold text-white">
            <ListVideo className="mr-2 inline h-5 w-5 text-primary" />
            Danh sách tập
            <span className="ml-2 text-sm font-medium text-muted-foreground">({episodes.length} tập)</span>
          </h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
            {episodes.map((ep) => {
              const epSlug = ep.slug || ep.episodeSlug
              return (
                <Link
                  key={ep.id}
                  href={epSlug ? `${watchHref}?ep=${epSlug}` : watchHref}
                  className="truncate rounded-lg border border-white/[0.06] bg-card/50 px-2 py-2.5 text-center text-xs font-semibold text-white/80 transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  title={ep.title || ep.episodeName || `Tập ${ep.episodeNumber}`}
                >
                  {ep.episodeName || `Tập ${ep.episodeNumber}`}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ═══════ TRAILER ═══════ */}
      {trailerEmbed && (
        <section id="trailer" className="mx-auto mt-14 max-w-7xl scroll-mt-20 px-5 md:px-8 lg:px-10">
          <h2 className="mb-4 text-lg font-bold text-white">
            <Film className="mr-2 inline h-5 w-5 text-primary" />
            Trailer
          </h2>
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-black shadow-2xl shadow-black/40">
            <iframe
              src={trailerEmbed}
              title={`Trailer ${movie.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* ═══════ SHORTS ═══════ */}
      {shorts.length > 0 && (
        <section className="mx-auto mt-14 max-w-7xl px-5 md:px-8 lg:px-10">
          <h2 className="mb-4 text-lg font-bold text-white">
            <Clapperboard className="mr-2 inline h-5 w-5 text-primary" />
            Shorts
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {shorts.map((s) => (
              <Link
                key={s.id}
                href={`/shorts?v=${s.id}`}
                className="group relative aspect-[9/16] w-36 flex-shrink-0 overflow-hidden rounded-xl border border-white/[0.06] bg-card md:w-44"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.thumbnailUrl || '/placeholder.jpg'} alt={s.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                <Play className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 fill-white/90 text-white/90 opacity-0 transition group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold text-white">{s.title}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/60"><Eye className="h-3 w-3" />{s.viewCount.toLocaleString('vi-VN')}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════ CAST GRID ═══════ */}
      {cast.length > 0 && (
        <section className="mx-auto mt-14 max-w-7xl px-5 md:px-8 lg:px-10">
          <h2 className="mb-5 text-lg font-bold text-white">Dàn diễn viên</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
            {cast.slice(0, 16).map(({ person, character }) => {
              const body = (
                <>
                  <div className="relative mx-auto mb-2.5 h-20 w-20 overflow-hidden rounded-full border-2 border-white/[0.06] bg-card transition-all group-hover:border-primary/30">
                    <Image
                      src={person.profileUrl || '/placeholder-user.jpg'}
                      alt={person.name}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                      unoptimized
                    />
                  </div>
                  <p className="line-clamp-1 text-xs font-semibold text-white/90 group-hover:text-primary transition-colors">{person.name}</p>
                  {character && <p className="line-clamp-1 text-[10px] text-muted-foreground">{character}</p>}
                </>
              )
              return person.tmdbId ? (
                <Link href={`/person/${person.tmdbId}`} key={person.id} className="block group text-center">{body}</Link>
              ) : (
                <div key={person.id} className="group text-center">{body}</div>
              )
            })}
          </div>
        </section>
      )}

      {/* ═══════ COMMENTS ═══════ */}
      <MovieComments movieId={movie.id} />

      {/* ═══════ RELATED ═══════ */}
      {relatedMovies.length > 0 && (
        <div className="mt-14">
          <MovieRow title="Phim tương tự" movies={relatedMovies} />
        </div>
      )}

      {/* ═══════ RELATED NEWS ═══════ */}
      <div className="mt-14 pb-14">
        <RelatedNews movieTitle={movie.title} originalTitle={movie.originalTitle || movie.title} year={movie.year || 0} limit={6} />
      </div>
    </main>
  )
}
