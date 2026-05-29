'use client'

// ============================================
// Admin TCoin — Transactions & Refund modal
// ============================================
// Opens from the WalletsTab "Lịch sử" action and lets the admin browse a
// single user's wallet transactions and refund any DEBIT row.

import { useCallback, useEffect, useState } from 'react'
import { X, RefreshCw, Undo2 } from 'lucide-react'

interface TxnItem {
  id: string
  direction: string
  type: string
  status: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  title: string | null
  description: string | null
  referenceId: string | null
  createdAt: string
  refundable: boolean
}

interface TransactionsModalProps {
  userId: string
  userName: string
  onClose: () => void
  formatCoin: (n: number) => string
  formatDate: (d: string) => string
}

export function TransactionsModal({
  userId, userName, onClose, formatCoin, formatDate,
}: TransactionsModalProps) {
  const [items, setItems] = useState<TxnItem[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refunding, setRefunding] = useState<string | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [confirmTxId, setConfirmTxId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tcoin/users/${userId}/transactions?page=1&perPage=50`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        setBalance(data.balance ?? 0)
      } else {
        setItems([])
      }
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const handleRefund = async (txId: string) => {
    if (refundReason.trim().length < 5) {
      alert('Lý do hoàn tiền phải có ít nhất 5 ký tự')
      return
    }
    setRefunding(txId)
    try {
      const res = await fetch('/api/admin/tcoin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, reason: refundReason.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        alert('Hoàn tiền thành công!')
        setConfirmTxId(null)
        setRefundReason('')
        load()
      } else {
        alert(data.error || data.message || 'Hoàn tiền thất bại')
      }
    } finally {
      setRefunding(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-card border border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-bold">Lịch sử giao dịch — {userName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Số dư hiện tại:{' '}
              <span className="text-yellow-400 font-bold tabular-nums">
                {formatCoin(balance)} TCoin
              </span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={load}
              disabled={loading}
              className="rounded-lg p-2 hover:bg-muted disabled:opacity-50"
              title="Làm mới"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-muted"
              title="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-1">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Đang tải…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Không có giao dịch nào</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Thời gian</th>
                  <th className="text-left px-4 py-2 font-medium">Loại</th>
                  <th className="text-left px-4 py-2 font-medium">Mô tả</th>
                  <th className="text-right px-4 py-2 font-medium">Số dư</th>
                  <th className="text-right px-4 py-2 font-medium">Số TCoin</th>
                  <th className="text-right px-4 py-2 font-medium">Hoàn tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => {
                  const isCredit = tx.direction.toLowerCase() === 'credit'
                  return (
                    <tr key={tx.id} className="border-b border-border/40 hover:bg-muted/40">
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                        {tx.type}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {tx.title || tx.description || '—'}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-muted-foreground tabular-nums">
                        {formatCoin(tx.balanceAfter)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-bold tabular-nums ${
                          isCredit ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {isCredit ? '+' : '−'}
                        {formatCoin(tx.amount)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {tx.refundable ? (
                          <button
                            onClick={() => setConfirmTxId(tx.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400 hover:bg-orange-500/20"
                          >
                            <Undo2 className="h-3 w-3" />
                            Hoàn
                          </button>
                        ) : tx.type === 'REFUND' ? (
                          <span className="text-[11px] text-green-400">Đã hoàn</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Refund confirmation footer */}
        {confirmTxId && (
          <div className="border-t border-border p-4 bg-muted/30">
            <p className="text-xs font-semibold mb-2">
              Hoàn tiền cho giao dịch <code className="text-orange-400">{confirmTxId.slice(0, 8)}…</code>
            </p>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Lý do hoàn tiền (tối thiểu 5 ký tự)…"
              rows={2}
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => { setConfirmTxId(null); setRefundReason('') }}
                disabled={refunding === confirmTxId}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                Huỷ
              </button>
              <button
                onClick={() => handleRefund(confirmTxId)}
                disabled={refunding === confirmTxId || refundReason.trim().length < 5}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500/90 disabled:opacity-50"
              >
                {refunding === confirmTxId ? 'Đang hoàn…' : 'Xác nhận hoàn tiền'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
