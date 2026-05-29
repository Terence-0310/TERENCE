// Hits searchMovies() directly (bypassing the HTTP layer + Next cache) so we
// know whether the issue is in the service or in the dev server build.
import { searchMovies } from '@/src/be/modules/search/movie-search-service'

const QUERIES = [
  // Title
  'tu chien tren khong',
  'Tử Chiến Trên Không',
  'standoff in the sky',

  // Actor (Vietnamese-known actors)
  'trấn thành',
  'tran thanh',
  'thu trang',
  'nguyễn quang dũng',

  // Character (vai nhân vật)
  'trung úy minh',
  'đại tá hương',

  // Genre / country
  'hành động',
  'hàn quốc',

  // Description-only — must NOT beat title hits
  'bầu trời',
]

;(async () => {
  for (const q of QUERIES) {
    const t0 = Date.now()
    const r = await searchMovies(q, 1, 3)
    const ms = Date.now() - t0
    console.log(`═══ Q: "${q}"  ${ms}ms  src=${r.source}  total=${r.total} ═══`)
    r.items.forEach((it, i) => {
      console.log(`  ${i + 1}. ${(it.score ?? 0).toFixed(1).padStart(8)}  ${it.title}`)
    })
    console.log()
  }
})()
