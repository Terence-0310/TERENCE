'use client'

// ============================================
// TCoin Adjust Modal — presentational component
// Sprint 4A: Extracted from tcoin/page.tsx
// ============================================

import { Coins, Plus, Minus } from 'lucide-react'

interface AdjustModalProps {
  userName: string
  amount: string
  reason: string
  adjusting: boolean
  onAmountChange: (value: string) => void
  onReasonChange: (value: string) => void
  onConfirm: () => void
  onClose: () => void
}

export function AdjustModal({
  userName, amount, reason, adjusting,
  onAmountChange, onReasonChange, onConfirm, onClose,
}: AdjustModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Coins className="h-5 w-5 text-yellow-400" />
          Điều chỉnh TCoin
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Người dùng: <span className="font-medium text-foreground">{userName}</span>
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium">Số lượng (dương = cộng, âm = trừ)</label>
            <div className="mt-1 flex items-center gap-2">
              <button
                onClick={() => onAmountChange(String(Math.abs(Number(amount) || 0)))}
                className="rounded-lg bg-green-500/10 p-2 text-green-400 hover:bg-green-500/20"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                onClick={() => onAmountChange(String(-Math.abs(Number(amount) || 0)))}
                className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                placeholder="Vd: 100 hoặc -50"
                className="flex-1 rounded-lg bg-muted border border-border px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Lý do</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Ghi rõ lý do điều chỉnh..."
              className="mt-1 w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium transition hover:bg-muted/80"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={!amount || !reason || adjusting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
          >
            {adjusting ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  )
}
