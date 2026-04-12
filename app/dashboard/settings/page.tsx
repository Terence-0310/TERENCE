'use client'

import { useState } from 'react'
import { Save, Bell, Shield, Globe, Palette, Mail } from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { Input } from '@/src/fe/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/fe/components/ui/card'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-muted-foreground">Quản lý các thiết lập hệ thống và tài khoản</p>
      </div>

      {/* General Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Cài đặt chung</CardTitle>
              <CardDescription>Thông tin cơ bản về website</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Tên website</label>
              <Input defaultValue="Terence" className="mt-1 bg-muted border-border" />
            </div>
            <div>
              <label className="text-sm font-medium">Slogan</label>
              <Input defaultValue="Xem phim online chất lượng cao" className="mt-1 bg-muted border-border" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Mô tả website</label>
            <textarea
              defaultValue="Terence - Nền tảng xem phim trực tuyến hàng đầu Việt Nam với kho phim phong phú và chất lượng cao."
              className="w-full mt-1 px-3 py-2 bg-muted border border-border rounded-lg h-20 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Thông báo</CardTitle>
              <CardDescription>Quản lý cách bạn nhận thông báo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium">Thông báo email</p>
              <p className="text-sm text-muted-foreground">Nhận thông báo qua email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors">
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="font-medium">Thông báo push</p>
              <p className="text-sm text-muted-foreground">Nhận thông báo trên trình duyệt</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors">
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Báo cáo hằng tuần</p>
              <p className="text-sm text-muted-foreground">Nhận báo cáo thống kê mỗi tuần</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary transition-colors">
                <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Bảo mật</CardTitle>
              <CardDescription>Cài đặt bảo mật tài khoản</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Mật khẩu hiện tại</label>
            <Input type="password" placeholder="Nhập mật khẩu hiện tại" className="mt-1 bg-muted border-border" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Mật khẩu mới</label>
              <Input type="password" placeholder="Nhập mật khẩu mới" className="mt-1 bg-muted border-border" />
            </div>
            <div>
              <label className="text-sm font-medium">Xác nhận mật khẩu</label>
              <Input type="password" placeholder="Nhập lại mật khẩu mới" className="mt-1 bg-muted border-border" />
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-border mt-4">
            <div>
              <p className="font-medium">Xác thực 2 yếu tố</p>
              <p className="text-sm text-muted-foreground">Thêm lớp bảo vệ cho tài khoản</p>
            </div>
            <Button variant="outline" size="sm">
              Kích hoạt
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Giao diện</CardTitle>
              <CardDescription>Tùy chỉnh giao diện website</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-3 block">Chế độ giao diện</label>
            <div className="flex gap-4">
              <button className="flex-1 p-4 border-2 border-primary rounded-lg bg-card">
                <div className="w-full h-8 bg-background rounded mb-2" />
                <p className="text-sm font-medium">Tối</p>
              </button>
              <button className="flex-1 p-4 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors">
                <div className="w-full h-8 bg-white rounded mb-2" />
                <p className="text-sm font-medium">Sáng</p>
              </button>
              <button className="flex-1 p-4 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors">
                <div className="w-full h-8 bg-gradient-to-r from-background to-white rounded mb-2" />
                <p className="text-sm font-medium">Tự động</p>
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-3 block">Màu chủ đạo</label>
            <div className="flex gap-3">
              {['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-orange-500', 'bg-pink-500'].map((color, idx) => (
                <button
                  key={color}
                  className={`w-10 h-10 rounded-full ${color} ${idx === 0 ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : ''}`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4 pt-4">
        {saved && (
          <span className="text-sm text-green-500">Đã lưu thay đổi!</span>
        )}
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Lưu thay đổi
        </Button>
      </div>
    </div>
  )
}
