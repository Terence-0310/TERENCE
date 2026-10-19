// ============================================
// Movie Search Service
// ============================================
// Search + suggest with graceful Prisma fallback when ES is offline.
//
// Ranking design (see docs/SEARCH_FIX_REPORT.md for the math):
//   Tier 1 (boost 800–1000)  — exact matches on title / slug / originalTitle.
//   Tier 2 (boost 45–60)     — phrase matches inside title-family fields.
//   Tier 3 (boost 20, 75% MSM) — fuzzy title. `minimum_should_match: 75%`
//                              so a multi-word query like "Jack Reynor"
//                              needs BOTH words to match — without that
//                              the fuzzy clause swamped results with
//                              every "Samurai Jack" / "Jack Whitehall".
//   Tier 3.5 (const 600–800) — exact-phrase actor/director/character.
//                              Sized to sit BELOW a real title-exact
//                              hit (Tier 1, ~5000+) yet clearly above a
//                              generic title-fuzzy hit. When a user
//                              types an actor's full name, the actor's
//                              films surface here.
//   Tier 4 (boost 10, 75% MSM) — partial people / category / country.
//   Tier 5 (boost 1)         — description / long content. Operator OR
//                              with 75% min-match so a single common word
//                              like "đường" can't drag random films up.
// Invariant: a movie whose TITLE matches the query must always outrank
// a movie matched only by description, actor, or genre. When no title
// matches, an exact actor / director phrase wins next.

import { getClient, getMoviesIndex, isAvailable, reportUnavailable } from './elastic-client'
import { prisma } from '@/lib/db/prisma'
import { sanitizeSearchQuery } from '@/src/be/shared/utils/sanitizer'
import { logger } from '@/src/be/shared/utils/logger'
import { normalizeVietnamese } from '@/lib/search/normalize'
import type { Prisma } from '@prisma/client'

// ─── Internal ES helper types ───────────────────────────────────
type EsFilterClause = Record<string, unknown>
type EsQuery = Record<string, unknown>
type EsSearchResponse = {
  hits?: {
    total?: number | { value: number }
    hits?: Array<{ _source: Record<string, unknown>; _score: number }>
  }
}

const log = logger.child({ module: 'movie-search-service' })

// ─── Search Result Types ────────────────────────────────────────

export interface SearchResultItem {
  id: string
  slug: string
  title: string
  originalTitle: string | null
  year: number | null
  tmdbId: number | null
  contentType: string
  quality: string | null
  language: string | null
  thumbUrl: string | null
  posterUrl: string | null
  rating: number
  episodeCurrent: string | null
  episodeTotal: number | null
  categories: string[]
  countries: string[]
  // Enrichment for richer result cards — populated from the index so the
  // catalog grid can show full info (director / lead cast / backdrop) without
  // an extra DB round-trip.
  backdropUrl: string | null
  director: string | null
  actors: string | null
  score: number
}

export interface SearchResult {
  items: SearchResultItem[]
  suggestions: SuggestItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
  source: 'elasticsearch' | 'prisma_fallback'
  /**
   * Heuristic hint surfaced to the frontend so it can render a
   * "we couldn't find this actor — here are similar titles" banner.
   * `isLikelyName` is true when the query looks like a person's name
   * (≥2 capitalised tokens after sanitisation) and `actorMatchCount`
   * counted zero movies with that exact actor phrase. The frontend
   * decides whether to show the banner.
   */
  hint?: {
    isLikelyName: boolean
    actorMatchCount: number
  }
}

export interface SuggestItem {
  id: string
  slug: string
  title: string
  originalTitle: string | null
  year: number | null
  contentType: string
  thumbUrl: string | null
  actors?: string
}

// ─── Heuristics ────────────────────────────────────────────────

/**
 * Detect whether a raw query *looks* like a person's name on the
 * surface — multiple capitalised tokens. Used only as a cheap pre-check
 * before the expensive Person-table lookup; never as the sole signal
 * for showing the banner, because Vietnamese title-case happily catches
 * concepts like "Trái Ác Quỷ" or "Vũ Trụ Mới".
 */
