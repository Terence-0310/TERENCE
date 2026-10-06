// ============================================
// Unit tests — legacy-upload hardening
// ============================================
// handleFileUpload must (1) trust the file bytes, not the declared MIME type,
// (2) derive the extension from the verified type and (3) keep every write
// inside public/uploads no matter what `subDir` the caller passes.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

const writeFile = vi.fn().mockResolvedValue(undefined)
const mkdir = vi.fn().mockResolvedValue(undefined)

vi.mock('fs/promises', () => ({
  default: { writeFile: (...a: unknown[]) => writeFile(...a), mkdir: (...a: unknown[]) => mkdir(...a), unlink: vi.fn() },
}))

vi.mock('@/src/be/shared/db/prisma', () => ({
  prisma: { upload: { create: vi.fn().mockResolvedValue({}), deleteMany: vi.fn() } },
}))

import { handleFileUpload, handleMovieMediaUpload } from '@/src/be/modules/uploads/legacy-upload'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
const MP4 = Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])

function makeFile(bytes: Buffer | string, name: string, type: string): File {
  return new File([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], name, { type })
}

function writtenPath(): string {
  return writeFile.mock.calls[0][0] as string
}

beforeEach(() => {
  writeFile.mockClear()
  mkdir.mockClear()
})

describe('handleFileUpload()', () => {
  it('rejects HTML disguised as an image via the Content-Type', async () => {
    const file = makeFile('<html><script>alert(1)</script></html>', 'evil.html', 'image/png')
    await expect(handleFileUpload(file, 'avatars')).rejects.toThrow()
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('names the file after the verified type, not the client filename', async () => {
    const result = await handleFileUpload(makeFile(PNG, 'evil.html', 'text/html'), 'avatars')
    expect(result.fileName.endsWith('.png')).toBe(true)
    expect(result.mimeType).toBe('image/png')
    expect(writtenPath().endsWith('.png')).toBe(true)
  })

  it.each([
    ['../../etc', 'etc'],
    ['..\\..\\windows\\system32', 'windows/system32'],
    ['avatars/../../../secret', 'avatars/secret'],
    ['../', 'general'],
    ['', 'general'],
  ])('keeps subDir %j inside public/uploads', async (subDir, expected) => {
    const result = await handleFileUpload(makeFile(JPEG, 'a.jpg', 'image/jpeg'), subDir)
    expect(result.url.startsWith(`/uploads/${expected}/`)).toBe(true)
    const dir = path.dirname(writtenPath())
    expect(dir).toBe(path.join(UPLOAD_DIR, expected))
    expect(path.relative(UPLOAD_DIR, dir).startsWith('..')).toBe(false)
  })

  it('accepts videos by default but not when imagesOnly is set', async () => {
    const ok = await handleFileUpload(makeFile(MP4, 'clip.mp4', 'video/mp4'), 'general')
    expect(ok.fileName.endsWith('.mp4')).toBe(true)
    await expect(
      handleFileUpload(makeFile(MP4, 'clip.mp4', 'video/mp4'), 'avatars', undefined, { imagesOnly: true }),
    ).rejects.toThrow('Chỉ chấp nhận ảnh')
  })

  it('enforces a custom size cap', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(2048)])
    await expect(
      handleFileUpload(makeFile(big, 'a.png', 'image/png'), 'avatars', undefined, { maxSize: 1024 }),
    ).rejects.toThrow('File quá lớn')
  })
})

describe('handleMovieMediaUpload()', () => {
  it('rejects a non-image whose name and declared type look valid', async () => {
    const file = makeFile('<svg onload=alert(1)>', 'poster.png', 'image/png')
    await expect(handleMovieMediaUpload(file, 'movie1', 'poster')).rejects.toThrow()
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('stores a real image with the extension of its actual format', async () => {
    const result = await handleMovieMediaUpload(makeFile(JPEG, 'poster.png', 'image/png'), 'movie1', 'poster')
    expect(result.fileName).toMatch(/^movie_movie1_\d+_[a-z0-9]+\.jpg$/)
    expect(result.mimeType).toBe('image/jpeg')
  })
})
