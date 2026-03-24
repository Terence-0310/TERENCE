import Link from 'next/link'
import type { Metadata } from 'next'
import { COUNTRIES } from '@/lib/data/countries'

export const metadata: Metadata = {
  title: 'Phim theo quốc gia — Terence',
  description: 'Khám phá phim theo quốc gia sản xuất.',
}

export default function CountriesPage() {
  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 animate-slide-in-left">
          <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Phim theo quốc gia</h1>
          <p className="text-muted-foreground text-sm">Chọn quốc gia để xem phim sản xuất tại đó</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {COUNTRIES.map((country, i) => (
            <Link
              key={country.code}
              href={`/browse?country=${country.code}`}
              className="group rounded-xl border border-white/[0.06] bg-card/40 px-4 py-3.5 transition hover:bg-card/60 hover:border-primary/20 animate-chip-in"
              style={{ '--i': i } as React.CSSProperties}
            >
              <span className="text-sm font-medium text-white/80 group-hover:text-white truncate">
                {country.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
