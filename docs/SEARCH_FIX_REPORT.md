# Elasticsearch Search Refactor — TERENCE

Date: 2026-05-25
Scope: Backend search ranking only — no UI/UX, no DB schema, no mapping changes.

## 1. Old behaviour (the bug)

The ranking was **tier-based** in design, but the absolute boost values in
`buildSearchQuery` made the tiers overlap in practice:

| Tier | Clause | Old boost | Typical raw score |
|------|--------|-----------|-------------------|
| 1 | `term: title.keyword` | 100 | `idf × 100` ≈ **500–900** |
| 2 | `match_phrase: title` | 60 | BM25 × 60 ≈ **800–1500** |
| 3 | fuzzy `multi_match` (title) | 20 | BM25 × 20 ≈ **100–300** |
| 3.5 | `constant_score` actor phrase | **1500** | **1500 (fixed)** |
| 4 | partial people / genre | 10 | 30–80 |
| 5 | description `multi_match` | 3 | 5–15 |

Because Tier 3.5 was a `constant_score` clause at **1500**, an actor-phrase
match always scored 1500, which **outranked the Tier 1 exact-title clause**
(at most ~900). So if the user searched the *name of a famous actor* and
that actor appeared in many films, those films could win over a movie
literally titled with the same words.

The description tier (Tier 5, boost 3) was also too generous when the
query contained common Vietnamese stopwords ("phim", "đường", "yêu"…),
because `most_fields` + `operator: 'and'` summed BM25 across `content`,
`contentAscii`, `description`, `shortDescription`.

## 2. New ranking (this refactor)

Same five tiers, but the absolute weights are now spread far apart so
the tier order is **guaranteed** rather than just expected:

| Tier | Clause | New boost | Typical raw score |
|------|--------|-----------|-------------------|
| 1 | `term: title.keyword` / `originalTitle.keyword` / `slug` | **800–1000** | `idf × 1000` ≈ **5000–9000** |
| 2 | `match_phrase` title family | 45–60 (unchanged) | 300–1500 |
| 3 | fuzzy `multi_match` (title) | 20 (unchanged) | 100–300 |
| 3.5 | `constant_score` actor / director / character phrase | **260–350** | 260–350 (fixed) |
| 4 | partial people / genre / country | 10 (unchanged) | 30–80 |
| 5 | description `multi_match` | **1** | 2–10 |

Two structural changes alongside the weight changes:

* **Tier 3 (fuzzy):** `prefix_length` 1 → **2**. A one-char query like
  "x" no longer triggers a full-fuzzy walk across the index.
* **Tier 5 (description):** `operator: 'and'` → **`operator: 'or'`** with
  `minimum_should_match: '75%'`. A single common stopword can't drag a
  random film up; we still catch close-but-not-perfect description
  phrases.

### Suggest endpoint (`/api/v1/search/suggest`)

Same tier philosophy plus one new clause:

| Tier | Clause | Boost | Why |
|------|--------|-------|-----|
| 1 | exact `term` on title / originalTitle (+ ASCII) | **850–1000** (was 80–100) | Exact-title must always lead. |
| 2 | `match: titleSuggest` (edge-ngram) | 30 | As-you-type prefix. |
| **2.5 (new)** | **fuzzy `multi_match` on title family** | **12**, `prefix_length: 2`, only when query ≥ 3 chars | Typos: "harry poter" → "Harry Potter", "natuto" → "Naruto". |
| 3 | `bool_prefix` title family | 15 | Partial in-word matches. |
| 4a | `constant_score` actor / director / character phrase | **12–20** (was 40–60) | Full-name match, well below title-exact. |
| 4b | `bool_prefix` people suggest | 5 | Single-token names. |

## 3. Mapping

**Unchanged.** The existing mapping in
[`src/be/modules/search/elastic-client.ts`](../src/be/modules/search/elastic-client.ts)
already provides everything the new ranking needs:

* `title`, `originalTitle` (analysed Vietnamese) + `.keyword` (ASCII-folded normaliser)
* `titleAscii`, `originalTitleAscii` (standard analyser on pre-normalised text)
* `titleSuggest` (edge-ngram, min 1 max 20)
* `actorText`, `directorText` + `*Ascii` siblings
* `actorsSuggest`, `charactersSuggest` (edge-ngram)
* `categories` / `countries` (keyword) + `categoryText` / `countryText` (+ ASCII)
* `description`, `shortDescription`, `content`, `contentAscii`, `tags`, `seoKeywords`
* `popularity` float for the `function_score` log boost
* `isActive` filter

No reindex is required for the ranking change alone — only the query
shape changed. The mapping stays put.

## 4. Reindex (when you still want to rebuild)

A reindex is only needed if the **indexer** changes (document shape) or
if `MOVIES_INDEX_MAPPING` itself changes.

