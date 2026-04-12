// ============================================
// Unit Tests — Extended Validators (news, genre, country, id/slug)
// ============================================
// Covers schemas not tested in validators.test.ts

import { describe, it, expect } from 'vitest'
import {
  newsCreateSchema,
  newsUpdateSchema,
  genreCreateSchema,
  genreUpdateSchema,
  countryCreateSchema,
  countryUpdateSchema,
  reviewUpdateSchema,
  sortSchema,
  idParamSchema,
  slugParamSchema,
} from '@/src/be/shared/validators/index'

describe('newsCreateSchema', () => {
  it('should require title and slug', () => {
    expect(newsCreateSchema.safeParse({}).success).toBe(false)
  })

  it('should accept valid news', () => {
    const data = { title: 'New Article', slug: 'new-article' }
    expect(newsCreateSchema.safeParse(data).success).toBe(true)
  })

  it('should reject slug with spaces', () => {
    expect(newsCreateSchema.safeParse({ title: 'T', slug: 'bad slug' }).success).toBe(false)
  })

  it('should default status to draft', () => {
    const data = { title: 'T', slug: 't' }
    expect(newsCreateSchema.parse(data).status).toBe('draft')
  })

  it('should accept all status types', () => {
    for (const s of ['draft', 'published', 'hidden', 'archived']) {
      expect(newsCreateSchema.safeParse({ title: 'T', slug: 't', status: s }).success).toBe(true)
    }
  })

  it('should reject title over 500 chars', () => {
    expect(newsCreateSchema.safeParse({ title: 'x'.repeat(501), slug: 't' }).success).toBe(false)
  })
})

describe('newsUpdateSchema', () => {
  it('should accept partial updates', () => {
    expect(newsUpdateSchema.safeParse({ title: 'Updated' }).success).toBe(true)
    expect(newsUpdateSchema.safeParse({}).success).toBe(true)
  })
})

describe('genreCreateSchema', () => {
  it('should require name and slug', () => {
    expect(genreCreateSchema.safeParse({}).success).toBe(false)
  })

  it('should accept valid genre', () => {
    const data = { name: 'Hành Động', slug: 'hanh-dong' }
    expect(genreCreateSchema.safeParse(data).success).toBe(true)
  })

  it('should default sortOrder to 0', () => {
    const result = genreCreateSchema.parse({ name: 'T', slug: 't' })
    expect(result.sortOrder).toBe(0)
    expect(result.isActive).toBe(true)
  })

  it('should accept optional tmdbId', () => {
    const data = { name: 'T', slug: 't', tmdbId: 28 }
    expect(genreCreateSchema.safeParse(data).success).toBe(true)
  })
})

describe('genreUpdateSchema', () => {
  it('should accept partial updates', () => {
    expect(genreUpdateSchema.safeParse({ name: 'New Name' }).success).toBe(true)
    expect(genreUpdateSchema.safeParse({}).success).toBe(true)
  })
})

describe('countryCreateSchema', () => {
  it('should require name and slug', () => {
    expect(countryCreateSchema.safeParse({}).success).toBe(false)
  })

  it('should accept valid country', () => {
    const data = { name: 'Việt Nam', slug: 'viet-nam', code: 'VN' }
    expect(countryCreateSchema.safeParse(data).success).toBe(true)
  })

  it('should reject code over 5 chars', () => {
    expect(countryCreateSchema.safeParse({ name: 'T', slug: 't', code: 'TOOLONG' }).success).toBe(false)
  })

  it('should default isActive to true', () => {
    expect(countryCreateSchema.parse({ name: 'T', slug: 't' }).isActive).toBe(true)
  })
})

describe('countryUpdateSchema', () => {
  it('should accept partial updates', () => {
    expect(countryUpdateSchema.safeParse({ name: 'New Name' }).success).toBe(true)
    expect(countryUpdateSchema.safeParse({}).success).toBe(true)
  })
})

describe('reviewUpdateSchema', () => {
  it('should accept partial updates without movieId', () => {
    expect(reviewUpdateSchema.safeParse({ rating: 5 }).success).toBe(true)
    expect(reviewUpdateSchema.safeParse({ title: 'New Title' }).success).toBe(true)
    expect(reviewUpdateSchema.safeParse({}).success).toBe(true)
  })
})

describe('sortSchema', () => {
  it('should parse with defaults', () => {
    const result = sortSchema.parse({})
    expect(result.sort).toBe('createdAt')
    expect(result.order).toBe('desc')
  })

  it('should accept valid sort params', () => {
    const result = sortSchema.parse({ sort: 'title', order: 'asc' })
    expect(result.sort).toBe('title')
    expect(result.order).toBe('asc')
  })

  it('should reject invalid order', () => {
    expect(sortSchema.safeParse({ order: 'random' }).success).toBe(false)
  })
})

describe('idParamSchema', () => {
  it('should require non-empty id', () => {
    expect(idParamSchema.safeParse({}).success).toBe(false)
    expect(idParamSchema.safeParse({ id: '' }).success).toBe(false)
  })

  it('should accept valid id', () => {
    expect(idParamSchema.safeParse({ id: 'abc-123' }).success).toBe(true)
  })
})

describe('slugParamSchema', () => {
  it('should require non-empty slug', () => {
    expect(slugParamSchema.safeParse({}).success).toBe(false)
    expect(slugParamSchema.safeParse({ slug: '' }).success).toBe(false)
  })

  it('should accept valid slug', () => {
    expect(slugParamSchema.safeParse({ slug: 'my-movie' }).success).toBe(true)
  })
})
