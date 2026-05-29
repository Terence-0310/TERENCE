'use client'

// ============================================
// TCoin Payments Tab — presentational component
// Sprint 4A: Extracted from tcoin/page.tsx
// ============================================

import { CheckCircle2, Clock, XCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

interface PaymentOrderItem {
  id: string
  userId: string
  userName: string
  amount: number
  currency: string
  tcoins: number
  provider: string | null
  providerTxnId: string | null
  status: string
  paidAt: string | null
  createdAt: string
}

interface PaymentsTabProps {
  payments: PaymentOrderItem[]
  total: number
  page: number
  perPage: number
  filter: string
  onFilterChange: (value: string) => void
  onPageChange: (page: number) => void
  onConfirmOrder: (orderId: string) => void
  formatCoin: (n: number) => string
  formatVnd: (n: number) => string
  formatDate: (d: string) => string
}

export function PaymentsTab({
  payments, total, page, perPage, filter,
  onFilterChange, onPageChange, onConfirmOrder, formatCoin, formatVnd, formatDate,
}: PaymentsTabProps) {
  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: '', label: 'Tất cả' },
          { value: 'PENDING', label: 'Chờ xử lý' },
          { value: 'PAID', label: 'Đã thanh toán' },
          { value: 'EXPIRED', label: 'Hết hạn' },
          { value: 'FAILED', label: 'Thất bại' },
          { value: 'CANCELED', label: 'Đã huỷ' },
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => onFilterChange(s.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === s.value
                ? 'bg-primary text-white'
                : 'bg-card border border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mã đơn</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Người dùng</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Số tiền</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">TCoins</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Ngày tạo</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((o) => (
              <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {o.id.slice(0, 8)}...
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{o.userName}</p>
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatVnd(o.amount)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-yellow-400 font-bold">{formatCoin(o.tcoins)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell text-muted-foreground text-xs">
                  {formatDate(o.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {o.status === 'PENDING' && (
                    <button
                      onClick={() => onConfirmOrder(o.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/20"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Xác nhận
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Không tìm thấy đơn hàng
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Hiển thị {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} / {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 text-muted-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── StatusBadge ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    PENDING:  { icon: Clock,        color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  label: 'Chờ xử lý' },
    PAID:     { icon: CheckCircle2, color: 'text-green-400',   bg: 'bg-green-400/10',   label: 'Đã thanh toán' },
    EXPIRED:  { icon: AlertCircle,  color: 'text-orange-400',  bg: 'bg-orange-400/10',  label: 'Hết hạn' },
    FAILED:   { icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-400/10',     label: 'Thất bại' },
    CANCELED: { icon: XCircle,      color: 'text-gray-400',    bg: 'bg-gray-400/10',    label: 'Đã huỷ' },
  }
  const cfg = configs[status] || { icon: AlertCircle, color: 'text-gray-400', bg: 'bg-gray-400/10', label: status }
  const Icon = cfg.icon

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}
