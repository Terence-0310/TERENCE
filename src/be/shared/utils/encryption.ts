import crypto from 'crypto'

// Keys: DATA_ENCRYPTION_KEY when set, else NEXTAUTH_SECRET (historical key).
// Decryption tries both, so NEXTAUTH_SECRET can be rotated by first setting
// DATA_ENCRYPTION_KEY to its old value — existing metadata stays readable.
// No hardcoded fallback — a missing secret must never mean a public key.
function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest()
}

function getKey(): Buffer {
  const secret = process.env.DATA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('DATA_ENCRYPTION_KEY or NEXTAUTH_SECRET is required for metadata encryption')
  return deriveKey(secret)
}

function getDecryptionKeys(): Buffer[] {
  const secrets = [process.env.DATA_ENCRYPTION_KEY, process.env.NEXTAUTH_SECRET].filter((s): s is string => !!s)
  return [...new Set(secrets)].map(deriveKey)
}

const ALGORITHM = 'aes-256-gcm'
// Pin the GCM tag length so truncated (forgeable) tags are rejected on decrypt.
const AUTH_TAG_LENGTH = 16

/**
 * Mã hoá an toàn mọi object/metadata thành dạng chuỗi base64.
 * Sử dụng thuật toán AES-256-GCM.
 */
export function encryptMetadata(metadata: any): any {
  if (!metadata) return metadata
  
  try {
    const text = JSON.stringify(metadata)
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv, { authTagLength: AUTH_TAG_LENGTH })
    let encrypted = cipher.update(text, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    const authTag = cipher.getAuthTag().toString('base64')

    return {
      _encrypted: true,
      data: encrypted,
      iv: iv.toString('base64'),
      authTag,
    }
  } catch (err) {
    console.error('[Encryption] Failed to encrypt:', err)
    return metadata // Fallback an toàn
  }
}

/**
 * Giải mã object metadata nếu có chứa cờ _encrypted.
 * Trả về raw object ban đầu.
 */
export function decryptMetadata(encryptedMetadata: any): any {
  if (!encryptedMetadata || typeof encryptedMetadata !== 'object' || !encryptedMetadata._encrypted) {
    return encryptedMetadata
  }

  const { data, iv, authTag } = encryptedMetadata
  let lastErr: unknown = new Error('No decryption key configured')
  for (const key of getDecryptionKeys()) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'), {
        authTagLength: AUTH_TAG_LENGTH,
      })
      decipher.setAuthTag(Buffer.from(authTag, 'base64'))
      let decrypted = decipher.update(data, 'base64', 'utf8')
      decrypted += decipher.final('utf8')
      return JSON.parse(decrypted)
    } catch (err) {
      lastErr = err // wrong key or tampered data — try the next key
    }
  }
  console.error('[Encryption] Failed to decrypt:', lastErr)
  return { error: 'Failed to decrypt metadata, key might be invalid' }
}
