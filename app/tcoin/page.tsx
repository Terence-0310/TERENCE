'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useAuthModal } from '@/src/fe/components/auth/auth-modal-store'
import { useTCoinRealtime } from '@/src/fe/lib/realtime/hooks'

// Shape returned by GET /api/tcoin/my-perks — used here to gate the
// "Đổi N TCoin" buttons so a perk the user already owns shows
// "Đang sử dụng" instead of letting them spend twice.
type MyPerks = {
  frameActive: boolean
  badgeActive: boolean
  roomThemeActive: boolean
  removeAdsActive: boolean
  hdUpgradeActive: boolean
  earlyAccessActive: boolean
  activeByOption: Record<string, string | null>
}

// ── Types khớp với BE ──
type Package = {
  id: string
  name: string
  coinAmount: number
  bonusAmount: number
  priceVnd: number
  isPopular: boolean
}

type Reward = {
  id: string
  amount: number
  label: string
  description: string
  maxPerDay?: number
  oneTime?: boolean
  actionUrl?: string
}

type RewardStatus = {
  daily_checkin?: { claimedToday: boolean }
  watch_complete?: { todayCount: number }
  write_review?: { todayCount: number }
  referral?: { totalCount: number }
  verify_email?: { claimed: boolean }
  complete_profile?: { claimed: boolean }
} & Record<string, any>

type SpendOption = {
  id: string
  name: string
  cost: number
  description: string
  durationDays?: number
}

type Transaction = {
  id: string
  type: string
  direction: 'CREDIT' | 'DEBIT' | string
  amount: number
  title: string
  description: string | null
  createdAt: string
}

type ActiveOrder = {
  id: string
  code: string
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED' | 'CANCELED' | string
  amountVnd: number
  coinAmount: number
  bonusAmount: number
  transferContent: string
  qrImageUrl: string | null
  expiresAt: string
}

type OverviewResponse = {
  isAuthenticated: boolean
  balance: number
  totalEarned: number
  totalSpent: number
  packages: Package[]
  rewards: Reward[]
  spendOptions: SpendOption[]
  recentTransactions: Transaction[]
  activeOrder: ActiveOrder | null
  dailyCheckinAvailable: boolean
  rewardStatus: RewardStatus
}

// ── API helper: tự unwrap envelope { success, data, error } ──
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body?.success === false) {
    throw new Error(body?.error || body?.message || `HTTP ${res.status}`)
  }
  return (body?.data ?? body) as T
}

function formatVnd(value: number) {
  return value.toLocaleString('vi-VN') + 'đ'
}

