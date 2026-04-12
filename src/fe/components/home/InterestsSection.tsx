'use client'

// ============================================
// InterestsSection — "Bạn đang quan tâm gì?" category cards
// ============================================
// Clean, professional gradient cards — no emoji icons.

import Link from 'next/link'

const INTERESTS = [
  {
    label: 'Xu hướng',
    href: '/browse?category=trending',
    gradient: 'from-red-600/30 to-orange-500/30',
    accent: 'bg-red-500/20 text-red-400',
  },
  {
    label: 'Phim phổ biến',
    href: '/browse?category=popular',
    gradient: 'from-primary/30 to-cyan-500/30',
    accent: 'bg-cyan-500/20 text-cyan-400',
  },
  {
    label: 'Đánh giá cao',
    href: '/browse?category=top-rated',
    gradient: 'from-yellow-600/30 to-amber-500/30',
    accent: 'bg-amber-500/20 text-amber-400',
  },
  {
    label: 'Đang chiếu rạp',
    href: '/browse?category=now-playing',
    gradient: 'from-purple-600/30 to-pink-500/30',
    accent: 'bg-purple-500/20 text-purple-400',
  },
  {
    label: 'Sắp ra mắt',
    href: '/browse?category=upcoming',
    gradient: 'from-blue-600/30 to-indigo-500/30',
    accent: 'bg-blue-500/20 text-blue-400',
  },
  {
    label: 'Xem chung',
    href: '/xem-chung',
    gradient: 'from-green-600/30 to-teal-500/30',
    accent: 'bg-teal-500/20 text-teal-400',
  },
] as const

export function InterestsSection() {
  return (
    <section className="px-5 py-6 md:px-8 lg:px-10">
      <h2 className="mb-5 text-lg font-bold tracking-tight text-white md:text-xl animate-slide-in-left">
        Bạn đang quan tâm gì?
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {INTERESTS.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.06]
              bg-gradient-to-br p-5 transition-all duration-300
              hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1
              animate-chip-in"
            style={{
              '--i': i,
              backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
            } as React.CSSProperties}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-100`} />
            <div className="relative z-10 flex flex-col items-center gap-2 text-center">
              <span className="text-sm font-semibold text-white/90 group-hover:text-white transition">
                {item.label}
              </span>
              <span className="text-[11px] text-white/40 group-hover:text-white/60 transition">
                Xem chủ đề &gt;
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
