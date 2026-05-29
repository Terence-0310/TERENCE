#!/usr/bin/env node
// Test harness for /api/v1/search. The DB is Vietnamese-centric, so the
// query list focuses on titles + actors that actually exist (Trấn Thành,
// Tử Chiến Trên Không, Hàn Quốc, ...) plus a handful of edge-cases.

const BASE = process.env.BASE || 'http://localhost:3000'

const QUERIES = [
  // Exact + ascii variants of a known title
  'tu chien tren khong',
  'Tử Chiến Trên Không',
  'tử chiến',

  // Original title (English) of the same movie
  'standoff in the sky',

  // Actor / director — expect movies featuring that person at top
  // (tier 3.5 phrase boost 30 beats fuzzy title boost 20)
  'trấn thành',
  'tran thanh',
  'thu trang',
  'nguyễn quang dũng',

  // Character names (vai nhân vật)
  'trung úy minh',
  'đại tá hương',

  // Genre + country
  'hành động',
  'hanh dong',
  'hàn quốc',
  'han quoc',

  // Typo (fuzzy)
  'tử chiển',          // typo of "tử chiến"
  'tran than',         // typo of "tran thanh"

  // Description hit (should NOT outrank title hits)
  'bầu trời',

  // Real Vietnamese title prefix (autocomplete-style)
  'luật sư',
]

function trim(s, n = 60) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

async function run(q) {
  const url = `${BASE}/api/v1/search?q=${encodeURIComponent(q)}&limit=3`
  const t0 = Date.now()
  const res = await fetch(url)
  const ms = Date.now() - t0
  const body = await res.json()
  if (res.status === 429) {
    console.log(`═══ Q: "${q}"  →  429 RATE LIMITED — sleeping 60s and retrying ═══\n`)
    await new Promise((r) => setTimeout(r, 60_000))
    return run(q)
  }
  // Support both the new shape (data.items / data.pagination) and the legacy
  // shape (data = items array, pagination at top level) — useful while a long
  // running dev server is still on the old build.
  const meta = body?.meta ?? {}
  const isNewShape = body?.data && !Array.isArray(body.data)
  const items = isNewShape ? (body.data.items ?? []) : (Array.isArray(body.data) ? body.data : [])
  const suggestions = isNewShape ? (body.data.suggestions ?? []) : []
  const pag = isNewShape ? body.data.pagination : body.pagination
  const total = pag?.total ?? items.length

  console.log(`═══ Q: "${q}"  →  ${ms}ms  src=${meta.source}  total=${total}  ═══`)
  if (items.length === 0) {
    console.log('  (no hits)')
  } else {
    items.forEach((it, i) => {
      const score = (it.score ?? 0).toFixed(2).padStart(7)
      const title = trim(it.title, 45)
      const orig = it.originalTitle ? `  (${trim(it.originalTitle, 30)})` : ''
      const year = it.year ? ` [${it.year}]` : ''
      console.log(`  ${i + 1}. ${score}  ${title}${year}${orig}`)
    })
  }
  if (suggestions.length > 0) {
    console.log(`  ↳ suggestions: ${suggestions.map((s) => trim(s.title, 22)).join(' | ')}`)
  }
  console.log('')
}

;(async () => {
  for (const q of QUERIES) {
    try {
      await run(q)
      // Stay under the 20 req/min rate limit (~3s spacing).
      await new Promise((r) => setTimeout(r, 3100))
    } catch (err) {
      console.log(`═══ Q: "${q}"  →  ERROR: ${err.message} ═══\n`)
    }
  }
})()
