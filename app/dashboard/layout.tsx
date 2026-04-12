'use client'

'use client'

import { useState, useEffect } from 'react'
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
  AlertTriangle
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
  { icon: Tag, label: 'Nội dung', href: '/dashboard/content' },
  { icon: Users, label: 'Người dùng', href: '/dashboard/users' },
  { icon: Coins, label: 'Thanh toán & TCoin', href: '/dashboard/tcoin' },
  { icon: BarChart3, label: 'Thống kê', href: '/dashboard/analytics' },
  { icon: FileText, label: 'Nhật ký', href: '/dashboard/logs' },
  { icon: Settings, label: 'Cài đặt', href: '/dashboard/settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoading, isAdmin, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

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
        <div className="animate-spin w-10 h-10 border-4 border-[#2dd4bf] border-t-transparent rounded-full font-nunito"></div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-[#f2f7ff] dark:bg-[#0B1120] text-[#25396f] dark:text-gray-300 flex font-nunito transition-colors duration-300">
      
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
              <TerenceLogo size={36} className="text-[#2dd4bf] group-hover:scale-110 transition-transform" />
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
                        ? 'bg-[#2dd4bf] text-white shadow-[0_4px_10px_rgba(45,212,191,0.4)] dark:text-[#022c22] scale-100'
                        : 'text-[#25396f] dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-[#2dd4bf] dark:hover:text-[#2dd4bf] hover:translate-x-1'
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
                  <div className="w-10 h-10 rounded-full bg-[#2dd4bf]/10 dark:bg-[#2dd4bf]/20 flex items-center justify-center shrink-0">
                    <span className="text-[#2dd4bf] font-black">{user.name.charAt(0)}</span>
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
        <header className="h-[90px] px-6 lg:px-10 flex items-center justify-between shrink-0 opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-4">
            <button
               className={`p-2.5 rounded-xl bg-white dark:bg-[#151e2f] text-gray-600 dark:text-gray-300 shadow-sm hover:shadow-md transition-all active:scale-95 ${sidebarOpen ? 'hidden lg:block' : 'block'}`}
               onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center bg-white dark:bg-[#151e2f] rounded-2xl px-4 py-2.5 shadow-sm min-w-[300px] transition-all focus-within:ring-2 focus-within:ring-[#2dd4bf]/50">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className="ml-3 bg-transparent border-0 outline-none text-[15px] font-medium flex-1 text-gray-700 dark:text-gray-200 placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button 
               onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
               className="p-2.5 rounded-xl bg-white dark:bg-[#151e2f] text-gray-600 dark:text-gray-300 shadow-sm hover:text-[#2dd4bf] dark:hover:text-[#2dd4bf] transition-colors active:scale-95"
            >
               {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notification */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2.5 rounded-xl bg-white dark:bg-[#151e2f] text-gray-600 dark:text-gray-300 shadow-sm relative hover:text-[#2dd4bf] dark:hover:text-[#2dd4bf] transition-colors active:scale-95 group outline-none cursor-pointer">
                  <Bell className="w-5 h-5 group-hover:animate-wiggle" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#151e2f] animate-pulse"></span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[320px] bg-white dark:bg-[#151e2f] border-none shadow-2xl rounded-2xl p-0 font-nunito animate-dropdown-in overflow-hidden">
                <div className="p-4 bg-gray-50 dark:bg-black/20 flex items-center justify-between">
                   <span className="font-black text-[#25396f] dark:text-white">Thông báo</span>
                   <span className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded-lg">3 Mới</span>
                </div>
                <div className="max-h-[340px] overflow-y-auto custom-scrollbar flex flex-col">
                   <div className="p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors border-b border-gray-100 dark:border-white/5">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                         <Coins className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                         <p className="text-[13px] font-bold text-[#25396f] dark:text-gray-200 line-clamp-2">Phú Nhị Đại vừa nạp <span className="text-[#2dd4bf]">50,000,000 TCoin</span> duyệt tự động.</p>
                         <p className="text-[11px] text-gray-400 mt-1 font-semibold">2 phút trước</p>
                      </div>
                   </div>
                   <div className="p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                         <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                         <p className="text-[13px] font-bold text-[#25396f] dark:text-gray-200 line-clamp-2">Cảnh báo: Link nguồn hỏng tại phim <span className="text-yellow-500">The Batman</span>.</p>
                         <p className="text-[11px] text-gray-400 mt-1 font-semibold">1 giờ trước</p>
                      </div>
                   </div>
                   <div className="p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                         <Users className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex-1">
                         <p className="text-[13px] font-bold text-[#25396f] dark:text-gray-200 line-clamp-2">Hệ thống ghi nhận <span className="text-green-500">+1,240</span> người đăng ký mới hôm nay.</p>
                         <p className="text-[11px] text-gray-400 mt-1 font-semibold">5 giờ trước</p>
                      </div>
                   </div>
                </div>
                <div className="p-3 text-center border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#151e2f]">
                   <button className="text-sm font-bold text-gray-500 hover:text-[#25396f] dark:hover:text-white transition-colors w-full p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">Đánh dấu đã đọc tất cả</button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Top Right Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-3 bg-white dark:bg-[#151e2f] p-2 pr-4 rounded-2xl shadow-sm outline-none cursor-pointer hover:shadow-md transition-all active:scale-95">
                <div className="w-9 h-9 rounded-xl bg-[#2dd4bf]/10 flex items-center justify-center shrink-0">
                  <span className="text-[#2dd4bf] font-black text-sm tracking-tighter">{user.name.substring(0, 2).toUpperCase()}</span>
                </div>
                <div className="hidden sm:block text-left">
                   <p className="text-sm font-bold text-[#25396f] dark:text-white leading-tight">{user.name}</p>
                   <p className="text-[11px] font-bold text-gray-400 leading-tight">Admin</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#151e2f] border-none shadow-xl rounded-xl p-2 font-nunito animate-dropdown-in">
                <DropdownMenuLabel className="font-bold text-gray-400 text-xs uppercase px-2">Tài khoản</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100 dark:bg-white/5 my-2" />
                <DropdownMenuItem onClick={() => router.push('/')} className="cursor-pointer font-bold text-[#25396f] dark:text-white rounded-lg py-2.5 hover:text-[#2dd4bf] hover:bg-[#2dd4bf]/10">
                  Quay về trang web
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer font-bold text-[#25396f] dark:text-white rounded-lg py-2.5 hover:text-[#2dd4bf] hover:bg-[#2dd4bf]/10">
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

