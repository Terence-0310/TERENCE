'use client'

import { useState, useEffect, useRef } from 'react'
import { Coins, Gift, ShoppingCart, History, Star, ArrowUpRight, ArrowDownLeft, X, Loader2 } from 'lucide-react'
import {
  TCOIN_REWARDS,
  TCOIN_SPEND_OPTIONS,
} from '@/lib/data/tcoin'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useAuthModal } from '@/src/fe/components/auth/auth-modal-store'
import { toast } from 'sonner' // Assuming they use sonner or similar

export default function TCoinPage() {
  const [balance, setBalance] = useState(0)
  const [packages, setPackages] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { openModal } = useAuthModal()
  
  // Payment Modal State
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/tcoin/overview')
      const data = await res.json()
      if (!data.error) {
        setPackages(data.packages || [])
        if (isAuthenticated) {
          setBalance(data.balance || 0)
          setTransactions(data.recentTransactions || [])
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return;
    fetchOverview()
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    if (activeOrder && activeOrder.status === 'PENDING') {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/tcoin/orders/${activeOrder.orderId || activeOrder.id}`)
          const data = await res.json()
          if (data.status === 'PAID') {
            setActiveOrder(data)
            fetchOverview() // Refresh balance
            alert('Thanh toán thành công! TCoin đã được cộng.')
            setActiveOrder(null)
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          } else if (data.status === 'EXPIRED') {
            setActiveOrder(data)
            alert('Đơn hàng đã hết hạn.')
            setActiveOrder(null)
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
          }
        } catch (error) {}
      }, 5000);
    }
    
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [activeOrder?.id, activeOrder?.orderId, activeOrder?.status]);

  const handleTopup = async (packageId: string) => {
    setIsProcessing(true)
    try {
      const res = await fetch('/api/tcoin/topup/create-bank-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId })
      })
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)

      setActiveOrder({
        ...data,
        status: data.status || 'PENDING'
      })
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header + Balance */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-1">TCoin</h1>
            <p className="text-muted-foreground text-sm">Tích xu, đổi quà, nâng cấp trải nghiệm xem phim</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3">
            <Coins className="w-7 h-7 text-primary" />
            <div>
              <p className="text-[11px] text-white/50 uppercase tracking-wider">Số dư hiện tại</p>
              {isAuthenticated ? (
                <p className="text-xl font-extrabold text-primary">{balance.toLocaleString()} <span className="text-sm font-normal text-white/40">TCoin</span></p>
              ) : (
                <button onClick={() => openModal('login')} className="text-sm font-semibold text-primary/80 hover:text-primary transition underline decoration-dashed underline-offset-4 mt-0.5">
                  Đăng nhập ngay
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mua TCoin */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Mua TCoin</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-xl border p-4 transition hover:border-primary/30 ${
                  pkg.isPopular
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-white/[0.06] bg-card/40'
                }`}
              >
                {pkg.isPopular && (
                  <span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Phổ biến
                  </span>
                )}
                <p className="text-sm font-semibold text-white mt-1">{pkg.name}</p>
                <p className="text-2xl font-extrabold text-primary mt-2">
                  {pkg.coinAmount.toLocaleString()}
                  {pkg.bonusAmount > 0 && <span className="text-xs text-primary/60 font-normal ml-1">+{pkg.bonusAmount}</span>}
                </p>
                <p className="text-xs text-white/40 mt-1">TCoin</p>
                <div className="mt-4 flex gap-2">
                  {!isAuthenticated ? (
                    <button 
                      onClick={() => openModal('register')}
                      className="flex-1 rounded-lg bg-primary/20 border border-primary/30 py-2.5 text-[12px] font-bold text-primary hover:bg-primary/30 transition shadow-sm"
                    >
                      Đăng Ký Để Mua
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleTopup(pkg.id)}
                      disabled={isProcessing}
                      className="flex-1 rounded-lg bg-[#005fb8] py-2 text-[11px] font-medium text-white hover:bg-[#004a8f] transition"
                    >
                      Mua qua VietQR
                    </button>
                  )}
                </div>
                <div className="text-center mt-2 text-xs text-white/50">{pkg.priceVnd.toLocaleString('vi-VN')}đ</div>
              </div>
            ))}
          </div>
        </section>

        {/* Cách kiếm TCoin */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Cách kiếm TCoin</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TCOIN_REWARDS.map((reward) => (
              <div key={reward.id} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-card/40 p-4">
                <span className="text-2xl flex-shrink-0">{reward.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white truncate">{reward.action}</p>
                    <span className="text-xs font-bold text-primary whitespace-nowrap">+{reward.coins}</span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">{reward.description}</p>
                  {reward.repeatable && (
                    <span className="inline-block mt-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/30">Lặp lại</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Đổi TCoin */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Đổi TCoin</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TCOIN_SPEND_OPTIONS.map((opt) => (
              <div key={opt.id} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-card/40 p-4 hover:border-primary/20 transition">
                <span className="text-2xl flex-shrink-0">{opt.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{opt.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{opt.description}</p>
                  <button
                    onClick={() => {
                      if (!isAuthenticated) openModal('login')
                      // else spend option...
                    }}
                    disabled={isAuthenticated && balance < opt.cost}
                    className="mt-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {opt.cost} TCoin
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Lịch sử giao dịch */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Lịch sử giao dịch</h2>
          </div>
          {isAuthenticated && transactions.length > 0 ? (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              {transactions.map((tx: any, i) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < transactions.length - 1 ? 'border-b border-white/[0.04]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      tx.direction === 'credit' || tx.direction === 'CREDIT' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {tx.direction === 'credit' || tx.direction === 'CREDIT'
                        ? <ArrowDownLeft className="w-3.5 h-3.5 text-green-400" />
                        : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white/80 truncate">{tx.title || tx.type} {(tx.metadata as any)?.orderCode || ''}</p>
                      <p className="text-[11px] text-white/30">{new Date(tx.createdAt).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold whitespace-nowrap ml-3 ${
                    tx.direction === 'credit' || tx.direction === 'CREDIT' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.direction === 'credit' || tx.direction === 'CREDIT' ? '+' : '-'}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[20vh] flex-col items-center justify-center text-center">
              <History className="h-10 w-10 text-white/10 mb-3" />
              <p className="text-white/40 text-sm">
                {!isAuthenticated ? 'Vui lòng đăng nhập để xem lịch sử giao dịch' : 'Chưa có giao dịch'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* QR Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm rounded-2xl bg-zinc-900 border border-white/10 p-6 flex flex-col items-center shadow-2xl">
            <button 
              onClick={() => setActiveOrder(null)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-2">Thanh toán VietQR</h3>
            <p className="text-sm text-white/60 mb-6 text-center">
              Mở ứng dụng ví hoặc ngân hàng và quét mã để thanh toán. Điền đúng nội dung: 
              <br/><strong className="text-primary mt-1 inline-block">{activeOrder.transferContent}</strong>
            </p>
            
            <div className="bg-white p-2 rounded-xl">
              {activeOrder.qrImageUrl ? (
                <img src={activeOrder.qrImageUrl} alt="QR Code" className="w-64 h-auto aspect-auto rounded-lg" />
              ) : (
                <div className="w-64 flex items-center justify-center h-64">
                   <Loader2 className="w-8 h-8 animate-spin text-black opacity-50" />
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center gap-2 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">Đang chờ thanh toán...</span>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
