'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Film,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  FileText,
  Coins,
  Tag,
  Moon,
  Sun,
  AlertTriangle,
  CreditCard,
  Clapperboard,
  Monitor,
  Loader2,
  Newspaper,
  Megaphone
} from 'lucide-react'
import { Button } from '@/src/fe/components/ui/button'
import { useAuth } from '@/src/fe/features/auth/contexts/auth-context'
import { useTheme } from 'next-themes'
import { TerenceLogo } from '@/src/fe/components/terence-logo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/fe/components/ui/dropdown-menu'

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: 'Tổng quan', href: '/dashboard' },
  { icon: Film, label: 'Quản lý phim', href: '/dashboard/movies' },
  { icon: Newspaper, label: 'Bài viết', href: '/dashboard/news' },
  { icon: Tag, label: 'Nội dung', href: '/dashboard/content' },
  { icon: Users, label: 'Người dùng', href: '/dashboard/users' },
  { icon: Coins, label: 'Thanh toán & TCoin', href: '/dashboard/tcoin' },
  { icon: Megaphone, label: 'Quảng cáo', href: '/dashboard/ads' },
  { icon: BarChart3, label: 'Thống kê', href: '/dashboard/analytics' },
  { icon: FileText, label: 'Nhật ký', href: '/dashboard/logs' },
  { icon: Settings, label: 'Cài đặt', href: '/dashboard/settings' },
]

// ── Notification types ──
interface Notification {
  id: string
  type: 'payment' | 'user' | 'system' | 'warning' | 'movie'
  title: string
  message: string
  createdAt: string
}

