'use client'

// ============================================
// Admin TCoin Dashboard
// ============================================
// Sprint 4A: Extracted WalletsTab, PaymentsTab, and AdjustModal
// into _components/ subcomponents to reduce page complexity.

import { useState, useEffect, useCallback } from 'react'
import {
  Coins,
  Wallet,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react'
import { WalletsTab } from './_components/WalletsTab'
import { PaymentsTab } from './_components/PaymentsTab'
import { AdjustModal } from './_components/AdjustModal'

// ── Types ──
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

type Tab = 'wallets' | 'payments'

export default function TCoinDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('wallets')
  const [wallets, setWallets] = useState<WalletSummary[]>([])
  const [payments, setPayments] = useState<PaymentOrderItem[]>([])
  const [walletsTotal, setWalletsTotal] = useState(0)
  const [paymentsTotal, setPaymentsTotal] = useState(0)
  const [walletsPage, setWalletsPage] = useState(1)
  const [paymentsPage, setPaymentsPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<string>('')

  // Stats
  const [stats, setStats] = useState({
    totalCirculating: 0,
    activeWallets: 0,
    totalOrders: 0,
    completedOrders: 0,
  })

  // Adjust modal
  const [adjustModal, setAdjustModal] = useState<{ userId: string; userName: string } | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const PER_PAGE = 15

  const loadWallets = useCallback(async (page: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tcoin/wallets?page=${page}&perPage=${PER_PAGE}`)
      if (res.ok) {
        const data = await res.json()
        setWallets(data.items)
        setWalletsTotal(data.total)

        const totalCirculating = data.items.reduce((s: number, w: WalletSummary) => s + w.balance, 0)
        setStats((prev) => ({
          ...prev,
          totalCirculating,
          activeWallets: data.total,
        }))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPayments = useCallback(async (page: number, status?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) })
      if (status) params.set('status', status)
      const res = await fetch(`/api/admin/tcoin/payments?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.items)
        setPaymentsTotal(data.total)
        setStats((prev) => ({
          ...prev,
          totalOrders: data.total,
          completedOrders: data.items.filter((o: PaymentOrderItem) => o.status === 'completed').length,
        }))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'wallets') {
      loadWallets(walletsPage)
    } else {
      loadPayments(paymentsPage, paymentFilter)
    }
  }, [activeTab, walletsPage, paymentsPage, paymentFilter, loadWallets, loadPayments])

  const handleAdjust = async () => {
    if (!adjustModal || !adjustAmount || !adjustReason) return
    setAdjusting(true)
    try {
      const res = await fetch('/api/admin/tcoin/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: adjustModal.userId,
          amount: Number(adjustAmount),
          reason: adjustReason,
        }),
      })
      if (res.ok) {
        setAdjustModal(null)
        setAdjustAmount('')
        setAdjustReason('')
        loadWallets(walletsPage)
      }
    } finally {
      setAdjusting(false)
    }
  }

  const handleConfirmOrder = async (orderId: string) => {
    const res = await fetch('/api/payments/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        providerTxnId: `admin-confirm-${Date.now()}`,
        status: 'completed',
      }),
    })
    if (res.ok) {
      loadPayments(paymentsPage, paymentFilter)
    }
  }

  const handlePaymentFilterChange = (value: string) => {
    setPaymentFilter(value)
    setPaymentsPage(1)
  }

  const formatCoin = (n: number) => n.toLocaleString('vi-VN')
  const formatVnd = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)
  const formatDate = (d: string) => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="h-6 w-6 text-yellow-400" />
            TCoin & Payments
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý ví, giao dịch và đơn nạp TCoin
          </p>
        </div>
        <button
          onClick={() => activeTab === 'wallets' ? loadWallets(walletsPage) : loadPayments(paymentsPage, paymentFilter)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/20 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Coins} label="TCoin lưu hành" value={formatCoin(stats.totalCirculating)} color="text-yellow-400" bgColor="bg-yellow-400/10" />
        <StatCard icon={Users} label="Ví hoạt động" value={String(stats.activeWallets)} color="text-blue-400" bgColor="bg-blue-400/10" />
        <StatCard icon={CreditCard} label="Tổng đơn nạp" value={String(stats.totalOrders)} color="text-green-400" bgColor="bg-green-400/10" />
        <StatCard icon={TrendingUp} label="Đơn thành công" value={String(stats.completedOrders)} color="text-emerald-400" bgColor="bg-emerald-400/10" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-card p-1 border border-border w-fit">
        <TabButton active={activeTab === 'wallets'} onClick={() => setActiveTab('wallets')} icon={Wallet} label="Ví người dùng" />
        <TabButton active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={CreditCard} label="Đơn nạp tiền" />
      </div>

      {/* Content */}
      {activeTab === 'wallets' && (
        <WalletsTab
          wallets={wallets}
          total={walletsTotal}
          page={walletsPage}
          perPage={PER_PAGE}
          search={search}
          onSearchChange={setSearch}
          onPageChange={setWalletsPage}
          onAdjust={(userId, userName) => setAdjustModal({ userId, userName })}
          formatCoin={formatCoin}
          formatDate={formatDate}
        />
      )}

      {activeTab === 'payments' && (
        <PaymentsTab
          payments={payments}
          total={paymentsTotal}
          page={paymentsPage}
          perPage={PER_PAGE}
          filter={paymentFilter}
          onFilterChange={handlePaymentFilterChange}
          onPageChange={setPaymentsPage}
          onConfirmOrder={handleConfirmOrder}
          formatCoin={formatCoin}
          formatVnd={formatVnd}
          formatDate={formatDate}
        />
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <AdjustModal
          userName={adjustModal.userName}
          amount={adjustAmount}
          reason={adjustReason}
          adjusting={adjusting}
          onAmountChange={setAdjustAmount}
          onReasonChange={setAdjustReason}
          onConfirm={handleAdjust}
          onClose={() => { setAdjustModal(null); setAdjustAmount(''); setAdjustReason('') }}
        />
      )}
    </div>
  )
}

// ── Small sub-components (kept inline — too small to extract) ──

function StatCard({ icon: Icon, label, value, color, bgColor }: {
  icon: React.ElementType; label: string; value: string; color: string; bgColor: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label }: {
  active: boolean; onClick: () => void; icon: React.ElementType; label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-primary text-white shadow'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