function unitPriceVnd(priceVnd: number, totalCoins: number) {
  if (totalCoins <= 0) return ''
  return Math.round(priceVnd / totalCoins).toLocaleString('vi-VN') + 'đ / TCoin'
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TCoinPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { openModal } = useAuthModal()

  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // Top-up modal
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null)
  // Whether the QR modal is OPEN. Kept separate from `activeOrder` so that a
  // pending order surfaced on page load shows a dismissible banner instead of
  // force-reopening the modal every time the user returns to /tcoin. Only an
  // explicit action (create order / "Tiếp tục thanh toán") opens it.
  const [showQr, setShowQr] = useState(false)
  const [topupBusy, setTopupBusy] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const tickRef = useRef<NodeJS.Timeout | null>(null)

  // Per-action busy states
  const [spendBusy, setSpendBusy] = useState<string | null>(null)
  const [checkinBusy, setCheckinBusy] = useState(false)
  const [verifyEmailBusy, setVerifyEmailBusy] = useState(false)

  // Spend confirmation modal — step UX
  const [spendConfirm, setSpendConfirm] = useState<SpendOption | null>(null)

  const fetchOverview = useCallback(async () => {
    try {
      const data = await api<OverviewResponse>('/api/tcoin/overview')
      setOverview(data)
      if (data.activeOrder && data.activeOrder.status === 'PENDING') {
        setActiveOrder(data.activeOrder)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không tải được dữ liệu TCoin', { icon: null })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    fetchOverview()
  }, [authLoading, isAuthenticated, fetchOverview])

  useEffect(() => {
    if (!activeOrder) return
    tickRef.current = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [activeOrder])

  // Realtime: singleton socket from useTCoinRealtime. Every wallet
  // mutation (credit/debit/refund/admin adjust) emits, so the ví +
  // transaction list update without polling. fetchOverview() refreshes
  // the heavier server-rendered fields (recent transactions list,
  // packages, dailyCheckinAvailable, rewardStatus) — call it after any
  // change instead of mutating local state piecemeal.
  useTCoinRealtime(isAuthenticated && user?.id ? user.id : null, {
    onPaid: () => {
      toast.success('Thanh toán thành công. TCoin đã được cộng vào ví.', { icon: null })
      setActiveOrder(null)
      setShowQr(false)
      fetchOverview()
    },
    onTransaction: (p) => {
      const direction = (p.transaction.direction || '').toLowerCase()
      if (direction === 'credit') {
        const reward = p.transaction.amount
        toast.success(`+${reward} TCoin`, { icon: null, duration: 2500 })
      }
      fetchOverview()
    },
    onTaskClaimed: (p) => {
      toast.success(`+${p.amount} TCoin — đã ghi nhận nhiệm vụ`, { icon: null })
    },
    onRewardRedeemed: (p) => {
      toast.success(`Đã đổi "${p.name}" (-${p.cost} TCoin)`, { icon: null })
    },
  })

  useEffect(() => {
    if (!activeOrder || activeOrder.status !== 'PENDING') return

    const orderKey = activeOrder.code || activeOrder.id

    // HTTP poll: 5s while the tab is visible. Socket.IO is unreliable in prod
    // (plain `next start` doesn't host the `/api/socketio` namespace), so the
    // poll is the primary realtime signal. Pauses while the tab is hidden.
    const POLL_MS = 5_000

    const checkStatus = async () => {
      try {
        const data = await api<{ status: string }>(`/api/tcoin/order/${orderKey}`)
        if (data.status === 'PAID') {
          toast.success('Thanh toán thành công. TCoin đã được cộng vào ví.', { icon: null })
          setActiveOrder(null)
          setShowQr(false)
          fetchOverview()
        } else if (['EXPIRED', 'FAILED', 'CANCELED'].includes(data.status)) {
          toast.error('Đơn nạp đã hết hạn hoặc bị huỷ.', { icon: null })
          setActiveOrder(null)
          setShowQr(false)
        }
      } catch {
        /* silent — sẽ thử lại lần sau */
      }
    }

    const startPolling = () => {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(checkStatus, POLL_MS)
    }
    const stopPolling = () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Catch up immediately on return so the user sees fresh state.
        checkStatus()
        startPolling()
      } else {
        stopPolling()
      }
    }

    if (document.visibilityState === 'visible') startPolling()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      stopPolling()
    }
  }, [activeOrder?.id, activeOrder?.code, activeOrder?.status, fetchOverview])

  const balance = overview?.balance ?? 0
  const packages = overview?.packages ?? []
  const rewards = overview?.rewards ?? []
  const rewardStatus = overview?.rewardStatus ?? ({} as RewardStatus)
  const spendOptions = overview?.spendOptions ?? []
  const transactions = overview?.recentTransactions ?? []
  const canCheckin = !!overview?.dailyCheckinAvailable && isAuthenticated

  // Active perks → drives the "Đang sử dụng" badge + button disable on
  // each spend card. Refetched after every successful spend so the card
  // flips immediately. Only fetched while authenticated.
  const { data: perksEnvelope, mutate: refetchPerks } = useSWR<{ data: MyPerks }>(
    isAuthenticated ? '/api/tcoin/my-perks' : null,
    (url: string) => fetch(url).then((r) => r.json()),
  )
  const activeByOption = perksEnvelope?.data?.activeByOption ?? {}

  // Lifetime totals from the wallet aggregates (BE sums all transactions),
  // not just the 8 recent ones shown below.
  const totalEarned = overview?.totalEarned ?? 0
  const totalSpent = overview?.totalSpent ?? 0

  const handleTopup = async (pkg: Package) => {
    if (!isAuthenticated) return openModal('login')
    setTopupBusy(pkg.id)
    try {
      const order = await api<ActiveOrder>('/api/tcoin/topup/create-bank-order', {
        method: 'POST',
        body: JSON.stringify({ packageId: pkg.id }),
      })
      setActiveOrder({ ...order, status: 'PENDING' })
      setShowQr(true)
    } catch (err: any) {
      toast.error(err?.message || 'Không tạo được đơn nạp', { icon: null })
    } finally {
      setTopupBusy(null)
    }
  }

  // Cancel the pending order (shared by the QR modal and the pending-order
  // banner). Clears local state + refreshes overview so the banner disappears.
  const handleCancelActiveOrder = async () => {
    if (!activeOrder) return
    const key = activeOrder.code || activeOrder.id
    try {
      await api(`/api/tcoin/order/${key}`, { method: 'DELETE' })
      toast.success('Đã huỷ đơn nạp', { icon: null })
    } catch (err: any) {
      toast.error(err?.message || 'Huỷ đơn thất bại', { icon: null })
    } finally {
      setActiveOrder(null)
      setShowQr(false)
      fetchOverview()
    }
  }

  // Bước 1: click nút Đổi → mở modal xác nhận
  const handleSpendClick = (opt: SpendOption) => {
    if (!isAuthenticated) return openModal('login')
    if (balance < opt.cost) {
      toast.error(`Không đủ TCoin. Cần ${opt.cost.toLocaleString()} TCoin.`, { icon: null })
      return
    }
    setSpendConfirm(opt)
  }

  // Bước 2: confirm trong modal → gọi API spend
  const handleSpendConfirm = async (opt: SpendOption) => {
    setSpendBusy(opt.id)
    try {
      const result = await api<{ message: string }>('/api/tcoin/spend', {
        method: 'POST',
        body: JSON.stringify({ optionId: opt.id }),
      })
      // Toast có action button dẫn sang profile để xem perk vừa kích hoạt
      toast.success(result.message || `Đã đổi "${opt.name}"`, {
        icon: null,
        description: 'Mở trang hồ sơ để xem ưu đãi đang dùng.',
        action: {
          label: 'Xem hồ sơ',
          onClick: () => {
            window.location.href = '/profile'
          },
        },
      })
      setSpendConfirm(null)
      fetchOverview()
      // Refetch active perks so the card flips to "Đã đổi" immediately
      // instead of waiting for SWR's revalidate interval.
      refetchPerks()
    } catch (err: any) {
      toast.error(err?.message || 'Đổi quà thất bại', { icon: null })
    } finally {
      setSpendBusy(null)
    }
  }

  // Claim the one-time +20 TCoin for a verified email directly from the task
  // card. New Google users never get this auto-credited (at sign-in time the
  // adapter hasn't created the user row yet), so we expose an explicit claim
  // here instead of bouncing them to /profile with nothing to do.
  const handleClaimVerifyEmail = async () => {
    if (!isAuthenticated) return openModal('login')
    setVerifyEmailBusy(true)
    try {
      const result = await api<{ alreadyClaimed: boolean; amount: number; message: string }>(
        '/api/tcoin/reward/verify-email',
        { method: 'POST' }
      )
      toast.success(result.message || `+${result.amount} TCoin`, { icon: null })
      fetchOverview()
    } catch (err: any) {
      toast.error(err?.message || 'Không nhận được thưởng', { icon: null })
    } finally {
      setVerifyEmailBusy(false)
    }
  }

  const handleDailyCheckin = async () => {
    if (!isAuthenticated) return openModal('login')
    setCheckinBusy(true)
    try {
      const result = await api<{ ok: boolean; amount: number; message: string }>(
        '/api/tcoin/reward/daily-checkin',
        { method: 'POST' }
      )
      if (result.ok) {
        toast.success(result.message || `+${result.amount} TCoin`, { icon: null })
      } else {
        toast.info(result.message || 'Bạn đã điểm danh hôm nay', { icon: null })
      }
      fetchOverview()
    } catch (err: any) {
      toast.error(err?.message || 'Điểm danh thất bại', { icon: null })
    } finally {
      setCheckinBusy(false)
    }
  }

  if (loading || authLoading) {
    return (
      <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-12 w-48 rounded-lg skeleton" />
          <div className="h-32 w-full rounded-2xl skeleton" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl skeleton" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-6xl space-y-10">
        {/* ── Hero: Header + Balance ── */}
        <section className="rounded-2xl border border-white/10 bg-card/40 p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">
                Ví TCoin của bạn
              </p>
              <h1 className="text-white text-3xl md:text-4xl font-extrabold tracking-tight">
                {isAuthenticated ? balance.toLocaleString('vi-VN') : '— —'}
                <span className="ml-2 text-base font-medium text-white/40">TCoin</span>
              </h1>
              <p className="text-sm text-white/50 mt-2 max-w-md">
                Tích xu mỗi ngày, nạp nhanh qua VietQR, đổi quà — nâng cấp trải nghiệm xem phim.
              </p>

              {isAuthenticated && (
                <div className="mt-4 flex items-center gap-5 text-xs text-white/50">
                  <span>
                    Đã nhận:{' '}
                    <span className="text-green-400 font-semibold">
                      {totalEarned.toLocaleString('vi-VN')}
                    </span>
                  </span>
                  <span>
                    Đã chi:{' '}
                    <span className="text-red-400 font-semibold">
                      {totalSpent.toLocaleString('vi-VN')}
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {isAuthenticated ? (
                <button
                  onClick={handleDailyCheckin}
                  disabled={!canCheckin || checkinBusy}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkinBusy
                    ? 'Đang điểm danh…'
                    : canCheckin
                    ? 'Điểm danh nhận TCoin'
                    : 'Đã điểm danh hôm nay'}
                </button>
              ) : (
                <button
                  onClick={() => openModal('login')}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition"
                >
                  Đăng nhập để kiếm TCoin
                </button>
              )}
              <a
                href="#mua-tcoin"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                Nạp TCoin ngay
              </a>
            </div>
          </div>
        </section>

        {/* ── Pending-order banner ──
            Shown when a PENDING order exists but the QR modal is closed, so
            returning to /tcoin offers a dismissible "resume" prompt instead of
            force-reopening the modal. */}
        {activeOrder && !showQr && (
          <section className="rounded-2xl border border-primary/30 bg-primary/10 p-4 md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-base">⏳</span>
                <div>
                  <p className="text-sm font-bold text-white">Bạn có một đơn nạp đang chờ thanh toán</p>
                  <p className="mt-0.5 text-xs text-white/60">
                    Mã{' '}
                    <span className="font-mono text-white/80">
                      {activeOrder.transferContent || activeOrder.code}
                    </span>
                    {' · '}
                    <span className="font-semibold text-white/80">
                      {activeOrder.amountVnd.toLocaleString('vi-VN')}đ
                    </span>
                    {(() => {
                      const remain = Math.max(
                        0,
                        Math.floor((new Date(activeOrder.expiresAt).getTime() - now) / 1000),
                      )
                      if (remain <= 0) return <> · <span className="text-red-400">đã hết hạn</span></>
                      const mm = String(Math.floor(remain / 60)).padStart(2, '0')
                      const ss = String(remain % 60).padStart(2, '0')
                      return (
                        <>
                          {' · còn '}
                          <span className="font-semibold text-primary">{mm}:{ss}</span>
                        </>
                      )
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => setShowQr(true)}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
                >
                  Tiếp tục thanh toán
                </button>
                <button
                  onClick={handleCancelActiveOrder}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
                >
                  Huỷ
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Mua TCoin ── */}
        <section id="mua-tcoin">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Nạp TCoin qua VietQR</h2>
              <p className="text-xs text-white/40 mt-0.5">
                Thanh toán an toàn qua ngân hàng. TCoin cộng tự động sau khi nhận thanh toán.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg) => {
              const totalCoins = pkg.coinAmount + pkg.bonusAmount
              const isBusy = topupBusy === pkg.id
              const bonusPct =
                pkg.bonusAmount > 0
                  ? Math.round((pkg.bonusAmount / pkg.coinAmount) * 100)
                  : 0
              return (
                <div
                  key={pkg.id}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card/30 transition hover:border-white/20 ${
                    pkg.isPopular ? 'border-white/15' : 'border-white/[0.06]'
                  }`}
                >
                  {pkg.isPopular && (
                    <div className="h-[3px] w-full bg-primary" />
                  )}

                  <div className="flex flex-col flex-1 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/50">
                        {pkg.name}
                      </p>
                      {pkg.isPopular && (
                        <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                          Phổ biến
                        </span>
                      )}
                    </div>

                    <div className="mt-5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-extrabold text-white tabular-nums leading-none">
                          {pkg.coinAmount.toLocaleString('vi-VN')}
                        </span>
                        <span className="text-sm text-white/40">TCoin</span>
                      </div>
                      {pkg.bonusAmount > 0 ? (
                        <p className="mt-2 text-xs text-white/60">
                          + <span className="text-green-400 font-semibold">{pkg.bonusAmount.toLocaleString('vi-VN')}</span>{' '}
                          bonus{bonusPct > 0 ? ` (${bonusPct}%)` : ''}
                          <span className="text-white/30"> · tổng {totalCoins.toLocaleString('vi-VN')}</span>
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-white/30">Không có bonus</p>
                      )}
                    </div>

                    <div className="my-5 h-px w-full bg-white/[0.06]" />

                    <div>
                      <p className="text-xl font-bold text-white tabular-nums">
                        {formatVnd(pkg.priceVnd)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/40 tabular-nums">
                        ≈ {unitPriceVnd(pkg.priceVnd, totalCoins)}
                      </p>
                    </div>

                    <div className="mt-auto pt-5">
                      <button
                        onClick={() => handleTopup(pkg)}
                        disabled={isBusy}
                        className={`w-full rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                          pkg.isPopular
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'border border-white/15 bg-white/[0.04] text-white hover:bg-white/10'
                        }`}
                      >
                        {isBusy
                          ? 'Đang tạo đơn…'
                          : isAuthenticated
                          ? 'Nạp ngay'
                          : 'Đăng nhập để nạp'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Cách kiếm TCoin ── */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Cách kiếm TCoin</h2>
              <p className="text-xs text-white/40 mt-0.5">
                Tham gia hoạt động để nhận TCoin miễn phí. Một số phần thưởng chỉ nhận được một lần.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                status={rewardStatus[reward.id]}
                isAuthenticated={isAuthenticated}
                userId={user?.id}
                isEmailVerified={!!user?.isEmailVerified}
                onCheckin={handleDailyCheckin}
                checkinBusy={checkinBusy}
                onClaimVerifyEmail={handleClaimVerifyEmail}
                verifyEmailBusy={verifyEmailBusy}
                onLogin={() => openModal('login')}
              />
            ))}
          </div>
        </section>

        {/* ── Đổi TCoin ── */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Đổi TCoin lấy ưu đãi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {spendOptions.map((opt) => {
              const insufficient = isAuthenticated && balance < opt.cost
              const isBusy = spendBusy === opt.id
              const isActive = isAuthenticated && opt.id in activeByOption
              const activeUntil = activeByOption[opt.id]
              const activeUntilLabel = activeUntil
                ? new Date(activeUntil).toLocaleDateString('vi-VN')
                : null
              return (
                <div
                  key={opt.id}
                  className={`rounded-xl border p-4 transition ${
                    isActive
                      ? 'border-primary/40 bg-primary/[0.04]'
                      : 'border-white/[0.06] bg-card/40 hover:border-primary/20'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{opt.name}</p>
                  <p className="text-xs text-white/40 mt-1">{opt.description}</p>
                  {opt.durationDays && (
                    <p className="text-[11px] text-white/40 mt-0.5">
                      Hiệu lực {opt.durationDays} ngày
                    </p>
                  )}
                  {isActive && (
                    <p className="text-[11px] text-primary/80 mt-1 font-medium">
                      {activeUntilLabel
                        ? `Đang sử dụng · hết hạn ${activeUntilLabel}`
                        : 'Đang sử dụng · vĩnh viễn'}
                    </p>
                  )}
                  <button
                    onClick={() => handleSpendClick(opt)}
                    disabled={isBusy || insufficient || isActive}
                    className={`mt-3 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive
                        ? 'border-primary/30 bg-primary/15 text-primary'
                        : 'border-primary/20 bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {isActive
                      ? 'Đã đổi'
                      : isBusy
                      ? 'Đang đổi…'
                      : insufficient
                      ? `Cần ${opt.cost} TCoin`
                      : `Đổi ${opt.cost} TCoin`}
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Lịch sử giao dịch ── */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Lịch sử giao dịch</h2>
          {isAuthenticated && transactions.length > 0 ? (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
              {transactions.map((tx) => {
                const isCredit = (tx.direction || '').toLowerCase() === 'credit'
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white/85 truncate">
                        {tx.title || tx.description || tx.type}
                      </p>
                      <p className="text-[11px] text-white/30">{fmtDate(tx.createdAt)}</p>
                    </div>
                    <span
                      className={`text-sm font-bold whitespace-nowrap ml-3 ${
                        isCredit ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {isCredit ? '+' : '−'}
                      {tx.amount.toLocaleString('vi-VN')}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex min-h-[20vh] items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
              <p className="text-white/40 text-sm">
                {!isAuthenticated
                  ? 'Đăng nhập để xem lịch sử giao dịch'
                  : 'Chưa có giao dịch nào'}
              </p>
            </div>
          )}
        </section>
      </div>

      {activeOrder && showQr && (
        <QrModal
          order={activeOrder}
          now={now}
          // "Đóng" / "Để sau" only hides the modal — the order stays PENDING so
          // the user can resume from the banner. It no longer auto-reopens on
          // return to the page.
          onClose={() => setShowQr(false)}
          onCancel={handleCancelActiveOrder}
        />
      )}

      {spendConfirm && (
        <SpendConfirmModal
          option={spendConfirm}
          balance={balance}
          busy={spendBusy === spendConfirm.id}
          onClose={() => setSpendConfirm(null)}
          onConfirm={() => handleSpendConfirm(spendConfirm)}
        />
      )}
    </main>
  )
}

// ════════════════════════════════════════════════
// Spend confirm modal — bước xác nhận trước khi đổi TCoin
// ════════════════════════════════════════════════
function SpendConfirmModal({
  option,
  balance,
  busy,
  onClose,
  onConfirm,
}: {
  option: SpendOption
  balance: number
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const after = balance - option.cost

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-zinc-900 border border-white/10 p-6 shadow-2xl">
        <button
          onClick={onClose}
          disabled={busy}
          className="absolute top-3 right-3 rounded-md px-2 py-1 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
        >
          Đóng
        </button>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
            Xác nhận đổi TCoin
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">{option.name}</h3>
          <p className="mt-1 text-xs text-white/50">{option.description}</p>
        </div>

        <div className="mt-5 space-y-2">
          <SummaryRow label="Số dư hiện tại" value={`${balance.toLocaleString('vi-VN')} TCoin`} />
          <SummaryRow
            label="Phí đổi"
            value={`− ${option.cost.toLocaleString('vi-VN')} TCoin`}
            negative
          />
          <div className="h-px bg-white/[0.06]" />
          <SummaryRow
            label="Số dư sau khi đổi"
            value={`${after.toLocaleString('vi-VN')} TCoin`}
            highlight
          />
          {option.durationDays && (
            <SummaryRow
              label="Thời hạn hiệu lực"
              value={`${option.durationDays} ngày`}
            />
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
          >
            {busy ? 'Đang đổi…' : 'Xác nhận đổi'}
          </button>
        </div>

        <p className="mt-3 text-[11px] text-white/40 text-center">
          TCoin sẽ được trừ ngay khi xác nhận. Ưu đãi áp dụng tức thời.
        </p>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  highlight,
  negative,
}: {
  label: string
  value: string
  highlight?: boolean
  negative?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-white/50">{label}</span>
      <span
        className={`font-bold tabular-nums ${
          highlight ? 'text-primary' : negative ? 'text-red-400' : 'text-white'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function QrModal({
  order,
  now,
  onClose,
  onCancel,
}: {
  order: ActiveOrder
  now: number
  onClose: () => void
  onCancel: () => void | Promise<void>
}) {
  const [cancelling, setCancelling] = useState(false)
  const expiresMs = new Date(order.expiresAt).getTime()
  const remaining = Math.max(0, Math.floor((expiresMs - now) / 1000))
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const totalCoins = (order.coinAmount ?? 0) + (order.bonusAmount ?? 0)

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`Đã copy ${label}`, { icon: null }),
      () => toast.error('Không copy được', { icon: null })
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-zinc-900 border border-white/10 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-md px-2 py-1 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition"
        >
          Đóng
        </button>

        <div className="text-center">
          <h3 className="text-lg font-bold text-white">Thanh toán VietQR</h3>
          <p className="text-xs text-white/50 mt-1">
            Quét QR bằng app ngân hàng để nhận{' '}
            <span className="text-primary font-bold">
              {totalCoins.toLocaleString('vi-VN')} TCoin
            </span>
          </p>
        </div>

        <div className="mt-5 mx-auto w-fit rounded-2xl bg-white p-3">
          {order.qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={order.qrImageUrl}
              alt="VietQR"
              className="w-64 h-64 object-contain"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-zinc-500 text-sm">
              Đang tạo mã QR…
            </div>
          )}
        </div>

        <div className="mt-5 space-y-2 text-sm">
          <FieldRow
            label="Số tiền"
            value={formatVnd(order.amountVnd)}
            onCopy={() => copy(String(order.amountVnd), 'số tiền')}
          />
          <FieldRow
            label="Nội dung CK"
            value={order.transferContent}
            highlight
            onCopy={() => copy(order.transferContent, 'nội dung')}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 rounded-xl bg-white/5 px-4 py-3">
          <span className="text-sm font-medium text-primary">Đang chờ thanh toán…</span>
          <span className="text-xs font-mono font-bold text-white/70">
            {mm}:{ss}
          </span>
        </div>

        <p className="mt-3 text-[11px] text-white/40 text-center leading-relaxed">
          Vui lòng chuyển khoản <strong>đúng số tiền</strong> và{' '}
          <strong>đúng nội dung</strong>. TCoin được cộng tự động trong vài giây sau khi thanh
          toán thành công.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            disabled={cancelling}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
          >
            Để sau
          </button>
          <button
            onClick={async () => {
              setCancelling(true)
              try { await onCancel() } finally { setCancelling(false) }
            }}
            disabled={cancelling}
            className="flex-1 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
          >
            {cancelling ? 'Đang huỷ…' : 'Huỷ đơn nạp'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════
// Reward card — phần "Cách kiếm TCoin"
// ════════════════════════════════════════════════
function RewardCard({
  reward,
  status,
  isAuthenticated,
  userId,
  isEmailVerified,
  onCheckin,
  checkinBusy,
  onClaimVerifyEmail,
  verifyEmailBusy,
  onLogin,
}: {
  reward: Reward
  status: any
  isAuthenticated: boolean
  userId?: string | null
  isEmailVerified: boolean
  onCheckin: () => void
  checkinBusy: boolean
  onClaimVerifyEmail: () => void
  verifyEmailBusy: boolean
  onLogin: () => void
}) {
  // Referral: build the share link the user can copy directly. We expose
  // this on the dedicated 'referral' card so the user doesn't need a
  // separate page just to find their invite URL.
  const isReferral = reward.id === 'referral'
  const isVerifyEmail = reward.id === 'verify_email'
  function copyReferral() {
    if (!userId) return
    const url = `${window.location.origin}/signup?ref=${userId}`
    navigator.clipboard.writeText(url).then(
      () => toast.success('Đã copy link mời. Gửi cho bạn để cùng nhận TCoin.', { icon: null }),
      () => toast.error('Không copy được', { icon: null })
    )
  }
  // Trạng thái + nhãn theo từng loại reward
  const isDaily = reward.id === 'daily_checkin'
  const claimedToday = isDaily && !!status?.claimedToday
  const claimedOneTime = reward.oneTime && !!status?.claimed
  const todayCount: number = status?.todayCount ?? 0
  const totalCount: number = status?.totalCount ?? 0
  const dailyLeft =
    reward.maxPerDay !== undefined ? Math.max(0, reward.maxPerDay - todayCount) : null

  const limitLabel = reward.oneTime
    ? 'Một lần'
    : reward.maxPerDay
    ? `Tối đa ${reward.maxPerDay}/ngày`
    : 'Lặp lại'

  const isClaimedState = claimedToday || claimedOneTime

  return (
    <div
      className={`flex flex-col rounded-xl border bg-card/40 p-4 transition ${
        isClaimedState ? 'border-white/[0.04] opacity-70' : 'border-white/[0.06] hover:border-primary/20'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{reward.label}</p>
          <p className="text-xs text-white/40 mt-1">{reward.description}</p>
        </div>
        <span className="text-xs font-bold text-primary whitespace-nowrap tabular-nums">
          +{reward.amount}
        </span>
      </div>

      <div className="mt-auto pt-3 flex items-center justify-between gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            isClaimedState
              ? 'bg-white/5 text-white/40'
              : 'bg-white/5 text-white/50'
          }`}
        >
          {limitLabel}
        </span>

        {/* CTA / status */}
        {!isAuthenticated ? (
          <button
            onClick={onLogin}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 transition"
          >
            Đăng nhập
          </button>
        ) : isDaily ? (
          claimedToday ? (
            <span className="text-[11px] font-semibold text-white/40">Đã nhận hôm nay</span>
          ) : (
            <button
              onClick={onCheckin}
              disabled={checkinBusy}
              className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
            >
              {checkinBusy ? 'Đang nhận…' : 'Điểm danh'}
            </button>
          )
        ) : isReferral ? (
          <button
            onClick={copyReferral}
            disabled={!userId}
            className="rounded-md bg-primary/15 border border-primary/30 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/25 transition disabled:opacity-50"
          >
            Copy link mời {totalCount > 0 ? `(đã mời ${totalCount})` : ''}
          </button>
        ) : claimedOneTime ? (
          <span className="text-[11px] font-semibold text-green-400">Đã nhận</span>
        ) : isVerifyEmail ? (
          // Email already verified (e.g. Google sign-in) → let the user claim
          // the reward right here. Otherwise send them to /profile to trigger
          // the verification mail.
          isEmailVerified ? (
            <button
              onClick={onClaimVerifyEmail}
              disabled={verifyEmailBusy}
              className="rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
            >
              {verifyEmailBusy ? 'Đang nhận…' : `Nhận ${reward.amount}`}
            </button>
          ) : (
            <Link
              href={reward.actionUrl ?? '/profile'}
              className="text-[11px] font-semibold text-primary hover:text-primary/80 transition"
            >
              Xác minh
            </Link>
          )
        ) : reward.actionUrl ? (
          <Link
            href={reward.actionUrl}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 transition"
          >
            Thực hiện
          </Link>
        ) : reward.maxPerDay !== undefined ? (
          <span className="text-[11px] font-medium text-white/40 tabular-nums">
            Còn {dailyLeft}/{reward.maxPerDay} hôm nay
          </span>
        ) : totalCount > 0 ? (
          <span className="text-[11px] font-medium text-white/40 tabular-nums">
            Đã nhận {totalCount} lần
          </span>
        ) : (
          <span className="text-[11px] text-white/30">Tự động</span>
        )}
      </div>
    </div>
  )
}

function FieldRow({
  label,
  value,
  highlight,
  onCopy,
}: {
  label: string
  value: string
  highlight?: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
      <span className="text-[11px] uppercase tracking-wider text-white/40">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`text-sm font-bold truncate ${
            highlight ? 'text-primary' : 'text-white'
          }`}
        >
          {value}
        </span>
        <button
          onClick={onCopy}
          className="shrink-0 rounded-md bg-white/5 hover:bg-white/10 px-2 py-1 text-[11px] font-semibold text-white/60 hover:text-white transition"
        >
          Copy
        </button>
      </div>
    </div>
  )
}
