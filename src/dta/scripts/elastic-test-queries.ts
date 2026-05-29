#!/usr/bin/env npx tsx
// ============================================
// Elasticsearch Search — Regression Test
// ============================================
// Runs a fixed set of realistic queries against the live ES index and
// prints the top-N titles + scores. Use it after a mapping or ranking
// change to confirm the new ranking doesn't silently regress.
//
// Usage:
//   npm run search:test                          # default suite
//   npx tsx src/dta/scripts/elastic-test-queries.ts --q="harry poter" --n=10
//
// Exits 0 on success (every query returned at least one hit), 1 if any
// query came back empty (likely a mapping or sanitiser regression).

import { searchMovies, suggestMovies } from '../../be/modules/search/movie-search-service'
import { isAvailable, closeClient, getMoviesIndex } from '../../be/modules/search/elastic-client'
import { disconnect } from '../../be/modules/search/movie-search-indexer'

// Suite reflects the spec's must-pass cases — popular Western/Eastern
// titles, a Vietnamese-no-diacritics query, a typo, an actor-style query,
// and a genre-style query. Override with --q for one-off checks.
const SUITE = [
  'naruto',
  'one piece',
  'spider',
  'spider-man',
  'nguoi nhen',     // diacritics-stripped — must surface Người Nhện/Spider-Man
  'harry poter',    // typo — must surface Harry Potter via fuzzy
  'tom holland',    // actor-style query — title hits must still win if any
  'kinh dị',        // genre — should surface horror films, not "Kinh"
]

function args() {
  const a = process.argv.slice(2)
  const get = (n: string) => a.find((x) => x.startsWith(`--${n}=`))?.split('=')[1]
  return { q: get('q'), n: parseInt(get('n') || '5', 10) }
}

async function runOne(q: string, n: number) {
  const [primary, suggest] = await Promise.all([
    searchMovies(q, 1, n),
    suggestMovies(q, n),
  ])

  console.log(`\n  ▶ Query: "${q}"  (source=${primary.source}, total=${primary.total})`)
  console.log(`    ── Primary hits ─────────────────────────────`)
  if (primary.items.length === 0) {
    console.log('      (no results)')
  } else {
    primary.items.forEach((m, i) => {
      const ot = m.originalTitle && m.originalTitle !== m.title ? ` / ${m.originalTitle}` : ''
      console.log(`      ${i + 1}. [${m.score.toFixed(1).padStart(8)}]  ${m.title}${ot}  (${m.year ?? '—'})`)
    })
  }
  console.log(`    ── Suggest (autocomplete) ───────────────────`)
  if (suggest.items.length === 0) {
    console.log('      (no suggestions)')
  } else {
    suggest.items.forEach((m, i) => {
      const ot = m.originalTitle && m.originalTitle !== m.title ? ` / ${m.originalTitle}` : ''
      console.log(`      ${i + 1}. ${m.title}${ot}  (${m.year ?? '—'})`)
    })
  }
  return primary.items.length > 0
}

async function main() {
  const { q, n } = args()

  console.log('╔══════════════════════════════════════════╗')
  console.log('║  TERENCE — ES Search Regression Test     ║')
  console.log('╚══════════════════════════════════════════╝')

  const ok = await isAvailable()
  console.log(`  ES: ${ok ? '✓ online' : '✗ unavailable (fallback to Prisma)'}`)
  console.log(`  Index: ${getMoviesIndex()}`)
  console.log(`  Per-query top: ${n}`)

  const queries = q ? [q] : SUITE
  let pass = 0
  let fail = 0
  for (const query of queries) {
    try {
      const hadResults = await runOne(query, n)
      if (hadResults) pass++
      else fail++
    } catch (e) {
      fail++
      console.error(`  ✗ "${query}" threw:`, e instanceof Error ? e.message : e)
    }
  }

  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log(`  Pass: ${pass}    Empty: ${fail}    Total: ${queries.length}`)
  console.log('═══════════════════════════════════════════')

  await closeClient()
  await disconnect()
  process.exit(fail === 0 ? 0 : 1)
}

main()
