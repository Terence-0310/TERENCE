// ============================================
// Object storage for user uploads (Neon Object Storage, S3-compatible)
// ============================================
// Enabled when UPLOADS_BUCKET and the AWS-standard credentials injected by
// Neon (`neon deploy` / `neon env pull`) are present:
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION
// Otherwise uploads stay on the local disk (public/uploads) — fine for dev,
// but not for hosts with an ephemeral filesystem such as Render Free.
//
// The bucket is `public_read`, so stored objects are served straight from
// `${AWS_ENDPOINT_URL_S3}/<bucket>/<key>` (or UPLOADS_PUBLIC_BASE_URL when a
// CDN sits in front). Keys are unique per upload, so objects are immutable.

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

interface StorageConfig {
  bucket: string
  endpoint: string
  region: string
  publicBaseUrl: string
}

function getConfig(): StorageConfig | null {
  const bucket = process.env.UPLOADS_BUCKET?.trim()
  const endpoint = process.env.AWS_ENDPOINT_URL_S3?.trim().replace(/\/+$/, '')
  if (!bucket || !endpoint || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    return null
  }
  const publicBaseUrl =
    process.env.UPLOADS_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') || `${endpoint}/${bucket}`
  return { bucket, endpoint, region: process.env.AWS_REGION || 'us-east-1', publicBaseUrl }
}

let client: S3Client | null = null
let clientKey = ''

function getClient(config: StorageConfig): S3Client {
  const key = `${config.endpoint}|${config.region}`
  if (!client || clientKey !== key) {
    // Credentials come from the standard AWS env chain. Neon requires path-style addressing.
    client = new S3Client({ endpoint: config.endpoint, region: config.region, forcePathStyle: true })
    clientKey = key
  }
  return client
}

export function isObjectStorageEnabled(): boolean {
  return getConfig() !== null
}

/** Upload one object and return its public URL. */
export async function putPublicObject(key: string, body: Buffer, contentType: string): Promise<string> {
  const config = getConfig()
  if (!config) throw new Error('Object storage is not configured')
  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
  return `${config.publicBaseUrl}/${key}`
}

/** The object key behind a URL we issued, or null if the URL is not ours. */
export function objectKeyFromUrl(url: string): string | null {
  const config = getConfig()
  if (!config || !url.startsWith(`${config.publicBaseUrl}/`)) return null
  const key = url.slice(config.publicBaseUrl.length + 1)
  // Same character set the upload helpers produce; rejects `..` and oddities.
  return /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)*$/.test(key) && !key.includes('..') ? key : null
}

export async function deleteObject(key: string): Promise<void> {
  const config = getConfig()
  if (!config) return
  await getClient(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
}

/** `s3://bucket/key` — stored in Upload.path so records show where the bytes live. */
export function objectStoragePath(key: string): string {
  return `s3://${getConfig()?.bucket ?? 'unconfigured'}/${key}`
}
