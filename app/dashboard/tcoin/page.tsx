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
  AlertTriangle,
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

const MOCK_WALLETS: WalletSummary[] = [
  { userId: 'u1', userName: 'Nguyễn Văn Admin', email: 'admin@terence.com', balance: 14500000, totalEarned: 24000000, totalSpent: 9500000, transactionCount: 45, lastActivity: new Date().toISOString() },
  { userId: 'u2', userName: 'VVIP Đam Mê', email: 'vvip@yahoo.com', balance: 8500000, totalEarned: 12000000, totalSpent: 3500000, transactionCount: 22, lastActivity: new Date(Date.now() - 3600000).toISOString() },
  { userId: 'u3', userName: 'Thích Xem Chùa', email: 'xemchua@gmail.com', balance: 50000, totalEarned: 100000, totalSpent: 50000, transactionCount: 3, lastActivity: new Date(Date.now() - 86400000).toISOString() },
  { userId: 'u4', userName: 'Phú Nhị Đại', email: 'richkid@hotmail.com', balance: 50000000, totalEarned: 52000000, totalSpent: 2000000, transactionCount: 15, lastActivity: new Date(Date.now() - 120000).toISOString() },
  { userId: 'u5', userName: 'Dân Cày Cuốc', email: 'caycuoc@game.vn', balance: 1200000, totalEarned: 2400000, totalSpent: 1200000, transactionCount: 124, lastActivity: new Date(Date.now() - 86400000 * 2).toISOString() },
]

const MOCK_PAYMENTS: PaymentOrderItem[] = [
  { id: 'ORD-89472', userId: 'u4', userName: 'Phú Nhị Đại', amount: 500000, currency: 'VND', tcoins: 50000000, provider: 'vietqr', providerTxnId: 'SEPAY123456', status: 'completed', paidAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 3610000).toISOString() },
  { id: 'ORD-89473', userId: 'u2', userName: 'VVIP Đam Mê', amount: 100000, currency: 'VND', tcoins: 10000000, provider: 'vnpay', providerTxnId: 'VNP789012', status: 'completed', paidAt: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date(Date.now() - 7210000).toISOString() },
  { id: 'ORD-89474', userId: 'u5', userName: 'Dân Cày Cuốc', amount: 20000, currency: 'VND', tcoins: 2000000, provider: 'zalopay', providerTxnId: null, status: 'pending', paidAt: null, createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'ORD-89475', userId: 'u3', userName: 'Thích Xem Chùa', amount: 50000, currency: 'VND', tcoins: 5000000, provider: 'vietqr', providerTxnId: null, status: 'failed', paidAt: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
]

