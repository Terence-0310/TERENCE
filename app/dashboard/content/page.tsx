'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, Edit, Trash2, RefreshCw, X, Save, Tag, Globe2 } from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/fe/components/ui/card'

interface GenreItem { id: string; name: string; slug: string; _count?: { movies: number } }
interface CountryItem { id: string; name: string; slug: string; _count?: { movies: number } }
type Tab = 'genres' | 'countries'

export default function ContentPage() {
  const [tab, setTab] = useState<Tab>('genres')
  const [genres, setGenres] = useState<GenreItem[]>([])
  const [countries, setCountries] = useState<CountryItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState<{ id: string; name: string; slug: string } | null>(null)
  const [form, setForm] = useState({ name: '', slug: '' })
  const [saving, setSaving] = useState(false)

  const fetchGenres = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ limit: '200' })
    if (search) p.set('search', search)
    const res = await fetch(`/api/admin/genres?${p}`)
    if (res.ok) { const d = await res.json(); setGenres(d.data || []) }
    setLoading(false)
  }, [search])

  const fetchCountries = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams({ limit: '200' })
    if (search) p.set('search', search)
    const res = await fetch(`/api/admin/countries?${p}`)
    if (res.ok) { const d = await res.json(); setCountries(d.data || []) }
    setLoading(false)
  }, [search])

  useEffect(() => {
    if (tab === 'genres') fetchGenres()
    else fetchCountries()
  }, [tab, fetchGenres, fetchCountries])

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleAdd = async () => {
    if (!form.name || !form.slug) return
    setSaving(true)
    const endpoint = tab === 'genres' ? '/api/admin/genres' : '/api/admin/countries'
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) { setShowAdd(false); setForm({ name: '', slug: '' }); tab === 'genres' ? fetchGenres() : fetchCountries() }
    else { const d = await res.json(); alert(d.error || 'Lỗi') }
    setSaving(false)
  }

  const handleEdit = async () => {
    if (!editItem) return
    setSaving(true)
    const endpoint = tab === 'genres' ? `/api/admin/genres/${editItem.id}` : `/api/admin/countries/${editItem.id}`
    const res = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editItem.name, slug: editItem.slug }) })
    if (res.ok) { setEditItem(null); tab === 'genres' ? fetchGenres() : fetchCountries() }
    setSaving(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa "${name}"? Phim liên kết sẽ mất tag này.`)) return
    const endpoint = tab === 'genres' ? `/api/admin/genres/${id}` : `/api/admin/countries/${id}`
    await fetch(endpoint, { method: 'DELETE' })
    tab === 'genres' ? fetchGenres() : fetchCountries()
  }

  const items = tab === 'genres' ? genres : countries

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quản lý nội dung</h1>
          <p className="text-muted-foreground">Thể loại, quốc gia và phân loại phim</p>
        </div>
        <Button className="gap-2" onClick={() => { setShowAdd(true); setForm({ name: '', slug: '' }) }}>
          <Plus className="w-4 h-4" /> Thêm mới
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-card p-1 border border-border w-fit">
        <button onClick={() => setTab('genres')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${tab === 'genres' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:bg-muted'}`}>
          <Tag className="h-4 w-4" /> Thể loại ({genres.length})
        </button>
        <button onClick={() => setTab('countries')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${tab === 'countries' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:bg-muted'}`}>
          <Globe2 className="h-4 w-4" /> Quốc gia ({countries.length})
        </button>
      </div>

      {/* Search */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Tìm kiếm..." className="pl-9 bg-muted border-border" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" onClick={() => tab === 'genres' ? fetchGenres() : fetchCountries()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-lg">{tab === 'genres' ? 'Thể loại' : 'Quốc gia'} ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {loading && items.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/10 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-muted rounded-lg" />
                    <div className="space-y-2">
                      <div className="h-5 w-24 bg-muted rounded" />
                      <div className="h-3 w-16 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-muted rounded" />
                    <div className="h-8 w-8 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3 hover:bg-muted transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="font-mono">{item.slug}</span>
                      <span>•</span>
                      <span>{item._count?.movies || 0} phim</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem({ id: item.id, name: item.name, slug: item.slug })}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item.id, item.name)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">Không có dữ liệu</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdd(false)} />
          <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Thêm {tab === 'genres' ? 'thể loại' : 'quốc gia'}</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Tên</label>
                <Input className="mt-1 bg-muted border-border" value={form.name} onChange={(e) => setForm({ name: e.target.value, slug: autoSlug(e.target.value) })} placeholder="Vd: Hành động" />
              </div>
              <div>
                <label className="text-sm font-medium">Slug</label>
                <Input className="mt-1 bg-muted border-border" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="hanh-dong" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Hủy</Button>
              <Button className="flex-1" onClick={handleAdd} disabled={saving || !form.name}>{saving ? 'Đang lưu...' : 'Thêm'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditItem(null)} />
          <div className="relative bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Sửa {tab === 'genres' ? 'thể loại' : 'quốc gia'}</h3>
              <button onClick={() => setEditItem(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Tên</label>
                <Input className="mt-1 bg-muted border-border" value={editItem.name} onChange={(e) => setEditItem({ ...editItem, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Slug</label>
                <Input className="mt-1 bg-muted border-border" value={editItem.slug} onChange={(e) => setEditItem({ ...editItem, slug: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setEditItem(null)}>Hủy</Button>
              <Button className="flex-1 gap-2" onClick={handleEdit} disabled={saving}><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Lưu'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
