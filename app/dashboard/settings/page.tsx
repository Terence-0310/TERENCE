'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, Globe, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/fe/components/ui/card'
import { Textarea } from '@/src/fe/components/ui/textarea'
import { Switch } from '@/src/fe/components/ui/switch'
import { toast } from 'sonner'

interface SystemSetting {
  id: string
  key: string
  value: string
  type: string
  group: string
  description?: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, SystemSetting>>({})
  const [form, setForm] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch settings from API
  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      if (!res.ok) throw new Error('Không thể tải cấu hình Hệ thống')
      const json = await res.json()
      setSettings(json.settings || {})
      
      const initialForm: Record<string, string> = {}
      Object.keys(json.settings || {}).forEach(k => {
        initialForm[k] = json.settings[k].value
      })
      setForm(initialForm)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async (group: string) => {
    setSaving(true)
    try {
      // Find all settings keys for this group
      const keysToUpdate = Object.keys(form).filter(key => 
        (settings[key]?.group === group) || 
        // Or if it's a new setting that we are pre-defining
        setupFields[group]?.some(f => f.key === key)
      )

      const updates = keysToUpdate.map(key => {
        const fieldMeta = setupFields[group]?.find(f => f.key === key)
        return {
          key,
          value: form[key],
          group: fieldMeta?.group || group,
          type: fieldMeta?.type || 'string',
          description: fieldMeta?.description
        }
      })

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      if (!res.ok) throw new Error('Lỗi cập nhật thiết lập')
      toast.success('Cập nhật thành công')
      
      // Update local state sync
      fetchSettings()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Pre-defined UI fields in case they don't exist yet in the DB
  const setupFields: Record<string, { key: string, label: string, type: 'string'|'boolean'|'textarea', group: string, description?: string }[]> = {
    general: [
      { key: 'site_name', label: 'Tên Website', type: 'string', group: 'general', description: 'Tên thương hiệu hiển thị (VD: TERENCE)' },
      { key: 'site_description', label: 'Mô tả ngắn', type: 'textarea', group: 'general', description: 'Mô tả dùng cho SEO (Meta Description)' },
      { key: 'maintenance_mode', label: 'Chế độ bảo trì', type: 'boolean', group: 'general', description: 'Tạm ngưng truy cập người dùng phổ thông' },
    ],
    tmdb: [
      { key: 'tmdb_api_key', label: 'API Key TMDB', type: 'string', group: 'tmdb', description: 'Key đồng bộ thông tin phim từ cổng TMDB' },
      { key: 'ophim_sync_enabled', label: 'Bật đồng bộ nguồn OPhim', type: 'boolean', group: 'tmdb' }
    ]
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Cài đặt Hệ thống</h1>
        <p className="text-muted-foreground">Quản lý cấu hình động, không cần reboot máy chủ</p>
      </div>

      {/* General Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Cấu hình chung</CardTitle>
          <CardDescription>Các thông tin cơ bản về website của bạn.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {setupFields.general.map((field) => (
             <div key={field.key} className="space-y-1">
               <label className="text-sm font-medium">{field.label}</label>
               {field.type === 'string' && (
                 <Input 
                   value={form[field.key] || ''} 
                   onChange={e => handleChange(field.key, e.target.value)} 
                   placeholder={field.label}
                 />
               )}
               {field.type === 'textarea' && (
                 <Textarea 
                   value={form[field.key] || ''} 
                   onChange={e => handleChange(field.key, e.target.value)} 
                   placeholder={field.label}
                   className="resize-none"
                   rows={3}
                 />
               )}
               {field.type === 'boolean' && (
                 <div className="flex items-center gap-2">
                   <Switch 
                     checked={form[field.key] === 'true'} 
                     onCheckedChange={(c) => handleChange(field.key, String(c))} 
                   />
                   <span className="text-sm text-muted-foreground tracking-tight">Kích hoạt</span>
                 </div>
               )}
               {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
             </div>
          ))}
          <Button onClick={() => handleSave('general')} disabled={saving} className="mt-4">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Lưu Cấu Hình Chung
          </Button>
        </CardContent>
      </Card>

      {/* API / Sync Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
           <CardTitle className="text-lg">Đồng bộ Nguồn Phim (Metadata)</CardTitle>
           <CardDescription>Khóa API và cấu hình đồng bộ phim thủ công.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {setupFields.tmdb.map((field) => (
            <div key={field.key} className="space-y-1">
               <label className="text-sm font-medium">{field.label}</label>
               {field.type === 'string' && (
                 <Input 
                   value={form[field.key] || ''} 
                   onChange={e => handleChange(field.key, e.target.value)} 
                   placeholder={field.label}
                 />
               )}
               {field.type === 'boolean' && (
                 <div className="flex items-center gap-2">
                   <Switch 
                     checked={form[field.key] === 'true'} 
                     onCheckedChange={(c) => handleChange(field.key, String(c))} 
                   />
                   <span className="text-sm text-muted-foreground tracking-tight">Kích hoạt</span>
                 </div>
               )}
               {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
            </div>
          ))}
          <Button onClick={() => handleSave('tmdb')} disabled={saving} className="mt-4" variant="secondary">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Lưu Cấu Hình Nguồn
          </Button>
        </CardContent>
      </Card>
      
    </div>
  )
}
