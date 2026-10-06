// ============================================
// Integration tests — PUT /api/admin/users/[id]/permissions
// ============================================
// Covers the per-user permission override flow end to end through the route
// handler, with only the database mocked:
//   • overrides are persisted even though the Permission table isn't seeded
//   • an actor can't grant permissions they don't hold (no escalation)
//   • only users below the actor in the role hierarchy can be edited
//   • grants that already exist (e.g. from a SUPER_ADMIN) survive edits

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

type Actor = { id: string; email: string; name: string; role: string }
let actor: Actor
let targetRole = 'STAFF'
let existingGrants: string[] = []
// Rows returned for the effective-permission lookup (findMany with include).
let storedOverrides: Array<{ allowed: boolean; scope: string; permission: { key: string } }> = []

const tx = {
  userPermission: { deleteMany: vi.fn(), create: vi.fn() },
  adminLog: { create: vi.fn() },
}
const mockPrisma = {
  user: { findUnique: vi.fn(async () => ({ id: 'target', role: targetRole })) },
  // Empty → the in-code role matrix is used (matches production: not seeded).
  rolePermission: { findMany: vi.fn(async () => []) },
  userPermission: {
    findMany: vi.fn(async (args: { where: { allowed?: boolean } }) =>
      args?.where?.allowed ? existingGrants.map((key) => ({ permission: { key } })) : storedOverrides),
  },
  permission: {
    upsert: vi.fn(async ({ where }: { where: { key: string } }) => ({ id: `perm-${where.key}`, key: where.key })),
  },
  $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
}

vi.mock('@/src/be/shared/db/prisma', () => ({
  get prisma() { return mockPrisma },
}))
vi.mock('@/src/be/modules/admin/audit', () => ({
  logAdminAction: vi.fn(),
  getClientIp: () => '127.0.0.1',
}))
vi.mock('@/src/be/shared/guards/require-auth', () => ({
  requireAdmin: vi.fn(async () => ({ user: actor })),
  requireAuth: vi.fn(),
}))

import { PUT } from '@/app/api/admin/users/[id]/permissions/route'
import { hasPermission } from '@/src/lib/permissions/access-control'

function put(overrides: Array<{ key: string; allowed: boolean }>) {
  const req = new NextRequest('http://localhost/api/admin/users/target/permissions', {
    method: 'PUT',
    body: JSON.stringify({ overrides }),
    headers: { 'content-type': 'application/json' },
  })
  return PUT(req, { params: Promise.resolve({ id: 'target' }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  actor = { id: 'admin-1', email: 'admin@test.vn', name: 'Admin', role: 'ADMIN' }
  targetRole = 'STAFF'
  existingGrants = []
  storedOverrides = []
})

describe('permission overrides', () => {
  it('persists a grant the actor holds, creating the Permission row on demand', async () => {
    const res = await put([{ key: 'news.manage', allowed: true }])
    expect(res.status).toBe(200)
    expect(mockPrisma.permission.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { key: 'news.manage' } }))
    expect(tx.userPermission.create).toHaveBeenCalledWith({
      data: { userId: 'target', permissionId: 'perm-news.manage', allowed: true, scope: 'all' },
    })
  })

  it('blocks granting a permission the actor does not have', async () => {
    // ADMIN has no settings.update in the role matrix.
    const res = await put([{ key: 'settings.update', allowed: true }])
    expect(res.status).toBe(403)
    expect(tx.userPermission.create).not.toHaveBeenCalled()
  })

  it('still allows revoking (deny override) any permission', async () => {
    const res = await put([{ key: 'settings.update', allowed: false }])
    expect(res.status).toBe(200)
    expect(tx.userPermission.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ allowed: false }) }),
    )
  })

  it('keeps an existing grant the actor could not have made', async () => {
    existingGrants = ['settings.update']
    const res = await put([
      { key: 'settings.update', allowed: true },
      { key: 'news.manage', allowed: true },
    ])
    expect(res.status).toBe(200)
    expect(tx.userPermission.create).toHaveBeenCalledTimes(2)
  })

  it('refuses to edit a user at the same level', async () => {
    targetRole = 'ADMIN'
    const res = await put([{ key: 'news.manage', allowed: true }])
    expect(res.status).toBe(403)
  })

  it('lets a SUPER_ADMIN grant anything to an ADMIN', async () => {
    actor = { ...actor, role: 'SUPER_ADMIN' }
    targetRole = 'ADMIN'
    const res = await put([{ key: 'settings.update', allowed: true }])
    expect(res.status).toBe(200)
  })

  it('ignores unknown permission keys', async () => {
    const res = await put([{ key: 'not.a.permission', allowed: true }])
    expect(res.status).toBe(200)
    expect(mockPrisma.permission.upsert).not.toHaveBeenCalled()
    expect(tx.userPermission.create).not.toHaveBeenCalled()
  })

  it('a stored grant / deny actually changes the effective permissions', async () => {
    const staff = { id: 'target', role: 'STAFF' }
    expect(await hasPermission(staff, 'news.manage')).toBe(false)
    expect(await hasPermission(staff, 'movie.create')).toBe(true)

    storedOverrides = [
      { allowed: true, scope: 'all', permission: { key: 'news.manage' } },
      { allowed: false, scope: 'all', permission: { key: 'movie.create' } },
    ]
    expect(await hasPermission(staff, 'news.manage')).toBe(true)
    expect(await hasPermission(staff, 'movie.create')).toBe(false)
  })
})
