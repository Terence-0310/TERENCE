# Elasticsearch Search — TERENCE

## 1. What ES does (and does not)

| Concern | Owner |
|---|---|
| **Source of truth for movies** | Prisma + SQLite (or PostgreSQL after migration). Every read that needs guaranteed consistency must hit Prisma. |
| **Search index** | Elasticsearch. Holds a derived, denormalised copy of each active movie for fast full-text + fuzzy + autocomplete queries. |
| **Authoritative dataset** | Database. ES can be rebuilt at any moment from the DB without loss. |
| **What happens if ES is down** | The search API automatically falls back to a Prisma `contains` query. Search is slower and not fuzzy, but the site still works. |

Bottom line: **Elasticsearch never replaces the database**, it is a read-only secondary index optimised for relevance.

---

## 2. ENV variables

```dotenv
ELASTICSEARCH_HOST=http://localhost:9200          # required for ES mode
ELASTICSEARCH_USERNAME=                           # optional (basic auth)
ELASTICSEARCH_PASSWORD=                           # optional (basic auth)
ELASTICSEARCH_API_KEY=                            # optional (api-key auth)
ELASTICSEARCH_INDEX_MOVIES=terence_movies         # index name, default 'terence_movies'
```

If `ELASTICSEARCH_HOST` is unreachable, the app continues to run on the Prisma fallback. The
client uses a 60-second availability cache so we don't ping ES on every request.

---

## 3. Data flow

```
                    ┌────────────────────────────┐
                    │  Admin CRUD / Sync jobs    │
                    └──────────────┬─────────────┘
                                   │ writes
                                   ▼
        ┌──────────────────────────────────────────────────┐
        │           Prisma (SQLite / PostgreSQL)            │
        │           — single source of truth —              │
        └──────────────┬───────────────────────────────────┘
                       │ fire-and-forget syncMovieAsync()
                       │ (admin routes only — no UI block)
                       ▼
        ┌──────────────────────────────────────────────────┐
        │             Elasticsearch index                   │
        │             `terence_movies`                      │
        └──────────────┬───────────────────────────────────┘
                       │ search + suggest
                       ▼
                   /api/v1/search
                   /api/v1/search/suggest
```

Sync points:

- `POST /api/admin/movies`            → upsert ES doc.
- `PUT  /api/admin/movies/[id]`       → upsert ES doc (re-index full row).
- `DELETE /api/admin/movies/[id]`     → soft delete + delete ES doc.
- Sync scripts (ophim/kkphim) finish → operator must run `npm run search:reindex` to refresh.

If a write fails in ES (network down, mapping mismatch), the DB write still wins. Run
`npm run search:reindex` to bring the index back in line.

---

## 4. Index design

Index name: `terence_movies` (override via `ELASTICSEARCH_INDEX_MOVIES`).
Single shard, zero replicas (development friendly; raise for prod).

### Analyzers

| Analyzer | Use |
|---|---|
| `vietnamese_analyzer` | standard tokenizer + lowercase + asciifolding. Default for analysed text fields. |
| `lowercase_keyword` | keyword tokenizer + lowercase. Used for case-insensitive exact match. |
| `autocomplete_analyzer` | edge_ngram tokenizer (min=1, max=20) + lowercase + asciifolding. Used only on `*Suggest` fields. |
| `autocomplete_search_analyzer` | standard + lowercase + asciifolding. Search-time analyzer for autocomplete to avoid double-tokenising. |

### Key fields (full mapping lives in `src/be/modules/search/elastic-client.ts`)

| Field | Purpose |
|---|---|
| `title`, `originalTitle` | Vietnamese-analysed title text. `.keyword` sibling for exact match (case-insensitive). |
| `titleAscii`, `originalTitleAscii` | Pre-folded ASCII form built by `normalizeVietnamese()`. Lets us boost ASCII matches separately. |
| `titleSuggest` | Edge_ngram autocomplete field including both diacritic and ASCII forms. |
| `actorText`, `directorText` (+ `*Ascii`) | Joined people names. |
| `characters` | Role names ("Peter Parker", ...). |
| `categories`, `countries` | Slug keywords. |
| `categoryText`, `countryText` (+ `*Ascii`) | Human-readable category / country names. |
| `description`, `shortDescription`, `content`, `contentAscii` | Long text. **Boosted lowest** in the search query. |
| `popularity` | Derived float: `log10(viewCount + 1) + rating × 0.1`. Used as a tiny ranking boost. |