export function isLikelyPersonName(rawQuery: string): boolean {
  const tokens = rawQuery.trim().split(/\s+/).filter((t) => t.length > 1)
  if (tokens.length < 2) return false
  // \p{Lu} = real uppercase. A range like [À-Ỹ] also spans lowercase accented
  // letters (á, ử…), which made plain titles such as "án tử" look like names.
  const capCount = tokens.filter((t) => /^\p{Lu}/u.test(t)).length
  return capCount >= Math.ceil(tokens.length / 2)
}

/**
 * Authoritative check: does our Person table contain anyone whose name
 * (case-insensitive substring) matches the query? If yes, the user is
 * almost certainly looking for that actor/director — we can confidently
 * count their movies and decide whether to surface the "not found"
 * banner. If no Person matches, the query is *not* a person search —
 * it's a concept / title / random phrase, so the banner is silenced.
 */
async function findMatchingPersonId(query: string): Promise<string | null> {
  try {
    const person = await prisma.person.findFirst({
      where: {
        OR: [
          { name:         { contains: query, mode: 'insensitive' } },
          { originalName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    })
    return person?.id ?? null
  } catch {
    return null
  }
}


// ─── ES query builder ──────────────────────────────────────────

/**
 * Build the bool/should query body. Exported so unit tests can assert on
 * the structure without spinning up ES.
 */
export function buildSearchQuery(query: string, filters: { contentType?: string; year?: number; category?: string; country?: string }): EsQuery {
  const qAscii = normalizeVietnamese(query)

  const filterClauses: EsFilterClause[] = [{ term: { isActive: true } }]
  if (filters.contentType) filterClauses.push({ term: { contentType: filters.contentType } })
  if (filters.year)        filterClauses.push({ term: { year: filters.year } })
  if (filters.category)    filterClauses.push({ term: { categories: filters.category } })
  if (filters.country)     filterClauses.push({ term: { countries: filters.country } })

  const should: EsFilterClause[] = [
    // ── Tier 1: EXACT (boost 800–1000) ─────────────────────────────
    // term on .keyword sub-field with normalised query string. The
    // raw score for `term` is `idf × boost`; with typical idf ~5-9
    // that puts the exact-title clause at ~5000-9000 which guarantees
    // it sits above EVERY other clause below (including the actor
    // constant_score 350).
    { term: { 'title.keyword':              { value: qAscii, boost: 1000 } } },
    { term: { 'originalTitle.keyword':      { value: qAscii, boost:  950 } } },
    { term: { 'titleAscii.keyword':         { value: qAscii, boost:  900 } } },
    { term: { 'originalTitleAscii.keyword': { value: qAscii, boost:  850 } } },
    { term: { slug:                         { value: qAscii, boost:  800 } } },

    // ── Tier 2: PHRASE match (boost 45–60) ────────────────────────
    // Whole-query phrase. "người nhện về nhà" matches a title containing
    // that exact phrase even if other words also appear.
    { match_phrase: { title:              { query,         boost: 60 } } },
    { match_phrase: { titleAscii:         { query: qAscii, boost: 55 } } },
    { match_phrase: { originalTitle:      { query,         boost: 50 } } },
    { match_phrase: { originalTitleAscii: { query: qAscii, boost: 45 } } },

    // ── Tier 3: FUZZY title (boost 20) ────────────────────────────
    // Catches typos. `fuzziness: 1` is deliberately tighter than the
    // ES default `AUTO` (which allows 2 edits for ≥6-char words). Real
    // typos are almost always 1 edit — allowing 2 caused "reynor" to
    // fuzzy-match "renoir" (2 substitutions/insertions), polluting
    // actor-name searches with unrelated titles.
    // `prefix_length: 2` requires the first 2 chars to match exactly
    // so we don't burn CPU on garbage queries like "x".
    // `minimum_should_match: '75%'` — for a 2-word query like "Jack
    // Reynor" require BOTH words to match (rounded up).
    {
      multi_match: {
        query,
        fields: ['title^3', 'titleAscii^2.5', 'originalTitle^2', 'originalTitleAscii^1.5', 'titleSuggest^2'],
        type: 'best_fields',
        fuzziness: 1,
        prefix_length: 2,
        tie_breaker: 0.2,
        minimum_should_match: '75%',
        boost: 20,
      },
    },

    // ── Tier 3.5: EXACT-PHRASE on people + character (constant_score) ────
    // Fixed scores so that when a query matches a full actor / director
    // name, the films starring that person reliably surface above any
    // title-fuzzy noise. Numbers picked so this tier ALWAYS sits below
    // a real title-exact hit (Tier 1, ~5000+) yet clearly above a
    // generic title-fuzzy hit (Tier 3, ~100–300).
    // Old (1100–1500) outranked title-exact; the previous round (260–350)
    // overcorrected so even when the actor's films existed, they sat
    // below title-fuzzy when popularity skewed the function_score.
    // 750–800 hits the right middle.
    { constant_score: { filter: { match_phrase: { actorText:         { query         } } }, boost: 800 } },
    { constant_score: { filter: { match_phrase: { actorTextAscii:    { query: qAscii } } }, boost: 750 } },
    { constant_score: { filter: { match_phrase: { characters:        { query         } } }, boost: 700 } },
    { constant_score: { filter: { match_phrase: { directorText:      { query         } } }, boost: 650 } },
    { constant_score: { filter: { match_phrase: { directorTextAscii: { query: qAscii } } }, boost: 600 } },

    // ── Tier 4: PEOPLE / CATEGORY / COUNTRY (boost 10) ────────────
    // Generic multi_match — picks up single-token / partial people names
    // ("Tom", "Holland" alone) and the genre / country lookups. The
    // phrase tier above dominates when the full name appears.
    // `minimum_should_match: '75%'` so the partial people tier also
    // requires most of a multi-word query to land (otherwise a query
    // like "Tom Holland" would match every "Tom" actor).
    {
      multi_match: {
        query,
        fields: [
          'actorText^1.2',     'actorTextAscii^1.1',
          'directorText^1.0',  'directorTextAscii^0.9',
          'characters^1.1',
          'categoryText^0.8',  'categoryTextAscii^0.7',
          'countryText^0.6',   'countryTextAscii^0.5',
          'tags^0.8',
          'seoKeywords^0.5',
        ],
        type: 'best_fields',
        operator: 'or',
        minimum_should_match: '75%',
        boost: 10,
      },
    },

    // ── Tier 5: LONG-FORM text (boost 1) ──────────────────────────
    // Lowest priority — must never outrank a title hit. Covers every
    // long-text source we have: description, aggregated content,
    // user reviews, and subtitle/dialogue dumps. Operator `or` with
    // `minimum_should_match: 75%` so a single common stopword like
    // "phim" or "đường" can't drag a random film up; we still catch
    // close-but-not-perfect dialogue or description phrases.
    {
      multi_match: {
        query,
        fields: [
          'content^1', 'contentAscii^0.8',
          'description^0.5', 'shortDescription^0.5',
          // Review text — user-written opinions. Slightly higher than
          // description because if a reviewer literally typed the query
          // phrase, the review is direct evidence the movie is relevant.
          'reviewText^0.7', 'reviewTextAscii^0.5',
          // Subtitle text — dialogue dumps populated by the background
          // sync job. Lower boost than reviews because dialogue can be
          // very long, so partial matches are noisier per token.
          'subtitleText^0.4', 'subtitleTextAscii^0.3',
        ],
        type: 'most_fields',
        operator: 'or',
        minimum_should_match: '75%',
        boost: 1,
      },
    },
  ]

  // Wrap in function_score to apply a tiny popularity boost so that, all
  // else equal, well-known movies surface first. boost_mode: 'sum' adds
  // popularity instead of multiplying, so the tier ordering above stays
  // intact (a Tier 1 hit with low popularity still beats a Tier 4 hit).
  return {
    function_score: {
      query: {
        bool: {
          should,
          filter: filterClauses,
          minimum_should_match: 1,
        },
      },
      functions: [
        {
          field_value_factor: { field: 'popularity', factor: 0.5, modifier: 'log1p', missing: 0 },
        },
      ],
      boost_mode: 'sum',
      score_mode: 'sum',
    },
  }
}

// ─── Elasticsearch Search ───────────────────────────────────────

async function searchElastic(
  query: string,
  page: number,
  perPage: number,
  filters: { contentType?: string; year?: number; category?: string; country?: string },
): Promise<Omit<SearchResult, 'suggestions'>> {
  const client = getClient()
  const index = getMoviesIndex()
  const from = (page - 1) * perPage

  const esQuery = buildSearchQuery(query, filters)

  const result = await client.search({
    index,
    from,
    size: perPage,
    query: esQuery,
    _source: [
      'id', 'slug', 'title', 'originalTitle', 'year', 'tmdbId', 'contentType',
      'quality', 'language', 'thumbUrl', 'posterUrl', 'backdropUrl', 'rating',
      'episodeCurrent', 'episodeTotal', 'categories', 'countries',
      'directorText', 'actorText',
    ] as string[],
  })

  const resTyped = result as EsSearchResponse
  const hits = resTyped.hits || (result as unknown as NonNullable<EsSearchResponse['hits']>)
  const totalVal = typeof hits.total === 'object' ? hits.total.value : (hits.total || 0)
  const items: SearchResultItem[] = (hits.hits || []).map((hit) => ({
    ...hit._source,
    score: hit._score || 0,
    rating: (hit._source.rating as number) || 0,
    categories: (hit._source.categories as string[]) || [],
    countries: (hit._source.countries as string[]) || [],
    backdropUrl: (hit._source.backdropUrl as string) || null,
    director: (hit._source.directorText as string) || null,
    actors: (hit._source.actorText as string) || null,
  })) as SearchResultItem[]

  return {
    items,
    total: totalVal as number,
    page,
    perPage,
    totalPages: Math.ceil((totalVal as number) / perPage),
    source: 'elasticsearch',
  }
}

// ─── Elasticsearch Suggest ──────────────────────────────────────

/**
 * Build the suggest query. Title-only, no description noise.
 */
export function buildSuggestQuery(query: string): EsQuery {
  const qAscii = normalizeVietnamese(query)
  // Fuzzy is only useful for queries ≥3 chars — for 1-2 chars AUTO
  // disables itself anyway (0 edits) but the clause adds noise.
  const enableFuzzy = qAscii.length >= 3
  return {
    bool: {
      should: [
        // Tier 1: exact title hits dominate (boost ×10 over old so any
        // exact-title row always sorts above an actor phrase row).
        { term: { 'title.keyword':              { value: qAscii, boost: 1000 } } },
        { term: { 'originalTitle.keyword':      { value: qAscii, boost:  950 } } },
        { term: { 'titleAscii.keyword':         { value: qAscii, boost:  900 } } },
        { term: { 'originalTitleAscii.keyword': { value: qAscii, boost:  850 } } },

        // Tier 2: prefix match via edge_ngram suggest field — gives the
        // "as-you-type" feel without any fuzzy CPU cost.
        { match: { titleSuggest: { query, boost: 30, operator: 'and' } } },

        // Tier 2.5: FUZZY title — catches typos like "harry poter" →
        // "Harry Potter" or "natuto" → "Naruto". prefix_length: 2 keeps
        // it cheap on long indices. `minimum_should_match: 75%` so a
        // multi-word query like "Jack Reynor" needs both words to match.
        ...(enableFuzzy ? [{
          multi_match: {
            query,
            fields: ['title^3', 'titleAscii^2.5', 'originalTitle^2', 'originalTitleAscii^1.5'],
            type: 'best_fields' as const,
            fuzziness: 1 as const,
            prefix_length: 2,
            minimum_should_match: '75%',
            boost: 12,
          },
        }] : []),

        // Tier 3: bool_prefix on full title family — partial in-word matching
        // (e.g. "harry pot" → "Harry Potter").
        {
          multi_match: {
            query,
            fields: ['title^4', 'titleAscii^3', 'originalTitle^2.5', 'originalTitleAscii^2'],
            type: 'bool_prefix',
            boost: 15,
          },
        },

        // Tier 4a: exact-phrase actor / director / character via constant_score.
        // Numbers picked so that the full-name match sits ABOVE the
        // tier-3 bool_prefix on title (so typing "Tom Holland" surfaces
        // Tom Holland's films before titles only containing "Tom").
        { constant_score: { filter: { match_phrase: { actorText:         { query         } } }, boost: 80 } },
        { constant_score: { filter: { match_phrase: { actorTextAscii:    { query: qAscii } } }, boost: 75 } },
        { constant_score: { filter: { match_phrase: { characters:        { query         } } }, boost: 65 } },
        { constant_score: { filter: { match_phrase: { directorText:      { query         } } }, boost: 60 } },
        { constant_score: { filter: { match_phrase: { directorTextAscii: { query: qAscii } } }, boost: 55 } },

        // Tier 4b: partial / single-token people names ("Tom") at low boost.
        {
          multi_match: {
            query,
            fields: ['actorsSuggest^1.2', 'charactersSuggest^1', 'actorText^0.8', 'directorText^0.6'],
            type: 'bool_prefix',
            boost: 5,
          },
        },
      ],
      filter: [{ term: { isActive: true } }],
      minimum_should_match: 1,
    },
  }
}

async function suggestElastic(query: string, limit: number): Promise<SuggestItem[]> {
  const client = getClient()
  const index = getMoviesIndex()

  const result = await client.search({
    index,
    size: limit,
    query: buildSuggestQuery(query),
    _source: ['id', 'slug', 'title', 'originalTitle', 'year', 'contentType', 'thumbUrl', 'actorText'] as string[],
  })

  const resTyped = result as EsSearchResponse
  const hits = resTyped.hits || (result as unknown as NonNullable<EsSearchResponse['hits']>)
  return (hits.hits || []).map((hit) => {
    const src = hit._source
    return {
      id: src.id as string,
      slug: src.slug as string,
      title: src.title as string,
      originalTitle: (src.originalTitle as string) || null,
      year: (src.year as number) || null,
      contentType: src.contentType as string,
      thumbUrl: (src.thumbUrl as string) || null,
      actors: (src.actorText as string) || undefined,
    }
  })
}

// ─── Prisma Fallback ────────────────────────────────────────────

async function searchPrismaFallback(
  query: string,
  page: number,
  perPage: number,
  filters: { contentType?: string; year?: number; category?: string; country?: string },
): Promise<Omit<SearchResult, 'suggestions'>> {
  // Mirror the tier intent in Prisma: title-first OR clauses sort highest.
  // SQLite doesn't have weight scoring, so we do two passes: title match
  // first, then a broader OR. Pagination still works because we count both.
  const titleOr: Prisma.MovieWhereInput[] = [
    { title:         { contains: query, mode: 'insensitive' } },
    { originalTitle: { contains: query, mode: 'insensitive' } },
    { slug:          { contains: query, mode: 'insensitive' } },
  ]
  const broadOr: Prisma.MovieWhereInput[] = [
    ...titleOr,
    { description:       { contains: query, mode: 'insensitive' } },
    { shortDescription:  { contains: query, mode: 'insensitive' } },
    { tags:              { contains: query, mode: 'insensitive' } },
    { people: { some: { person: { name: { contains: query, mode: 'insensitive' } } } } },
    { genres:     { some: { genre:   { name: { contains: query, mode: 'insensitive' } } } } },
    { countries:  { some: { country: { name: { contains: query, mode: 'insensitive' } } } } },
  ]

  const baseWhere: Prisma.MovieWhereInput = {
    isActive: true,
    deletedAt: null,
    status: 'published',
  }
  if (filters.contentType) baseWhere.contentType = filters.contentType
  if (filters.year)        baseWhere.year = filters.year
  if (filters.category)    baseWhere.genres    = { some: { genre:   { slug: filters.category } } }
  if (filters.country)     baseWhere.countries = { some: { country: { slug: filters.country } } }

  // Two queries: title-first pass, then fill from broad search excluding ids
  // we already returned. This approximates ES tier ordering on SQLite.
  const skip = (page - 1) * perPage
  const take = perPage

  const titleWhere: Prisma.MovieWhereInput = { ...baseWhere, OR: titleOr }
  const broadWhere: Prisma.MovieWhereInput = { ...baseWhere, OR: broadOr }

  const [titleTotal, broadTotal] = await Promise.all([
    prisma.movie.count({ where: titleWhere }),
    prisma.movie.count({ where: broadWhere }),
  ])

  const select = {
    id: true, slug: true, title: true, originalTitle: true, year: true,
    tmdbId: true, contentType: true, quality: true, language: true,
    thumbUrl: true, posterUrl: true, backdropUrl: true, rating: true,
    episodeCurrent: true, episodeTotal: true,
    genres:    { include: { genre:   { select: { slug: true } } } },
    countries: { include: { country: { select: { slug: true } } } },
    people: { include: { person: { select: { name: true } } }, orderBy: { sortOrder: 'asc' } },
  } as const

  // Pull `take` rows starting from `skip`. To honour the two-tier order
  // we union the title-pass first, then top up with broad-pass excluding
  // already-seen ids. For paging beyond the first page we still use the
  // broad pass on the offset.
  const titleHits = await prisma.movie.findMany({
    where: titleWhere,
    select,
    orderBy: [{ viewCount: 'desc' }, { updatedAt: 'desc' }],
    skip,
    take,
  })

  let combined = titleHits
  if (combined.length < take) {
    const seenIds = combined.map((m) => m.id)
    const more = await prisma.movie.findMany({
      where: { ...broadWhere, id: { notIn: seenIds.length ? seenIds : ['__none__'] } },
      select,
      orderBy: [{ viewCount: 'desc' }, { updatedAt: 'desc' }],
      take: take - combined.length,
    })
    combined = [...combined, ...more]
  }

  return {
    items: combined.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.title,
      originalTitle: m.originalTitle,
      year: m.year,
      tmdbId: m.tmdbId,
      contentType: m.contentType,
      quality: m.quality,
      language: m.language,
      thumbUrl: m.thumbUrl,
      posterUrl: m.posterUrl,
      rating: m.rating || 0,
      episodeCurrent: m.episodeCurrent,
      episodeTotal: m.episodeTotal,
      categories: m.genres?.map((c) => c.genre.slug) || [],
      countries: m.countries.map((c) => c.country.slug),
      backdropUrl: m.backdropUrl,
      director: m.people?.filter((p) => p.role === 'director').map((p) => p.person.name).join(', ') || null,
      actors: m.people?.filter((p) => p.role === 'actor').map((p) => p.person.name).join(', ') || null,
      score: 0,
    })),
    // Prefer broad total so pagination doesn't surprise the caller.
    total: Math.max(broadTotal, titleTotal),
    page,
    perPage,
    totalPages: Math.ceil(Math.max(broadTotal, titleTotal) / perPage),
    source: 'prisma_fallback',
  }
}

