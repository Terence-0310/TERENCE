'use client'

import { useAuthModal } from './auth-modal-store'
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/src/fe/components/ui/dialog'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

export function AuthModal() {
  const { isOpen, view, closeModal } = useAuthModal()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden bg-background border border-white/10 rounded-2xl shadow-2xl">
        <div className="w-full px-6 py-10 sm:px-10 flex flex-col items-center">
          <DialogHeader className="sr-only">
            <DialogTitle>Xác thực</DialogTitle>
          </DialogHeader>
          {view === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
