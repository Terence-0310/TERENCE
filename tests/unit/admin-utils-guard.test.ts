// Regression: admin.utils.requireAdmin used to drop its permission argument,
// so any dashboard user (EDITOR/STAFF) passed checks like 'metadata.manage'.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getCurrentUser = vi.fn()
vi.mock('@/src/be/modules/auth', () => ({ AuthService: { getCurrentUser: () => getCurrentUser() } }))
vi.mock('@/src/be/shared/db/prisma', () => ({ prisma: {} }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

import { requireAdmin } from '@/src/be/modules/admin/admin.utils'

describe('admin.utils requireAdmin', () => {
  beforeEach(() => getCurrentUser.mockReset())

  it('rejects an EDITOR for metadata.manage (not in the EDITOR matrix)', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u1', role: 'EDITOR' })
    const res = await requireAdmin('metadata.manage')
    expect('error' in res && res.error?.status).toBe(403)
  })

  it('rejects a STAFF for news.manage', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u2', role: 'STAFF' })
    const res = await requireAdmin('news.manage')
    expect('error' in res && res.error?.status).toBe(403)
  })

  it('allows an EDITOR for news.manage', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u3', role: 'EDITOR' })
    const res = await requireAdmin('news.manage')
    expect('error' in res).toBe(false)
  })

  it('returns 401 without a session', async () => {
    getCurrentUser.mockResolvedValue(null)
    const res = await requireAdmin('news.manage')
    expect('error' in res && res.error?.status).toBe(401)
  })
})
