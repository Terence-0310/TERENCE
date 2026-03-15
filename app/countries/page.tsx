import Link from 'next/link'
import { Globe } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Phim theo quốc gia — Terence',
  description: 'Khám phá phim theo quốc gia sản xuất.',
}

// Country list with ISO 3166-1 codes that TMDB supports
const COUNTRIES = [
  { code: 'US', name: 'Mỹ', flag: '🇺🇸' },
  { code: 'KR', name: 'Hàn Quốc', flag: '🇰🇷' },
  { code: 'JP', name: 'Nhật Bản', flag: '🇯🇵' },
  { code: 'CN', name: 'Trung Quốc', flag: '🇨🇳' },
  { code: 'TH', name: 'Thái Lan', flag: '🇹🇭' },
  { code: 'IN', name: 'Ấn Độ', flag: '🇮🇳' },
  { code: 'GB', name: 'Anh', flag: '🇬🇧' },
  { code: 'FR', name: 'Pháp', flag: '🇫🇷' },
  { code: 'DE', name: 'Đức', flag: '🇩🇪' },
  { code: 'IT', name: 'Ý', flag: '🇮🇹' },
  { code: 'ES', name: 'Tây Ban Nha', flag: '🇪🇸' },
  { code: 'VN', name: 'Việt Nam', flag: '🇻🇳' },
  { code: 'HK', name: 'Hồng Kông', flag: '🇭🇰' },
  { code: 'TW', name: 'Đài Loan', flag: '🇹🇼' },
  { code: 'RU', name: 'Nga', flag: '🇷🇺' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AU', name: 'Úc', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'SE', name: 'Thụy Điển', flag: '🇸🇪' },
]

export default function CountriesPage() {
  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-2">Phim theo quốc gia</h1>
          <p className="text-muted-foreground text-sm">Chọn quốc gia để xem phim sản xuất tại đó</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {COUNTRIES.map((country) => (
            <Link
              key={country.code}
              href={`/browse?country=${country.code}`}
              className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-card/40 px-4 py-3.5 transition hover:bg-card/60 hover:border-primary/20"
            >
              <span className="text-2xl flex-shrink-0">{country.flag}</span>
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
