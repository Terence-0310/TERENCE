'use client'

// ============================================
// TCoin Wallets Tab — presentational component
// Sprint 4A: Extracted from tcoin/page.tsx
// ============================================

import { Search, Coins, ChevronLeft, ChevronRight } from 'lucide-react'

interface WalletSummary {
  userId: string
  userName: string
  email: string
  balance: number
  totalEarned: number
  totalSpent: number
  transactionCount: number
  lastActivity: string | null
}

interface WalletsTabProps {
  wallets: WalletSummary[]
  total: number
  page: number
  perPage: number
  search: string
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
  onAdjust: (userId: string, userName: string) => void
  formatCoin: (n: number) => string
  formatDate: (d: string) => string
}

export function WalletsTab({
  wallets, total, page, perPage, search,
  onSearchChange, onPageChange, onAdjust, formatCoin, formatDate,
}: WalletsTabProps) {
  const filteredWallets = search
    ? wallets.filter(
        (w) =>
          w.userName.toLowerCase().includes(search.toLowerCase()) ||
          w.email.toLowerCase().includes(search.toLowerCase()),
      )
    : wallets

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center bg-card rounded-lg px-3 py-2 border border-border flex-1 max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo tên, email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ml-2 bg-transparent border-0 outline-none text-sm flex-1"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Người dùng</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Số dư</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Đã nhận</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Đã dùng</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">GD</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Hoạt động</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredWallets.map((w) => (
              <tr key={w.userId} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{w.userName}</p>
                    <p className="text-xs text-muted-foreground">{w.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-yellow-400">{formatCoin(w.balance)}</span>
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className="text-green-400">+{formatCoin(w.totalEarned)}</span>
                </td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <span className="text-red-400">-{formatCoin(w.totalSpent)}</span>
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground">
                  {w.transactionCount}
                </td>
                <td className="px-4 py-3 text-right hidden lg:table-cell text-muted-foreground text-xs">
                  {w.lastActivity ? formatDate(w.lastActivity) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onAdjust(w.userId, w.userName)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20"
                  >
                    <Coins className="h-3 w-3" />
                    Điều chỉnh
                  </button>
                </td>
              </tr>
            ))}
            {filteredWallets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Không tìm thấy dữ liệu
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
