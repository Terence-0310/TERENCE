'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useRef, useEffect, Suspense } from 'react'
import { Search, Menu, X, LogOut, LayoutDashboard, ChevronDown, User } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useAuthModal } from '@/components/auth/auth-modal-store'
import { GENRES, genreBrowseUrl } from '@/lib/data/genres'
import { COUNTRIES, countryBrowseUrl } from '@/lib/data/countries'
import { TerenceLogo } from '@/components/terence-logo'

const NAV_ITEMS = [
  { label: 'Phim lẻ', href: '/movies' },
  { label: 'Phim bộ', href: '/series' },
  { label: 'Xem chung', href: '/xem-chung' },
  { label: 'Phim Top View', href: '/browse?sort=views' },
  { label: 'Chủ Đề', href: '/browse' },
  { label: 'Diễn viên', href: '/people' },
  { label: 'Tcoin', href: '/tcoin' },
]

function HeaderInner() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAdmin, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const { openModal } = useAuthModal()

  // Genre dropdown state
  const [genreOpen, setGenreOpen] = useState(false)
  const genreRef = useRef<HTMLDivElement>(null)
  const genreTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Country dropdown state
  const [countryOpen, setCountryOpen] = useState(false)
  const countryRef = useRef<HTMLDivElement>(null)
  const countryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Scroll listener — transparent on top, solid after scroll
  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 80)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  // Check if on homepage for transparent nav
  const isHome = pathname === '/'
  const isTransparent = isHome && !scrolled

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`)
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
    setCountryOpen(false)
    setGenreOpen(true)
  }
  function handleGenreLeave() {
    genreTimeout.current = setTimeout(() => setGenreOpen(false), 150)
  }

  // Country hover handlers
  function handleCountryEnter() {
    if (countryTimeout.current) clearTimeout(countryTimeout.current)
    setGenreOpen(false)
    setCountryOpen(true)
  }
  function handleCountryLeave() {
    countryTimeout.current = setTimeout(() => setCountryOpen(false), 150)
  }

  const isGenreActive = activeGenreId !== null
  const isCountryActive = activeCountryCode !== null

  // Nav link style
  const navLinkClass = (active: boolean) =>
    `whitespace-nowrap px-2.5 py-1.5 text-[13px] font-medium transition lg:px-3 ${
      active ? 'text-white' : 'text-white/60 hover:text-white'
    }`

  // Dropdown button style
  const dropdownBtnClass = (active: boolean) =>
    `flex items-center gap-0.5 whitespace-nowrap px-2.5 py-1.5 text-[13px] font-medium transition lg:px-3 ${
      active ? 'text-white' : 'text-white/60 hover:text-white'
    }`

  // Header background class
  const headerBg = isTransparent
    ? 'bg-transparent border-transparent'
    : 'bg-[#0B0F19]/90 backdrop-blur-xl border-b border-white/[0.04] shadow-sm'

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`}>
      <div className="flex h-[68px] items-center gap-4 px-4 md:px-6 lg:px-8 w-full max-w-[1920px] mx-auto">
        {/* L: Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 mr-4 xl:mr-8 hover:opacity-80 transition-opacity">
          <TerenceLogo size={34} />
          <span className="text-[22px] font-extrabold tracking-tight text-white hidden md:inline mt-0.5">TERENCE</span>
        </Link>

        {/* M-L: Search Bar */}
        {pathname !== '/browse' ? (
          <form onSubmit={handleSearch} className="hidden md:flex relative w-[320px] lg:w-[380px] xl:w-[440px] mr-auto">
            <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm phim, diễn viên"
              className="w-full rounded-[14px] bg-[#22213D]/70 hover:bg-[#22213D]/90 border border-transparent py-[11px] pl-11 pr-4 text-[14px] text-white outline-none placeholder:text-white/40 focus:border-[#4B48A1]/50 focus:bg-[#1A1835] transition-all"
            />
          </form>
        ) : (
          <div className="hidden md:flex w-[320px] lg:w-[380px] xl:w-[440px] mr-auto" />
        )}

        {/* M: Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-0.5 xl:gap-2 mr-4 xl:mr-8 h-full">
          {/* Quốc gia */}
          <div ref={countryRef} className="relative h-full flex items-center" onMouseEnter={handleCountryEnter} onMouseLeave={handleCountryLeave}>
            <button
              onClick={() => { setCountryOpen(!countryOpen); setGenreOpen(false) }}
              className={`flex items-center gap-1.5 px-3 py-2 text-[14px] font-semibold whitespace-nowrap transition-colors rounded-lg hover:text-white ${isCountryActive || countryOpen ? 'text-white' : 'text-white/60'}`}
            >
              Quốc gia
              <ChevronDown className={`w-[14px] h-[14px] text-white/40 transition-transform duration-200 ${(countryOpen || isCountryActive) ? 'text-white/100' : ''} ${countryOpen ? 'rotate-180' : ''}`} />
            </button>
            {countryOpen && (
              <div
                className="absolute left-0 lg:left-[-20px] top-[calc(100%-10px)] w-[680px] rounded-[18px] border border-white/[0.08] bg-[#0A0D15]/98 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl p-6 z-[60] animate-dropdown-in"
                onMouseEnter={handleCountryEnter}
                onMouseLeave={handleCountryLeave}
              >
                <div className="grid grid-cols-4 gap-2">
                  {COUNTRIES.map((c) => (
                    <Link
                      key={c.code}
                      href={countryBrowseUrl(c.code)}
                      className={`rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all duration-150 ${
                        activeCountryCode === c.code
                          ? 'bg-primary/20 text-primary'
                          : 'text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Thể loại */}
          <div ref={genreRef} className="relative h-full flex items-center" onMouseEnter={handleGenreEnter} onMouseLeave={handleGenreLeave}>
            <button
              onClick={() => { setGenreOpen(!genreOpen); setCountryOpen(false) }}
              className={`flex items-center gap-1.5 px-3 py-2 text-[14px] font-semibold whitespace-nowrap transition-colors rounded-lg hover:text-white ${isGenreActive || genreOpen ? 'text-white' : 'text-white/60'}`}
            >
              Thể loại
              <ChevronDown className={`w-[14px] h-[14px] text-white/40 transition-transform duration-200 ${(genreOpen || isGenreActive) ? 'text-white/100' : ''} ${genreOpen ? 'rotate-180' : ''}`} />
            </button>
            {genreOpen && (
              <div
                className="absolute left-0 lg:left-[-20px] xl:left-[-140px] top-[calc(100%-10px)] w-[680px] rounded-[18px] border border-white/[0.08] bg-[#0A0D15]/98 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl p-6 z-[60] animate-dropdown-in"
                onMouseEnter={handleGenreEnter}
                onMouseLeave={handleGenreLeave}
              >
                <div className="grid grid-cols-4 gap-2">
                  {GENRES.map((g) => (
                    <Link
                      key={g.id}
                      href={genreBrowseUrl(g.id)}
                      className={`rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all duration-150 ${
                        activeGenreId === g.id
                          ? 'bg-primary/20 text-primary'
                          : 'text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Các mục còn lại */}
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href.split('?')[0] && (item.href.includes('?sort=views') ? searchParams.get('sort') === 'views' : true);
            // Ignore "?sort=views" active logic if we're on /browse without sort for "Chủ đề"
            const finalIsActive = item.href === '/browse' && searchParams.get('sort') ? false : isActive;
            
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`px-3 py-2 text-[14px] font-semibold transition-colors hover:text-white whitespace-nowrap ${finalIsActive ? 'text-white' : 'text-white/60'}`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* R: Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile search toggle */}
          {pathname !== '/browse' && (
            <button
              onClick={() => {
                const el = document.getElementById('mobile-search-bar')
                if (el) el.classList.toggle('hidden')
              }}
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          {user ? (
            <div className="hidden lg:flex items-center gap-2">
              {isAdmin && (
                <Link href="/dashboard" className="rounded-lg p-2.5 text-white/60 transition hover:bg-white/10 hover:text-teal-400" title="Dashboard">
                  <LayoutDashboard className="h-[20px] w-[20px]" />
                </Link>
              )}
              {/* Member pill logged in */}
              <div className="flex items-center gap-2 rounded-full bg-[#2DD4BF] px-4 py-1.5 hover:bg-[#14B8A6] transition shadow-[0_0_15px_rgba(45,212,191,0.2)] cursor-pointer border-transparent">
                <Link href="/profile" className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10">
                    <User className="h-4 w-4 text-black" />
                  </div>
                  <span className="text-[14px] font-bold text-black border-l border-black/10 pl-3 ml-0.5 py-1">{user.name}</span>
                </Link>
                <button onClick={handleLogout} className="ml-1 pl-1 text-black/60 hover:text-black transition-colors" title="Đăng xuất">
                  <LogOut className="h-[16px] w-[16px]" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openModal('login')}
              className="hidden lg:inline-flex items-center gap-2.5 rounded-full bg-[#2DD4BF] px-5 py-[10px] text-[14px] font-extrabold text-black transition-colors hover:bg-[#14B8A6] shadow-[0_4px_15px_rgba(45,212,191,0.25)]"
            >
              <User className="h-5 w-5" />
              Thành viên
            </button>
          )}

          <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 lg:hidden mr-1">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Search — hidden by default, toggle via button */}
      <div id="mobile-search-bar" className="hidden border-t border-white/5 bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm phim, diễn viên"
              className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
        </form>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-white/5 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4 max-h-[80vh] overflow-y-auto">
            <Link href="/" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              Trang chủ
            </Link>
            <Link href="/browse" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              Chủ đề
            </Link>
            <Link href="/movies" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              Phim Lẻ
            </Link>
            <Link href="/series" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              Phim Bộ
            </Link>
            <Link href="/xem-chung" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              Xem chung
            </Link>


            {/* Genre section */}
            <div className="my-1 border-t border-white/[0.06]" />
            <p className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-widest text-white/30 font-semibold">Thể loại</p>
            <div className="grid grid-cols-2 gap-1 px-1">
              {GENRES.map((g) => (
                <Link key={g.id} href={genreBrowseUrl(g.id)} onClick={() => setMobileOpen(false)} className="rounded-lg px-2 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white transition">
                  {g.name}
                </Link>
              ))}
            </div>

            {/* Country section */}
            <div className="my-1 border-t border-white/[0.06]" />
            <p className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-widest text-white/30 font-semibold">Quốc gia</p>
            <div className="grid grid-cols-2 gap-1 px-1">
              {COUNTRIES.map((c) => (
                <Link key={c.code} href={countryBrowseUrl(c.code)} onClick={() => setMobileOpen(false)} className="rounded-lg px-2 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white transition">
                  {c.name}
                </Link>
              ))}
            </div>

            <div className="my-1 border-t border-white/[0.06]" />
            <Link href="/people" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              Diễn viên
            </Link>
            <Link href="/schedule" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              Lịch chiếu
            </Link>
            <Link href="/tcoin" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              TCoin
            </Link>

            {user ? (
              <>
                {isAdmin && (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5">
                    Dashboard
                  </Link>
                )}
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5">
                  Hồ sơ cá nhân
                </Link>
                <button onClick={handleLogout} className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-400 transition hover:bg-white/5">
                  Đăng xuất
                </button>
              </>
            ) : (
              <button 
                onClick={() => { setMobileOpen(false); openModal('login'); }} 
                className="rounded-lg bg-primary px-3 py-2.5 text-center text-sm font-semibold text-white"
              >
                Đăng nhập
              </button>
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