async function suggestPrismaFallback(query: string, limit: number): Promise<SuggestItem[]> {
  const movies = await prisma.movie.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      status: 'published',
      OR: [
        { title:         { contains: query, mode: 'insensitive' } },
        { originalTitle: { contains: query, mode: 'insensitive' } },
        { people: { some: { person: { name: { contains: query, mode: 'insensitive' } } } } },
      ],
    },
    select: {
      id: true, slug: true, title: true, originalTitle: true,
      year: true, contentType: true, thumbUrl: true,
      people: { where: { role: 'actor' }, include: { person: { select: { name: true } } }, take: 5 },
    },
    orderBy: { viewCount: 'desc' },
    take: limit,
  })
  return movies.map((m) => ({
    id: m.id,
    slug: m.slug,
    title: m.title,
    originalTitle: m.originalTitle,
    year: m.year,
    contentType: m.contentType,
    thumbUrl: m.thumbUrl,
    actors: m.people?.map((p) => p.person.name).join(', ') || undefined,
  }))
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Full-text search with ES + Prisma fallback.
 *
 * Returns the primary hit list plus a small `suggestions` slice taken from
 * the autocomplete index. The two are intentionally distinct: `items`
 * gives the user the best matches; `suggestions` gives the "did you also
 * mean" list to surface near-but-not-exact alternatives.
 */
