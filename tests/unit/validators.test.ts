// ============================================
// Unit Tests — Zod Validators
// ============================================

import { describe, it, expect } from 'vitest'
import {
  movieCreateSchema,
  movieUpdateSchema,
  episodeCreateSchema,
  shortCreateSchema,
  userCreateSchema,
  userUpdateSchema,
  generateSlug,
} from '@/lib/admin/validators'
import {
  paginationSchema,
  searchSchema,
  reviewCreateSchema,
  loginSchema,
  signupSchema,
  watchProgressSchema,
} from '@/lib/validators'

describe('Admin Validators', () => {
  describe('movieCreateSchema', () => {
    it('should accept valid movie data', () => {
      const data = {
        title: 'Avengers: Endgame',
        slug: 'avengers-endgame',
      }
      const result = movieCreateSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject empty title', () => {
      const data = { title: '', slug: 'test' }
      const result = movieCreateSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject invalid slug with spaces', () => {
      const data = { title: 'Test', slug: 'invalid slug' }
      const result = movieCreateSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should accept valid slug with numbers and hyphens', () => {
      const data = { title: 'Test', slug: 'movie-2024-hd' }
      const result = movieCreateSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should default contentType to movie', () => {
      const data = { title: 'Test', slug: 'test' }
      const result = movieCreateSchema.parse(data)
      expect(result.contentType).toBe('movie')
    })

    it('should default status to draft', () => {
      const data = { title: 'Test', slug: 'test' }
      const result = movieCreateSchema.parse(data)
      expect(result.status).toBe('draft')
    })

    it('should accept all content types', () => {
      for (const type of ['movie', 'series', 'anime', 'trailer', 'short']) {
        const data = { title: 'Test', slug: 'test', contentType: type }
        expect(movieCreateSchema.safeParse(data).success).toBe(true)
      }
    })

    it('should reject invalid contentType', () => {
      const data = { title: 'Test', slug: 'test', contentType: 'podcast' }
      expect(movieCreateSchema.safeParse(data).success).toBe(false)
    })

    it('should validate year range', () => {
      expect(movieCreateSchema.safeParse({ title: 'T', slug: 't', year: 1899 }).success).toBe(false)
      expect(movieCreateSchema.safeParse({ title: 'T', slug: 't', year: 2101 }).success).toBe(false)
      expect(movieCreateSchema.safeParse({ title: 'T', slug: 't', year: 2024 }).success).toBe(true)
    })

    it('should validate rating 0-10', () => {
      expect(movieCreateSchema.safeParse({ title: 'T', slug: 't', rating: -1 }).success).toBe(false)
      expect(movieCreateSchema.safeParse({ title: 'T', slug: 't', rating: 11 }).success).toBe(false)
      expect(movieCreateSchema.safeParse({ title: 'T', slug: 't', rating: 8.5 }).success).toBe(true)
    })
  })

  describe('movieUpdateSchema', () => {
    it('should accept partial updates', () => {
      const result = movieUpdateSchema.safeParse({ title: 'New Title' })
      expect(result.success).toBe(true)
    })

    it('should accept empty object', () => {
      const result = movieUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('episodeCreateSchema', () => {
    it('should require movieId', () => {
      const result = episodeCreateSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should accept valid episode', () => {
      const data = { movieId: 'abc', episodeNumber: 1, streamType: 'hls', streamUrl: 'https://example.com/ep1.m3u8' }
      const result = episodeCreateSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should default streamType to mp4', () => {
      const data = { movieId: 'abc' }
      const result = episodeCreateSchema.parse(data)
      expect(result.streamType).toBe('mp4')
    })
  })

  describe('shortCreateSchema', () => {
    it('should require title and videoUrl', () => {
      expect(shortCreateSchema.safeParse({}).success).toBe(false)
      expect(shortCreateSchema.safeParse({ title: 'T', slug: 't' }).success).toBe(false)
    })

    it('should accept valid short', () => {
      const data = { title: 'Short', slug: 'short-1', videoUrl: 'https://example.com/v.mp4' }
      expect(shortCreateSchema.safeParse(data).success).toBe(true)
    })
  })

  describe('userCreateSchema', () => {
    it('should require name, email, password', () => {
      expect(userCreateSchema.safeParse({}).success).toBe(false)
    })

    it('should reject invalid email', () => {
      const data = { name: 'Test', email: 'not-email', password: '12345678' }
      expect(userCreateSchema.safeParse(data).success).toBe(false)
    })

    it('should reject short password', () => {
      const data = { name: 'Test', email: 'test@test.com', password: '1234567' }
      expect(userCreateSchema.safeParse(data).success).toBe(false)
    })

    it('should accept valid user', () => {
      const data = { name: 'Test', email: 'test@test.com', password: '12345678' }
      expect(userCreateSchema.safeParse(data).success).toBe(true)
    })

    it('should default role to user', () => {
      const data = { name: 'Test', email: 'test@test.com', password: '12345678' }
      expect(userCreateSchema.parse(data).role).toBe('user')
    })
  })

  describe('userUpdateSchema', () => {
    it('should accept partial updates', () => {
      expect(userUpdateSchema.safeParse({ name: 'New Name' }).success).toBe(true)
      expect(userUpdateSchema.safeParse({ role: 'admin' }).success).toBe(true)
    })

    it('should reject invalid role', () => {
      expect(userUpdateSchema.safeParse({ role: 'superuser' }).success).toBe(false)
    })
  })

  describe('generateSlug()', () => {
    it('should generate slug from ASCII title', () => {
      expect(generateSlug('Avengers Endgame')).toBe('avengers-endgame')
    })

    it('should handle Vietnamese diacritics', () => {
      expect(generateSlug('Cõng Anh Mà Chạy')).toBe('cong-anh-ma-chay')
    })

    it('should handle đ character', () => {
      expect(generateSlug('Đường Về Nhà')).toBe('duong-ve-nha')
    })

    it('should remove special characters', () => {
      expect(generateSlug('Movie: Title (2024) [HD]!')).toBe('movie-title-2024-hd')
    })

    it('should collapse multiple hyphens', () => {
      expect(generateSlug('Hello   ---   World')).toBe('hello-world')
    })

    it('should trim leading/trailing hyphens', () => {
      expect(generateSlug('  -Hello World-  ')).toBe('hello-world')
    })

    it('should limit to 200 characters', () => {
      const long = 'a'.repeat(300)
      expect(generateSlug(long).length).toBeLessThanOrEqual(200)
    })
  })
})

describe('App Validators', () => {
  describe('paginationSchema', () => {
    it('should parse page and limit with defaults', () => {
      const result = paginationSchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should coerce string numbers', () => {
      const result = paginationSchema.parse({ page: '3', limit: '50' })
      expect(result.page).toBe(3)
      expect(result.limit).toBe(50)
    })

    it('should reject limit over 100', () => {
      const result = paginationSchema.safeParse({ limit: '200' })
      expect(result.success).toBe(false)
    })

    it('should reject page 0', () => {
      const result = paginationSchema.safeParse({ page: '0' })
      expect(result.success).toBe(false)
    })
  })

  describe('searchSchema', () => {
    it('should require at least 1 char query', () => {
      expect(searchSchema.safeParse({ q: '' }).success).toBe(false)
    })

    it('should accept valid search', () => {
      expect(searchSchema.safeParse({ q: 'avengers' }).success).toBe(true)
    })

    it('should default type to all', () => {
      expect(searchSchema.parse({ q: 'test' }).type).toBe('all')
    })
  })

  describe('reviewCreateSchema', () => {
    it('should require movieId and rating', () => {
      expect(reviewCreateSchema.safeParse({}).success).toBe(false)
    })

    it('should validate rating 0-10', () => {
      expect(reviewCreateSchema.safeParse({ movieId: 'x', rating: -1 }).success).toBe(false)
      expect(reviewCreateSchema.safeParse({ movieId: 'x', rating: 11 }).success).toBe(false)
      expect(reviewCreateSchema.safeParse({ movieId: 'x', rating: 8 }).success).toBe(true)
    })
  })

  describe('loginSchema', () => {
    it('should require email and password', () => {
      expect(loginSchema.safeParse({}).success).toBe(false)
    })

    it('should validate email format', () => {
      expect(loginSchema.safeParse({ email: 'bad', password: 'x' }).success).toBe(false)
      expect(loginSchema.safeParse({ email: 'ok@test.com', password: 'x' }).success).toBe(true)
    })
  })

  describe('signupSchema', () => {
    it('should enforce min 8 char password', () => {
      const data = { name: 'Test', email: 'test@test.com', password: '1234567' }
      expect(signupSchema.safeParse(data).success).toBe(false)
    })

    it('should accept valid signup', () => {
      const data = { name: 'Test', email: 'test@test.com', password: '12345678' }
      expect(signupSchema.safeParse(data).success).toBe(true)
    })
  })

  describe('watchProgressSchema', () => {
    it('should require movieId and progress', () => {
      expect(watchProgressSchema.safeParse({}).success).toBe(false)
    })

    it('should validate progress range 0-1', () => {
      expect(watchProgressSchema.safeParse({ movieId: 'x', progress: -0.1 }).success).toBe(false)
      expect(watchProgressSchema.safeParse({ movieId: 'x', progress: 1.1 }).success).toBe(false)
      expect(watchProgressSchema.safeParse({ movieId: 'x', progress: 0.5 }).success).toBe(true)
    })
  })
})
