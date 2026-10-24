'use client'

// ============================================
// NewsHero — Section bar at the top of /news (baomoi-style tabs)
// ============================================

import { useEffect, useState } from 'react'

interface NewsHeroProps {
  /** In-page anchors for the sections that have content */
  sections?: { href: string; label: string }[]
}

export function NewsHero({ sections = [] }: NewsHeroProps) {
  const [active, setActive] = useState(sections[0]?.href)

  // Highlight the tab of the section currently in view.
  useEffect(() => {
    const targets = sections
      .map((s) => document.querySelector(s.href))
      .filter((el): el is Element => el !== null)
    if (targets.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) setActive(`#${visible[0].target.id}`)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  return (
    <div className="border-b border-white/[0.07] bg-gradient-to-r from-primary/[0.12] via-primary/[0.04] to-transparent">
      <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-4 md:px-6 lg:px-8 scrollbar-hide">
        <h1 className="flex-shrink-0 py-3.5 text-lg font-extrabold uppercase tracking-wide text-white">
          Tin tức
        </h1>
        <span className="h-5 w-px flex-shrink-0 bg-white/15" />
        <nav className="flex items-center gap-5" aria-label="Chuyên mục tin tức">
          {sections.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className={`relative flex-shrink-0 py-3.5 text-sm font-semibold uppercase tracking-wide transition-colors ${
                active === s.href ? 'text-primary' : 'text-white/60 hover:text-white'
              }`}
            >
              {s.label}
              {active === s.href && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}
