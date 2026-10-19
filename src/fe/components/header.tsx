'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useRef, useEffect, Suspense } from 'react'
import { Search, Menu, X, LogOut, LayoutDashboard, ChevronDown, User, PlayCircle, Loader2, Coins } from 'lucide-react'
import useSWR from 'swr'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useAuthModal } from '@/src/fe/components/auth/auth-modal-store'
import { GENRES, genreBrowseUrl } from '@/lib/data/genres'
import { COUNTRIES, countryBrowseUrl } from '@/lib/data/countries'
import { TerenceLogo } from '@/src/fe/components/terence-logo'
import { UserAvatar } from '@/src/fe/components/shared/UserAvatar'
import { NotificationBell } from '@/src/fe/components/shared/NotificationBell'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/fe/components/ui/dropdown-menu'

// `primary` items stay inline on standard laptops (xl, 1280–1535px); the rest
// collapse into a "Thêm" dropdown there and only show inline from 2xl (≥1536px).
const NAV_ITEMS = [
  { label: 'Phim lẻ', href: '/movies', primary: true },
  { label: 'Phim bộ', href: '/series', primary: true },
  { label: 'Xem chung', href: '/xem-chung', primary: true },
  { label: 'Shorts', href: '/shorts', primary: false },
  { label: 'Phim Top View', href: '/top-view', primary: false },
  { label: 'Chủ Đề', href: '/browse', primary: false },
  { label: 'Diễn viên', href: '/people', primary: false },
  { label: 'Tin tức', href: '/news', primary: false },
  { label: 'Đánh giá', href: '/reviews', primary: false },
  { label: 'Tcoin', href: '/tcoin', primary: true },
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

  // "Thêm" overflow dropdown (laptop widths, xl → just below 2xl)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  // Autocomplete
  const searchContainerRef = useRef<HTMLFormElement>(null)
  const [showSuggest, setShowSuggest] = useState(false)

  const { data: suggestData, isLoading: suggestLoading } = useSWR(
    searchQuery.trim().length >= 2 ? `/api/v1/search/suggest?q=${encodeURIComponent(searchQuery.trim())}` : null,
    (url: string) => fetch(url).then((r) => r.json())
  )

  const suggestions = suggestData?.data || []

  // Current user's TCoin perk flags (avatar frame / exclusive badge).
  const { data: perkData } = useSWR(
    user ? '/api/tcoin/my-perks' : null,
    (url: string) => fetch(url).then((r) => r.json()),
  )
  const frameActive = !!perkData?.data?.frameActive
  const badgeActive = !!perkData?.data?.badgeActive

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
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) setShowSuggest(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close dropdowns on route change
  useEffect(() => {
    setGenreOpen(false)
    setCountryOpen(false)
    setMoreOpen(false)
    setMobileOpen(false)
    setShowSuggest(false)
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
    if (searchQuery.trim().toLowerCase() === 'mỹ chi' || searchQuery.trim().toLowerCase() === 'my chi') {
      window.location.href = '/mychi/index.html'
      return
    }
    if (searchQuery.trim()) {
      setShowSuggest(false)
      router.push(`/browse?q=${encodeURIComponent(searchQuery.trim())}`)
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

  // Header background class
  const headerBg = (isTransparent && !mobileOpen)
    ? 'bg-transparent border-transparent'
    : 'bg-background/98 backdrop-blur-xl border-b border-white/[0.04] shadow-sm'

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`}>
      <div className="flex h-[68px] items-center justify-between px-4 md:px-6 lg:px-8 w-full max-w-[1920px] mx-auto">
        {/* LEFT GROUP */}
        <div className="flex items-center gap-2 xl:gap-4 shrink-0">
          {/* L: Logo */}
          <Link href="/" className="flex items-center gap-1.5 2xl:gap-2 shrink-0 hover:opacity-80 transition-opacity">
          <TerenceLogo size={34} />
          <span className="text-[22px] font-extrabold tracking-tight text-white hidden md:inline mt-0.5">TERENCE</span>
        </Link>

        {/* M-L: Search Bar */}
        {pathname !== '/browse' ? (
          <form ref={searchContainerRef} onSubmit={handleSearch} className="hidden md:flex relative w-[160px] lg:w-[200px] xl:w-[220px] 2xl:w-[280px] shrink-0 z-[70]">
            <Search className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (e.target.value.trim().length > 0) setShowSuggest(true)
                else setShowSuggest(false)
              }}
              onFocus={() => { if (searchQuery.trim().length > 0) setShowSuggest(true) }}
              placeholder="Tìm kiếm phim..."
              className="w-full rounded-[14px] bg-[#22213D]/70 hover:bg-[#22213D]/90 border border-transparent py-[11px] pl-10 pr-9 text-[14px] text-white outline-none placeholder:text-white/40 focus:border-[#4B48A1]/50 focus:bg-[#1A1835] transition-all focus:shadow-[0_0_15px_rgba(75,72,161,0.3)]"
            />
            {suggestLoading && searchQuery.trim().length >= 2 && (
              <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/50" />
            )}

            {/* Autocomplete Dropdown */}
            {showSuggest && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] rounded-[14px] border border-white/[0.08] bg-background/95 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-2 z-[60] animate-dropdown-in flex flex-col max-h-[400px] overflow-y-auto">
                {(() => {
                  const isEasterEgg = searchQuery.trim().toLowerCase() === 'mỹ chi' || searchQuery.trim().toLowerCase() === 'my chi';
                  const baseSuggestions = suggestData?.data || [];
                  const displayedSuggestions = isEasterEgg 
                    ? [{
                        id: 'mychi',
                        title: 'Mỹ Chi - 💖 Món quà bí mật',
                        originalTitle: 'Bấm vào đây ngay nhé!',
                        contentType: 'special',
                        year: 'Vô cực',
                        thumbUrl: 'https://i.pinimg.com/originals/b7/c6/4a/b7c64aca651271c52087f58276bd1de1.gif',
                        url: '/mychi/index.html'
                      }, ...baseSuggestions]
                    : baseSuggestions;

                  if (displayedSuggestions.length === 0) {
                    return (
                      <div className="py-6 text-center text-[13px] text-white/40">
                        {suggestLoading ? 'Đang phân tích dữ liệu...' : 'Không tìm thấy kết quả nào'}
                      </div>
                    );
                  }

                  return displayedSuggestions.map((m: any) => {
                    const href = m.url ? m.url : `/${m.contentType === 'movie' ? 'movie' : 'tv'}/${m.slug || m.id}`;
                    
                    return (
                      <Link
                        key={m.id}
                        href={href}
                        onClick={() => setShowSuggest(false)}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/5 transition-colors group"
                      >
                        <div className="h-12 w-9 shrink-0 overflow-hidden rounded bg-white/10 relative">
                          {m.thumbUrl ? (
                            <img src={m.thumbUrl} alt={m.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <PlayCircle className="h-4 w-4 text-white/30" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <PlayCircle className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="truncate text-[13px] font-semibold text-white/90 group-hover:text-primary transition-colors">{m.title}</span>
                          {m.originalTitle && m.originalTitle !== m.title && (
                            <span className="truncate text-[11px] text-white/40">{m.originalTitle}</span>
                          )}
                          {m.year && <span className="text-[11px] text-white/30">{m.year}</span>}
                        </div>
                      </Link>
                    )
                  });
                })()}
                
                {suggestions.length > 0 && (
                  <button 
                    type="submit" 
                    className="mt-1 w-full rounded-lg bg-white/5 py-2 text-center text-[12px] font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Xem tất cả kết quả
                  </button>
                )}
              </div>
            )}
          </form>
        ) : (
          <div className="hidden md:flex w-[160px] lg:w-[200px] xl:w-[220px] 2xl:w-[280px] shrink-0" />
        )}
        </div>

        {/* RIGHT GROUP */}
        <div className="flex items-center justify-end flex-1 gap-1 xl:gap-2 2xl:gap-3 shrink min-w-0">
        {/* M: Desktop Nav */}
        <nav className="hidden xl:flex items-center gap-0.5 xl:gap-1 2xl:gap-2 h-full overflow-visible shrink">
          {/* Quốc gia */}
          <div ref={countryRef} className="relative h-full flex items-center shrink-0" onMouseEnter={handleCountryEnter} onMouseLeave={handleCountryLeave}>
            <button
              onClick={() => { setCountryOpen(!countryOpen); setGenreOpen(false) }}
              className={`flex items-center gap-0.5 2xl:gap-1.5 px-1 xl:px-1.5 2xl:px-2 py-2 text-[13px] 2xl:text-[14px] font-medium whitespace-nowrap transition-colors rounded-lg hover:text-white ${isCountryActive || countryOpen ? 'text-white' : 'text-white/60'}`}
            >
              Quốc gia
              <ChevronDown className={`w-[14px] h-[14px] text-white/40 transition-transform duration-200 ${(countryOpen || isCountryActive) ? 'text-white/100' : ''} ${countryOpen ? 'rotate-180' : ''}`} />
            </button>
            {countryOpen && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+5px)] w-[480px] xl:w-[680px] max-w-[90vw] rounded-[18px] border border-white/[0.08] bg-background/98 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl p-4 xl:p-6 z-[60] animate-dropdown-in"
                onMouseEnter={handleCountryEnter}
                onMouseLeave={handleCountryLeave}
              >
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-2">
                  {COUNTRIES.map((c) => (
                    <Link
                      key={c.code}
                      href={countryBrowseUrl(c.code)}
                      className={`block truncate rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all duration-150 ${
                        activeCountryCode === c.code
                          ? 'bg-primary/20 text-primary'
                          : 'text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                      title={c.name}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Thể loại */}
          <div ref={genreRef} className="relative h-full flex items-center shrink-0" onMouseEnter={handleGenreEnter} onMouseLeave={handleGenreLeave}>
            <button
              onClick={() => { setGenreOpen(!genreOpen); setCountryOpen(false) }}
              className={`flex items-center gap-0.5 2xl:gap-1.5 px-1 xl:px-1.5 2xl:px-2 py-2 text-[13px] 2xl:text-[14px] font-medium whitespace-nowrap transition-colors rounded-lg hover:text-white ${isGenreActive || genreOpen ? 'text-white' : 'text-white/60'}`}
            >
              Thể loại
              <ChevronDown className={`w-[14px] h-[14px] text-white/40 transition-transform duration-200 ${(genreOpen || isGenreActive) ? 'text-white/100' : ''} ${genreOpen ? 'rotate-180' : ''}`} />
            </button>
            {genreOpen && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+5px)] w-[480px] xl:w-[680px] max-w-[90vw] rounded-[18px] border border-white/[0.08] bg-background/98 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl p-4 xl:p-6 z-[60] animate-dropdown-in"
                onMouseEnter={handleGenreEnter}
                onMouseLeave={handleGenreLeave}
              >
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-2">
                  {GENRES.map((g) => (
                    <Link
                      key={g.id}
                      href={genreBrowseUrl(g.id)}
                      className={`block truncate rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-all duration-150 ${
                        activeGenreId === g.id
                          ? 'bg-primary/20 text-primary'
                          : 'text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                      title={g.name}
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Các mục còn lại — primary luôn hiện; secondary chỉ inline khi đủ
              rộng (≥1700px). Ngưỡng cao hơn 2xl (1536px) vì laptop Windows
              thường scale 125% → màn 1920 chỉ còn 1536 CSS px, vẫn chật nếu
              bung đủ 11 mục. */}
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href.split('?')[0];
            const finalIsActive = item.href === '/browse' && searchParams.get('sort') ? false : isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 px-1 xl:px-1.5 min-[1700px]:px-2 py-2 text-[13px] min-[1700px]:text-[14px] font-medium transition-colors hover:text-white whitespace-nowrap ${
                  item.primary ? '' : 'hidden min-[1700px]:inline-block'
                } ${finalIsActive ? 'text-white' : 'text-white/60'}`}
              >
                {item.label}
              </Link>
            )
          })}

          {/* "Thêm" — gom các mục phụ ở khoảng laptop (xl → <1700px), ẩn khi đủ rộng */}
          <div ref={moreRef} className="relative h-full flex items-center shrink-0 min-[1700px]:hidden">
            <button
              onClick={() => { setMoreOpen(!moreOpen); setGenreOpen(false); setCountryOpen(false) }}
              className={`flex items-center gap-0.5 px-1 xl:px-1.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors rounded-lg hover:text-white ${moreOpen ? 'text-white' : 'text-white/60'}`}
            >
              Thêm
              <ChevronDown className={`w-[14px] h-[14px] text-white/40 transition-transform duration-200 ${moreOpen ? 'rotate-180 text-white/100' : ''}`} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-[calc(100%+5px)] w-48 rounded-[14px] border border-white/[0.08] bg-background/98 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl p-2 z-[60] animate-dropdown-in">
                {NAV_ITEMS.filter((item) => !item.primary).map((item) => {
                  const isActive = pathname === item.href.split('?')[0];
                  const finalIsActive = item.href === '/browse' && searchParams.get('sort') ? false : isActive;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`block rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                        finalIsActive ? 'bg-primary/20 text-primary' : 'text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
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
              className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white md:hidden"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-1 xl:gap-1.5 2xl:gap-2">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 2xl:gap-2 rounded-full bg-primary px-2 py-1 xl:px-2.5 2xl:px-3 2xl:py-1.5 hover:bg-primary transition shadow-[0_0_15px_rgba(45,212,191,0.2)] cursor-pointer outline-none border-transparent">
                  <UserAvatar
                    src={user.avatar}
                    name={user.name}
                    frameActive={frameActive}
                    badgeActive={badgeActive}
                    className="h-5 w-5 xl:h-6 xl:w-6 2xl:h-7 2xl:w-7"
                  />
                  <span className="hidden sm:block text-[11px] xl:text-[12px] 2xl:text-[14px] font-bold text-black border-l border-black/10 pl-2 xl:pl-2 2xl:pl-3 ml-0.5 py-0.5 max-w-[60px] xl:max-w-[70px] 2xl:max-w-[120px] truncate">{user.name}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-black/60 hidden md:block" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background/98 backdrop-blur-xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-xl p-2 font-nunito animate-dropdown-in mt-2 z-[100]">
                  <DropdownMenuLabel className="font-bold text-white/40 text-xs uppercase px-2 tracking-widest">Tài khoản</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10 my-2" />
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => router.push('/dashboard')} className="cursor-pointer font-semibold text-white rounded-lg py-2.5 hover:text-primary hover:bg-white/5 focus:bg-white/5 focus:text-primary">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Quản lý hệ thống
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer font-semibold text-white rounded-lg py-2.5 hover:text-primary hover:bg-white/5 focus:bg-white/5 focus:text-primary">
                    <User className="w-4 h-4 mr-2" />
                    Hồ sơ cá nhân
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/tcoin')} className="cursor-pointer font-semibold text-white rounded-lg py-2.5 hover:text-primary hover:bg-white/5 focus:bg-white/5 focus:text-primary">
                    <Coins className="w-4 h-4 mr-2" />
                    Nạp thẻ - TCoin
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10 my-2" />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400 focus:bg-red-500/10 hover:bg-red-500/10 hover:text-red-400 cursor-pointer font-bold rounded-lg py-2.5">
                    <LogOut className="w-4 h-4 mr-2" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <button
              onClick={() => openModal('login')}
              className="inline-flex items-center gap-1.5 xl:gap-2.5 rounded-full bg-primary px-3 py-[7px] xl:px-4 xl:py-[10px] text-[12px] xl:text-[14px] font-extrabold text-black transition-colors hover:bg-primary shadow-[0_4px_15px_rgba(45,212,191,0.25)]"
            >
              <User className="h-4 w-4 xl:h-5 xl:w-5" />
              <span className="hidden sm:inline">Thành viên</span>
            </button>
          )}

          <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 xl:hidden">
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        </div>
      </div>

      {/* Mobile Search — hidden by default, toggle via button */}
      <div id="mobile-search-bar" className="hidden border-t border-white/5 bg-background/98 px-4 py-3 backdrop-blur-xl md:hidden">
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
        <div className="border-t border-white/5 bg-background/98 backdrop-blur-xl xl:hidden">
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
            <Link href="/top-view" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              Phim Top View
            </Link>

            {/* Genre section */}
            <div className="my-1 border-t border-white/[0.06]" />
            <p className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-widest text-white/30 font-semibold">Thể loại</p>
            <div className="flex flex-wrap gap-1 px-2">
              {GENRES.map((g) => (
                <Link key={g.id} href={genreBrowseUrl(g.id)} onClick={() => setMobileOpen(false)} className="block max-w-full truncate rounded-lg px-3 py-2 text-[13px] font-medium text-white/60 hover:bg-white/10 hover:text-white transition whitespace-nowrap" title={g.name}>
                  {g.name}
                </Link>
              ))}
            </div>

            {/* Country section */}
            <div className="my-1 border-t border-white/[0.06]" />
            <p className="px-3 pt-1 pb-0.5 text-[10px] uppercase tracking-widest text-white/30 font-semibold">Quốc gia</p>
            <div className="flex flex-wrap gap-1 px-2">
              {COUNTRIES.map((c) => (
                <Link key={c.code} href={countryBrowseUrl(c.code)} onClick={() => setMobileOpen(false)} className="block max-w-full truncate rounded-lg px-3 py-2 text-[13px] font-medium text-white/60 hover:bg-white/10 hover:text-white transition whitespace-nowrap" title={c.name}>
                  {c.name}
                </Link>
              ))}
            </div>

            <div className="my-1 border-t border-white/[0.06]" />
            <Link href="/people" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              Diễn viên
            </Link>
            <Link href="/news" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              Tin tức
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
