'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/fe/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'default',
}: ConfirmModalProps) {
  const [loading, setLoading] = React.useState(false)

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      await onConfirm()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={onClose}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
