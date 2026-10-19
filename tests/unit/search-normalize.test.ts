// ============================================
// Unit Tests — Vietnamese normalization + ES query builder
// ============================================
// Covers the shared normalizer used by both indexer and search service,
// and asserts the tier-based ranking structure that powers /api/v1/search.

import { describe, it, expect } from 'vitest'
import { normalizeVietnamese, stripDiacritics, vietnameseTokens, joinAscii } from '@/lib/search/normalize'
import { buildSearchQuery, buildSuggestQuery, isLikelyPersonName } from '@/src/be/modules/search/movie-search-service'

describe('normalizeVietnamese()', () => {
  it('strips diacritics from common Vietnamese letters', () => {
    expect(normalizeVietnamese('Người Nhện')).toBe('nguoi nhen')
    expect(normalizeVietnamese('Đường về nhà')).toBe('duong ve nha')
    expect(normalizeVietnamese('Cô gái đến từ hôm qua')).toBe('co gai den tu hom qua')
  })

  it('collapses punctuation and whitespace', () => {
    expect(normalizeVietnamese('  CON  TRAI  ÚT  ')).toBe('con trai ut')
    expect(normalizeVietnamese('Người Nhện: Vũ trụ mới!')).toBe('nguoi nhen vu tru moi')
    expect(normalizeVietnamese('a---b___c')).toBe('a b c')
  })

  it('preserves digits', () => {
    expect(normalizeVietnamese('Avengers Endgame 2019')).toBe('avengers endgame 2019')
    expect(normalizeVietnamese('Phim 18+')).toBe('phim 18')
  })

  it('handles empty / null / undefined safely', () => {
    expect(normalizeVietnamese('')).toBe('')
    expect(normalizeVietnamese(null)).toBe('')
    expect(normalizeVietnamese(undefined)).toBe('')
    expect(normalizeVietnamese('   ')).toBe('')
  })

  it('is idempotent', () => {
    const input = 'Người Nhện'
    const once = normalizeVietnamese(input)
    const twice = normalizeVietnamese(once)
    expect(twice).toBe(once)
  })
})

describe('stripDiacritics()', () => {
  it('lowercases and removes diacritics but keeps spacing', () => {
    expect(stripDiacritics('Người Nhện: Về Nhà')).toBe('nguoi nhen: ve nha')
    expect(stripDiacritics('Đường')).toBe('duong')
  })
})

describe('vietnameseTokens()', () => {
  it('splits normalised query into tokens', () => {
    expect(vietnameseTokens('Người Nhện về Nhà')).toEqual(['nguoi', 'nhen', 've', 'nha'])
    expect(vietnameseTokens('  spider-man  ')).toEqual(['spider', 'man'])
  })

  it('drops empty fragments', () => {
    expect(vietnameseTokens('')).toEqual([])
    expect(vietnameseTokens('   --- ')).toEqual([])
  })
})

describe('joinAscii()', () => {
  it('joins normalised pieces with single spaces', () => {
    expect(joinAscii(['Tom Holland', 'Zendaya'])).toBe('tom holland zendaya')
    expect(joinAscii(['Hành động', '', null, 'Phiêu lưu'])).toBe('hanh dong phieu luu')
  })

  it('returns empty for all-empty input', () => {
    expect(joinAscii([null, undefined, '', '   '])).toBe('')
  })
})

