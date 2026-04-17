'use client'

// ============================================
// User Modals — Add + Edit user modals
// Sprint 4A: Extracted from users/page.tsx
// ============================================

import { X, Save } from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'

// ─── Add User Modal ─────────────────────────────────────────────

interface AddUserModalProps {
  form: { name: string; email: string; password: string; role: string }
  saving: boolean
  onFormChange: (form: { name: string; email: string; password: string; role: string }) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function AddUserModal({ form, saving, onFormChange, onSubmit, onClose }: AddUserModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Thêm người dùng</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div><label className="text-sm font-medium">Tên *</label>
            <Input className="mt-1 bg-muted border-border" value={form.name} onChange={(e) => onFormChange({ ...form, name: e.target.value })} required /></div>
          <div><label className="text-sm font-medium">Email *</label>
            <Input type="email" className="mt-1 bg-muted border-border" value={form.email} onChange={(e) => onFormChange({ ...form, email: e.target.value })} required /></div>
          <div><label className="text-sm font-medium">Mật khẩu (≥8 ký tự) *</label>
            <Input type="password" className="mt-1 bg-muted border-border" value={form.password} onChange={(e) => onFormChange({ ...form, password: e.target.value })} required minLength={8} /></div>
          <div><label className="text-sm font-medium">Vai trò</label>
            <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg outline-none bg-[#0A0E17]" value={form.role} onChange={(e) => onFormChange({ ...form, role: e.target.value })}>
              <option value="USER">User</option><option value="EDITOR">Editor</option>
              <option value="STAFF">Staff</option><option value="ADMIN">Admin</option>
            </select></div>
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Hủy</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Đang lưu...' : 'Thêm'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Edit User Modal ────────────────────────────────────────────

interface UserItem {
  id: string; name: string; email: string; role: string; status: string
  isActive: boolean; avatar: string | null; lastLoginAt: string | null
  lastLoginIp: string | null; loginCount: number; blockedReason: string | null
  createdAt: string; deletedAt: string | null
}

interface EditUserModalProps {
  user: UserItem
  editForm: { name: string; email: string; role: string; status: string }
  saving: boolean
  onFormChange: (form: { name: string; email: string; role: string; status: string }) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  fmtDateTime: (d: string | null) => string
}

export function EditUserModal({ user, editForm, saving, onFormChange, onSubmit, onClose, fmtDateTime }: EditUserModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Sửa người dùng</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div><label className="text-sm font-medium">Tên</label>
            <Input className="mt-1 bg-muted border-border" value={editForm.name} onChange={(e) => onFormChange({ ...editForm, name: e.target.value })} required /></div>
          <div><label className="text-sm font-medium">Email</label>
            <Input type="email" className="mt-1 bg-muted border-border" value={editForm.email} onChange={(e) => onFormChange({ ...editForm, email: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium">Vai trò</label>
              <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg outline-none bg-[#0A0E17]" value={editForm.role} onChange={(e) => onFormChange({ ...editForm, role: e.target.value })}>
                <option value="SUPER_ADMIN">Super Admin</option><option value="ADMIN">Admin</option>
                <option value="STAFF">Staff</option><option value="EDITOR">Editor</option><option value="USER">User</option>
              </select></div>
            <div><label className="text-sm font-medium">Trạng thái</label>
              <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg" value={editForm.status} onChange={(e) => onFormChange({ ...editForm, status: e.target.value })}>
                <option value="active">Hoạt động</option><option value="suspended">Tạm ngưng</option><option value="banned">Bị khóa</option>
              </select></div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Đăng nhập: {user.loginCount}x — Lần cuối: {fmtDateTime(user.lastLoginAt)}</p>
            {user.lastLoginIp && <p>IP cuối: {user.lastLoginIp}</p>}
            <p>Tạo lúc: {fmtDateTime(user.createdAt)}</p>
          </div>
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Hủy</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={saving}>
              <Save className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