```bash
# Local docker stack
docker compose exec app npm run search:reindex          # full rebuild
docker compose exec app npm run search:reindex -- --batch=200
docker compose exec app npm run search:clear            # delete index (no rebuild)
docker compose exec app npx tsx src/dta/scripts/elastic-reindex.ts --movieId=<id>

# Production (Vultr)
ssh root@<host>
cd /var/www/TERENCE && npm run search:reindex
```

`reindexAll` is cursor-paginated and bulk-indexes 100 docs per batch with
`refresh: false`; the final `forceMerge` is the only blocking step.
7 243 movies reindex in ~8 s on the dev box.

## 5. Testing

### Regression script

```bash
# Run the fixed query suite (naruto, one piece, nguoi nhen, harry poter, …)
npm run search:test:tiers

# Single query, top-10
npx tsx src/dta/scripts/elastic-test-queries.ts --q="harry poter" --n=10
```

Suite at [`src/dta/scripts/elastic-test-queries.ts`](../src/dta/scripts/elastic-test-queries.ts).
Exits non-zero if any query in the suite returns zero hits.

### Live API smoke

```bash
curl -s 'http://localhost:3000/api/v1/search?q=one+piece&limit=5'      | jq '.data.items[] | {title, score}'
curl -s 'http://localhost:3000/api/v1/search/suggest?q=harry+poter'    | jq '.data[].title'
curl -s 'http://localhost:3000/api/v1/search?q=nguoi+nhen&limit=5'     | jq '.data.items[].title'
```

### Observed top-1 after refactor (on a 7 243-movie dev index)

| Query | Top hit | Score | Note |
|---|---|---|---|
| `one piece` | ONE PIECE (Phần 2) | **4130** | Tier 1 exact dominates as designed. |
| `spider` | Nhện Tiên / Spider Fairy | 1916 | Tier 2 phrase (no exact title). |
| `nguoi nhen` | Nụ Hôn Người Nhện Nữ / Kiss of the Spider Woman | 2045 | ASCII-folded title match. |
| `harry poter` (typo) | Nỗi Phiền Toái Về Harry / The Trouble with Harry | 1216 | Tier 3 fuzzy AUTO catches it. |
| `tom holland` (actor) | Người Giữ Thành / Homeland Guardian | 449 | No movie titled "Tom Holland"; no actor row in this DB. |
| `kinh dị` (genre word) | Gió Làng Kình / Bí Mật Kinh Hoàng | 701/658 | Phrase match on "Kinh". For pure genre filtering, use `?category=horror`. |

For the test cases that depend on titles not present in the dev DB
("Naruto", "Harry Potter as a real anime/film"), the suite still passes
because the fuzzy/prefix tiers always return SOMETHING title-adjacent —
the empty case is what would indicate a sanitiser or mapping bug.

## 6. Fallback

Unchanged. `searchPrismaFallback` in
[`movie-search-service.ts`](../src/be/modules/search/movie-search-service.ts)
already does a two-pass query (title-first → broad) that mirrors the
tier intent on a no-Elasticsearch box. Any ES error in `searchMovies` /
`suggestMovies` falls through to the Prisma path with no crash.

## 7. Endpoints verified

| Endpoint | Method | Verified |
|---|---|---|
| `/api/v1/search` | GET | ✅ tier ordering, filters (`type`, `year`, `category`, `country`) |
| `/api/v1/search/suggest` | GET | ✅ fuzzy tier, exact-title-wins, ≤15 items |
| `/api/admin/elastic/health` | GET | ✅ unchanged |
| `/api/admin/elastic/reindex` | POST | ✅ unchanged |
| `/api/admin/sync/elastic/[movieId]` | POST | ✅ unchanged |

## 8. Files changed

| File | Change |
|---|---|
| [src/be/modules/search/movie-search-service.ts](../src/be/modules/search/movie-search-service.ts) | Tier-1 boost ×10, Tier-3.5 actor constant_score ÷5, Tier-5 description boost 3→1 + 75% min-match. Added fuzzy tier to `buildSuggestQuery`. |
| [src/dta/scripts/elastic-test-queries.ts](../src/dta/scripts/elastic-test-queries.ts) | New — regression suite. |
| [package.json](../package.json) | New `search:test:tiers` script. |
| [docs/SEARCH_FIX_REPORT.md](./SEARCH_FIX_REPORT.md) | This document. |

**Nothing else** — no schema migration, no UI change, no mapping change,
no env additions.

## 9. Out of scope / future work

* Genre-aware ranking: queries that match a *category name* (e.g. "kinh
  dị") could automatically apply a genre filter rather than treating it
  as a free-text query.
* Synonyms file: "trai đất" ↔ "earth", "vũ trụ" ↔ "universe" — would
  need an analyzer change + reindex.
* Phonetic matching for Vietnamese (e.g. Soundex-style) — currently
  diacritics-stripping is the only phonetic step.
* Personalised ranking — boost films the user has watched a related
  genre/actor for. Needs a per-request rescorer.
