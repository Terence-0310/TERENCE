// ============================================
// Zod Validators — Unified validation schemas
// ============================================
// Consolidated validation for all API inputs.
// Re-exports existing validators + adds new ones.

import { z } from 'zod'

// ── Re-export existing validators ──
export {
  movieCreateSchema,
  movieUpdateSchema,
  episodeCreateSchema,
  episodeUpdateSchema,
  shortCreateSchema,
  shortUpdateSchema,
  userCreateSchema,
  userUpdateSchema,
  generateSlug,
} from '@/src/be/modules/admin/validators'

// ── Pagination query ──
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ── Sort query ──
export const sortSchema = z.object({
  sort: z.string().optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

// ── Search query ──
export const searchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['movie', 'series', 'anime', 'all']).optional().default('all'),
})

// ── Review create ──
export const reviewCreateSchema = z.object({
  movieId: z.string().min(1),
  rating: z.number().min(0).max(10),
  title: z.string().max(200).optional().nullable(),
  content: z.string().max(5000).optional().nullable(),
  isSpoiler: z.boolean().default(false),
})

// ── Review update ──
export const reviewUpdateSchema = reviewCreateSchema.partial().omit({ movieId: true })

// ── News create ──
export const newsCreateSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().max(1000).optional().nullable(),
  content: z.string().max(50000).optional().nullable(),
  coverImage: z.string().max(1000).optional().nullable(),
  status: z.enum(['draft', 'published', 'hidden', 'archived']).default('draft'),
  tags: z.string().max(500).optional().nullable(),
})

export const newsUpdateSchema = newsCreateSchema.partial()

// ── Genre create/update ──
export const genreCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  tmdbId: z.number().int().optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export const genreUpdateSchema = genreCreateSchema.partial()

// ── Country create/update ──
export const countryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  code: z.string().max(5).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

export const countryUpdateSchema = countryCreateSchema.partial()

// ── Login ──
export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
})

// ── Signup ──
export const signupSchema = z.object({
  name: z.string().min(1, 'Tên là bắt buộc').max(200),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải ít nhất 8 ký tự').max(100),
})

// ── Watch progress ──
export const watchProgressSchema = z.object({
  movieId: z.string().min(1),
  episodeId: z.string().optional().nullable(),
  progress: z.number().min(0).max(1),
  currentTime: z.number().int().min(0).optional(),
  duration: z.number().int().min(0).optional(),
})

// ── ID param ──
export const idParamSchema = z.object({
  id: z.string().min(1),
})

export const slugParamSchema = z.object({
  slug: z.string().min(1),
})
