'use client'

import React, { useState, useEffect } from 'react'
import { PERMISSIONS } from '@/src/constants/permissions'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/src/fe/components/ui/dialog'
import { Button } from '@/src/fe/components/ui/button'
import { Shield, ShieldAlert, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { can } from '@/src/lib/permissions/ui-guard'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'

interface UserPermissionsModalProps {
  user: any | null
  isOpen: boolean
  onClose: () => void
}

export function UserPermissionsModal({ user, isOpen, onClose }: UserPermissionsModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // overrides: { key: string, allowed: boolean, scope: string }[]
  const [overrides, setOverrides] = useState<any[]>([])
  const { user: currentUser } = useAuth()

  useEffect(() => {
    if (isOpen && user) {
      fetchPermissions()
    }
  }, [isOpen, user])

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/permissions`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to fetch')
      setOverrides(json.overrides || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save permissions')
      toast.success('Permission overrides updated successfully')
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const togglePermission = (permKey: string) => {
    setOverrides(prev => {
      const existing = prev.find(p => p.key === permKey)
      if (existing) {
        // Toggle allowed state
        if (existing.allowed) {
          // If allowed was true, switch to restricted (false) 
          return prev.map(p => p.key === permKey ? { ...p, allowed: false } : p)
        } else {
          // If explicitly denied, remove from overrides to revert to Role Default
          return prev.filter(p => p.key !== permKey)
        }
      } else {
        // If not explicit, add as allowed
        return [...prev, { key: permKey, allowed: true, scope: 'all' }]
      }
    })
  }

  const getPermissionState = (permKey: string) => {
    const existing = overrides.find(p => p.key === permKey)
    if (!existing) return 'default'
    return existing.allowed ? 'allowed' : 'denied'
  }

  if (!user) return null

  // Group permissions logically
  const groups = [
    { title: 'Movies', keys: [PERMISSIONS.MOVIE_READ, PERMISSIONS.MOVIE_CREATE, PERMISSIONS.MOVIE_UPDATE, PERMISSIONS.MOVIE_DELETE, PERMISSIONS.MOVIE_PUBLISH] },
    { title: 'Episodes', keys: [PERMISSIONS.EPISODE_READ, PERMISSIONS.EPISODE_CREATE, PERMISSIONS.EPISODE_UPDATE, PERMISSIONS.EPISODE_DELETE] },
    { title: 'Users & Roles', keys: [PERMISSIONS.USER_READ, PERMISSIONS.USER_UPDATE, PERMISSIONS.USER_BLOCK, PERMISSIONS.USER_ROLE_UPDATE] },
    { title: 'System', keys: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.PAYMENT_READ, PERMISSIONS.PAYMENT_UPDATE, PERMISSIONS.ADMINLOG_READ, PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_UPDATE] },
  ]

  const hasAccess = can(currentUser, PERMISSIONS.USER_ROLE_UPDATE)

  if (!hasAccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-destructive" /> Permission Denied</DialogTitle>
          </DialogHeader>
          <p>Bạn không có quyền quản lý Permission nâng cao.</p>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-5 h-5 text-primary" />
            Fine-Grained Permissions
          </DialogTitle>
          <DialogDescription>
            Tùy chỉnh quyền cá nhân cho user <b className="text-foreground">{user.email}</b>. Các thiết lập này sẽ <b>ghi đè</b> (override) quyền gốc của Role hiện tại.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 my-2">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {groups.map(group => (
                <div key={group.title} className="bg-muted/20 border border-border rounded-lg p-4">
                  <h3 className="font-semibold text-primary mb-4 pb-2 border-b border-border/50">{group.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.keys.map(permKey => {
                      const state = getPermissionState(permKey)
                      return (
                        <div key={permKey} className="flex items-center justify-between p-2 rounded-md bg-background border border-border/50 hover:border-primary/50 transition-colors">
                          <span className="text-sm font-medium select-none truncate w-3/4">{permKey}</span>
                          <Button
                            variant={state === 'allowed' ? 'default' : state === 'denied' ? 'destructive' : 'outline'}
                            size="sm"
                            className="w-24 text-xs h-7"
                            onClick={() => togglePermission(permKey)}
                          >
                            {state === 'allowed' ? 'Được cấp' : state === 'denied' ? 'Bị cấm' : 'Mặc định Role'}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-400">
                <b>Ghi chú trạng thái:</b>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><b>Mặc định Role:</b> Quyền tuân theo nhóm Role ban đầu của User.</li>
                  <li><b>Được cấp:</b> Cho phép thực thi dù Role gốc không được phép.</li>
                  <li><b className="text-destructive">Bị cấm:</b> Tước quyền dù Role gốc có được phép.</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-4 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>Hủy bỏ</Button>
          <Button onClick={handleSave} disabled={loading || saving} className="bg-primary text-primary-foreground">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Lưu ghi đè quyền
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
