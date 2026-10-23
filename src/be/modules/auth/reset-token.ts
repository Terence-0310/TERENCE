// Password-reset tokens are stored as SHA-256 digests: a leaked database row
// (dump, backup, read replica) must not be usable to reset someone's password.
// The raw token only ever exists in the email link.

import crypto from 'crypto'

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex')
  return { token, tokenHash: hashResetToken(token) }
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
