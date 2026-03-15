'use client'

import { useState } from 'react'
import { Search, Filter, MoreVertical, UserPlus, Mail, Shield, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const USERS = [
  { id: 1, name: 'Nguyen Van A', email: 'a@email.com', role: 'admin', status: 'active', joined: '2025-01-15', watched: 156 },
  { id: 2, name: 'Tran Thi B', email: 'b@email.com', role: 'premium', status: 'active', joined: '2025-02-20', watched: 143 },
  { id: 3, name: 'Le Van C', email: 'c@email.com', role: 'user', status: 'active', joined: '2025-03-10', watched: 128 },
  { id: 4, name: 'Pham Thi D', email: 'd@email.com', role: 'premium', status: 'inactive', joined: '2025-04-05', watched: 115 },
  { id: 5, name: 'Hoang Van E', email: 'e@email.com', role: 'user', status: 'active', joined: '2025-05-12', watched: 98 },
  { id: 6, name: 'Vu Thi F', email: 'f@email.com', role: 'user', status: 'banned', joined: '2025-06-08', watched: 45 },
  { id: 7, name: 'Dang Van G', email: 'g@email.com', role: 'premium', status: 'active', joined: '2025-07-22', watched: 87 },
  { id: 8, name: 'Bui Thi H', email: 'h@email.com', role: 'user', status: 'active', joined: '2025-08-30', watched: 76 },
]

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')

  const filteredUsers = USERS.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = selectedRole === 'all' || user.role === selectedRole
    return matchesSearch && matchesRole
  })

  const stats = {
    total: USERS.length,
    active: USERS.filter(u => u.status === 'active').length,
    premium: USERS.filter(u => u.role === 'premium').length,
    banned: USERS.filter(u => u.status === 'banned').length,
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
          <p className="text-muted-foreground">Quản lý tài khoản và phân quyền người dùng</p>
        </div>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" />
          Thêm người dùng
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Tong nguoi dung</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-500">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Dang hoat dong</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-primary">{stats.premium}</p>
            <p className="text-sm text-muted-foreground">Premium</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-500">{stats.banned}</p>
            <p className="text-sm text-muted-foreground">Bi khoa</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên hoặc email..."
                className="pl-9 bg-muted border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Admin</option>
                <option value="premium">Premium</option>
                <option value="user">User</option>
              </select>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Danh sách người dùng ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Người dùng</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vai trò</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Trạng thái</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ngày tham gia</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Phim đã xem</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-semibold">{user.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-500/10 text-purple-500' 
                          : user.role === 'premium'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : user.role === 'premium' ? 'Premium' : 'User'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active' 
                          ? 'bg-green-500/10 text-green-500' 
                          : user.status === 'inactive'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {user.status === 'active' ? 'Hoạt động' : user.status === 'inactive' ? 'Nghỉ' : 'Bị khóa'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">{user.joined}</td>
                    <td className="py-4 px-4">{user.watched}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Gui email">
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Phan quyen">
                          <Shield className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Khoa tai khoan">
                          <Ban className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Hiển thị 1-{filteredUsers.length} trong số {USERS.length} người dùng
              </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Trước
              </Button>
              <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
                1
              </Button>
              <Button variant="outline" size="sm">
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
