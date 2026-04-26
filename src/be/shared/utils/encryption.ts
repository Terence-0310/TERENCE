import crypto from 'crypto'

function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET || 'terence-default-secret-key-32b!!!'
  return crypto.createHash('sha256').update(String(secret)).digest()
}

const ALGORITHM = 'aes-256-gcm'

/**
 * Mã hoá an toàn mọi object/metadata thành dạng chuỗi base64.
 * Sử dụng thuật toán AES-256-GCM.
 */
export function encryptMetadata(metadata: any): any {
  if (!metadata) return metadata
  
  try {
    const text = JSON.stringify(metadata)
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
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

  try {
    const { data, iv, authTag } = encryptedMetadata
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(iv, 'base64'))
    decipher.setAuthTag(Buffer.from(authTag, 'base64'))
    let decrypted = decipher.update(data, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    return JSON.parse(decrypted)
  } catch (err) {
    console.error('[Encryption] Failed to decrypt:', err)
    return { error: 'Failed to decrypt metadata, key might be invalid' }
  }
}
