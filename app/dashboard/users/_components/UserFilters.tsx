import { Search, RefreshCw } from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { Card, CardContent } from '@/src/fe/components/ui/card'

interface UserFiltersProps {
  search: string
  setSearch: (val: string) => void
  roleFilter: string
  setRoleFilter: (val: string) => void
  statusFilter: string
  setStatusFilter: (val: string) => void
  specialFilter: string
  setSpecialFilter: (val: string) => void
  sortBy: string
  setSortBy: (val: string) => void
  onRefresh: () => void
}

export function UserFilters({
  search, setSearch,
  roleFilter, setRoleFilter,
  statusFilter, setStatusFilter,
  specialFilter, setSpecialFilter,
  sortBy, setSortBy,
  onRefresh
}: UserFiltersProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Tìm theo tên hoặc email..." 
                className="pl-9 bg-muted border-border"
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
            <Button variant="outline" size="icon" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none cursor-pointer hover:bg-muted/80 transition-colors" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">Tất cả vai trò</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
              <option value="EDITOR">Editor</option>
              <option value="USER">User</option>
            </select>
            <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none cursor-pointer hover:bg-muted/80 transition-colors" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="banned">Bị khóa</option>
              <option value="suspended">Tạm ngưng</option>
            </select>
            <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none cursor-pointer hover:bg-muted/80 transition-colors" value={specialFilter} onChange={(e) => setSpecialFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="deleted">Đã xóa</option>
            </select>
            <select className="px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none cursor-pointer hover:bg-muted/80 transition-colors" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
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
  )
}
