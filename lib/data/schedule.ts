// ============================================
// Schedule Data Layer
// ============================================
// Builds a 7-day "premiering this week" schedule from REAL movies in the DB.
// Movies with a `publishedAt` inside the next 7 days land on their real day;
// the remaining slots are filled deterministically from the most recently
// published catalogue so every day shows real, clickable titles. The only
// time `isDemo` is true is when the database has no movies at all.
//
// Showtime / cinema / format / price are presentational flavour generated
// deterministically from the movie id (this is a streaming platform, not a
// real box office) — they never shuffle between refreshes.

import { prisma } from '@/src/be/shared/db/prisma'

export interface ScheduleSlot {
  id: string
  movieTitle: string
  posterUrl: string | null
  movieSlug?: string
  time: string        // "14:30"
  cinema: string
  format: string      // "2D" | "3D" | "IMAX"
  price: string
}

export interface ScheduleDay {
  date: string        // "2026-03-15"
  label: string       // "Thứ 7, 15/03"
  isToday: boolean
  slots: ScheduleSlot[]
}

export interface ScheduleResponse {
  days: ScheduleDay[]
  isDemo: boolean   // true ONLY when the DB has no movies at all
}

const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const SHOW_TIMES = ['09:00', '11:30', '14:00', '16:30', '19:00', '21:30']
const FORMATS = ['2D', '3D', 'IMAX']
const CINEMAS = ['CGV Vincom', 'Lotte Cinema', 'Galaxy Cinema', 'BHD Star']

const SLOTS_PER_DAY = 4

interface MovieLite {
  id: string
  title: string
  slug: string
  posterUrl: string | null
  publishedAt: Date | null
}

function buildDayShell(date: Date): ScheduleDay {
  const dateStr = date.toISOString().split('T')[0]
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return {
    date: dateStr,
    label: `${DAY_NAMES[date.getDay()]}, ${dd}/${mm}`,
    isToday: false,
    slots: [],
  }
}

/** Deterministic seed from a movie id so slot fields never reshuffle. */
function seedOf(id: string): number {
  return id.charCodeAt(0) + id.charCodeAt(id.length - 1) + id.length
}

function toSlot(movie: MovieLite, dateStr: string, offset: number): ScheduleSlot {
  const seed = seedOf(movie.id) + offset
  return {
    id: `${dateStr}-${movie.id}`,
    movieTitle: movie.title,
    posterUrl: movie.posterUrl ?? null,
    movieSlug: movie.slug,
    time: SHOW_TIMES[seed % SHOW_TIMES.length],
    cinema: CINEMAS[seed % CINEMAS.length],
    format: FORMATS[seed % FORMATS.length],
    price: `${75 + (seed % 4) * 10}.000₫`,
  }
}

/**
 * Build a 7-day schedule from real published movies. Always returns real data
 * when the catalogue is non-empty; `isDemo` is true only when the DB has none.
 */
export async function getSchedule(): Promise<ScheduleResponse> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const horizon = new Date(today)
  horizon.setDate(today.getDate() + 7)

  const days: ScheduleDay[] = []
  for (let d = 0; d < 7; d++) {
    const date = new Date(today)
    date.setDate(today.getDate() + d)
    const day = buildDayShell(date)
    if (d === 0) day.isToday = true
    days.push(day)
  }

  let upcoming: MovieLite[] = []
  let recent: MovieLite[] = []

  try {
    // Real releases scheduled inside the 7-day window → placed on their day.
    upcoming = await prisma.movie.findMany({
      where: {
        deletedAt: null,
        status: 'published',
        publishedAt: { gte: today, lt: horizon },
      },
      select: { id: true, title: true, slug: true, posterUrl: true, publishedAt: true },
      orderBy: { publishedAt: 'asc' },
      take: 50,
    })

    // Recently published catalogue used to fill the remaining slots so every
    // day has real, clickable titles (most platforms have no true box office).
    recent = await prisma.movie.findMany({
      where: { deletedAt: null, status: 'published' },
      select: { id: true, title: true, slug: true, posterUrl: true, publishedAt: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 7 * SLOTS_PER_DAY + upcoming.length,
    })
  } catch {
    // DB unavailable / schema mismatch — fall through to the empty demo below.
    upcoming = []
    recent = []
  }

  // No catalogue at all → clearly-flagged demo (posters null → placeholder).
  if (upcoming.length === 0 && recent.length === 0) {
    for (let d = 0; d < days.length; d++) {
      const day = days[d]
      for (let s = 0; s < 3 + (d % 2); s++) {
        day.slots.push({
          id: `${day.date}-demo-${s}`,
          movieTitle: `Phim đang cập nhật #${(d + s) % 3 + 1}`,
          posterUrl: null,
          time: SHOW_TIMES[(s + d) % SHOW_TIMES.length],
          cinema: CINEMAS[(s + d) % CINEMAS.length],
          format: FORMATS[s % FORMATS.length],
          price: `${75 + s * 10}.000₫`,
        })
      }
    }
    return { days, isDemo: true }
  }

  const used = new Set<string>()

  // 1. Place real upcoming releases on their actual day.
  for (const movie of upcoming) {
    if (!movie.publishedAt) continue
    const movieDateStr = movie.publishedAt.toISOString().split('T')[0]
    const day = days.find((d) => d.date === movieDateStr)
    if (!day || used.has(movie.id)) continue
    day.slots.push(toSlot(movie, movieDateStr, 0))
    used.add(movie.id)
  }

  // 2. Fill every day up to SLOTS_PER_DAY from the recent catalogue (no repeats).
  const pool = recent.filter((m) => !used.has(m.id))
  let pi = 0
  for (let d = 0; d < days.length; d++) {
    const day = days[d]
    let offset = 1
    while (day.slots.length < SLOTS_PER_DAY && pi < pool.length) {
      const movie = pool[pi++]
      if (used.has(movie.id)) continue
      day.slots.push(toSlot(movie, day.date, offset++))
      used.add(movie.id)
    }
    day.slots.sort((a, b) => a.time.localeCompare(b.time))
  }

  return { days, isDemo: false }
}
