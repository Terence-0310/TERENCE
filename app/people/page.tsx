import Image from 'next/image'
import Link from 'next/link'
import { User } from 'lucide-react'
import { tmdbFetch } from '@/lib/tmdb/client'
import { tmdbProfileUrl } from '@/lib/tmdb/config'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Diễn viên nổi tiếng — Terence',
  description: 'Khám phá các diễn viên, đạo diễn nổi tiếng.',
}

interface TmdbPerson {
  id: number
  name: string
  profile_path: string | null
  known_for_department: string
  known_for: Array<{ id: number; title?: string; name?: string; media_type: string }>
  popularity: number
}

async function getPopularPeople(page = 1) {
  try {
    const data = await tmdbFetch<{
      page: number
      results: TmdbPerson[]
      total_pages: number
      total_results: number
    }>('/person/popular', {
      params: { page },
      revalidate: 3600,
    })
    return data
  } catch {
    return { page: 1, results: [], total_pages: 0, total_results: 0 }
  }
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const data = await getPopularPeople(page)

  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Diễn viên nổi tiếng</h1>
          <p className="text-muted-foreground text-sm">Khám phá các nghệ sĩ được yêu thích</p>
        </div>

        {data.results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {data.results.map((person) => (
              <div
                key={person.id}
                className="group rounded-xl border border-white/[0.06] bg-card/40 overflow-hidden transition hover:bg-card/60 hover:border-primary/20"
              >
                {/* Avatar */}
                <div className="relative aspect-[2/3] bg-white/5">
                  {person.profile_path ? (
                    <Image
                      src={tmdbProfileUrl(person.profile_path)}
                      alt={person.name}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <User className="h-12 w-12 text-white/10" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-white truncate">{person.name}</h3>
                  <p className="text-xs text-white/40 mt-0.5">{person.known_for_department}</p>
                  {person.known_for.length > 0 && (
                    <p className="text-[11px] text-white/30 mt-1 truncate">
                      {person.known_for
                        .map(k => k.title || k.name)
                        .filter(Boolean)
                        .slice(0, 2)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <User className="h-12 w-12 text-white/10 mb-4" />
            <p className="text-white/50 text-sm">Không tìm thấy dữ liệu</p>
          </div>
        )}

        {/* Pagination */}
        {data.total_pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            {page > 1 && (
              <Link
                href={`/people?page=${page - 1}`}
                className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-white/70 border border-white/[0.06] transition hover:bg-white/10"
              >
                Trang trước
              </Link>
            )}
            <span className="text-sm text-white/40">
              Trang {page} / {Math.min(data.total_pages, 500)}
            </span>
            {page < data.total_pages && page < 500 && (
              <Link
                href={`/people?page=${page + 1}`}
                className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-white/70 border border-white/[0.06] transition hover:bg-white/10"
              >
                Trang sau
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
