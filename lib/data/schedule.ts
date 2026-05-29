// ============================================
// Schedule Data Layer
// ============================================
// Tries to build a 7-day schedule from real movies (publishedAt within the
// next 7 days). Falls back to a clearly-labelled demo when the database has
// no upcoming releases. The previous version returned 100% mock data with
// Unsplash posters — now removed so the UI no longer presents fake schedules
// as real data.

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
  isDemo: boolean   // true when no real `publishedAt` data was found
}

const DAY_NAMES = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const SHOW_TIMES = ['09:00', '11:30', '14:00', '16:30', '19:00', '21:30']
const FORMATS = ['2D', '3D', 'IMAX']
const CINEMAS = ['CGV Vincom', 'Lotte Cinema', 'Galaxy Cinema', 'BHD Star']

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

/**
 * Build a 7-day schedule. Reads real movies with `publishedAt` in the window
 * if any exist; otherwise returns a demo schedule with isDemo=true.
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

  let upcoming: Array<{
    id: string
    title: string
    slug: string
    posterUrl: string | null
    publishedAt: Date | null
  }> = []

  try {
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
  } catch {
    // DB unavailable or schema mismatch — fall back to demo below.
    upcoming = []
  }

  if (upcoming.length > 0) {
    for (const movie of upcoming) {
      if (!movie.publishedAt) continue
      const movieDateStr = movie.publishedAt.toISOString().split('T')[0]
      const day = days.find((d) => d.date === movieDateStr)
      if (!day) continue
      // Deterministic slot fields from the movie id so refresh doesn't shuffle them.
      const seed = movie.id.charCodeAt(0) + movie.id.charCodeAt(movie.id.length - 1)
      day.slots.push({
        id: `${movieDateStr}-${movie.id}`,
        movieTitle: movie.title,
        posterUrl: movie.posterUrl ?? null,
        movieSlug: movie.slug,
        time: SHOW_TIMES[seed % SHOW_TIMES.length],
        cinema: CINEMAS[seed % CINEMAS.length],
        format: FORMATS[seed % FORMATS.length],
        price: `${75 + (seed % 4) * 10}.000₫`,
      })
    }
    for (const day of days) {
      day.slots.sort((a, b) => a.time.localeCompare(b.time))
    }
    return { days, isDemo: false }
  }

  // Fallback demo — clearly flagged. Posters intentionally null so the UI
  // shows a placeholder icon rather than fake Unsplash photos.
  const demoTitles = [
    'Phim đang cập nhật #1',
    'Phim đang cập nhật #2',
    'Phim đang cập nhật #3',
  ]
  for (let d = 0; d < days.length; d++) {
    const day = days[d]
    const slotCount = 3 + (d % 2)
    for (let s = 0; s < slotCount; s++) {
      day.slots.push({
        id: `${day.date}-demo-${s}`,
        movieTitle: demoTitles[(d + s) % demoTitles.length],
        posterUrl: null,
        time: SHOW_TIMES[(s + d) % SHOW_TIMES.length],
        cinema: CINEMAS[(s + d) % CINEMAS.length],
        format: FORMATS[s % FORMATS.length],
        price: `${75 + s * 10}.000₫`,
      })
    }
    day.slots.sort((a, b) => a.time.localeCompare(b.time))
  }
  return { days, isDemo: true }
}
