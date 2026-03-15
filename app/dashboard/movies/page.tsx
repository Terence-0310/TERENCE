'use client'

import { useState } from 'react'
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const MOVIES = [
  { id: 1, title: 'Tử Chiến Trên Không', genre: 'Hành động', views: 12345, status: 'active', date: '2026-03-01' },
  { id: 2, title: 'Hoa Máu', genre: 'Hành động', views: 9876, status: 'active', date: '2026-02-28' },
  { id: 3, title: 'Danh Dự Cuối Cùng', genre: 'Tâm lý', views: 8765, status: 'active', date: '2026-02-25' },
  { id: 4, title: 'Bàn Tay Diệt Quỷ', genre: 'Kinh dị', views: 7654, status: 'pending', date: '2026-02-20' },
  { id: 5, title: 'Chòm Sao Thiên Hậu', genre: 'Tâm lý', views: 6543, status: 'active', date: '2026-02-18' },
  { id: 6, title: 'Đừng Quên Anh Yêu Em', genre: 'Lãng mạn', views: 5432, status: 'active', date: '2026-02-15' },
  { id: 7, title: 'Bước Vào Tim Em', genre: 'Tâm lý', views: 4321, status: 'inactive', date: '2026-02-10' },
  { id: 8, title: 'Tài Xế Ẩn Danh 3', genre: 'Hành động', views: 3210, status: 'active', date: '2026-02-05' },
]

export default function MoviesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  const filteredMovies = MOVIES.filter((movie) => {
    const matchesSearch = movie.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || movie.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý phim</h1>
          <p className="text-muted-foreground">Quản lý tất cả nội dung phim trên hệ thống</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Thêm phim mới
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm phim..."
                className="pl-9 bg-muted border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-3 py-2 bg-muted border border-border rounded-lg text-sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang chiếu</option>
                <option value="pending">Chờ duyệt</option>
                <option value="inactive">Tạm dừng</option>
              </select>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movies Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Danh sách phim ({filteredMovies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tên phim</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Thể loại</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Lượt xem</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Trạng thái</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ngày tạo</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovies.map((movie) => (
                  <tr key={movie.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 rounded-lg bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-semibold text-xs">{movie.title.charAt(0)}</span>
                        </div>
                        <span className="font-medium">{movie.title}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">{movie.genre}</td>
                    <td className="py-4 px-4">{movie.views.toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        movie.status === 'active' 
                          ? 'bg-green-500/10 text-green-500' 
                          : movie.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {movie.status === 'active' ? 'Đang chiếu' : movie.status === 'pending' ? 'Chờ duyệt' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">{movie.date}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
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
              Hiển thị 1-{filteredMovies.length} trong số {MOVIES.length} phim
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Trước
              </Button>
              <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Movie Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold mb-4">Them phim moi</h2>
            <form className="space-y-4">
              <div>
                <label className="text-sm font-medium">Ten phim</label>
                <Input className="mt-1 bg-muted border-border" placeholder="Nhap ten phim" />
              </div>
              <div>
                <label className="text-sm font-medium">The loai</label>
                <select className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg">
                  <option>Hanh dong</option>
                  <option>Tam ly</option>
                  <option>Lang man</option>
                  <option>Kinh di</option>
                  <option>Hai</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Mo ta</label>
                <textarea
                  className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg h-24 resize-none"
                  placeholder="Nhap mo ta phim"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Huy
                </Button>
                <Button type="submit" className="flex-1">
                  Them phim
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