---

## 5. Query strategy

The `/api/v1/search` query lives in `src/be/modules/search/movie-search-service.ts` →
`buildSearchQuery()`. Five tiers, evaluated as siblings in `bool.should`. Highest-tier
match wins; popularity adds a tiny additive boost so well-known titles surface first when
relevance ties.

| Tier | Clause | Boost |
|---|---|---|
| 1 — exact | `term` on `title.keyword`                 | 100 |
|           | `term` on `originalTitle.keyword`         | 95 |
|           | `term` on `titleAscii.keyword`            | 90 |
|           | `term` on `originalTitleAscii.keyword`    | 85 |
|           | `term` on `slug`                          | 80 |
| 2 — phrase| `match_phrase` on `title` / `titleAscii` / `originalTitle` / `originalTitleAscii` | 45–60 |
| 3 — fuzzy | `multi_match` on title family with `fuzziness: AUTO` | 20 |
| 3.5 — people / character exact-phrase | `match_phrase` on `actorText` (30), `actorTextAscii` (28), `directorText` (25), `directorTextAscii` (23), `characters` (22) | 22–30 |
| 4 — people / category / country (generic) | `multi_match` on `actorText`, `directorText`, `characters`, `categoryText`, `countryText`, `tags` | 10 |
| 5 — description | `multi_match` on `content`, `description`, `shortDescription` | 3 |

**Why tier 3.5 sits above fuzzy title (boost 20):** typing a full actor / character name
("Trấn Thành", "tran thanh", "Peter Parker") should put that person's films at the top.
Without the dedicated phrase tier, the fuzzy title clause would pick lookalike titles
("Cạnh Tranh Thân Thiện") via edit distance and bury the real match. Phrase tier
requires *contiguous* token match, so it doesn't fire on accidental two-word lookalikes.

`function_score` adds `log1p(popularity) × 0.5` on top, with `boost_mode: 'sum'` so the
tier ordering is preserved — a Tier-5 description match can never outrank a Tier-1 title.

The autocomplete query (`buildSuggestQuery`) follows the same tier idea but is intentionally
narrower: it only goes through title / titleSuggest / a small actor/character signal.

---

## 5b. Docker quickstart (fresh test)

```bash
# 1. Force a clean rebuild so the image picks up the new search code
#    (lib/search/normalize.ts, updated mapping, tier-based ranking).
docker compose build --no-cache app

# 2. Bring everything up. The app entrypoint will:
#    - wait for Postgres
#    - run `prisma db push`
#    - seed (SEED_ON_START=true)
#    - sync 3 OPhim pages (SYNC_OPHIM_ON_START=true)
#    - run `elastic-reindex.ts` to populate the index with the new mapping
docker compose up -d

# 3. Tail the logs until you see "Starting TERENCE on port 3000...":
docker compose logs -f app

# 4. (Optional) Re-run the indexer manually any time:
docker compose exec app npm run search:reindex
# or wipe the index without rebuilding:
docker compose exec app npm run search:clear

# 5. Run the smoke test script. Hits /api/v1/search with 8–10
#    representative Vietnamese queries and asserts HTTP 200.
sh scripts/docker-search-test.sh
# Windows host:
pwsh -File scripts/docker-search-test.ps1

# 6. Inspect the index directly through ES:
curl http://localhost:9200/_cat/indices?v
curl 'http://localhost:9200/terence_movies/_count'
```

If the container is healthy but search returns 0 hits, the most likely cause is the
indexer ran before OPhim had populated the DB. Re-run step 4 manually.

---

## 6. CLI commands