const MOCK_TCOIN_STATS = {
  totalCirculating: 145500000,
  activeWallets: 12450,
  totalOrders: 15420,
  completedOrders: 14800,
}

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

  const [isMockData, setIsMockData] = useState(false)

  const PER_PAGE = 15

  const loadWallets = useCallback(async (page: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tcoin/wallets?page=${page}&perPage=${PER_PAGE}`)
      if (res.ok) {
        const data = await res.json()
        const isFallback = !data.items || data.items.length === 0;
        setIsMockData(isFallback);
        const currentWallets = isFallback ? MOCK_WALLETS : data.items;
        
        setWallets(currentWallets)
        setWalletsTotal(isFallback ? 12450 : data.total)

        const totalCirculating = isFallback ? MOCK_TCOIN_STATS.totalCirculating : data.items.reduce((s: number, w: WalletSummary) => s + w.balance, 0)
        setStats((prev) => ({
          ...prev,
          totalCirculating,
          activeWallets: isFallback ? MOCK_TCOIN_STATS.activeWallets : data.total,
        }))
      } else {
        setIsMockData(true);
        setWallets(MOCK_WALLETS); setWalletsTotal(12450);
        setStats(prev => ({ ...prev, totalCirculating: MOCK_TCOIN_STATS.totalCirculating, activeWallets: MOCK_TCOIN_STATS.activeWallets }))
      }
    } catch {
        setIsMockData(true);
        setWallets(MOCK_WALLETS); setWalletsTotal(12450);
        setStats(prev => ({ ...prev, totalCirculating: MOCK_TCOIN_STATS.totalCirculating, activeWallets: MOCK_TCOIN_STATS.activeWallets }))
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
        const isFallback = !data.items || data.items.length === 0;
        setIsMockData(isFallback);
        const currentPayments = isFallback ? MOCK_PAYMENTS : data.items;
        
        setPayments(currentPayments)
        setPaymentsTotal(isFallback ? 15420 : data.total)
        setStats((prev) => ({
          ...prev,
          totalOrders: isFallback ? MOCK_TCOIN_STATS.totalOrders : data.total,
          completedOrders: isFallback ? MOCK_TCOIN_STATS.completedOrders : data.items.filter((o: PaymentOrderItem) => o.status === 'completed').length,
        }))
      } else {
        setIsMockData(true);
        setPayments(MOCK_PAYMENTS); setPaymentsTotal(15420);
        setStats(prev => ({ ...prev, totalOrders: MOCK_TCOIN_STATS.totalOrders, completedOrders: MOCK_TCOIN_STATS.completedOrders }))
      }
    } catch {
        setIsMockData(true);
        setPayments(MOCK_PAYMENTS); setPaymentsTotal(15420);
        setStats(prev => ({ ...prev, totalOrders: MOCK_TCOIN_STATS.totalOrders, completedOrders: MOCK_TCOIN_STATS.completedOrders }))
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
    const amountNum = Number(adjustAmount)
    try {
      // Simulate frontend operation perfectly for mock users
      if (adjustModal.userId.startsWith('u')) {
        await new Promise(r => setTimeout(r, 600)) // Fake latency
        
        setWallets(prevWallets => prevWallets.map(w => {
          if (w.userId === adjustModal.userId) {
            const newBalance = w.balance + amountNum;
            if (newBalance < 0) {
              alert('Lỗi: Số dư không đủ để trừ!');
              return w;
            }
            return {
              ...w,
              balance: newBalance,
              totalEarned: amountNum > 0 ? w.totalEarned + amountNum : w.totalEarned,
              totalSpent: amountNum < 0 ? w.totalSpent + Math.abs(amountNum) : w.totalSpent,
              transactionCount: w.transactionCount + 1,
              lastActivity: new Date().toISOString()
            }
          }
          return w;
        }))
        
        // Update stats summary on screen
        setStats(s => ({
          ...s,
          totalCirculating: s.totalCirculating + amountNum
        }))
        
        alert(`Điều chỉnh thành công ${amountNum > 0 ? '+' : ''}${amountNum.toLocaleString('vi-VN')} TCoin cho người dùng ${adjustModal.userName}`)
        setAdjustModal(null)
        setAdjustAmount('')
        setAdjustReason('')
        return
      }

      // Real DB interaction
      const res = await fetch('/api/admin/tcoin/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: adjustModal.userId,
          amount: amountNum,
          reason: adjustReason,
        }),
      })
      if (res.ok) {
        alert('Điều chỉnh TCoin thành công!')
        setAdjustModal(null)
        setAdjustAmount('')
        setAdjustReason('')
        loadWallets(walletsPage)
      } else {
        const err = await res.json()
        alert(err.error || 'Có lỗi xảy ra khi điều chỉnh')
      }
    } finally {
      setAdjusting(false)
    }
  }

  const handleConfirmOrder = async (orderId: string) => {
    // If interacting with mock data order
    if (orderId.startsWith('ORD-')) {
      alert('Đã xác nhận thanh toán đơn hàng này (Mô phỏng)!')
      setPayments(prev => prev.map(p => {
        if (p.id === orderId) {
           return { ...p, status: 'completed', paidAt: new Date().toISOString() }
        }
        return p
      }))
      setStats(s => ({ ...s, completedOrders: s.completedOrders + 1 }))
      return
    }

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
      alert('Xác nhận thanh toán thành công!')
      loadPayments(paymentsPage, paymentFilter)
    } else {
      alert('Lỗi xác nhận đơn nạp!')
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
      {isMockData && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg p-4 flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
             <AlertTriangle className="h-5 w-5" />
             <div>
               <p className="font-bold text-sm">Chế độ Mô Phỏng (Demo Mode)</p>
               <p className="text-xs mt-0.5 opacity-90">Dữ liệu ví TCoin hoặc Cơ sở dữ liệu Payment Gateway hiện chưa được khởi tạo. Hệ thống đang hiển thị dữ liệu giả định để xem trước luồng giao diện.</p>
             </div>
          </div>
        </div>
      )}

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
