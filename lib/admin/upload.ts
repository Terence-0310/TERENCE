import path from 'path'
import fs from 'fs/promises'
import { prisma } from '@/lib/auth/db'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

// ─── Allowed types ──────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

// ─── Size limits ────────────────────────────────────────────────
const MAX_MOVIE_IMAGE_SIZE = 5 * 1024 * 1024  // 5MB for movie posters/backdrops/thumbnails
const MAX_GENERAL_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB general
const MAX_VIDEO_SIZE = 500 * 1024 * 1024       // 500MB

export type MovieMediaField = 'poster' | 'backdrop' | 'thumbnail'

export interface UploadResult {
  fileName: string
  originalName: string
  mimeType: string
  size: number
  path: string
  url: string
}

// ─── Helpers ────────────────────────────────────────────────────
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true })
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 200)
}

function generateUniqueFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  const base = path.basename(originalName, ext)
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${sanitizeFileName(base)}_${timestamp}_${random}${ext}`
}

/** Generate secure movie media filename: movieId_timestamp_random.ext */
function generateMovieMediaFileName(movieId: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  // Sanitize movieId to prevent path traversal
  const safeMovieId = movieId.replace(/[^a-zA-Z0-9_-]/g, '')
  return `movie_${safeMovieId}_${timestamp}_${random}${ext}`
}

// ─── Validation ─────────────────────────────────────────────────

/** Validate a file for movie image upload (poster/backdrop/thumbnail) */
export function validateMovieImage(file: File): { valid: boolean; error?: string } {
  // Check mime type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: `Loại file không hợp lệ: ${file.type}. Chỉ chấp nhận JPEG, PNG, WebP` }
  }

  // Check extension
  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Đuôi file không hợp lệ: ${ext}. Chỉ chấp nhận .jpg, .png, .webp` }
  }

  // Check file size (5MB max)
  if (file.size > MAX_MOVIE_IMAGE_SIZE) {
    return { valid: false, error: `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 5MB` }
  }

  // Basic filename sanitization check — reject suspicious names
  const baseName = path.basename(file.name)
  if (baseName.includes('..') || baseName.includes('/') || baseName.includes('\\')) {
    return { valid: false, error: 'Tên file không hợp lệ' }
  }

  return { valid: true }
}

// ─── Movie Media Upload ─────────────────────────────────────────

/**
 * Upload a movie image (poster/backdrop/thumbnail).
 * - Validates file type, size, extension
 * - Generates secure filename: movie_{id}_{timestamp}_{random}.ext
 * - Stores in /public/uploads/movies/{field}/
 * - Tracks in DB Upload table
 * - Returns URL + metadata
 *
 * Architecture supports future migration to Cloudflare R2, S3, CDN
 * by replacing this function's storage logic.
 */
export async function handleMovieMediaUpload(
  file: File,
  movieId: string,
  field: MovieMediaField,
  uploadedBy?: string
): Promise<UploadResult> {
  // Validate
  const validation = validateMovieImage(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Storage path: /public/uploads/movies/{poster|backdrop|thumbnail}/
  const subDir = `movies/${field}`
  const targetDir = path.join(UPLOAD_DIR, subDir)
  await ensureDir(targetDir)

  // Generate secure filename
  const fileName = generateMovieMediaFileName(movieId, file.name)
  const filePath = path.join(targetDir, fileName)
  const buffer = Buffer.from(await file.arrayBuffer())

  // Write file
  await fs.writeFile(filePath, buffer)

  const url = `/uploads/${subDir}/${fileName}`

  // Track in DB
  await prisma.upload.create({
    data: {
      fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      path: filePath,
      url,
      uploadedBy: uploadedBy || null,
    },
  })

  return { fileName, originalName: file.name, mimeType: file.type, size: file.size, path: filePath, url }
}

// ─── General Upload (legacy support) ────────────────────────────

export async function handleFileUpload(
  file: File,
  subDir: string = 'general',
  uploadedBy?: string
): Promise<UploadResult> {
  const mimeType = file.type
  const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType)
  const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType)

  if (!isImage && !isVideo) {
    throw new Error(`Loại file không được hỗ trợ: ${mimeType}`)
  }

  const maxSize = isImage ? MAX_GENERAL_IMAGE_SIZE : MAX_VIDEO_SIZE
  if (file.size > maxSize) {
    throw new Error(`File quá lớn. Tối đa ${Math.round(maxSize / 1024 / 1024)}MB`)
  }

  const targetDir = path.join(UPLOAD_DIR, subDir)
  await ensureDir(targetDir)

  const fileName = generateUniqueFileName(file.name)
  const filePath = path.join(targetDir, fileName)
  const buffer = Buffer.from(await file.arrayBuffer())

  await fs.writeFile(filePath, buffer)

  const url = `/uploads/${subDir}/${fileName}`

  await prisma.upload.create({
    data: {
      fileName,
      originalName: file.name,
      mimeType,
      size: file.size,
      path: filePath,
      url,
      uploadedBy: uploadedBy || null,
    },
  })

  return { fileName, originalName: file.name, mimeType, size: file.size, path: filePath, url }
}

// ─── Delete ─────────────────────────────────────────────────────

export async function deleteUploadedFile(url: string) {
  if (!url || !url.startsWith('/uploads/')) return
  try {
    const filePath = path.join(process.cwd(), 'public', url)
    await fs.unlink(filePath)
    await prisma.upload.deleteMany({ where: { url } })
  } catch {
    // File might already be deleted
  }
}
