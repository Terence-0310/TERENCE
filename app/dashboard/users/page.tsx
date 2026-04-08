'use client'

// ============================================
// Admin Users Management
// ============================================
// Sprint 4A: Extracted UserTable and UserModals into _components/
// to reduce page complexity. Page retains state + API logic.

import { useState, useEffect, useCallback } from 'react'
import { Search, UserPlus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserTable } from './_components/UserTable'
import { AddUserModal, EditUserModal } from './_components/UserModals'

interface UserItem {
  id: string; name: string; email: string; role: string; status: string
  isActive: boolean; avatar: string | null; lastLoginAt: string | null
  lastLoginIp: string | null; loginCount: number; blockedReason: string | null
  createdAt: string; deletedAt: string | null
}

interface Pagination { page: number; limit: number; total: number; totalPages: number }

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [specialFilter, setSpecialFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editUser, setEditUser] = useState<UserItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', status: '' })

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20', sortBy })
    if (search) params.set('search', search)
    if (roleFilter !== 'all') params.set('role', roleFilter)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (specialFilter === 'deleted') params.set('deleted', 'true')
    try {
      const res = await fetch(`/api/admin/users?${params}`)
      const json = await res.json()
      setUsers(json.data || [])
      setPagination(json.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
    } catch { setUsers([]) }
    setLoading(false)
  }, [search, roleFilter, statusFilter, sortBy, specialFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const stats = {
    total: pagination.total,
    active: users.filter(u => u.status === 'active' && !u.deletedAt).length,
    admins: users.filter(u => ['super_admin', 'admin'].includes(u.role)).length,
    banned: users.filter(u => u.status === 'banned').length,
  }

  // ── Handlers ──

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (res.ok) { setShowAddModal(false); setForm({ name: '', email: '', password: '', role: 'user' }); fetchUsers() }
      else { const d = await res.json(); alert(d.error || 'Lỗi') }
    } catch { alert('Lỗi kết nối') }
    setSaving(false)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editUser) return; setSaving(true)
    try {
      const body: Record<string, string> = {}
      if (editForm.name !== editUser.name) body.name = editForm.name
      if (editForm.email !== editUser.email) body.email = editForm.email
      if (editForm.role !== editUser.role) body.role = editForm.role
      if (editForm.status !== editUser.status) body.status = editForm.status
      if (Object.keys(body).length === 0) { setEditUser(null); setSaving(false); return }
      const res = await fetch(`/api/admin/users/${editUser.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setEditUser(null); fetchUsers(pagination.page) }
      else { const d = await res.json(); alert(d.error || 'Lỗi') }
    } catch { alert('Lỗi kết nối') }
    setSaving(false)
  }

  const openEdit = (user: UserItem) => {
    setEditUser(user)
    setEditForm({ name: user.name, email: user.email, role: user.role, status: user.status })
  }

  const doAction = async (id: string, action: string, body?: object, confirmMsg?: string) => {
    if (confirmMsg && !confirm(confirmMsg)) return
    const res = await fetch(`/api/admin/users/${id}/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : '{}',
    })
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Lỗi'); return }
    fetchUsers(pagination.page)
  }

  const handleBlock = async (id: string, name: string) => {
    const reason = prompt(`Lý do khóa ${name}:`)
    if (reason === null) return
    await doAction(id, 'block', { reason })
  }

  const handleResetPassword = async (id: string, name: string) => {
    const newPw = prompt(`Đặt mật khẩu mới cho ${name} (≥8 ký tự):`)
    if (!newPw) return
    if (newPw.length < 8) { alert('Mật khẩu phải >= 8 ký tự'); return }
    await doAction(id, 'reset-password', { password: newPw })
    alert('Đã đặt lại mật khẩu')
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa tài khoản "${name}"? (soft delete)`)) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Lỗi'); return }
    fetchUsers(pagination.page)
  }

  const handleRoleChange = (id: string, newRole: string) => {
    fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }) }).then(() => fetchUsers(pagination.page))
  }

  // ── Format helpers ──

  const roleLabel = (r: string) => ({ super_admin: 'Super Admin', admin: 'Admin', staff: 'Staff', editor: 'Editor', user: 'User' }[r] || r)
  const roleColor = (r: string) => ({ super_admin: 'bg-red-500/10 text-red-500', admin: 'bg-purple-500/10 text-purple-500', staff: 'bg-blue-500/10 text-blue-500', editor: 'bg-cyan-500/10 text-cyan-500', user: 'bg-muted text-muted-foreground' }[r] || 'bg-muted text-muted-foreground')
  const statusColor = (s: string) => ({ active: 'bg-green-500/10 text-green-500', suspended: 'bg-yellow-500/10 text-yellow-500', banned: 'bg-red-500/10 text-red-500' }[s] || 'bg-muted text-muted-foreground')
  const statusLabel = (s: string) => ({ active: 'Hoạt động', suspended: 'Tạm ngưng', banned: 'Bị khóa' }[s] || s)
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('vi') : '—'
  const fmtDateTime = (d: string | null) => d ? new Date(d).toLocaleString('vi') : 'Chưa đăng nhập'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
          <p className="text-muted-foreground">Quản lý tài khoản và phân quyền người dùng</p>
        </div>
        <Button className="gap-2" onClick={() => setShowAddModal(true)}>
          <UserPlus className="w-4 h-4" /> Thêm người dùng
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Tổng người dùng</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-2xl font-bold text-green-500">{stats.active}</p><p className="text-sm text-muted-foreground">Đang hoạt động</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-2xl font-bold text-primary">{stats.admins}</p><p className="text-sm text-muted-foreground">Admin</p></CardContent></Card>
        <Card className="bg-card border-border"><CardContent className="p-4"><p className="text-2xl font-bold text-red-500">{stats.banned}</p><p className="text-sm text-muted-foreground">Bị khóa</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Tìm theo tên hoặc email..." className="pl-9 bg-muted border-border"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="icon" onClick={() => fetchUsers()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">Tất cả vai trò</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="editor">Editor</option>
                <option value="user">User</option>
              </select>
              <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Hoạt động</option>
                <option value="banned">Bị khóa</option>
                <option value="suspended">Tạm ngưng</option>
              </select>
              <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={specialFilter} onChange={(e) => setSpecialFilter(e.target.value)}>
                <option value="all">Tất cả</option>
                <option value="deleted">🗑️ Đã xóa</option>
              </select>
              <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="lastLogin">Đăng nhập gần nhất</option>
                <option value="loginCount">Nhiều lượt đăng nhập</option>
                <option value="name">Theo tên A→Z</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg">Danh sách người dùng ({pagination.total})</CardTitle></CardHeader>
        <CardContent>
          <UserTable
            users={users}
            loading={loading}
            onEdit={openEdit}
            onResetPassword={handleResetPassword}
            onBlock={handleBlock}
            onUnblock={(id) => doAction(id, 'unblock')}
            onDelete={handleDelete}
            onRestore={(id, name) => doAction(id, 'restore', undefined, `Khôi phục "${name}"?`)}
            onRoleChange={handleRoleChange}
            roleLabel={roleLabel}
            roleColor={roleColor}
            statusLabel={statusLabel}
            statusColor={statusColor}
            fmtDate={fmtDate}
            fmtDateTime={fmtDateTime}
          />

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Trang {pagination.page}/{pagination.totalPages} — {pagination.total} người dùng</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)}>Trước</Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchUsers(pagination.page + 1)}>Sau</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {showAddModal && (
        <AddUserModal
          form={form}
          saving={saving}
          onFormChange={setForm}
          onSubmit={handleCreate}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          editForm={editForm}
          saving={saving}
          onFormChange={setEditForm}
          onSubmit={handleEdit}
          onClose={() => setEditUser(null)}
          fmtDateTime={fmtDateTime}
        />
      )}
    </div>
  )
}
