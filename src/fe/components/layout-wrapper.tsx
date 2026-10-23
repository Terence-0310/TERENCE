'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import { Header } from '@/src/fe/components/header'
import { Footer } from '@/src/fe/components/footer'
import { RouteProgress } from '@/src/fe/components/route-progress'
import { ScrollToTop } from '@/src/fe/components/shared/ScrollToTop'
import { AuthModal } from '@/src/fe/components/auth/AuthModal'

const HIDE_LAYOUT_PREFIXES = ['/dashboard', '/login', '/signup', '/forgot-password']
const HIDE_FOOTER_PREFIXES = ['/watch/', '/shorts', '/login', '/signup', '/forgot-password']

// Hide all layout for room pages (but NOT for /xem-chung listing page)
function isRoomPage(pathname: string): boolean {
  return /^\/xem-chung\/[A-Za-z0-9]+/.test(pathname)
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideAll = HIDE_LAYOUT_PREFIXES.some((p) => pathname.startsWith(p)) || isRoomPage(pathname)
  const hideFooter = HIDE_FOOTER_PREFIXES.some((p) => pathname.startsWith(p))

  if (hideAll) return <>{children}</>

  // Homepage hero extends behind fixed header;
  // other pages need padding-top to avoid content under fixed header
  const isHome = pathname === '/'

  return (
    <>
      <Suspense>
        <RouteProgress />
      </Suspense>
      <Header />
      <div className={isHome ? '' : 'pt-16'}>
        {children}
      </div>
      {!hideFooter && <Footer />}
      <ScrollToTop />
      <AuthModal />
    </>
  )
}
