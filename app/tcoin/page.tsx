'use client'

import { useState } from 'react'
import { Coins, Gift, ShoppingCart, History, Star, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import {
  getDemoBalance,
  getDemoTransactions,
  TCOIN_PACKAGES,
  TCOIN_REWARDS,
  TCOIN_SPEND_OPTIONS,
  type TCoinTransaction,
} from '@/lib/data/tcoin'

export default function TCoinPage() {
  const [balance] = useState(getDemoBalance)
  const transactions = getDemoTransactions()

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
              <p className="text-xl font-extrabold text-primary">{balance.toLocaleString()} <span className="text-sm font-normal text-white/40">TCoin</span></p>
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
            {TCOIN_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-xl border p-4 transition hover:border-primary/30 ${
                  pkg.popular
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-white/[0.06] bg-card/40'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Phổ biến
                  </span>
                )}
                <p className="text-sm font-semibold text-white mt-1">{pkg.name}</p>
                <p className="text-2xl font-extrabold text-primary mt-2">
                  {pkg.coins.toLocaleString()}
                  {pkg.bonus && <span className="text-xs text-primary/60 font-normal ml-1">+{pkg.bonus}</span>}
                </p>
                <p className="text-xs text-white/40 mt-1">TCoin</p>
                <button className="mt-3 w-full rounded-lg bg-white/5 border border-white/[0.06] py-2 text-sm font-medium text-white/70 hover:bg-white/10 transition">
                  {pkg.price}
                </button>
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
                    disabled={balance < opt.cost}
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
          {transactions.length > 0 ? (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              {transactions.map((tx, i) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < transactions.length - 1 ? 'border-b border-white/[0.04]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === 'earn' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {tx.type === 'earn'
                        ? <ArrowDownLeft className="w-3.5 h-3.5 text-green-400" />
                        : <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white/80 truncate">{tx.description}</p>
                      <p className="text-[11px] text-white/30">{tx.date}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold whitespace-nowrap ml-3 ${
                    tx.type === 'earn' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[20vh] flex-col items-center justify-center text-center">
              <History className="h-10 w-10 text-white/10 mb-3" />
              <p className="text-white/40 text-sm">Chưa có giao dịch</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
