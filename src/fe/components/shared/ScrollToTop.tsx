'use client'

// ============================================
// ScrollToTop — Floating "ĐẦU TRANG" button
// ============================================
// Appears when user scrolls down > 400px.
// Matches RoPhim's bottom-right scroll-to-top button style.

import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

export function ScrollToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!show) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-0.5 rounded-xl
        bg-white px-3 py-2.5 text-black shadow-2xl shadow-black/30
        transition-all duration-300 hover:bg-white/90 hover:scale-105
        animate-fade-in-up"
      aria-label="Cuộn lên đầu trang"
    >
      <ArrowUp className="h-4 w-4" />
      <span className="text-[10px] font-bold leading-none tracking-tight">ĐẦU</span>
      <span className="text-[10px] font-bold leading-none tracking-tight">TRANG</span>
    </button>
  )
}
