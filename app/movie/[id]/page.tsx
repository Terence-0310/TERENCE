import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Star, Clock, Calendar, Play, ArrowLeft, ExternalLink, Film } from 'lucide-react'
import { getMovieDetail } from '@/src/be/services/tmdb/movie-service'
import { MovieRow } from '@/src/fe/components/shared/MovieRow'
import { MovieComments } from '@/src/fe/components/shared/MovieComments'
import { RelatedNews } from '@/src/fe/components/news/RelatedNews'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  try {
    const movie = await getMovieDetail(Number(id))
    return {
      title: `${movie.title} (${movie.year}) — Terence`,
      description: movie.overview?.slice(0, 155) || `Xem ${movie.title} trên Terence`,
      openGraph: {
        title: `${movie.title} — Terence`,
        description: movie.overview || '',
        images: movie.backdropUrl ? [{ url: movie.backdropUrl, width: 1280, height: 720 }] : [],
      },
    }
  } catch {
    return { title: 'Phim — Terence' }
  }
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params
  
  if (isNaN(Number(id))) {
    // If ID is not numeric, it's an internal DB slug from OPhim. 
    // Redirect directly to the Watch player which supports DB playback natively.
    const { redirect } = await import('next/navigation')
    redirect(`/watch/${id}`)
  }

  const movieId = Number(id)
  
  let movie
  try {
    movie = await getMovieDetail(movieId)
  } catch {
    notFound()
  }

  const director = movie.crew?.find((c: any) => c.job === 'Director')

  return (
    <main className="min-h-screen bg-background">
      {/* ═══════ HERO BACKDROP ═══════ */}
      <section className="relative h-[55vh] min-h-[420px] overflow-hidden md:h-[65vh]">
        {movie.backdropUrl && movie.backdropUrl !== '/placeholder.jpg' ? (
          <Image
            src={movie.backdropUrl}
            alt={movie.title}
            fill
            className="object-cover object-top"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-background" />
        )}

        {/* Cinematic overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        <div className="absolute bottom-0 h-40 w-full bg-gradient-to-t from-background to-transparent" />

        {/* Back */}
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
                src={movie.posterUrl || '/placeholder.jpg'}
                alt={movie.title}
                width={288}
                height={432}
                className="h-auto w-full object-cover"
                priority
              />
            </div>

            {/* Quick score */}
            {movie.voteAverage > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-card border border-white/5 px-4 py-3">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="text-2xl font-black text-white">{movie.voteAverage}</span>
                <span className="text-xs text-muted-foreground">/ 10</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {movie.voteCount.toLocaleString()} votes
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-6">
            {/* Tagline */}
            {movie.tagline && (
              <p className="text-sm font-medium italic text-primary/80">"{movie.tagline}"</p>
            )}

            {/* Title */}
            <div>
              <h1 className="text-3xl font-black leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
                {movie.title}
              </h1>
              {movie.originalTitle !== movie.title && (
                <p className="mt-1.5 text-sm text-muted-foreground">{movie.originalTitle}</p>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2.5">
              {movie.year > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 border border-white/5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {movie.year}
                </span>
              )}
              {movie.runtimeFormatted && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-medium text-white/80 border border-white/5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {movie.runtimeFormatted}
                </span>
              )}
              {movie.status && (
                <span className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-muted-foreground border border-white/5">
                  {movie.status}
                </span>
              )}
            </div>

            {/* Genres */}
            {movie.genres?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((g: any) => (
                  <Link
                    key={g.id}
                    href={`/browse?genre=${g.id}`}
                    className="rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/15"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/watch/${movie.id}`}
                className="group inline-flex items-center gap-2.5 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/35 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-white transition-transform group-hover:scale-110" />
                Xem phim
              </Link>
              {movie.trailer && (
                <a
                  href={movie.trailer.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/80 border border-white/10 transition hover:bg-white/10 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Trailer
                </a>
              )}
            </div>

            {/* Overview */}
            {movie.overview && (
              <div className="rounded-xl bg-card/50 border border-white/[0.04] p-5">
                <h2 className="mb-2.5 text-sm font-bold uppercase tracking-wider text-white/50">Nội dung</h2>
                <p className="text-sm leading-relaxed text-white/70">{movie.overview}</p>
              </div>
            )}

            {/* Director & Cast summary */}
            <div className="grid gap-4 sm:grid-cols-2">
              {director && (
                <div className="rounded-xl bg-card/30 border border-white/[0.04] p-4">
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Đạo diễn</h3>
                  <p className="text-sm font-semibold text-white">
                    <Link href={`/person/${director.id}`} className="hover:text-primary transition-colors">{director.name}</Link>
                  </p>
                </div>
              )}
              {movie.cast?.length > 0 && (
                <div className="rounded-xl bg-card/30 border border-white/[0.04] p-4">
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Diễn viên chính</h3>
                  <p className="text-sm text-white/80">
                    {movie.cast.slice(0, 4).map((c: any, idx: number) => (
                      <span key={c.id}>
                        <Link href={`/person/${c.id}`} className="hover:text-primary transition-colors">{c.name}</Link>
                        {idx < Math.min(movie.cast.length, 4) - 1 ? ' · ' : ''}
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ TRAILER ═══════ */}
      {movie.trailer && (
        <section className="mx-auto mt-14 max-w-7xl px-5 md:px-8 lg:px-10">
          <h2 className="mb-4 text-lg font-bold text-white">
            <Film className="mr-2 inline h-5 w-5 text-primary" />
            Trailer chính thức
          </h2>
          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-black shadow-2xl shadow-black/40">
            <iframe
              src={movie.trailer.embedUrl}
              title={movie.trailer.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* ═══════ CAST GRID ═══════ */}
      {movie.cast?.length > 0 && (
        <section className="mx-auto mt-14 max-w-7xl px-5 md:px-8 lg:px-10">
          <h2 className="mb-5 text-lg font-bold text-white">Dàn diễn viên</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
            {movie.cast.slice(0, 16).map((person: any) => (
              <Link href={`/person/${person.id}`} key={person.id} className="block group text-center">
                <div className="relative mx-auto mb-2.5 h-20 w-20 overflow-hidden rounded-full border-2 border-white/[0.06] bg-card transition-all group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/10">
                  <Image
                    src={person.profileUrl || '/placeholder-user.jpg'}
                    alt={person.name}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <p className="line-clamp-1 text-xs font-semibold text-white/90 group-hover:text-primary transition-colors">{person.name}</p>
                <p className="line-clamp-1 text-[10px] text-muted-foreground">{person.character}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══════ COMMENTS ═══════ */}
      <MovieComments movieId={movie.id} />

      {/* ═══════ RELATED ═══════ */}
      {movie.relatedMovies?.length > 0 && (
        <div className="mt-14">
          <MovieRow title="Phim tương tự" movies={movie.relatedMovies} />
        </div>
      )}

      {/* ═══════ RELATED NEWS ═══════ */}
      <div className="mt-14 pb-14">
        <RelatedNews
          movieTitle={movie.title}
          originalTitle={movie.originalTitle}
          year={movie.year}
          limit={6}
        />
      </div>
    </main>
  )
}
