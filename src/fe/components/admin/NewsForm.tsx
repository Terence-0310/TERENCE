'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { Card, CardContent } from '@/src/fe/components/ui/card'
import { RichTextEditor } from '@/src/fe/components/admin/RichTextEditor'
import { toast } from 'sonner'
import Link from 'next/link'

interface NewsFormProps {
  initialData?: {
    id: string
    title: string
    slug: string
    content: string
    excerpt?: string | null
    coverImage?: string | null
    status: string
  }
}

export function NewsForm({ initialData }: NewsFormProps) {
  const router = useRouter()
  const isEdit = !!initialData

  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    coverImage: '',
    status: 'draft',
  })
  
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || '',
        slug: initialData.slug || '',
        content: initialData.content || '',
        excerpt: initialData.excerpt || '',
        coverImage: initialData.coverImage || '',
        status: initialData.status || 'draft',
      })
    }
  }, [initialData])

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setForm(prev => ({
      ...prev,
      title,
      // Chỉ tự động generate slug khi tạo mới và chưa nhập nội dung custom vào ô slug
      slug: !isEdit && (!prev.slug || autoSlug(prev.title) === prev.slug) ? autoSlug(title) : prev.slug
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.slug || !form.content) {
      toast.error('Vui lòng điền đầy đủ Tiêu đề, Slug và Nội dung')
      return
    }

    setSaving(true)
    try {
      const url = isEdit ? `/api/admin/news/${initialData.id}` : '/api/admin/news'
      const method = isEdit ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (res.ok) {
        toast.success(isEdit ? 'Cập nhật bài viết thành công!' : 'Tạo bài viết thành công!')
        router.push('/dashboard/news')
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Đã có lỗi xảy ra')
      }
    } catch {
      toast.error('Lỗi kết nối tới máy chủ')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/news">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" type="button">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? 'Chỉnh sửa bài viết' : 'Viết bài mới'}</h1>
            <p className="text-sm text-muted-foreground">Soạn thảo nội dung tin tức, blog với Rich Text Editor</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={form.status}
            onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
            className="h-10 px-4 rounded-md border border-border bg-background text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="draft">Bản nháp</option>
            <option value="published">Xuất bản</option>
            <option value="hidden">Ẩn</option>
          </select>
          
          <Button type="submit" disabled={saving} className="gap-2 shadow-lg">
            <Save className="h-4 w-4" />
            {saving ? 'Đang lưu...' : 'Lưu bài viết'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <CardContent className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2">Tiêu đề bài viết <span className="text-red-500">*</span></label>
                <Input 
                  value={form.title} 
                  onChange={handleTitleChange} 
                  placeholder="Nhập tiêu đề ấn tượng..." 
                  className="text-lg font-medium h-12"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Đường dẫn tĩnh (Slug) <span className="text-red-500">*</span></label>
                <Input 
                  value={form.slug} 
                  onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))} 
                  placeholder="tieu-de-bai-viet" 
                  className="bg-muted/50 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">Đoạn trích dẫn (Excerpt)</label>
                <textarea 
                  value={form.excerpt} 
                  onChange={(e) => setForm(prev => ({ ...prev, excerpt: e.target.value }))} 
                  placeholder="Tóm tắt ngắn gọn nội dung bài viết để hiển thị ở trang chủ..." 
                  className="w-full min-h-[80px] p-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-0 border-none overflow-hidden rounded-xl">
              <div className="bg-muted px-6 py-3 border-b border-border flex items-center justify-between">
                <label className="text-sm font-bold flex items-center gap-2">
                  Nội dung chính <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">Rich Text Editor</span>
              </div>
              <div className="bg-background">
                <RichTextEditor 
                  value={form.content} 
                  onChange={(content) => setForm(prev => ({ ...prev, content }))} 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Section */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold">Ảnh bìa (Thumbnail)</h3>
              </div>
              
              <div className="space-y-4">
                {form.coverImage ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-border group">
                    <img src={form.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button type="button" variant="destructive" size="sm" onClick={() => setForm(prev => ({ ...prev, coverImage: '' }))}>
                        Gỡ ảnh
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center bg-muted/30 text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                    <span className="text-xs">Chưa có ảnh bìa</span>
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">URL Hình ảnh</label>
                  <Input 
                    value={form.coverImage} 
                    onChange={(e) => setForm(prev => ({ ...prev, coverImage: e.target.value }))} 
                    placeholder="https://..." 
                    className="text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    Nhập đường dẫn trực tiếp (URL) của hình ảnh. Khuyến nghị tỷ lệ 16:9 để hiển thị đẹp nhất trên màn hình.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