export async function searchMovies(
  query: string,
  page: number = 1,
  perPage: number = 20,
  filters: { contentType?: string; year?: number; category?: string; country?: string } = {},
): Promise<SearchResult> {
  const safeQuery = sanitizeSearchQuery(query)

  if (!safeQuery) {
    return { items: [], suggestions: [], total: 0, page, perPage, totalPages: 0, source: 'elasticsearch' }
  }

  // Try ES first; on any failure, log and fall back.
  let primary: Omit<SearchResult, 'suggestions' | 'hint'> | null = null
  let suggestions: SuggestItem[] = []
  let used: 'elasticsearch' | 'prisma_fallback' = 'elasticsearch'
  let hint: SearchResult['hint'] | undefined

  try {
    if (await isAvailable()) {
      primary = await searchElastic(safeQuery, page, perPage, filters)
      // Limit suggestions to 5 and skip those already in the primary list.
      try {
        const raw = await suggestElastic(safeQuery, 8)
        const primaryIds = new Set(primary.items.map((i) => i.id))
        suggestions = raw.filter((s) => !primaryIds.has(s.id)).slice(0, 5)
      } catch {
        // suggestions are nice-to-have — don't fail the request.
      }
      // Surface the "looks like a name + no actor match" hint only on
      // the first page. We treat a query as "name-like" when:
      //   1. It has ≥2 capitalised tokens (cheap heuristic), AND
      //   2. The Person table actually contains a matching row
      //      (authoritative — proves the user really is searching
      //      for someone we know about).
      // Without (2), banner fires on concepts like "Trái Ác Quỷ" that
      // happen to be title-cased; with (2) it only fires when the
      // user types an actual person's name.
      if (page === 1) {
        try {
          if (isLikelyPersonName(query)) {
            const personId = await findMatchingPersonId(safeQuery)
            if (personId) {
              const movieCount = await prisma.moviePerson.count({
                where: {
                  personId,
                  movie: { isActive: true, deletedAt: null },
                },
              })
              hint = { isLikelyName: true, actorMatchCount: movieCount }
            } else {
              // No Person row → user is not searching for someone we
              // know. Don't show the "actor not found" banner.
              hint = { isLikelyName: false, actorMatchCount: 0 }
            }
          } else {
            hint = { isLikelyName: false, actorMatchCount: 0 }
          }
        } catch {
          /* hint is nice-to-have */
        }
      }
    }
  } catch (error) {
    // Trip the breaker so the NEXT search skips ES (fast Prisma) instead of
    // paying the request timeout again — ES is re-probed after 5s.
    reportUnavailable()
    log.warn({ err: error instanceof Error ? error.message : error }, 'ES search failed, falling back to Prisma')
  }

  if (!primary) {
    primary = await searchPrismaFallback(safeQuery, page, perPage, filters)
    used = 'prisma_fallback'
    try {
      const raw = await suggestPrismaFallback(safeQuery, 8)
      const primaryIds = new Set(primary.items.map((i) => i.id))
      suggestions = raw.filter((s) => !primaryIds.has(s.id)).slice(0, 5)
    } catch {
      /* ignore */
    }
  }

  return { ...primary, suggestions, source: used, hint }
}

/**
 * Autocomplete suggest with ES + Prisma fallback.
 */
export async function suggestMovies(query: string, limit: number = 8): Promise<{ items: SuggestItem[]; source: string }> {
  const safeQuery = sanitizeSearchQuery(query)

  if (!safeQuery) {
    return { items: [], source: 'none' }
  }

  try {
    if (await isAvailable()) {
      const items = await suggestElastic(safeQuery, limit)
      return { items, source: 'elasticsearch' }
    }
  } catch (error) {
    reportUnavailable()
    log.warn({ err: error instanceof Error ? error.message : error }, 'ES suggest failed, falling back to Prisma')
  }

  const items = await suggestPrismaFallback(safeQuery, limit)
  return { items, source: 'prisma_fallback' }
}
