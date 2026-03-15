'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const generateSlug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'd').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 200)

const EMPTY_FORM = {
  title: '', originalTitle: '', slug: '', description: '', shortDescription: '',
  type: 'movie', status: 'draft', posterUrl: '', backdropUrl: '', thumbnailUrl: '',
  trailerUrl: '', releaseYear: '', duration: '', quality: 'HD', language: 'vi',
  country: 'Việt Nam', genre: '', rating: '', ageRating: '', cast: '', director: '',
  tags: '', seoTitle: '', seoDescription: '', seoKeywords: '',
  isFeatured: false, isTrending: false, isRecommended: false,
}

export default function NewMoviePage() {
  const router = useRouter()
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const up = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const body = {
        ...form,
        slug: form.slug || generateSlug(form.title),
        releaseYear: form.releaseYear ? parseInt(form.releaseYear) : undefined,
        duration: form.duration ? parseInt(form.duration) : undefined,
        rating: form.rating ? parseFloat(form.rating) : undefined,
        posterUrl: form.posterUrl || undefined,
        backdropUrl: form.backdropUrl || undefined,
        thumbnailUrl: form.thumbnailUrl || undefined,
      }
      const res = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) { router.push('/dashboard/movies') }
      else { const d = await res.json(); setError(d.error || 'Lỗi tạo phim') }
    } catch { setError('Lỗi kết nối') }
    setSaving(false)
  }

  // Shared field classes
  const inputCls = 'mt-1 bg-muted border-border'
  const selectCls = 'w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm'
  const labelCls = 'text-sm font-medium'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/movies"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <div><h1 className="text-2xl font-bold">Thêm phim mới</h1><p className="text-muted-foreground">Điền thông tin chi tiết cho phim</p></div>
      </div>

      {error && <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Thông tin cơ bản</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Tên phim *</label><Input className={inputCls} value={form.title}
                onChange={(e) => { up('title', e.target.value); if (!form.slug) up('slug', generateSlug(e.target.value)) }} required /></div>
              <div><label className={labelCls}>Tên gốc</label><Input className={inputCls} value={form.originalTitle} onChange={(e) => up('originalTitle', e.target.value)} /></div>
            </div>
            <div><label className={labelCls}>Slug (URL)</label><Input className={inputCls} value={form.slug} placeholder="tu-dong-tao-tu-ten-phim"
              onChange={(e) => up('slug', e.target.value)} /></div>
            <div><label className={labelCls}>Mô tả ngắn</label><Input className={inputCls} maxLength={500}
              value={form.shortDescription} onChange={(e) => up('shortDescription', e.target.value)} /></div>
            <div><label className={labelCls}>Mô tả đầy đủ</label>
              <textarea className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg h-32 resize-none text-sm"
                value={form.description} onChange={(e) => up('description', e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Classification */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Phân loại & Thuộc tính</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className={labelCls}>Loại phim</label>
                <select className={selectCls} value={form.type} onChange={(e) => up('type', e.target.value)}>
                  <option value="movie">Phim lẻ</option><option value="series">Phim bộ</option>
                  <option value="anime">Anime</option><option value="trailer">Trailer</option><option value="short">Short</option>
                </select></div>
              <div><label className={labelCls}>Trạng thái</label>
                <select className={selectCls} value={form.status} onChange={(e) => up('status', e.target.value)}>
                  <option value="draft">Nháp</option><option value="published">Xuất bản</option>
                  <option value="hidden">Ẩn</option><option value="archived">Lưu trữ</option>
                </select></div>
              <div><label className={labelCls}>Năm</label>
                <Input type="number" className={inputCls} value={form.releaseYear} onChange={(e) => up('releaseYear', e.target.value)} /></div>
              <div><label className={labelCls}>Thời lượng (phút)</label>
                <Input type="number" className={inputCls} value={form.duration} onChange={(e) => up('duration', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className={labelCls}>Chất lượng</label>
                <select className={selectCls} value={form.quality} onChange={(e) => up('quality', e.target.value)}>
                  <option value="CAM">CAM</option><option value="HD">HD</option><option value="FHD">Full HD</option><option value="4K">4K</option>
                </select></div>
              <div><label className={labelCls}>Ngôn ngữ</label><Input className={inputCls} value={form.language} onChange={(e) => up('language', e.target.value)} /></div>
              <div><label className={labelCls}>Quốc gia</label><Input className={inputCls} value={form.country} onChange={(e) => up('country', e.target.value)} /></div>
              <div><label className={labelCls}>Xếp hạng tuổi</label>
                <select className={selectCls} value={form.ageRating} onChange={(e) => up('ageRating', e.target.value)}>
                  <option value="">Chưa chọn</option><option value="P">P (mọi lứa tuổi)</option>
                  <option value="C13">C13</option><option value="C16">C16</option><option value="C18">C18</option>
                </select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Thể loại</label><Input className={inputCls} placeholder="Hành động, Tâm lý, Kinh dị"
                value={form.genre} onChange={(e) => up('genre', e.target.value)} /></div>
              <div><label className={labelCls}>Rating (0-10)</label><Input type="number" step="0.1" min="0" max="10" className={inputCls}
                value={form.rating} onChange={(e) => up('rating', e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Cast & Crew */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Diễn viên & Đạo diễn</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className={labelCls}>Đạo diễn</label><Input className={inputCls} placeholder="Nguyễn Văn A"
              value={form.director} onChange={(e) => up('director', e.target.value)} /></div>
            <div><label className={labelCls}>Diễn viên</label>
              <textarea className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg h-20 resize-none text-sm"
                placeholder="Nguyễn Văn B, Trần Thị C, ..." value={form.cast} onChange={(e) => up('cast', e.target.value)} /></div>
            <div><label className={labelCls}>Tags</label><Input className={inputCls} placeholder="action, thriller, vn-2025"
              value={form.tags} onChange={(e) => up('tags', e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Media */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Media (URL hoặc upload sau khi tạo)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className={labelCls}>Poster URL</label><Input className={inputCls} placeholder="https://..." value={form.posterUrl} onChange={(e) => up('posterUrl', e.target.value)} /></div>
              <div><label className={labelCls}>Backdrop URL</label><Input className={inputCls} placeholder="https://..." value={form.backdropUrl} onChange={(e) => up('backdropUrl', e.target.value)} /></div>
              <div><label className={labelCls}>Thumbnail URL</label><Input className={inputCls} placeholder="https://..." value={form.thumbnailUrl} onChange={(e) => up('thumbnailUrl', e.target.value)} /></div>
            </div>
            <div><label className={labelCls}>Trailer URL</label><Input className={inputCls} placeholder="https://youtube.com/watch?v=..."
              value={form.trailerUrl} onChange={(e) => up('trailerUrl', e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">💡 Bạn có thể upload ảnh trực tiếp sau khi tạo phim bằng trang chỉnh sửa.</p>
          </CardContent>
        </Card>

        {/* SEO */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">SEO</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className={labelCls}>SEO Title</label><Input className={inputCls} maxLength={200}
              value={form.seoTitle} onChange={(e) => up('seoTitle', e.target.value)} /></div>
            <div><label className={labelCls}>SEO Description</label>
              <textarea className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg h-20 resize-none text-sm" maxLength={500}
                value={form.seoDescription} onChange={(e) => up('seoDescription', e.target.value)} /></div>
            <div><label className={labelCls}>SEO Keywords</label><Input className={inputCls} placeholder="phim hay, phim 2026"
              value={form.seoKeywords} onChange={(e) => up('seoKeywords', e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Flags */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Cờ đặc biệt</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={form.isFeatured} onChange={(e) => up('isFeatured', e.target.checked)} />
                <span className="text-sm">⭐ Nổi bật</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={form.isTrending} onChange={(e) => up('isTrending', e.target.checked)} />
                <span className="text-sm">📈 Xu hướng</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={form.isRecommended} onChange={(e) => up('isRecommended', e.target.checked)} />
                <span className="text-sm">👍 Đề xuất</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Link href="/dashboard/movies"><Button type="button" variant="outline" className="flex-1">Hủy</Button></Link>
          <Button type="submit" className="flex-1 gap-2" disabled={saving}>
            <Save className="w-4 h-4" />{saving ? 'Đang tạo...' : 'Tạo phim'}
          </Button>
        </div>
      </form>
    </div>
  )
}
