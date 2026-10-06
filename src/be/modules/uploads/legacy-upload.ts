import path from 'path'
import fs from 'fs/promises'
import { prisma } from '@/src/be/shared/db/prisma'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')

// ─── Allowed types ──────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

// Extension is always derived from the verified type — never from the
// client's filename — so an upload can't land as e.g. `.html` and be served
// from our origin.
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
}

// ─── Size limits ────────────────────────────────────────────────
const MAX_MOVIE_IMAGE_SIZE = 5 * 1024 * 1024  // 5MB for movie posters/backdrops/thumbnails
const MAX_GENERAL_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB general
const MAX_VIDEO_SIZE = 500 * 1024 * 1024       // 500MB
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB

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

/**
 * Detect the real file type from its first bytes (magic numbers). Returns
 * null for anything that isn't one of the allowed image/video formats.
 */
function sniffMimeType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') return 'video/mp4'
  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm'
  return null
}

/** Keep only safe path segments (letters, digits, `_`, `-`) — blocks `..` traversal. */
function sanitizeSubDir(subDir: string): string {
  const segments = subDir
    .split(/[\\/]+/)
    .map((seg) => seg.replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)
  return segments.length > 0 ? segments.join('/') : 'general'
}

function generateUniqueFileName(originalName: string, ext: string): string {
  const base = path.basename(originalName, path.extname(originalName))
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
  const buffer = Buffer.from(await file.arrayBuffer())
  const sniffed = sniffMimeType(buffer)
  if (!sniffed || !ALLOWED_IMAGE_TYPES.includes(sniffed)) {
    throw new Error('Nội dung file không phải ảnh JPEG/PNG/WebP hợp lệ')
  }
  const fileName = generateMovieMediaFileName(movieId, `x${EXTENSION_BY_MIME[sniffed]}`)
  const filePath = path.join(targetDir, fileName)

  // Write file
  await fs.writeFile(filePath, buffer)

  const url = `/uploads/${subDir}/${fileName}`

  // Track in DB
  await prisma.upload.create({
    data: {
      fileName,
      originalName: file.name,
      mimeType: sniffed,
      size: file.size,
      path: filePath,
      url,
      uploadedBy: uploadedBy || null,
    },
  })

  return { fileName, originalName: file.name, mimeType: sniffed, size: file.size, path: filePath, url }
}

// ─── General Upload (legacy support) ────────────────────────────

export interface FileUploadOptions {
  /** Reject videos (e.g. avatars). */
  imagesOnly?: boolean
  /** Override the size cap in bytes. */
  maxSize?: number
}

export async function handleFileUpload(
  file: File,
  rawSubDir: string = 'general',
  uploadedBy?: string,
  options: FileUploadOptions = {},
): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer())
  // Trust the bytes, not the client-declared Content-Type.
  const mimeType = sniffMimeType(buffer)
  const isImage = !!mimeType && ALLOWED_IMAGE_TYPES.includes(mimeType)
  const isVideo = !!mimeType && ALLOWED_VIDEO_TYPES.includes(mimeType)

  if (!mimeType || (!isImage && !isVideo) || (options.imagesOnly && !isImage)) {
    throw new Error(
      options.imagesOnly
        ? 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP'
        : `Loại file không được hỗ trợ: ${file.type || 'không xác định'}`,
    )
  }

  const maxSize = options.maxSize ?? (isImage ? MAX_GENERAL_IMAGE_SIZE : MAX_VIDEO_SIZE)
  if (file.size > maxSize) {
    throw new Error(`File quá lớn. Tối đa ${Math.round(maxSize / 1024 / 1024)}MB`)
  }

  const subDir = sanitizeSubDir(rawSubDir)
  const targetDir = path.join(UPLOAD_DIR, subDir)
  await ensureDir(targetDir)

  const fileName = generateUniqueFileName(file.name, EXTENSION_BY_MIME[mimeType])
  const filePath = path.join(targetDir, fileName)

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