describe('buildSearchQuery() — tier-based ranking', () => {
  it('contains all five tiers in bool.should', () => {
    const q = buildSearchQuery('người nhện', {}) as { function_score: { query: { bool: { should: unknown[] } } } }
    const should = q.function_score.query.bool.should as Record<string, unknown>[]
    // Tier 1 (5 exact term clauses) + Tier 2 (4 phrase clauses) + Tier 3 + 4 + 5
    expect(should.length).toBeGreaterThanOrEqual(12)
  })

  it('boosts title.keyword exact match higher than any text clause', () => {
    const q = buildSearchQuery('người nhện', {}) as { function_score: { query: { bool: { should: Array<Record<string, unknown>> } } } }
    const should = q.function_score.query.bool.should
    const titleExact = should.find((c) => (c.term as Record<string, { boost?: number }> | undefined)?.['title.keyword'])
    const contentTier = should.find((c) => (c.multi_match as { fields?: string[] } | undefined)?.fields?.some((f) => f.startsWith('content')))
    const titleBoost = ((titleExact?.term as Record<string, { boost: number }>)['title.keyword'].boost)
    const contentBoost = ((contentTier?.multi_match as { boost: number }).boost)
    expect(titleBoost).toBeGreaterThan(contentBoost)
    expect(titleBoost).toBe(1000)
    expect(contentBoost).toBe(1)
  })

  it('feeds the normalised query into ascii term clauses', () => {
    const q = buildSearchQuery('Người Nhện', {}) as { function_score: { query: { bool: { should: Array<Record<string, unknown>> } } } }
    const should = q.function_score.query.bool.should
    const titleAsciiExact = should.find((c) => (c.term as Record<string, { value?: string }> | undefined)?.['titleAscii.keyword'])
    // The normalised value should be diacritic-free and space-collapsed.
    expect((titleAsciiExact?.term as Record<string, { value: string }>)['titleAscii.keyword'].value).toBe('nguoi nhen')
  })

  it('places people-phrase clauses (constant_score boost 600+) above fuzzy title (boost 20)', () => {
    // Search by actor / character name should beat fuzzy lookalike titles.
    // E.g. "Trấn Thành" must rank movies featuring the actor over the title
    // "Thánh Soái Trấn Bắc" (which matches via fuzzy on shared tokens).
    type ConstantScoreClause = { constant_score: { filter: { match_phrase: Record<string, unknown> }; boost: number } }
    const q = buildSearchQuery('trấn thành', {}) as { function_score: { query: { bool: { should: Array<Record<string, unknown>> } } } }
    const should = q.function_score.query.bool.should

    const fuzzy = should.find((c) => {
      const mm = c.multi_match as { fuzziness?: number; boost?: number } | undefined
      return mm?.fuzziness === 1
    })

    const peoplePhrases = should.filter((c): c is ConstantScoreClause => {
      const cs = (c as ConstantScoreClause).constant_score
      if (!cs) return false
      const fields = Object.keys(cs.filter?.match_phrase ?? {})
      return fields.some((f) => ['actorText', 'actorTextAscii', 'directorText', 'directorTextAscii', 'characters'].includes(f))
    })
    expect(peoplePhrases.length).toBe(5)

    const fuzzyBoost = (fuzzy!.multi_match as { boost: number }).boost
    // Every people-phrase clause must out-boost fuzzy title.
    for (const clause of peoplePhrases) {
      expect(clause.constant_score.boost).toBeGreaterThan(fuzzyBoost * 10) // sanity gap
    }
  })

  it('attaches the contentType / year / category / country filters', () => {
    const q = buildSearchQuery('x', { contentType: 'movie', year: 2020, category: 'hanh-dong', country: 'us' }) as {
      function_score: { query: { bool: { filter: Array<Record<string, unknown>> } } }
    }
    const filters = q.function_score.query.bool.filter
    // isActive + the 4 we passed = 5 total.
    expect(filters.length).toBe(5)
    const flatten = JSON.stringify(filters)
    expect(flatten).toContain('"contentType":"movie"')
    expect(flatten).toContain('"year":2020')
    expect(flatten).toContain('"categories":"hanh-dong"')
    expect(flatten).toContain('"countries":"us"')
  })
})

describe('buildSuggestQuery() — title-first autocomplete', () => {
  it('exact title term hits get the top boost (1000)', () => {
    const q = buildSuggestQuery('avengers') as { bool: { should: Array<Record<string, unknown>> } }
    const should = q.bool.should
    const top = should.find((c) => (c.term as Record<string, { boost?: number }> | undefined)?.['title.keyword'])
    expect(((top?.term as Record<string, { boost: number }>)['title.keyword']).boost).toBe(1000)
  })

  it('exposes both an exact-phrase people path (constant_score 40-60) and a generic prefix path (≤5)', () => {
    type ConstantScoreClause = { constant_score: { filter: { match_phrase: Record<string, unknown> }; boost: number } }
    const q = buildSuggestQuery('tom') as { bool: { should: Array<Record<string, unknown>> } }
    const should = q.bool.should

    // Exact-phrase tier — drives the autocomplete to surface a person's movies.
    const actorPhrase = should.find((c): c is ConstantScoreClause => {
      const cs = (c as ConstantScoreClause).constant_score
      return !!cs && 'actorText' in (cs.filter?.match_phrase ?? {})
    })
    expect(actorPhrase).toBeDefined()
    const actorPhraseBoost = actorPhrase!.constant_score.boost
    expect(actorPhraseBoost).toBeGreaterThanOrEqual(40)
    expect(actorPhraseBoost).toBeLessThan(100) // still below title-exact

    // Generic prefix tier — partial / single-token people matches.
    const peopleClause = should.find((c) => {
      const fields = (c.multi_match as { fields?: string[] } | undefined)?.fields
      return fields?.some((f) => f.includes('actorsSuggest'))
    })
    expect(peopleClause).toBeDefined()
    expect((peopleClause?.multi_match as { boost: number }).boost).toBeLessThanOrEqual(5)
  })

  it('filters by isActive', () => {
    const q = buildSuggestQuery('x') as { bool: { filter: Array<Record<string, unknown>> } }
    expect(JSON.stringify(q.bool.filter)).toContain('"isActive":true')
  })
})

describe('isLikelyPersonName()', () => {
  it('treats capitalised multi-word queries as names', () => {
    expect(isLikelyPersonName('Trấn Thành')).toBe(true)
    expect(isLikelyPersonName('Jack Reynor')).toBe(true)
  })

  it('does not treat lowercase accented titles as names', () => {
    // [À-Ỹ] used to match lowercase á/ử, routing "án tử" to a person search.
    expect(isLikelyPersonName('án tử')).toBe(false)
    expect(isLikelyPersonName('người nhện')).toBe(false)
  })

  it('needs at least two tokens', () => {
    expect(isLikelyPersonName('Doraemon')).toBe(false)
  })
})
