'use client'

import { useState } from 'react'
import { Calendar, Clock, MapPin, Film } from 'lucide-react'
import { getSchedule, type ScheduleDay } from '@/lib/data/schedule'

export default function SchedulePage() {
  const days = getSchedule()
  const [activeDay, setActiveDay] = useState(0)
  const currentDay = days[activeDay]

  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-2">
        Lịch chiếu
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Lịch chiếu phim rạp trong tuần
      </p>

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-6">
        {days.map((day, i) => (
          <button
            key={day.date}
            onClick={() => setActiveDay(i)}
            className={`flex-shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              i === activeDay
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white/5 text-white/60 border border-white/[0.06] hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="text-xs opacity-70">{day.isToday ? 'Hôm nay' : day.label.split(',')[0]}</div>
            <div className="font-semibold">{day.label.split(',')[1]?.trim()}</div>
          </button>
        ))}
      </div>

      {/* Schedule slots */}
      {currentDay && currentDay.slots.length > 0 ? (
        <div className="space-y-3">
          {currentDay.slots.map((slot) => (
            <div
              key={slot.id}
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
            </div>
          ))}
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
