import { Calendar, Clock, MapPin, Film, Info } from 'lucide-react'
import { getSchedule } from '@/lib/data/schedule'
import Link from 'next/link'

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const params = await searchParams
  const { days, isDemo } = await getSchedule()
  const activeDay = parseInt(params.day || '0')
  const currentDay = days[activeDay]

  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
        Lịch chiếu
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Lịch chiếu phim rạp trong tuần
      </p>

      {isDemo && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-200/80">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Hệ thống chưa có lịch chiếu thật. Bạn đang xem dữ liệu minh hoạ.
            Lịch sẽ tự động cập nhật khi có phim được lên lịch phát hành.
          </p>
        </div>
      )}

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-6">
        {days.map((day, i) => (
          <Link
            key={day.date}
            href={`/schedule?day=${i}`}
            scroll={false}
            className={`flex-shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              i === activeDay
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white/5 text-white/60 border border-white/[0.06] hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="text-xs opacity-70">{day.isToday ? 'Hôm nay' : day.label.split(',')[0]}</div>
            <div className="font-semibold">{day.label.split(',')[1]?.trim()}</div>
          </Link>
        ))}
      </div>

      {/* Schedule slots */}
      {currentDay && currentDay.slots.length > 0 ? (
        <div className="space-y-3">
          {currentDay.slots.map((slot) => {
            const Row = slot.movieSlug ? Link : 'div'
            const rowProps = slot.movieSlug ? { href: `/movie/${slot.movieSlug}` } : {}
            return (
            <Row
              key={slot.id}
              {...(rowProps as any)}
              className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-card/40 p-4 transition hover:bg-card/60"
            >
              {/* Poster placeholder */}
              <div className="hidden sm:flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/[0.06]">
                <Film className="h-5 w-5 text-white/20" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{slot.movieTitle}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/50">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {slot.time}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {slot.cinema}
                  </span>
                </div>
              </div>

              {/* Format + Price */}
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary border border-primary/20">
                  {slot.format}
                </span>
                <span className="text-sm font-semibold text-white">
                  {slot.price}
                </span>
              </div>
            </Row>
            )
          })}
        </div>
      ) : (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <Calendar className="h-12 w-12 text-white/10 mb-4" />
          <p className="text-white/50 text-sm">Chưa có lịch chiếu cho ngày này</p>
        </div>
      )}
    </main>
  )
}
