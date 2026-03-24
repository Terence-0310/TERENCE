'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { RouteProgress } from '@/components/route-progress'

const HIDE_LAYOUT_PREFIXES = ['/dashboard']
const HIDE_FOOTER_PREFIXES = ['/watch/']

// Hide all layout for room pages (but NOT for /xem-chung listing page)
function isRoomPage(pathname: string): boolean {
  return /^\/xem-chung\/[A-Za-z0-9]+/.test(pathname)
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideAll = HIDE_LAYOUT_PREFIXES.some((p) => pathname.startsWith(p)) || isRoomPage(pathname)
  const hideFooter = HIDE_FOOTER_PREFIXES.some((p) => pathname.startsWith(p))

  if (hideAll) return <>{children}</>

  return (
    <>
      <Suspense>
        <RouteProgress />
      </Suspense>
      <Header />
      {children}
      {!hideFooter && <Footer />}
    </>
  )
}