const NOTIF_ICON_MAP: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  payment: { icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  user: { icon: Users, color: 'text-green-500', bg: 'bg-green-500/10' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  system: { icon: Monitor, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  movie: { icon: Clapperboard, color: 'text-primary', bg: 'bg-primary/10' },
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ngày trước`
  return new Date(dateStr).toLocaleDateString('vi-VN')
}

// ── Dashboard Search Component ──

interface SearchResult {
  movies: Array<{ id: string; title: string; type: string; status: string; year?: number; href: string }>
  users: Array<{ id: string; name: string; email: string; role: string; href: string }>
  pages: Array<{ title: string; href: string; icon: string }>
}

const PAGE_ICON_MAP: Record<string, typeof Film> = {
  dashboard: LayoutDashboard,
  film: Film,
  tag: Tag,
  users: Users,
  coins: Coins,
  chart: BarChart3,
  log: FileText,
  settings: Settings,
}

function DashboardSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null)
      setIsOpen(false)
      return
    }
    try {
      setSearching(true)
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (json.success) {
        setResults(json.data)
        setIsOpen(true)
        setActiveIdx(-1)
      }
    } catch {
      // silently fail
    } finally {
      setSearching(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(val), 300)
  }

  // Build flat list for keyboard nav
  const flatItems: Array<{ href: string; label: string }> = []
  if (results) {
    results.pages.forEach(p => flatItems.push({ href: p.href, label: p.title }))
    results.movies.forEach(m => flatItems.push({ href: m.href, label: m.title }))
    results.users.forEach(u => flatItems.push({ href: u.href, label: u.name }))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || flatItems.length === 0) {
      if (e.key === 'Escape') { setIsOpen(false); inputRef.current?.blur() }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(prev => (prev + 1) % flatItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(prev => (prev - 1 + flatItems.length) % flatItems.length)
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      navigateTo(flatItems[activeIdx].href)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  const navigateTo = (href: string) => {
    setIsOpen(false)
    setQuery('')
    setResults(null)
    router.push(href)
  }

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasResults = results && (results.movies.length > 0 || results.users.length > 0 || results.pages.length > 0)
  let flatIdx = -1

  return (
    <div ref={containerRef} className="hidden md:block relative w-full max-w-[300px] lg:max-w-[360px]">
      <div className={`flex items-center bg-white dark:bg-[#151e2f] rounded-2xl px-4 py-2.5 shadow-sm w-full transition-all ${isOpen ? 'ring-2 ring-primary/50' : 'focus-within:ring-2 focus-within:ring-primary/50'}`}>
        {searching ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-gray-400" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (results && query.length >= 2) setIsOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Tìm phim, người dùng, trang..."
          className="ml-3 bg-transparent border-0 outline-none text-[15px] font-medium flex-1 text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
        />
        {query.length > 0 && (
          <button
            onClick={() => { setQuery(''); setResults(null); setIsOpen(false) }}
            className="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#151e2f] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden z-50 animate-dropdown-in">
          {!hasResults && !searching ? (
            <div className="p-6 text-center">
              <Search className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-medium">Không tìm thấy kết quả cho "{query}"</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {/* Pages */}
              {results && results.pages.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trang</span>
                  </div>
                  {results.pages.map((page) => {
                    flatIdx++
                    const currentIdx = flatIdx
                    const PageIcon = PAGE_ICON_MAP[page.icon] || LayoutDashboard
                    return (
                      <button
                        key={page.href}
                        onClick={() => navigateTo(page.href)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          activeIdx === currentIdx
                            ? 'bg-primary/10 text-primary'
                            : 'hover:bg-gray-50 dark:hover:bg-white/5 text-[#25396f] dark:text-gray-300'
                        }`}
                      >
                        <PageIcon className="w-4 h-4 shrink-0 opacity-60" />
                        <span className="text-sm font-semibold truncate">{page.title}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Movies */}
              {results && results.movies.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 border-t border-gray-100 dark:border-white/5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phim</span>
                  </div>
                  {results.movies.map((movie) => {
                    flatIdx++
                    const currentIdx = flatIdx
                    return (
                      <button
                        key={movie.id}
                        onClick={() => navigateTo(movie.href)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          activeIdx === currentIdx
                            ? 'bg-primary/10'
                            : 'hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Film className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#25396f] dark:text-white truncate">{movie.title}</p>
                          <p className="text-[11px] text-gray-400 font-medium">
                            {movie.type === 'tv' ? 'Phim bộ' : movie.type === 'anime' ? 'Anime' : 'Phim lẻ'}
                            {movie.year ? ` · ${movie.year}` : ''}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          movie.status === 'published'
                            ? 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400'
                        }`}>
                          {movie.status === 'published' ? 'Published' : movie.status}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Users */}
              {results && results.users.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 border-t border-gray-100 dark:border-white/5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Người dùng</span>
                  </div>
                  {results.users.map((user) => {
                    flatIdx++
                    const currentIdx = flatIdx
                    return (
                      <button
                        key={user.id}
                        onClick={() => navigateTo(user.href)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          activeIdx === currentIdx
                            ? 'bg-primary/10'
                            : 'hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-black text-[#022c22]">{user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#25396f] dark:text-white truncate">{user.name}</p>
                          <p className="text-[11px] text-gray-400 font-medium truncate">{user.email}</p>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{user.role}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/10 flex items-center gap-3">
            <span className="text-[10px] text-gray-400 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-mono text-[9px]">↑↓</kbd> di chuyển
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-mono text-[9px]">↵</kbd> mở
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 font-mono text-[9px]">Esc</kbd> đóng
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, isAdmin, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // ── Notification state ──
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = useCallback(async () => {
    try {
      setNotifLoading(true)
      const res = await fetch('/api/admin/notifications')
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setNotifications(json.data)
        setUnreadCount(json.unreadCount || json.data.length)
      }
    } catch {
      // Silently fail — keep any previous data
    } finally {
      setNotifLoading(false)
    }
  }, [])

  // Fetch notifications on mount + every 60s
  useEffect(() => {
    if (user && isAdmin) {
      fetchNotifications()
      const interval = setInterval(fetchNotifications, 60_000)
      return () => clearInterval(interval)
    }
  }, [user, isAdmin, fetchNotifications])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    } else if (!isLoading && user && !isAdmin) {
      router.push('/')
    }
  }, [isLoading, user, isAdmin, router])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) setSidebarOpen(false)
      else setSidebarOpen(true)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  if (isLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#f2f7ff] dark:bg-[#151e2f] flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full font-nunito"></div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f2f7ff] dark:bg-background text-[#25396f] dark:text-gray-300 flex font-nunito transition-colors duration-300">
      
      {/* Sidebar - Mazer Style with Terence Colors */}
      <aside 
        className={`fixed lg:static top-0 left-0 h-screen z-50 bg-white dark:bg-[#151e2f] shadow-[0_0_20px_rgba(0,0,0,0.05)] dark:shadow-none transition-all duration-300 flex flex-col overflow-hidden animate-slide-in-left shrink-0 ${
          sidebarOpen ? 'w-[280px] translate-x-0' : 'w-[280px] -translate-x-full lg:w-0'
        } ${sidebarOpen && isMobile ? 'shadow-2xl' : ''}`}
      >
        <div className="w-[280px] min-w-[280px] h-full flex flex-col">
          {/* Logo Area */}
          <div className="h-24 px-8 flex items-center justify-between shrink-0">
            <Link href="/" className="flex items-center gap-3 group">
              <TerenceLogo size={36} className="text-primary group-hover:scale-110 transition-transform" />
              <span className="text-2xl font-black tracking-tight text-[#25396f] dark:text-white">TERENCE</span>
            </Link>
            <button className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" onClick={() => setSidebarOpen(false)}>
               <X className="w-6 h-6" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto w-full py-4 space-y-2 custom-scrollbar">
            <div className="px-8 mb-4">
               <span className="text-xs font-bold text-[#25396f]/50 dark:text-gray-500 uppercase tracking-wider">Menu Chính</span>
            </div>

            {SIDEBAR_ITEMS.map((item, idx) => {
              const isActive = pathname === item.href
              return (
                <div 
                  key={item.href} 
                  className="px-5 opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'forwards' }}
                >
                  <Link
                    href={item.href}
                    onClick={() => isMobile && setSidebarOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 font-bold ${
                      isActive
                        ? 'bg-primary text-white shadow-[0_4px_10px_rgba(45,212,191,0.4)] dark:text-[#022c22] scale-100'
                        : 'text-[#25396f] dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-primary dark:hover:text-primary hover:translate-x-1'
                    }`}
                  >
                    <item.icon className={`w-[22px] h-[22px] ${isActive ? '' : 'opacity-80'}`} />
                    <span className="text-[15px] whitespace-nowrap">{item.label}</span>
                  </Link>
                </div>
              )
            })}
          </nav>

          {/* User Card */}
          <div className="p-6 shrink-0 opacity-0 animate-fade-in-up" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
             <div className="bg-[#f8f9fa] dark:bg-black/20 rounded-2xl p-4 flex flex-col gap-3">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-primary font-black">{user.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.role}</p>
                  </div>
               </div>
               <Button
                  variant="outline"
                  className="w-full justify-center gap-2 border-none bg-white text-red-500 hover:bg-red-50 hover:text-red-600 dark:bg-white/5 dark:text-red-400 shadow-sm transition-transform active:scale-95"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span className="font-bold text-sm">Đăng xuất</span>
                </Button>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-screen overflow-y-auto min-w-0 transition-all duration-300 custom-scrollbar`}>
        {/* Top Navbar */}
        <header className="h-[90px] px-4 md:px-6 lg:px-10 flex items-center justify-between shrink-0 opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 md:gap-4 flex-1">
            <button
               className={`p-2.5 rounded-xl bg-white dark:bg-[#151e2f] text-gray-600 dark:text-gray-300 shadow-sm hover:shadow-md transition-all active:scale-95 z-50 ${sidebarOpen ? 'hidden lg:block' : 'block'}`}
               onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block flex-1 max-w-sm">
              <DashboardSearch />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {/* Theme Toggle */}
            <button 
               onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
               className="p-2.5 rounded-xl bg-white dark:bg-[#151e2f] text-gray-600 dark:text-gray-300 shadow-sm hover:text-primary dark:hover:text-primary transition-colors active:scale-95"
            >
               {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notification — Dynamic */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2.5 rounded-xl bg-white dark:bg-[#151e2f] text-gray-600 dark:text-gray-300 shadow-sm relative hover:text-primary dark:hover:text-primary transition-colors active:scale-95 group outline-none cursor-pointer">
                  <Bell className="w-5 h-5 group-hover:animate-wiggle" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 rounded-full border-2 border-white dark:border-[#151e2f] text-[9px] font-bold text-white px-1 animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[360px] bg-white dark:bg-[#151e2f] border-none shadow-2xl rounded-2xl p-0 font-nunito animate-dropdown-in overflow-hidden">
                <div className="p-4 bg-gray-50 dark:bg-black/20 flex items-center justify-between">
                   <span className="font-black text-[#25396f] dark:text-white">Thông báo</span>
                   {unreadCount > 0 && (
                     <span className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded-lg">{unreadCount} Mới</span>
                   )}
                </div>
                <div className="max-h-[380px] overflow-y-auto custom-scrollbar flex flex-col">
                   {notifLoading && notifications.length === 0 ? (
                     <div className="p-8 flex flex-col items-center justify-center gap-2">
                       <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                       <p className="text-xs text-gray-400 font-medium">Đang tải thông báo...</p>
                     </div>
                   ) : notifications.length === 0 ? (
                     <div className="p-8 text-center">
                       <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                       <p className="text-sm text-gray-400 font-medium">Chưa có thông báo mới</p>
                     </div>
                   ) : (
                     notifications.map((notif, idx) => {
                       const iconConfig = NOTIF_ICON_MAP[notif.type] || NOTIF_ICON_MAP.system
                       const NotifIcon = iconConfig.icon
                       return (
                         <div
                           key={notif.id}
                           className={`p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                             idx < notifications.length - 1 ? 'border-b border-gray-100 dark:border-white/5' : ''
                           }`}
                         >
                           <div className={`w-10 h-10 rounded-full ${iconConfig.bg} flex items-center justify-center shrink-0`}>
                             <NotifIcon className={`w-5 h-5 ${iconConfig.color}`} />
                           </div>
                           <div className="flex-1 min-w-0">
                             <p className="text-[13px] font-bold text-[#25396f] dark:text-gray-200 line-clamp-2">
                               {notif.message}
                             </p>
                             <p className="text-[11px] text-gray-400 mt-1 font-semibold">
                               {formatRelativeTime(notif.createdAt)}
                             </p>
                           </div>
                         </div>
                       )
                     })
                   )}
                </div>
                <div className="p-3 text-center border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#151e2f] flex gap-2">
                   <button
                     onClick={() => { setNotifications([]); setUnreadCount(0) }}
                     className="text-sm font-bold text-gray-500 hover:text-[#25396f] dark:hover:text-white transition-colors flex-1 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5"
                   >
                     Đánh dấu đã đọc
                   </button>
                   <button
                     onClick={fetchNotifications}
                     className="text-sm font-bold text-primary hover:text-primary transition-colors p-2 rounded-lg hover:bg-primary/5"
                   >
                     Làm mới
                   </button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Top Right Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 bg-white dark:bg-[#151e2f] p-2 pr-2 lg:pr-4 rounded-2xl shadow-sm outline-none cursor-pointer hover:shadow-md transition-all active:scale-95">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-black text-sm tracking-tighter">{user.name.substring(0, 2).toUpperCase()}</span>
                </div>
                <div className="hidden lg:block text-left">
                   <p className="text-sm font-bold text-[#25396f] dark:text-white leading-tight truncate max-w-[120px]">{user.name}</p>
                   <p className="text-[11px] font-bold text-gray-400 leading-tight">Admin</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 hidden lg:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#151e2f] border-none shadow-xl rounded-xl p-2 font-nunito animate-dropdown-in">
                <DropdownMenuLabel className="font-bold text-gray-400 text-xs uppercase px-2">Tài khoản</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/5 my-2" />
                <DropdownMenuItem onClick={() => router.push('/')} className="cursor-pointer font-bold text-[#25396f] dark:text-white rounded-lg py-2.5 hover:text-primary hover:bg-primary/10">
                  Quay về trang web
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer font-bold text-[#25396f] dark:text-white rounded-lg py-2.5 hover:text-primary hover:bg-primary/10">
                  Tùy chỉnh hệ thống
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/5 my-2" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-500/10 cursor-pointer font-bold rounded-lg py-2.5">
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-10 pt-4 overflow-x-hidden opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {children}
        </main>
      </div>
      
      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
         <div 
           className="fixed inset-0 z-40 bg-[#25396f]/20 dark:bg-black/40 backdrop-blur-sm animate-fade-in" 
           onClick={() => setSidebarOpen(false)}
         />
      )}
    </div>
  )
}

