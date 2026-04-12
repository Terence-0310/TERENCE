import Image from 'next/image'
import Link from 'next/link'
import { User, Calendar, MapPin, Film } from 'lucide-react'
import { tmdbFetch } from '@/src/be/modules/tmdb/legacy/client'
import { tmdbProfileUrl, tmdbPosterUrl, tmdbBackdropUrl } from '@/src/be/modules/tmdb/legacy/config'
import { MovieCard } from '@/src/fe/components/shared/MovieCard'
import type { Metadata } from 'next'

interface TmdbPersonDetail {
  id: number
  name: string
  biography: string
  birthday: string | null
  deathday: string | null
  place_of_birth: string | null
  profile_path: string | null
  known_for_department: string
}

interface TmdbCombinedCredits {
  cast: Array<{
    id: number
    title?: string
    name?: string
    original_title?: string
    original_name?: string
    media_type: 'movie' | 'tv'
    poster_path: string | null
    backdrop_path: string | null
    release_date?: string
    first_air_date?: string
    vote_average: number
    character: string
  }>
}

async function getPersonDetail(id: string) {
  try {
    return await tmdbFetch<TmdbPersonDetail>(`/person/${id}`, { revalidate: 86400 })
  } catch (err) {
    return null
  }
}

async function getPersonCredits(id: string) {
  try {
    return await tmdbFetch<TmdbCombinedCredits>(`/person/${id}/combined_credits`, { revalidate: 86400 })
  } catch (err) {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = await params
  const person = await getPersonDetail(p.id)
  if (!person) return { title: 'Không tìm thấy diễn viên — Terence' }
  return {
    title: `${person.name} — Terence`,
    description: person.biography?.slice(0, 160) || `Tiểu sử và danh sách phim của ${person.name}.`,
  }
}

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params
  const [person, credits] = await Promise.all([
    getPersonDetail(p.id),
    getPersonCredits(p.id),
  ])

  if (!person) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center px-4">
        <User className="h-16 w-16 text-white/10 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Không tìm thấy thông tin</h1>
        <p className="text-white/50 text-sm">Nghệ sĩ này không tồn tại hoặc đã bị xóa khỏi TMDB.</p>
        <Link href="/people" className="mt-6 rounded-lg bg-primary/10 px-6 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition">
          Quay lại danh sách
        </Link>
      </div>
    )
  }

  // Sort credits by popularity or date (we'll sort by date descending)
  const sortedCast = credits?.cast
    .filter(c => c.poster_path) // only show items with posters
    .sort((a, b) => {
      const aDate = new Date(a.release_date || a.first_air_date || '1900-01-01').getTime()
      const bDate = new Date(b.release_date || b.first_air_date || '1900-01-01').getTime()
      return bDate - aDate
    }) || []

  // Adapt to MovieCard type
  const adaptedCast = sortedCast.map(c => ({
    id: c.id.toString(), // We use TMDB ID as string. The app might need to redirect correctly if we use internal slug, but MovieCard expects TMDB ID for TMDB search results
    title: c.title || c.name || '',
    originalTitle: c.original_title || c.original_name || '',
    posterUrl: c.poster_path, // MovieCard handles tmdb image natively or we need to pass absolute? Wait, tmdbFetch doesn't append prefix! MovieCard requires tmdb prefixed URL?
    // Let's resolve the tmdb image proxy!
    backdropUrl: c.backdrop_path,
    year: parseInt((c.release_date || c.first_air_date || '0').split('-')[0]) || 0,
    voteAverage: c.vote_average,
    mediaType: c.media_type,
  }))

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Hero section */}
      <div className="relative border-b border-white/[0.04] bg-[#0A0D15]/80 pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50"></div>
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px] pointer-events-none"></div>

        <div className="relative mx-auto max-w-7xl px-5 md:px-8 flex flex-col md:flex-row gap-8 items-start">
          {/* Avatar */}
          <div className="shrink-0 animate-slide-in-up">
            <div className="h-48 w-32 md:h-80 md:w-56 rounded-2xl border border-white/10 bg-white/5 overflow-hidden relative shadow-2xl">
              {person.profile_path ? (
                <Image
                  src={tmdbProfileUrl(person.profile_path)}
                  alt={person.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 30vw, 20vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <User className="h-16 w-16 text-white/10" />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 animate-slide-in-up" style={{ animationDelay: '100ms' }}>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">{person.name}</h1>
            <p className="text-primary font-medium mt-2 text-sm uppercase tracking-widest">{person.known_for_department}</p>
            
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-white/60">
              {person.birthday && (
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  <Calendar className="w-4 h-4 text-white/40" />
                  <span>Sinh: <span className="text-white/90">{person.birthday}</span></span>
                </div>
              )}
              {person.deathday && (
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  <Calendar className="w-4 h-4 text-white/40" />
                  <span>Mất: <span className="text-white/90">{person.deathday}</span></span>
                </div>
              )}
              {person.place_of_birth && (
                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                  <MapPin className="w-4 h-4 text-white/40" />
                  <span>{person.place_of_birth}</span>
                </div>
              )}
            </div>

            {person.biography && (
              <div className="mt-8">
                <h3 className="text-lg font-bold text-white mb-2">Tiểu sử</h3>
                <div className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap max-h-[250px] overflow-y-auto pr-4 thin-scrollbar">
                  {person.biography || 'Đang cập nhật tiểu sử...'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Movies / TV Shows */}
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="mb-8 flex items-center gap-3">
          <Film className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-white">Phim tham gia</h2>
          <span className="ml-2 rounded-lg bg-white/5 px-3 py-1 text-xs font-medium text-white/50 border border-white/5">
            {adaptedCast.length} tác phẩm
          </span>
        </div>

        {adaptedCast.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {adaptedCast.map((m: any, i: number) => {
              // Format standard TMDB data to what MovieCard expects (absolute URL or /api)
              const movieForCard = {
                ...m,
                posterUrl: m.posterUrl ? tmdbPosterUrl(m.posterUrl) : null,
                backdropUrl: m.backdropUrl ? tmdbBackdropUrl(m.backdropUrl) : null,
              }

              return (
                <div key={`${m.id}-${i}`} className="animate-card-reveal group relative" style={{ '--i': i } as React.CSSProperties}>
                  <MovieCard movie={movieForCard} />
                  {sortedCast[i].character && (
                    <div className="mt-1 px-1">
                      <p className="text-[11px] text-primary/80 truncate">Vai: {sortedCast[i].character}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex min-h-[30vh] flex-col items-center justify-center text-center border dashed border-white/10 rounded-2xl">
            <Film className="h-10 w-10 text-white/10 mb-3" />
            <p className="text-white/40 text-sm">Chưa có dữ liệu phim tham gia.</p>
          </div>
        )}
      </div>
    </main>
  )
}
