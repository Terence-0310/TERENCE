'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, Loader2, Globe, Database, Settings, Server, Shield, Lock, Network } from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { Card, CardContent, CardTitle, CardDescription } from '@/src/fe/components/ui/card'
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
  const [savingGroup, setSavingGroup] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi tải cấu hình')
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
    setSavingGroup(group)
    try {
      const keysToUpdate = Object.keys(form).filter(key =>
        (settings[key]?.group === group) ||
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
      toast.success('Lưu cấu hình thành công!')
      fetchSettings()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi lưu cấu hình')
    } finally {
      setSavingGroup(null)
    }
  }

  const setupFields: Record<string, { key: string, label: string, type: 'string'|'boolean'|'textarea', group: string, description?: string, placeholder?: string }[]> = {
    general: [
      { key: 'site_name', label: 'Tên Website', type: 'string', group: 'general', description: 'Tên thương hiệu hiển thị trên thanh tiêu đề và các email.', placeholder: 'TERENCE' },
      { key: 'site_description', label: 'Mô tả ngắn (SEO)', type: 'textarea', group: 'general', description: 'Mô tả dùng cho các thẻ Meta giúp tăng thứ hạng tìm kiếm.', placeholder: 'Nền tảng xem phim trực tuyến...' },
      { key: 'maintenance_mode', label: 'Chế độ bảo trì', type: 'boolean', group: 'general', description: 'Kích hoạt sẽ đóng cửa website với người dùng phổ thông.' },
    ],
    tmdb: [
      { key: 'tmdb_api_key', label: 'API Key TMDB', type: 'string', group: 'tmdb', description: 'Chìa khóa kết nối hệ thống với kho dữ liệu TheMovieDB.', placeholder: 'Nhập API Key v3 auth...' },
      { key: 'ophim_sync_enabled', label: 'Đồng bộ từ OPhim', type: 'boolean', group: 'tmdb', description: 'Tự động quét và lấy link phim mới từ nguồn OPhim.' }
    ],
    security: [
      {
        key: 'max_login_attempts',
        label: 'Số lần đăng nhập thất bại tối đa',
        type: 'string',
        group: 'security',
        description: 'Khoá tài khoản sau số lần đăng nhập sai liên tiếp này. Mặc định: 5.',
        placeholder: '5',
      },
      {
        key: 'lockout_duration_minutes',
        label: 'Thời gian khoá tài khoản (phút)',
        type: 'string',
        group: 'security',
        description: 'Tài khoản bị khoá trong khoảng thời gian này sau khi vượt giới hạn đăng nhập. Mặc định: 15.',
        placeholder: '15',
      },
      {
        key: 'ip_whitelist_enabled',
        label: 'Bật IP Whitelist cho Admin',
        type: 'boolean',
        group: 'security',
        description: 'Chỉ cho phép truy cập trang quản trị từ các địa chỉ IP đã đăng ký bên dưới.',
      },
      {
        key: 'ip_whitelist',
        label: 'Danh sách IP được phép (Whitelist)',
        type: 'textarea',
        group: 'security',
        description: 'Mỗi địa chỉ IP trên một dòng. Hỗ trợ CIDR (vd: 10.0.0.0/8). Áp dụng khi whitelist được bật.',
        placeholder: '127.0.0.1\n192.168.1.0/24',
      },
    ]
  }

  const tabs = [
    { id: 'general', label: 'Cấu hình chung', icon: Globe },
    { id: 'tmdb', label: 'Đồng bộ & API', icon: Database },
    { id: 'security', label: 'Bảo mật', icon: Shield },
  ]

  if (loading && Object.keys(settings).length === 0) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="h-4 w-96 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-6">
          <div className="w-64 space-y-2 shrink-0">
            {[1, 2, 3].map(i => <div key={i} className="h-10 w-full bg-muted rounded-lg animate-pulse" />)}
          </div>
          <div className="flex-1 space-y-4">
            <div className="h-48 w-full bg-muted/50 rounded-xl animate-pulse" />
            <div className="h-64 w-full bg-muted/50 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl font-nunito pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            Cài đặt Hệ thống
          </h1>
          <p className="text-muted-foreground font-medium mt-1">Quản lý và tùy biến toàn bộ thông số cốt lõi của nền tảng.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-100'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">

          {/* General Tab */}
          <div className={`transition-all duration-500 ${activeTab === 'general' ? 'block animate-fade-in-up' : 'hidden'}`}>
            <Card className="bg-card border-border shadow-sm overflow-hidden">
              <div className="bg-linear-to-r from-primary/10 via-background to-background p-6 border-b border-border/50">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" /> Thông tin cơ bản
                </CardTitle>
                <CardDescription className="mt-1">Hiển thị ra bên ngoài và ảnh hưởng tới SEO.</CardDescription>
              </div>
              <CardContent className="p-6 space-y-6">
                {setupFields.general.map((field) => (
                   <div key={field.key} className="space-y-2">
                     <label className="text-sm font-bold text-foreground">{field.label}</label>
                     {field.type === 'string' && (
                       <Input
                         value={form[field.key] || ''}
                         onChange={e => handleChange(field.key, e.target.value)}
                         placeholder={field.placeholder || field.label}
                         className="h-11 bg-muted/50 border-border focus:bg-background transition-colors"
                       />
                     )}
                     {field.type === 'textarea' && (
                       <Textarea
                         value={form[field.key] || ''}
                         onChange={e => handleChange(field.key, e.target.value)}
                         placeholder={field.placeholder || field.label}
                         className="resize-none bg-muted/50 border-border focus:bg-background transition-colors"
                         rows={4}
                       />
                     )}
                     {field.type === 'boolean' && (
                       <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                         <Switch
                           checked={form[field.key] === 'true'}
                           onCheckedChange={(c) => handleChange(field.key, String(c))}
                         />
                         <div>
                           <p className="text-sm font-bold">Kích hoạt {field.label.toLowerCase()}</p>
                         </div>
                       </div>
                     )}
                     {field.description && <p className="text-xs text-muted-foreground font-medium">{field.description}</p>}
                   </div>
                ))}
                <div className="pt-4 border-t border-border/50">
                  <Button onClick={() => handleSave('general')} disabled={savingGroup === 'general'} className="gap-2 shadow-lg hover:shadow-primary/20 transition-all">
                    {savingGroup === 'general' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Lưu cấu hình chung
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TMDB / Sync Tab */}
          <div className={`transition-all duration-500 ${activeTab === 'tmdb' ? 'block animate-fade-in-up' : 'hidden'}`}>
            <Card className="bg-card border-border shadow-sm overflow-hidden">
              <div className="bg-linear-to-r from-blue-500/10 via-background to-background p-6 border-b border-border/50">
                 <CardTitle className="text-xl flex items-center gap-2">
                   <Server className="w-5 h-5 text-blue-500" /> Kết nối & Đồng bộ
                 </CardTitle>
                 <CardDescription className="mt-1">Cấu hình kết nối dữ liệu từ bên thứ 3 (TMDB, OPhim).</CardDescription>
              </div>
              <CardContent className="p-6 space-y-6">
                {setupFields.tmdb.map((field) => (
                  <div key={field.key} className="space-y-2">
                     <label className="text-sm font-bold text-foreground">{field.label}</label>
                     {field.type === 'string' && (
                       <Input
                         value={form[field.key] || ''}
                         onChange={e => handleChange(field.key, e.target.value)}
                         placeholder={field.placeholder || field.label}
                         className="h-11 bg-muted/50 font-mono text-sm border-border focus:bg-background transition-colors"
                       />
                     )}
                     {field.type === 'boolean' && (
                       <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                         <Switch
                           checked={form[field.key] === 'true'}
                           onCheckedChange={(c) => handleChange(field.key, String(c))}
                         />
                         <div>
                           <p className="text-sm font-bold">Kích hoạt {field.label.toLowerCase()}</p>
                         </div>
                       </div>
                     )}
                     {field.description && <p className="text-xs text-muted-foreground font-medium">{field.description}</p>}
                  </div>
                ))}
                <div className="pt-4 border-t border-border/50">
                  <Button onClick={() => handleSave('tmdb')} disabled={savingGroup === 'tmdb'} variant="default" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg hover:shadow-blue-600/20 transition-all">
                    {savingGroup === 'tmdb' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Lưu cấu hình API
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security Tab */}
          <div className={`transition-all duration-500 ${activeTab === 'security' ? 'block animate-fade-in-up' : 'hidden'}`}>
            <div className="space-y-6">
              {/* Login Protection */}
              <Card className="bg-card border-border shadow-sm overflow-hidden">
                <div className="bg-linear-to-r from-red-500/10 via-background to-background p-6 border-b border-border/50">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Lock className="w-5 h-5 text-red-500" /> Bảo vệ đăng nhập
                  </CardTitle>
                  <CardDescription className="mt-1">Giới hạn số lần đăng nhập sai và tự động khoá tài khoản.</CardDescription>
                </div>
                <CardContent className="p-6 space-y-6">
                  {setupFields.security.slice(0, 2).map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-sm font-bold text-foreground">{field.label}</label>
                      <Input
                        type="number"
                        min="1"
                        value={form[field.key] || ''}
                        onChange={e => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="h-11 bg-muted/50 border-border focus:bg-background transition-colors w-48"
                      />
                      {field.description && <p className="text-xs text-muted-foreground font-medium">{field.description}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* IP Whitelist */}
              <Card className="bg-card border-border shadow-sm overflow-hidden">
                <div className="bg-linear-to-r from-amber-500/10 via-background to-background p-6 border-b border-border/50">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Network className="w-5 h-5 text-amber-500" /> Kiểm soát truy cập IP
                  </CardTitle>
                  <CardDescription className="mt-1">Giới hạn quyền truy cập trang quản trị theo địa chỉ IP.</CardDescription>
                </div>
                <CardContent className="p-6 space-y-6">
                  {setupFields.security.slice(2).map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-sm font-bold text-foreground">{field.label}</label>
                      {field.type === 'boolean' && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                          <Switch
                            checked={form[field.key] === 'true'}
                            onCheckedChange={(c) => handleChange(field.key, String(c))}
                          />
                          <div>
                            <p className="text-sm font-bold">Kích hoạt {field.label.toLowerCase()}</p>
                          </div>
                        </div>
                      )}
                      {field.type === 'textarea' && (
                        <Textarea
                          value={form[field.key] || ''}
                          onChange={e => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="resize-none bg-muted/50 border-border focus:bg-background transition-colors font-mono text-sm"
                          rows={6}
                        />
                      )}
                      {field.description && <p className="text-xs text-muted-foreground font-medium">{field.description}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div>
                <Button
                  onClick={() => handleSave('security')}
                  disabled={savingGroup === 'security'}
                  variant="default"
                  className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-lg hover:shadow-red-600/20 transition-all"
                >
                  {savingGroup === 'security' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu cấu hình bảo mật
                </Button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
