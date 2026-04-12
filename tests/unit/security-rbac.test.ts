import { describe, it, expect } from 'vitest'
import { hasPermission } from '@/src/lib/permissions/access-control'
import { PERMISSIONS } from '@/src/constants/permissions'
import { ROLES, RoleType } from '@/src/constants/roles'

describe('RBAC Security & Policy Enforcement Specs', () => {
  const createUser = (role: RoleType) => ({ id: `usr_${role}`, role })

  const superAdmin = createUser(ROLES.SUPER_ADMIN)
  const admin = createUser(ROLES.ADMIN)
  const staff = createUser(ROLES.STAFF)
  const editor = createUser(ROLES.EDITOR)
  const user = createUser(ROLES.USER)

  describe('Global Super Admin Immunities', () => {
    it('SUPER_ADMIN phải có toàn quyền cho hệ thống ngay cả khi không có record lưu DB', async () => {
      // Vì default access-control hardcoded override cho SUPER_ADMIN -> true mọi ngóc ngách
      expect(await hasPermission(superAdmin, PERMISSIONS.DASHBOARD_VIEW)).toBe(true)
      expect(await hasPermission(superAdmin, PERMISSIONS.USER_ROLE_UPDATE)).toBe(true)
      expect(await hasPermission(superAdmin, PERMISSIONS.MOVIE_DELETE)).toBe(true)
      expect(await hasPermission(superAdmin, 'fake.permission')).toBe(true)
    })
  })

  describe('Movie Management Security', () => {
    it('USER và EDITOR tuyệt đối không được gọi `movie.delete` / `movie.publish`', async () => {
      expect(await hasPermission(user, PERMISSIONS.MOVIE_DELETE)).toBe(false)
      expect(await hasPermission(user, PERMISSIONS.MOVIE_PUBLISH)).toBe(false)
      
      expect(await hasPermission(editor, PERMISSIONS.MOVIE_DELETE)).toBe(false)
      expect(await hasPermission(editor, PERMISSIONS.MOVIE_PUBLISH)).toBe(false)
    })

    it('ADMIN và STAFF không có quyền delete film (theo rule của CTO Matrix)', async () => {
      expect(await hasPermission(admin, PERMISSIONS.MOVIE_DELETE)).toBe(false)
      expect(await hasPermission(staff, PERMISSIONS.MOVIE_DELETE)).toBe(false)
    })

    it('ADMIN quản lý toàn bộ phim, STAFF và EDITOR sửa nội dung nhưng STAFF có quyền tạo mới, EDITOR thì không', async () => {
      expect(await hasPermission(admin, PERMISSIONS.MOVIE_CREATE)).toBe(true)
      expect(await hasPermission(admin, PERMISSIONS.MOVIE_UPDATE)).toBe(true)

      expect(await hasPermission(staff, PERMISSIONS.MOVIE_CREATE)).toBe(true)
      expect(await hasPermission(staff, PERMISSIONS.MOVIE_UPDATE)).toBe(true)

      expect(await hasPermission(editor, PERMISSIONS.MOVIE_CREATE)).toBe(false)
      expect(await hasPermission(editor, PERMISSIONS.MOVIE_UPDATE)).toBe(true)
    })
  })

  describe('User Management Security', () => {
    it('Chỉ duy nhất ADMIN trở lên được truy cập module quản trị users', async () => {
      expect(await hasPermission(admin, PERMISSIONS.USER_READ)).toBe(true)
      expect(await hasPermission(admin, PERMISSIONS.USER_BLOCK)).toBe(true)
      
      expect(await hasPermission(staff, PERMISSIONS.USER_READ)).toBe(false)
      expect(await hasPermission(editor, PERMISSIONS.USER_READ)).toBe(false)
      expect(await hasPermission(user, PERMISSIONS.USER_READ)).toBe(false)
    })
  })

  describe('System Metrics & Settings Security', () => {
    it('Chỉ có ADMIN và System-Authors mới view được Logs, Setting hay Payment', async () => {
      expect(await hasPermission(admin, PERMISSIONS.PAYMENT_READ)).toBe(true)
      expect(await hasPermission(admin, PERMISSIONS.ADMINLOG_READ)).toBe(true)
      expect(await hasPermission(admin, PERMISSIONS.SETTINGS_READ)).toBe(true)

      expect(await hasPermission(staff, PERMISSIONS.PAYMENT_READ)).toBe(false)
      expect(await hasPermission(staff, PERMISSIONS.ADMINLOG_READ)).toBe(false)
      expect(await hasPermission(staff, PERMISSIONS.SETTINGS_READ)).toBe(false)

      expect(await hasPermission(editor, PERMISSIONS.SETTINGS_READ)).toBe(false)
    })

    it('ADMIN có thể View Settings nhưng lại không thể Update Settings để chống Over-Configuring', async () => {
      expect(await hasPermission(admin, PERMISSIONS.SETTINGS_UPDATE)).toBe(false)
    })
  })
})
