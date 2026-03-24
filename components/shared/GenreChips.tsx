import Link from 'next/link'
import type { Genre } from '@/types/movie'

interface GenreChipsProps {
  genres: Genre[]
}

export function GenreChips({ genres }: GenreChipsProps) {
  if (genres.length === 0) return null

  return (
    <section className="px-5 py-4 md:px-8 lg:px-10">
      <h2 className="mb-4 text-lg font-bold tracking-tight text-white md:text-xl animate-slide-in-left">
        Thể loại phim
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {genres.map((genre, i) => (
          <Link
            key={genre.id}
            href={`/browse?genre=${genre.id}`}
            className="group rounded-xl bg-white/[0.03] px-4 py-3 border border-white/[0.06] transition-all hover:bg-primary/10 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 animate-chip-in"
            style={{ '--i': i } as React.CSSProperties}
          >
            <span className="text-sm font-medium text-white/70 transition-colors group-hover:text-white">
              {genre.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
