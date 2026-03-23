'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useRef, useEffect, Suspense } from 'react'
import { Search, Menu, X, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { GENRES, genreBrowseUrl } from '@/lib/data/genres'
import { COUNTRIES, countryBrowseUrl } from '@/lib/data/countries'
import { TerenceLogo } from '@/components/terence-logo'

// Nav items — "Thể loại" and "Quốc gia" are mega dropdowns, not links
const NAV_ITEMS = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Khám phá', href: '/browse' },
  { label: 'Xu hướng', href: '/browse?category=trending' },
  { label: 'Đánh giá cao', href: '/browse?category=top-rated' },
  { label: 'Xem chung', href: '/xem-chung' },
  { label: 'Tin tức', href: '/news' },
  // ← Genre mega dropdown inserted here
  // ← Country mega dropdown inserted here
  { label: 'Diễn viên', href: '/people' },
  { label: 'Lịch chiếu', href: '/schedule' },
  { label: 'Review', href: '/reviews' },
  { label: 'TCoin', href: '/tcoin' },
]

function HeaderInner() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAdmin, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Genre dropdown state
  const [genreOpen, setGenreOpen] = useState(false)
  const genreRef = useRef<HTMLDivElement>(null)
  const genreTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Country dropdown state
  const [countryOpen, setCountryOpen] = useState(false)
  const countryRef = useRef<HTMLDivElement>(null)
  const countryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) setGenreOpen(false)
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) setCountryOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close dropdowns on route change
  useEffect(() => {
    setGenreOpen(false)
    setCountryOpen(false)
    setMobileOpen(false)
  }, [pathname, searchParams])

  // Active states
  const activeGenreId = pathname === '/browse' ? Number(searchParams.get('genre')) || null : null
  const activeCountryCode = pathname === '/browse' ? searchParams.get('country') || null : null

  // Hide header on dashboard and watch pages
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/watch/')) return null

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  function handleLogout() {
    logout()
    router.push('/')
  }

  // Genre hover handlers
  function handleGenreEnter() {
    if (genreTimeout.current) clearTimeout(genreTimeout.current)
    setCountryOpen(false) // close other
    setGenreOpen(true)
  }
  function handleGenreLeave() {
    genreTimeout.current = setTimeout(() => setGenreOpen(false), 150)
  }

  // Country hover handlers
  function handleCountryEnter() {
    if (countryTimeout.current) clearTimeout(countryTimeout.current)
    setGenreOpen(false) // close other
    setCountryOpen(true)
  }
  function handleCountryLeave() {
    countryTimeout.current = setTimeout(() => setCountryOpen(false), 150)
  }

  const isGenreActive = activeGenreId !== null
  const isCountryActive = activeCountryCode !== null

  // Shared nav link style
  const navLinkClass = (active: boolean) =>
    `whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-medium transition lg:px-2.5 ${
      active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`

  // Shared dropdown button style
  const dropdownBtnClass = (active: boolean) =>
    `flex items-center gap-0.5 whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-medium transition lg:px-2.5 ${
      active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 items-center justify-between px-4 md:px-6 lg:px-8" style={{ maxWidth: '1400px' }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <TerenceLogo size={28} />
          <span className="text-lg font-bold tracking-tight text-white hidden lg:inline">Terence</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center md:flex">
          {/* First 6 items (before dropdowns) */}
          {NAV_ITEMS.slice(0, 6).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]))
            return (
              <Link key={item.href} href={item.href} className={navLinkClass(isActive)}>
                {item.label}
              </Link>
            )
          })}

          {/* Genre Mega Dropdown */}
          <div ref={genreRef} className="relative" onMouseEnter={handleGenreEnter} onMouseLeave={handleGenreLeave}>
            <button onClick={() => { setGenreOpen(!genreOpen); setCountryOpen(false) }} className={dropdownBtnClass(isGenreActive || genreOpen)}>
              Thể loại
              <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${genreOpen ? 'rotate-180' : ''}`} />
            </button>
            {genreOpen && (
              <div
                className="absolute left-0 top-full mt-2 w-[680px] rounded-2xl border border-white/[0.08] bg-[#0A0F1E]/98 shadow-2xl shadow-black/50 backdrop-blur-xl p-5 z-50 animate-dropdown-in"
                onMouseEnter={handleGenreEnter}
                onMouseLeave={handleGenreLeave}
              >
                <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold mb-3">Chọn thể loại</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {GENRES.map((g) => (
                    <Link
                      key={g.id}
                      href={genreBrowseUrl(g.id)}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 ${
                        activeGenreId === g.id
                          ? 'bg-primary/15 text-primary'
                          : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <span className="text-base leading-none shrink-0">{g.icon}</span>
                      <span>{g.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Country Mega Dropdown */}
          <div ref={countryRef} className="relative" onMouseEnter={handleCountryEnter} onMouseLeave={handleCountryLeave}>
            <button onClick={() => { setCountryOpen(!countryOpen); setGenreOpen(false) }} className={dropdownBtnClass(isCountryActive || countryOpen)}>
              Quốc gia
              <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${countryOpen ? 'rotate-180' : ''}`} />
            </button>
            {countryOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-[680px] rounded-2xl border border-white/[0.08] bg-[#0A0F1E]/98 shadow-2xl shadow-black/50 backdrop-blur-xl p-5 z-50 animate-dropdown-in"
                onMouseEnter={handleCountryEnter}
                onMouseLeave={handleCountryLeave}
              >
                <p className="text-[11px] uppercase tracking-widest text-white/30 font-semibold mb-3">Chọn quốc gia</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {COUNTRIES.map((c) => (
                    <Link
                      key={c.code}
                      href={countryBrowseUrl(c.code)}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 ${
                        activeCountryCode === c.code
                          ? 'bg-primary/15 text-primary'
                          : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <span className="text-base leading-none shrink-0">{c.flag}</span>
                      <span>{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Remaining items (after dropdowns) */}
          {NAV_ITEMS.slice(6).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]))
            return (
              <Link key={item.href} href={item.href} className={navLinkClass(isActive)}>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <Search className="h-5 w-5" />
          </button>

          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              {isAdmin && (
                <Link href="/dashboard" className="rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white" title="Dashboard">
                  <LayoutDashboard className="h-5 w-5" />
                </Link>
              )}
              <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20">
                  <span className="text-xs font-bold text-primary">{user.name.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium text-white/80">{user.name}</span>
              </div>
              <button onClick={handleLogout} className="rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white" title="Đăng xuất">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 md:inline-flex">
              Đăng nhập
            </Link>
          )}

          <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-white/60 transition hover:bg-white/5 md:hidden">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Search Overlay */}
      {searchOpen && (
        <div className="border-t border-white/5 bg-background/95 px-4 py-3 backdrop-blur-xl">
          <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm phim..."
                autoFocus
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-muted-foreground focus:border-primary/50"
              />
            </div>
          </form>
        </div>
      )}

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-white/5 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4 max-h-[80vh] overflow-y-auto">
            {NAV_ITEMS.slice(0, 6).map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
                {item.label}
              </Link>
            ))}

            {/* Genre section */}
            <div className="my-1 border-t border-white/[0.06]" />
            <p className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-widest text-white/30 font-semibold">Thể loại</p>
            <div className="grid grid-cols-2 gap-1 px-1">
              {GENRES.map((g) => (
                <Link key={g.id} href={genreBrowseUrl(g.id)} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white transition">
                  <span>{g.icon}</span>
                  <span className="truncate">{g.name}</span>
                </Link>
              ))}
            </div>

            {/* Country section */}
            <div className="my-1 border-t border-white/[0.06]" />
            <p className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-widest text-white/30 font-semibold">Quốc gia</p>
            <div className="grid grid-cols-2 gap-1 px-1">
              {COUNTRIES.map((c) => (
                <Link key={c.code} href={countryBrowseUrl(c.code)} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white transition">
                  <span>{c.flag}</span>
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
            </div>

            <div className="my-1 border-t border-white/[0.06]" />
            {NAV_ITEMS.slice(6).map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
                {item.label}
              </Link>
            ))}

            {user ? (
              <>
                {isAdmin && (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5">
                    Dashboard
                  </Link>
                )}
                <button onClick={handleLogout} className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-400 transition hover:bg-white/5">
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-white">
                Đăng nhập
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export function Header() {
  return (
    <Suspense>
      <HeaderInner />
    </Suspense>
  )
}
