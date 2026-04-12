import Link from 'next/link'
import { TerenceLogo } from '@/src/fe/components/terence-logo'

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Sovereignty Badge — RoPhim style */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-red-600/90 px-4 py-2 text-sm font-bold text-white shadow-lg">
            Hoàng Sa &amp; Trường Sa là của Việt Nam!
          </span>
        </div>

        {/* Logo + Social Icons */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <TerenceLogo size={36} />
              <div>
                <span className="text-xl font-bold text-white tracking-widest uppercase">Terence</span>
              </div>
            </Link>

            {/* Social icons */}
            <div className="flex items-center gap-2 ml-4">
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10
                  text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Facebook"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10
                  text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Telegram"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            </div>
          </div>


        </div>

        {/* Link row — RoPhim style */}
        <div className="mt-8 flex flex-wrap items-center gap-4 md:gap-6 border-t border-white/5 pt-6">
          <Link href="/browse" className="text-sm text-muted-foreground transition hover:text-white">
            Khám phá
          </Link>
          <Link href="/browse?category=trending" className="text-sm text-muted-foreground transition hover:text-white">
            Xu hướng
          </Link>
          <Link href="/browse?category=popular" className="text-sm text-muted-foreground transition hover:text-white">
            Phổ biến
          </Link>
          <Link href="/news" className="text-sm text-muted-foreground transition hover:text-white">
            Tin tức
          </Link>
          <Link href="/people" className="text-sm text-muted-foreground transition hover:text-white">
            Diễn viên
          </Link>
          <Link href="/schedule" className="text-sm text-muted-foreground transition hover:text-white">
            Lịch chiếu
          </Link>
          <Link href="/xem-chung" className="text-sm text-muted-foreground transition hover:text-white">
            Xem chung
          </Link>
          <Link href="/tcoin" className="text-sm text-muted-foreground transition hover:text-white">
            TCoin
          </Link>
        </div>

        {/* SEO text + copyright */}
        <div className="mt-6 space-y-4 border-t border-white/5 pt-6">
          <h3 className="text-base font-bold text-white/80">
            Terence: Đỉnh Cao Giải Trí Online — Rạp Phim Tại Gia
          </h3>
          <p className="text-xs text-muted-foreground/40 leading-relaxed max-w-3xl">
            Nền tảng Terence xem phim trực tuyến, nổi bật với chất lượng hình ảnh cao và giao diện dễ sử dụng.
            Với tốc độ tải trang nhanh chóng, người dùng có thể dễ dàng truy cập và thưởng thức một kho phim phong phú.
          </p>
          <p className="text-xs text-muted-foreground/30">
            © {new Date().getFullYear()} Terence. Dự án học tập — không phân phối nội dung bản quyền.
          </p>
        </div>
      </div>
    </footer>
  )
}