```bash
npm run search:reindex            # full reindex (recreates index, then bulk-inserts everything)
npm run search:reindex -- --batch=200
npm run search:sync -- --movieId=cm123abc   # re-index one movie
npm run search:clear              # drop the entire index (no rebuild)
```

Legacy aliases `elastic:reindex` / `elastic:sync` still work for any existing automation.

The admin UI also exposes the same operations at:

- `GET /api/admin/elastic/health` — index/cluster health, doc count.
- `POST /api/admin/elastic/reindex` — kicks off a background reindex.

---

## 7. API reference

### `GET /api/v1/search?q=...`

Query params:

- `q` (required) — search term, max ~200 chars after sanitisation.
- `page` (default 1, max 100).
- `perPage` or `limit` (default 20, max 50).
- `type` — one of `movie | series | anime`.
- `year` — 4-digit year filter.
- `category` — genre slug filter.
- `country` — country slug filter.

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      { "id": "...", "slug": "...", "title": "...", "year": 2019, "score": 112.4, ... }
    ],
    "pagination": { "page": 1, "limit": 20, "perPage": 20, "total": 87, "totalPages": 5 },
    "suggestions": [
      { "id": "...", "title": "...", "thumbUrl": "..." }
    ]
  },
  "meta": { "query": "người nhện", "source": "elasticsearch", "filters": { ... } }
}
```

`source: 'prisma_fallback'` means ES was unreachable and the response came from the
Prisma fallback path.

Rate limit: 20 search requests per minute per IP (returns 429 when exceeded).

### `GET /api/v1/search/suggest?q=...&limit=8`

Returns up to 8 autocomplete hits. Title-first, no description noise. Response shape is
the legacy one preserved for the header dropdown.

---

## 8. Test plan

When tweaking the ranking, sanity-check with these queries against a dev DB that has
a few hundred real movies indexed:

| Input | Expected top hit |
|---|---|
| `nguoi nhen`         | A movie whose title contains "Người Nhện". |
| `người nhện`         | Same. |
| `spider man`         | A movie whose `originalTitle` contains "Spider-Man". |
| `avenger`            | Avengers / Marvel hits — title above actor matches. |
| `hanh dong`          | Movies in the "Hành Động" genre. |
| `<lead actor name>`  | Movies that actor appears in. |
| `<one country slug>` | Movies from that country (filter style). |
| A descriptive phrase from a movie synopsis | The matching movie, but never above an exact title hit. |

Pass criteria:

- Diacritics in / out give the same set of results.
- Exact title query: that movie is item #0.
- Typo (one edit) still finds the right movie.
- ES down (stop the server / pull the cable): API still responds, `meta.source ===
  "prisma_fallback"`, items are roughly correct (title contains match).

---

## 9. Failure modes & playbook

| Symptom | Action |
|---|---|
| `meta.source: "prisma_fallback"` in responses | ES is unreachable — check `ELASTICSEARCH_HOST` and the ES process. App is healthy. |
| Search returns nothing for a freshly created movie | Run `npm run search:sync -- --movieId=...` or wait for the admin upsert (fire-and-forget) to finish. If the indexer keeps failing, check ES logs for mapping conflicts and recreate via `npm run search:reindex`. |
| Wrong movie at top of results | First confirm with the same query against Prisma fallback — if Prisma fallback is also wrong, the issue is data quality. Otherwise: open `buildSearchQuery()` and adjust the relevant tier's boost. Re-run the test plan above. |
| ES disk full / mapping error | `npm run search:clear` then `npm run search:reindex`. Safe — DB is the source of truth. |

---

## 10. Things deliberately *not* done

- No external Vietnamese-specific ICU analyzer. The standard tokenizer + asciifolding
  covers 95 % of cases, and the ICU plugin requires a licensed/managed cluster.
- No live CDC stream from Prisma → ES. Fire-and-forget on admin writes covers the active
  editing path; bulk imports (ophim sync) require a manual `npm run search:reindex`.
- No second-pass re-ranking via ML. The tier model is interpretable and fast; adding ML
  would be a separate project.
