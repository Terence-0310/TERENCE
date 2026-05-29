'use client'

// ============================================
// User Table — presentational component
// Sprint 4A: Extracted from users/page.tsx
// ============================================

import {
  Edit, Trash2, RotateCcw, KeyRound, Ban, UserCheck, Shield
} from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'

interface UserItem {
  id: string; name: string; email: string; role: string; status: string
  isActive: boolean; avatar: string | null; lastLoginAt: string | null
  lastLoginIp: string | null; loginCount: number; blockedReason: string | null
  createdAt: string; deletedAt: string | null
}

interface UserTableProps {
  users: UserItem[]
  loading: boolean
  onEdit: (user: UserItem) => void
  onResetPassword: (id: string, name: string) => void
  onBlock: (id: string, name: string) => void
  onUnblock: (id: string) => void
  onDelete: (id: string, name: string) => void
  onRestore: (id: string, name: string) => void
  onRoleChange: (id: string, newRole: string) => void
  onManagePermissions: (user: UserItem) => void
  roleLabel: (r: string) => string
  roleColor: (r: string) => string
  statusLabel: (s: string) => string
  statusColor: (s: string) => string
  fmtDate: (d: string | null) => string
  fmtDateTime: (d: string | null) => string
}

export function UserTable({
  users, loading, onEdit, onResetPassword, onBlock, onUnblock, onDelete, onRestore,
  onRoleChange, onManagePermissions, roleLabel, roleColor, statusLabel, statusColor, fmtDate, fmtDateTime,
}: UserTableProps) {
  const { user: currentUser } = useAuth()
  const currentUserRole = currentUser?.role?.toUpperCase() || ''

  if (loading && users.length === 0) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground w-1/3">Người dùng</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vai trò</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Trạng thái</th>
              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4"><div className="h-6 w-20 bg-muted rounded-full animate-pulse" /></td>
                <td className="py-4 px-4"><div className="h-6 w-20 bg-muted rounded-full animate-pulse" /></td>
                <td className="py-4 px-4">
                  <div className="flex justify-end gap-2">
                    <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                    <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                    <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Người dùng</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vai trò</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Trạng thái</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Đăng nhập</th>
            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Lần cuối</th>
            <th className="text-right py-3 px-4 font-medium text-muted-foreground">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className={`border-b border-border hover:bg-muted/50 transition-colors ${user.deletedAt ? 'opacity-50' : ''}`}>
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary font-semibold">{user.name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    {user.blockedReason && <p className="text-xs text-red-400 truncate">Lý do: {user.blockedReason}</p>}
                    {user.deletedAt && <p className="text-xs text-red-400">Đã xóa {fmtDate(user.deletedAt)}</p>}
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                {user.deletedAt || currentUserRole === 'USER' ? (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColor(user.role)}`}>{roleLabel(user.role)}</span>
                ) : (
                  <select className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer outline-none bg-black/40 ${roleColor(user.role)}`}
                    value={user.role} onChange={(e) => onRoleChange(user.id, e.target.value)}>
                    {currentUserRole === 'SUPER_ADMIN' && <option value="SUPER_ADMIN" className="bg-background text-white">Super Admin</option>}
                    {['SUPER_ADMIN', 'ADMIN'].includes(currentUserRole) && <option value="ADMIN" className="bg-background text-white">Admin</option>}
                    {['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(currentUserRole) && <option value="STAFF" className="bg-background text-white">Staff</option>}
                    {['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(currentUserRole) && <option value="EDITOR" className="bg-background text-white">Editor</option>}
                    <option value="USER" className="bg-background text-white">User</option>
                  </select>
                )}
              </td>
              <td className="py-4 px-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(user.status)}`}>{statusLabel(user.status)}</span>
              </td>
              <td className="py-4 px-4 text-muted-foreground text-sm">{user.loginCount}x</td>
              <td className="py-4 px-4 text-muted-foreground text-xs">{fmtDateTime(user.lastLoginAt)}</td>
              <td className="py-4 px-4">
                <div className="flex items-center justify-end gap-1">
                  {user.deletedAt ? (
                    ['SUPER_ADMIN', 'ADMIN'].includes(currentUserRole) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Khôi phục"
                        onClick={() => onRestore(user.id, user.name)}>
                        <RotateCcw className="w-4 h-4 text-green-500" />
                      </Button>
                    )
                  ) : (
                    <>
                      {/* ADMIN KHÔNG được sửa SUPER_ADMIN */}
                      {!(currentUserRole !== 'SUPER_ADMIN' && user.role?.toUpperCase() === 'SUPER_ADMIN') && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Sửa" onClick={() => onEdit(user)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Reset mật khẩu"
                            onClick={() => onResetPassword(user.id, user.name)}>
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          {user.status === 'banned' ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Mở khóa"
                              onClick={() => onUnblock(user.id)}>
                              <UserCheck className="w-4 h-4 text-green-500" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Khóa"
                              onClick={() => onBlock(user.id, user.name)}>
                              <Ban className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                          {/* Sửa Dynamic Permission Override */}
                          {['SUPER_ADMIN', 'ADMIN'].includes(currentUserRole) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Override Phân Quyền"
                              onClick={() => onManagePermissions(user)}>
                              <Shield className="w-4 h-4" />
                            </Button>
                          )}
                          {/* STAFF KHÔNG xóa user, EDITOR KHÔNG quản lý user */}
                          {['SUPER_ADMIN', 'ADMIN'].includes(currentUserRole) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Xóa"
                              onClick={() => onDelete(user.id, user.name)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <UserCheck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Không có người dùng nào</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Thử thay đổi bộ lọc hoặc thêm người dùng mới</p>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
