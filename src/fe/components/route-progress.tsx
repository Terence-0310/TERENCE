'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Slim progress bar at the top of the page during route transitions.
 * Inspired by NProgress / YouTube-style loading indicator.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevUrl = useRef('')

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setProgress(100)
    setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 300)
  }, [])

  useEffect(() => {
    const url = pathname + searchParams.toString()
    if (prevUrl.current && prevUrl.current !== url) {
      // Route changed — stop bar
      stop()
    }
    prevUrl.current = url
  }, [pathname, searchParams, stop])

  // Intercept link clicks to start the bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return
      if (anchor.target === '_blank') return

      const currentUrl = pathname + '?' + searchParams.toString()
      if (href === currentUrl || href === pathname) return

      // Start progress
      setVisible(true)
      setProgress(15)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p
          const increment = p < 50 ? 8 : p < 80 ? 3 : 1
          return Math.min(p + increment, 90)
        })
      }, 200)
    }

    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [pathname, searchParams])

  if (!visible && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 300ms' }}
    >
      <div
        className="h-full bg-primary shadow-[0_0_10px_var(--color-primary),0_0_5px_var(--color-primary)]"
        style={{
          width: `${progress}%`,
          transition: progress === 100 ? 'width 200ms ease-out' : 'width 400ms ease',
        }}
      />
    </div>
  )
}
