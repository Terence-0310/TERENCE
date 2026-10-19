'use client'

import { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Upload, X, Loader2 } from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/fe/components/ui/card'


interface PageProps { params: Promise<{ id: string }> }

// Hoisted out of the parent component so React doesn't remount it (and lose
// input focus) on every parent state change. Previously defined inline, which
// is a known React anti-pattern.
function MediaField(props: {
  field: string
  label: string
  value: string
  uploading: string | null
  onChange: (v: string) => void
  onUpload: (file: File) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      <label className="text-sm font-medium">{props.label}</label>
      <div className="mt-1 space-y-2">
        {props.value && (
          <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-muted">
            <img src={props.value} alt={`${props.label} preview`} className="w-full h-full object-cover" />
            <button
              type="button"
              aria-label={`Xoá ${props.label}`}
              className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
              onClick={() => props.onChange('')}
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            className="bg-muted border-border flex-1"
            placeholder="URL hoặc upload file"
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
          />
          <input
            type="file"
            ref={ref}
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && props.onUpload(e.target.files[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={props.uploading === props.field}
            onClick={() => ref.current?.click()}
          >
            {props.uploading === props.field ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function EditMoviePage({ params }: PageProps) {
  const { id } = use(params)
  const [form, setForm] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/admin/movies/${id}`).then(r => r.json()).then(d => {
      if (d.id) setForm(d)
      else setError('Phim không tồn tại')
    }).catch(() => setError('Lỗi kết nối'))
  }, [id])

  if (!form) return (
    <div className="flex justify-center py-20">
      {error ? <p className="text-destructive">{error}</p> :
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />}
    </div>
  )

  const up = (k: string, v: unknown) => setForm(f => f ? { ...f, [k]: v } : f)
  const str = (k: string) => (form[k] as string) || ''
  const bool = (k: string) => !!form[k]
  const num = (k: string) => form[k] != null ? String(form[k]) : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess(''); setSaving(true)
    try {
      const body = {
        title: str('title'), originalTitle: str('originalTitle') || null,
        slug: str('slug'), description: str('description') || null,
        shortDescription: str('shortDescription') || null,
        contentType: str('contentType'), status: str('status'),
        posterUrl: str('posterUrl') || null, backdropUrl: str('backdropUrl') || null,
        thumbUrl: str('thumbUrl') || null, trailerUrl: str('trailerUrl') || null,
        year: num('year') ? parseInt(num('year')) : null,
        duration: num('duration') ? parseInt(num('duration')) : null,
        quality: str('quality') || null, language: str('language') || null,
         
        rating: num('rating') ? parseFloat(num('rating')) : null,
        ageRating: str('ageRating') || null, tags: str('tags') || null,
        seoTitle: str('seoTitle') || null, seoDescription: str('seoDescription') || null,
        seoKeywords: str('seoKeywords') || null,
        isFeatured: bool('isFeatured'), isTrending: bool('isTrending'),
        isRecommended: bool('isRecommended'), sourceStatus: str('sourceStatus') || 'pending',
        earlyAccessUntil: str('earlyAccessUntil')
          ? new Date(str('earlyAccessUntil')).toISOString()
          : null,
      }
      const res = await fetch(`/api/admin/movies/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) { setSuccess('Đã lưu thành công!'); setTimeout(() => setSuccess(''), 3000) }
      else { const d = await res.json(); setError(d.error || 'Lỗi cập nhật') }
    } catch { setError('Lỗi kết nối') }
    setSaving(false)
  }

  const handleUpload = async (field: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError(`Dung lượng file không được vượt quá 5MB.`)
      return
    }
    setUploading(field)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('movieId', id)
      fd.append('field', field)
      const res = await fetch('/api/admin/uploads/movie-media', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) { up(field, data.url || data.data?.url); setSuccess(`Đã upload ${field} thành công!`) }
      else { setError(data.error || 'Upload thất bại') }
    } catch { setError('Lỗi upload') }
    setUploading(null)
  }

  const inputCls = 'mt-1 bg-muted border-border'
  const selectCls = 'w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm'
  const labelCls = 'text-sm font-medium'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/movies"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <div><h1 className="text-2xl font-bold">Chỉnh sửa phim</h1><p className="text-muted-foreground truncate max-w-md">{str('title')}</p></div>
      </div>

      {error && <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">{error}</div>}
      {success && <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 text-sm">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Thông tin cơ bản</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Tên phim *</label><Input className={inputCls} value={str('title')} onChange={(e) => up('title', e.target.value)} required /></div>
              <div><label className={labelCls}>Tên gốc</label><Input className={inputCls} value={str('originalTitle')} onChange={(e) => up('originalTitle', e.target.value)} /></div>
            </div>
            <div><label className={labelCls}>Slug</label><Input className={inputCls} value={str('slug')} onChange={(e) => up('slug', e.target.value)} /></div>
            <div><label className={labelCls}>Mô tả ngắn</label><Input className={inputCls} value={str('shortDescription')} onChange={(e) => up('shortDescription', e.target.value)} maxLength={500} /></div>
            <div><label className={labelCls}>Mô tả đầy đủ</label>
              <textarea className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg h-32 resize-none text-sm"
                value={str('description')} onChange={(e) => up('description', e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Classification */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Phân loại & Thuộc tính</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className={labelCls}>Loại phim</label>
                <select className={selectCls} value={str('contentType')} onChange={(e) => up('contentType', e.target.value)}>
                  <option value="movie">Phim lẻ</option><option value="series">Phim bộ</option>
                  <option value="anime">Anime</option><option value="trailer">Trailer</option><option value="short">Short</option>
                </select></div>
              <div><label className={labelCls}>Trạng thái</label>
                <select className={selectCls} value={str('status')} onChange={(e) => up('status', e.target.value)}>
                  <option value="draft">Nháp</option><option value="published">Xuất bản</option>
                  <option value="hidden">Ẩn</option><option value="archived">Lưu trữ</option>
                </select></div>
              <div><label className={labelCls}>Năm</label><Input type="number" className={inputCls} value={num('year')} onChange={(e) => up('year', e.target.value)} /></div>
              <div><label className={labelCls}>Thời lượng (phút)</label><Input type="number" className={inputCls} value={num('duration')} onChange={(e) => up('duration', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className={labelCls}>Chất lượng</label>
                <select className={selectCls} value={str('quality')} onChange={(e) => up('quality', e.target.value)}>
                  <option value="">—</option><option value="CAM">CAM</option><option value="HD">HD</option>
                  <option value="FHD">Full HD</option><option value="4K">4K</option>
                </select></div>
              <div><label className={labelCls}>Ngôn ngữ</label><Input className={inputCls} value={str('language')} onChange={(e) => up('language', e.target.value)} /></div>
              
              <div><label className={labelCls}>Xếp hạng tuổi</label>
                <select className={selectCls} value={str('ageRating')} onChange={(e) => up('ageRating', e.target.value)}>
                  <option value="">Chưa chọn</option><option value="P">P</option><option value="C13">C13</option>
                  <option value="C16">C16</option><option value="C18">C18</option>
                </select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div><label className={labelCls}>Rating (0-10)</label><Input type="number" step="0.1" min="0" max="10" className={inputCls} value={num('rating')} onChange={(e) => up('rating', e.target.value)} /></div>
            </div>
            <div><label className={labelCls}>Trạng thái nguồn</label>
              <select className={selectCls} value={str('sourceStatus')} onChange={(e) => up('sourceStatus', e.target.value)}>
                <option value="pending">Chờ</option><option value="active">Hoạt động</option>
                <option value="missing">Thiếu</option><option value="broken">Lỗi</option>
              </select></div>
          </CardContent>
        </Card>

        {/* Cast & Crew (Legacy fields removed, managed via relations) */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Tags & Phân loại</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className={labelCls}>Tags</label><Input className={inputCls} value={str('tags')} onChange={(e) => up('tags', e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Media with file upload */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Media</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MediaField
                field="posterUrl"
                label="Poster"
                value={str('posterUrl')}
                uploading={uploading}
                onChange={(v) => up('posterUrl', v)}
                onUpload={(file) => handleUpload('posterUrl', file)}
              />
              <MediaField
                field="backdropUrl"
                label="Backdrop"
                value={str('backdropUrl')}
                uploading={uploading}
                onChange={(v) => up('backdropUrl', v)}
                onUpload={(file) => handleUpload('backdropUrl', file)}
              />
              <MediaField
                field="thumbUrl"
                label="Thumbnail"
                value={str('thumbUrl')}
                uploading={uploading}
                onChange={(v) => up('thumbUrl', v)}
                onUpload={(file) => handleUpload('thumbUrl', file)}
              />
            </div>
            <div><label className={labelCls}>Trailer URL</label><Input className={inputCls} value={str('trailerUrl')} onChange={(e) => up('trailerUrl', e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* SEO */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">SEO</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className={labelCls}>SEO Title</label><Input className={inputCls} value={str('seoTitle')} onChange={(e) => up('seoTitle', e.target.value)} maxLength={200} /></div>
            <div><label className={labelCls}>SEO Description</label>
              <textarea className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg h-20 resize-none text-sm"
                value={str('seoDescription')} onChange={(e) => up('seoDescription', e.target.value)} maxLength={500} /></div>
            <div><label className={labelCls}>SEO Keywords</label><Input className={inputCls} value={str('seoKeywords')} onChange={(e) => up('seoKeywords', e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Flags */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-lg">Cờ đặc biệt</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={bool('isFeatured')} onChange={(e) => up('isFeatured', e.target.checked)} />
                <span className="text-sm">Nổi bật</span></label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={bool('isTrending')} onChange={(e) => up('isTrending', e.target.checked)} />
                <span className="text-sm">Xu hướng</span></label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={bool('isRecommended')} onChange={(e) => up('isRecommended', e.target.checked)} />
                <span className="text-sm">Đề xuất</span></label>
            </div>
            <div className="mt-6">
              <label className={labelCls}>Xem sớm tới (Early Access — TCoin)</label>
              <Input
                type="datetime-local"
                className={inputCls}
                value={str('earlyAccessUntil') ? str('earlyAccessUntil').slice(0, 16) : ''}
                onChange={(e) => up('earlyAccessUntil', e.target.value ? new Date(e.target.value).toISOString() : '')}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Trước thời điểm này, chỉ người dùng đổi ưu đãi “Xem sớm 24h” mới xem được. Để trống = công khai cho mọi người.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Link href="/dashboard/movies"><Button type="button" variant="outline" className="flex-1">Quay lại</Button></Link>
          <Button type="submit" className="flex-1 gap-2" disabled={saving}>
            <Save className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </div>
  )
}
