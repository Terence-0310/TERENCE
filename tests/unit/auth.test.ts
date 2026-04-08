// ============================================
// Unit Tests — Auth Helpers
// ============================================

import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { hasPermission, canAccessDashboard, canChangeRole, getRoleLabel } from '@/lib/auth/permissions'
import type { PublicUser } from '@/lib/auth/current-user'

describe('lib/auth/password', () => {
  it('should hash a password', async () => {
    const hash = await hashPassword('mypassword')
    expect(hash).not.toBe('mypassword')
    expect(hash.length).toBeGreaterThan(0)
  })

  it('should verify correct password', async () => {
    const hash = await hashPassword('correct-password')
    const result = await verifyPassword('correct-password', hash)
    expect(result).toBe(true)
  })

  it('should reject wrong password', async () => {
    const hash = await hashPassword('correct-password')
    const result = await verifyPassword('wrong-password', hash)
    expect(result).toBe(false)
  })

  it('should produce different hashes for same password', async () => {
    const hash1 = await hashPassword('same-password')
    const hash2 = await hashPassword('same-password')
    expect(hash1).not.toBe(hash2) // bcrypt uses random salt
  })
})

describe('lib/auth/permissions', () => {
  const admin: PublicUser = { email: 'admin@test.com', name: 'Admin', role: 'admin' }
  const staff: PublicUser = { email: 'staff@test.com', name: 'Staff', role: 'staff' }
  const editor: PublicUser = { email: 'editor@test.com', name: 'Editor', role: 'editor' }
  const user: PublicUser = { email: 'user@test.com', name: 'User', role: 'user' }

  describe('hasPermission()', () => {
    it('should return false for null user', () => {
      expect(hasPermission(null, 'dashboard.access')).toBe(false)
    })

    it('should grant admin dashboard access', () => {
      expect(hasPermission(admin, 'dashboard.access')).toBe(true)
    })

    it('should deny regular user dashboard access', () => {
      expect(hasPermission(user, 'dashboard.access')).toBe(false)
    })

    it('should grant admin movie management', () => {
      expect(hasPermission(admin, 'movies.create')).toBe(true)
      expect(hasPermission(admin, 'movies.delete')).toBe(true)
    })

    it('should deny staff movie deletion', () => {
      expect(hasPermission(staff, 'movies.delete')).toBe(false)
    })

    it('should grant staff movie creation', () => {
      expect(hasPermission(staff, 'movies.create')).toBe(true)
    })

    it('should deny editor user management', () => {
      expect(hasPermission(editor, 'users.view')).toBe(false)
    })

    it('should deny user all permissions', () => {
      expect(hasPermission(user, 'movies.view')).toBe(false)
      expect(hasPermission(user, 'users.view')).toBe(false)
    })
  })

  describe('canAccessDashboard()', () => {
    it('should allow admin', () => {
      expect(canAccessDashboard(admin)).toBe(true)
    })

    it('should allow staff', () => {
      expect(canAccessDashboard(staff)).toBe(true)
    })

    it('should allow editor', () => {
      expect(canAccessDashboard(editor)).toBe(true)
    })

    it('should deny regular user', () => {
      expect(canAccessDashboard(user)).toBe(false)
    })

    it('should deny null', () => {
      expect(canAccessDashboard(null)).toBe(false)
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
