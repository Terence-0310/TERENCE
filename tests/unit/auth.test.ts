// ============================================
// Unit Tests — Auth Helpers
// ============================================

import { describe, it, expect } from 'vitest'
import { AuthService, type PublicUser } from '@/src/be/modules/auth'
import { hasPermission, canAccessDashboard, canChangeRole, getRoleLabel } from '@/src/be/modules/auth/permissions'

describe('lib/auth/password', () => {
  it('should hash a password', async () => {
    const hash = await AuthService.hashPassword('mypassword')
    expect(hash).not.toBe('mypassword')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('should verify correct password', async () => {
    const hash = await AuthService.hashPassword('correct-password')
    const result = await AuthService.verifyPassword('correct-password', hash)
    expect(result).toBe(true)
  })

  it('should reject wrong password', async () => {
    const hash = await AuthService.hashPassword('correct-password')
    const result = await AuthService.verifyPassword('wrong-password', hash)
    expect(result).toBe(false)
  })

  it('should produce different hashes for same password', async () => {
    const hash1 = await AuthService.hashPassword('same-password')
    const hash2 = await AuthService.hashPassword('same-password')
    expect(hash1).not.toBe(hash2) // bcrypt uses random salt
  })
})

describe('lib/auth/permissions', () => {
  const admin: PublicUser = { email: 'admin@test.com', name: 'Admin', role: 'admin' }
  const staff: PublicUser = { email: 'staff@test.com', name: 'Staff', role: 'staff' }
  const editor: PublicUser = { email: 'editor@test.com', name: 'Editor', role: 'editor' }
  const user: PublicUser = { email: 'user@test.com', name: 'User', role: 'user' }

  describe('hasPermission()', () => {
    it('should return false for null user', async () => {
      expect(await hasPermission(null, 'dashboard.view' as any)).toBe(false)
    })

    it('should grant admin dashboard access', async () => {
      expect(await hasPermission(admin, 'dashboard.view' as any)).toBe(true)
    })

    it('should deny regular user dashboard access', async () => {
      expect(await hasPermission(user, 'dashboard.view' as any)).toBe(false)
    })

    it('should grant admin movie creation but deny deletion per new policy', async () => {
      expect(await hasPermission(admin, 'movie.create' as any)).toBe(true)
      expect(await hasPermission(admin, 'movie.delete' as any)).toBe(false)
    })

    it('should deny staff movie deletion', async () => {
      expect(await hasPermission(staff, 'movie.delete' as any)).toBe(false)
    })

    it('should grant staff movie creation', async () => {
      expect(await hasPermission(staff, 'movie.create' as any)).toBe(true)
    })

    it('should deny editor user management', async () => {
      expect(await hasPermission(editor, 'user.read' as any)).toBe(false)
    })

    it('should deny user all permissions', async () => {
      expect(await hasPermission(user, 'movie.read' as any)).toBe(false)
      expect(await hasPermission(user, 'user.read' as any)).toBe(false)
    })
  })

  describe('canAccessDashboard()', () => {
    it('should allow admin', async () => {
      expect(await canAccessDashboard(admin)).toBe(true)
    })

    it('should allow staff', async () => {
      expect(await canAccessDashboard(staff)).toBe(true)
    })

    it('should allow editor', async () => {
      expect(await canAccessDashboard(editor)).toBe(true)
    })

    it('should deny regular user', async () => {
      expect(await canAccessDashboard(user)).toBe(false)
    })

    it('should deny null', async () => {
      expect(await canAccessDashboard(null)).toBe(false)
    })
  })

  describe('canChangeRole()', () => {
    it('should allow admin to promote user to staff', () => {
      expect(canChangeRole(admin, 'user', 'staff')).toBe(true)
    })

    it('should deny staff promoting to admin', () => {
      expect(canChangeRole(staff, 'user', 'admin')).toBe(false)
    })

    it('should deny changing equal-level role', () => {
      expect(canChangeRole(admin, 'admin', 'staff')).toBe(false)
    })

    it('should deny changing higher-level role', () => {
      expect(canChangeRole(staff, 'admin', 'user')).toBe(false)
    })
  })

  describe('getRoleLabel()', () => {
    it('should return human labels', () => {
      expect(getRoleLabel('super_admin')).toBe('Super Admin')
      expect(getRoleLabel('admin')).toBe('Admin')
      expect(getRoleLabel('staff')).toBe('Staff')
      expect(getRoleLabel('editor')).toBe('Editor')
      expect(getRoleLabel('user')).toBe('User')
    })

    it('should return raw string for unknown role', () => {
      expect(getRoleLabel('unknown_role')).toBe('unknown_role')
    })
  })
})
