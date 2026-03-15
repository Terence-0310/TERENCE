// ============================================
// Schedule Data Layer — cinema schedule for demo
// ============================================

export interface ScheduleSlot {
  id: string
  movieTitle: string
  posterUrl: string
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

/** Generate demo schedule for the next 7 days */
export function getSchedule(): ScheduleDay[] {
  const movies = [
    { title: 'Tử Chiến Trên Không', poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&q=80' },
    { title: 'Hoa Máu', poster: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=300&q=80' },
    { title: 'Danh Dự Cuối Cùng', poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300&q=80' },
    { title: 'Chòm Sao Thiên Hậu', poster: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=300&q=80' },
    { title: 'Bước Vào Tim Em', poster: 'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=300&q=80' },
  ]
  const cinemas = ['CGV Vincom', 'Lotte Cinema', 'Galaxy Cinema', 'BHD Star']
  const times = ['09:00', '11:30', '14:00', '16:30', '19:00', '21:30']
  const formats = ['2D', '3D', 'IMAX']
  const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

  const days: ScheduleDay[] = []
  const today = new Date()

  for (let d = 0; d < 7; d++) {
    const date = new Date(today)
    date.setDate(today.getDate() + d)

    const dateStr = date.toISOString().split('T')[0]
    const dayName = dayNames[date.getDay()]
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')

    const slots: ScheduleSlot[] = []
    // Generate 4-6 random slots per day
    const slotCount = 4 + (d % 3)
    for (let s = 0; s < slotCount; s++) {
      const movie = movies[(d + s) % movies.length]
      slots.push({
        id: `${dateStr}-${s}`,
        movieTitle: movie.title,
        posterUrl: movie.poster,
        time: times[(s + d) % times.length],
        cinema: cinemas[(s + d) % cinemas.length],
        format: formats[s % formats.length],
        price: `${75 + s * 10}.000₫`,
      })
    }

    // Sort by time
    slots.sort((a, b) => a.time.localeCompare(b.time))

    days.push({
      date: dateStr,
      label: `${dayName}, ${dd}/${mm}`,
      isToday: d === 0,
      slots,
    })
  }

  return days
}
