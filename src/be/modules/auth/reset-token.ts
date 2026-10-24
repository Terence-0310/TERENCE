// One-time auth tokens (password reset, email verification) are stored as
// SHA-256 digests: a leaked database row (dump, backup, read replica) must not
// be usable to reset a password or verify an email. The raw token only ever
// exists in the email link.

import crypto from 'crypto'

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const hashResetToken = hashToken

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('hex')
  return { token, tokenHash: hashToken(token) }
}
