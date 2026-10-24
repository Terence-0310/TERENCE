// ============================================
// Unit tests — uploads to Neon Object Storage (S3-compatible)
// ============================================
// With UPLOADS_BUCKET + AWS_* set, uploads go to the bucket (never the local
// disk) and return public bucket URLs; only URLs we issued may be deleted.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const send = vi.fn().mockResolvedValue({})
const writeFile = vi.fn().mockResolvedValue(undefined)

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function (this: { config: unknown }, config: unknown) {
    this.config = config
    return { send }
  }),
  PutObjectCommand: vi.fn().mockImplementation(function (input) { return { kind: 'put', input } }),
  DeleteObjectCommand: vi.fn().mockImplementation(function (input) { return { kind: 'delete', input } }),
}))
vi.mock('fs/promises', () => ({
  default: { writeFile: (...a: unknown[]) => writeFile(...a), mkdir: vi.fn(), unlink: vi.fn() },
}))
const uploadCreate = vi.fn().mockResolvedValue({})
vi.mock('@/src/be/shared/db/prisma', () => ({
  prisma: { upload: { create: (...a: unknown[]) => uploadCreate(...a), deleteMany: vi.fn() } },
}))

import { S3Client } from '@aws-sdk/client-s3'
import { handleFileUpload, deleteUploadedFile, isManagedUploadUrl } from '@/src/be/modules/uploads/legacy-upload'

const ENDPOINT = 'https://br-test.storage.c-4.ap-southeast-1.aws.neon.tech'
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const png = () => new File([new Uint8Array(PNG)], 'me.png', { type: 'image/png' })

beforeEach(() => {
  send.mockClear()
  writeFile.mockClear()
  uploadCreate.mockClear()
  vi.stubEnv('UPLOADS_BUCKET', 'uploads')
  vi.stubEnv('AWS_ENDPOINT_URL_S3', ENDPOINT)
  vi.stubEnv('AWS_ACCESS_KEY_ID', 'test-key')
  vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test-secret')
  vi.stubEnv('AWS_REGION', 'ap-southeast-1')
})
afterEach(() => vi.unstubAllEnvs())

describe('uploads with object storage', () => {
  it('puts the file in the bucket with the sniffed type and returns its public URL', async () => {
    const result = await handleFileUpload(png(), 'avatars', 'u1', { imagesOnly: true })

    expect(writeFile).not.toHaveBeenCalled()
    const cmd = send.mock.calls[0][0]
    expect(cmd.kind).toBe('put')
    expect(cmd.input).toMatchObject({ Bucket: 'uploads', ContentType: 'image/png' })
    expect(cmd.input.Key).toMatch(/^avatars\/me_\d+_[a-z0-9]+\.png$/)
    expect(result.url).toBe(`${ENDPOINT}/uploads/${cmd.input.Key}`)
    expect(result.path).toBe(`s3://uploads/${cmd.input.Key}`)
    expect(uploadCreate.mock.calls[0][0].data.url).toBe(result.url)
  })

  it('uses path-style addressing (required by Neon)', async () => {
    await handleFileUpload(png(), 'avatars')
    const config = vi.mocked(S3Client).mock.calls.at(-1)?.[0]
    expect(config).toMatchObject({ endpoint: ENDPOINT, region: 'ap-southeast-1', forcePathStyle: true })
  })

  it('honours UPLOADS_PUBLIC_BASE_URL (CDN in front of the bucket)', async () => {
    vi.stubEnv('UPLOADS_PUBLIC_BASE_URL', 'https://cdn.example.org/')
    const result = await handleFileUpload(png(), 'avatars')
    expect(result.url).toMatch(/^https:\/\/cdn\.example\.org\/avatars\//)
  })

  it('deletes only objects we issued', async () => {
    await deleteUploadedFile(`${ENDPOINT}/uploads/avatars/me_1_abc.png`)
    expect(send.mock.calls[0][0]).toMatchObject({ kind: 'delete', input: { Bucket: 'uploads', Key: 'avatars/me_1_abc.png' } })

    send.mockClear()
    await deleteUploadedFile('https://img.ophim.live/uploads/movies/x.jpg')
    await deleteUploadedFile(`${ENDPOINT}/other-bucket/x.png`)
    await deleteUploadedFile(`${ENDPOINT}/uploads/../secret`)
    expect(send).not.toHaveBeenCalled()
  })

  it('recognises managed URLs', () => {
    expect(isManagedUploadUrl(`${ENDPOINT}/uploads/movies/poster/movie_1_2_x.jpg`)).toBe(true)
    expect(isManagedUploadUrl('/uploads/avatars/a.png')).toBe(true)
    expect(isManagedUploadUrl('https://image.tmdb.org/t/p/w500/a.jpg')).toBe(false)
    expect(isManagedUploadUrl(null)).toBe(false)
  })

  it('falls back to the local disk when storage is not configured', async () => {
    vi.stubEnv('UPLOADS_BUCKET', '')
    const result = await handleFileUpload(png(), 'avatars')
    expect(send).not.toHaveBeenCalled()
    expect(writeFile).toHaveBeenCalledOnce()
    expect(result.url).toMatch(/^\/uploads\/avatars\//)
  })
})
