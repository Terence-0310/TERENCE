import { z } from 'zod'

export const movieCreateSchema = z.object({
  title: z.string().min(1, 'Tên phim là bắt buộc').max(500),
  originalTitle: z.string().max(500).optional().nullable(),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/, 'Slug chỉ chứa chữ thường, số và dấu gạch ngang'),
  description: z.string().max(10000).optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  contentType: z.enum(['movie', 'series', 'anime', 'trailer', 'short']).default('movie'),
  status: z.enum(['draft', 'published', 'hidden', 'archived']).default('draft'),
  posterUrl: z.string().max(1000).optional().nullable(),
  backdropUrl: z.string().max(1000).optional().nullable(),
  thumbUrl: z.string().max(1000).optional().nullable(),
  trailerUrl: z.string().max(2000).optional().nullable(),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(),
  quality: z.string().max(20).optional().nullable(),
  language: z.string().max(50).optional().nullable(),


  rating: z.number().min(0).max(10).optional().nullable(),
  ageRating: z.string().max(10).optional().nullable(),
  tags: z.string().max(1000).optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  seoKeywords: z.string().max(500).optional().nullable(),
  isFeatured: z.boolean().default(false),
  isTrending: z.boolean().default(false),
  isRecommended: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  isCopyright: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sourceStatus: z.enum(['active', 'missing', 'broken', 'pending']).optional(),
  // Phase 1 new fields (optional for create)
  ophimId: z.string().max(200).optional().nullable(),
  tmdbId: z.number().int().optional().nullable(),
  imdbId: z.string().max(50).optional().nullable(),
  episodeCurrent: z.string().max(50).optional().nullable(),
  episodeTotal: z.number().int().optional().nullable(),
  trailerSite: z.string().max(50).optional().nullable(),
  trailerKey: z.string().max(200).optional().nullable(),
  metadataSource: z.enum(['ophim', 'tmdb', 'manual']).optional().nullable(),
  matchConfidence: z.number().min(0).max(1).optional().nullable(),
})

export const movieUpdateSchema = movieCreateSchema.partial()

export const episodeCreateSchema = z.object({
  movieId: z.string().min(1),
  episodeNumber: z.number().int().min(1).default(1),
  episodeOrder: z.number().int().default(0),
  episodeName: z.string().max(200).optional().nullable(),
  episodeSlug: z.string().max(200).optional().nullable(),
  title: z.string().max(500).optional(),
  slug: z.string().max(500).optional(),
  sourceName: z.string().max(100).optional().nullable(),
  serverName: z.string().max(100).optional().nullable(),
  streamType: z.enum(['iframe', 'mp4', 'hls', 'youtube', 'dash']).default('mp4'),
  streamUrl: z.string().max(2000).optional().nullable(),
  sourceUrl: z.string().max(2000).optional(),
  backupSourceUrl: z.string().max(2000).optional(),
  subtitleUrl: z.string().max(2000).optional(),
  duration: z.number().int().min(0).optional(),
  quality: z.string().max(20).optional(),
  language: z.string().max(50).optional(),
  sortOrder: z.number().int().default(0),
  status: z.enum(['active', 'broken', 'hidden', 'pending']).default('active'),
  isActive: z.boolean().default(true),
})

export const episodeUpdateSchema = episodeCreateSchema.partial().omit({ movieId: true })

export const shortCreateSchema = z.object({
  movieId: z.string().optional().nullable(),
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(500),
  slug: z.string().min(1).max(500).regex(/^[a-z0-9-]+$/, 'Slug chỉ chứa chữ thường, số và dấu gạch ngang'),
  description: z.string().max(2000).optional().nullable(),
  videoUrl: z.string().min(1, 'Video URL là bắt buộc').max(2000),
  sourceType: z.enum(['mp4', 'hls', 'youtube', 'iframe']).default('mp4'),
  thumbnailUrl: z.string().max(1000).optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(),
  hashtags: z.string().max(500).optional().nullable(),
  status: z.enum(['draft', 'published', 'hidden', 'archived']).default('draft'),
})

export const shortUpdateSchema = shortCreateSchema.partial()

export const userCreateSchema = z.object({
  name: z.string().min(2, 'Tên phải từ 2 ký tự').max(50, 'Tên quá dài'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải từ 8 ký tự'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'EDITOR', 'USER']).default('USER'),
})

export const userUpdateSchema = z.object({
  name: z.string().min(2, 'Tên phải từ 2 ký tự').optional(),
  email: z.string().email().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'STAFF', 'EDITOR', 'USER']).optional(),
  isActive: z.boolean().optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  blockedReason: z.string().max(500).optional().nullable(),
  avatar: z.string().max(1000).optional().nullable(),
})

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200)
}
