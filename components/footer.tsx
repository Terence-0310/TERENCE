import Link from 'next/link'
import { TerenceLogo } from '@/components/terence-logo'

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <TerenceLogo size={24} />
              <span className="text-lg font-bold text-white">Terence</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Nền tảng khám phá phim trực tuyến. Dữ liệu phim cung cấp bởi TMDB.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">Khám phá</h4>
              <div className="flex flex-col gap-2">
                <Link href="/browse?category=trending" className="text-sm text-muted-foreground transition hover:text-white">Xu hướng</Link>
                <Link href="/browse?category=popular" className="text-sm text-muted-foreground transition hover:text-white">Phổ biến</Link>
                <Link href="/browse?category=top-rated" className="text-sm text-muted-foreground transition hover:text-white">Đánh giá cao</Link>
                <Link href="/genres" className="text-sm text-muted-foreground transition hover:text-white">Thể loại</Link>
                <Link href="/countries" className="text-sm text-muted-foreground transition hover:text-white">Quốc gia</Link>
                <Link href="/people" className="text-sm text-muted-foreground transition hover:text-white">Diễn viên</Link>
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-white">Tính năng</h4>
              <div className="flex flex-col gap-2">
                <Link href="/xem-chung" className="text-sm text-muted-foreground transition hover:text-white">Xem chung</Link>
                <Link href="/news" className="text-sm text-muted-foreground transition hover:text-white">Tin tức</Link>
                <Link href="/reviews" className="text-sm text-muted-foreground transition hover:text-white">Reviews</Link>
                <Link href="/schedule" className="text-sm text-muted-foreground transition hover:text-white">Lịch chiếu</Link>
                <Link href="/tcoin" className="text-sm text-muted-foreground transition hover:text-white">TCoin</Link>
              </div>
            </div>
          </div>

          {/* TMDB Attribution */}
          <div className="flex flex-col items-start gap-3">
            <p className="text-xs text-muted-foreground/60">
              This product uses the TMDB API but is not endorsed or certified by TMDB.
            </p>
            <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
              <img
                src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                alt="TMDB"
                className="h-5 opacity-50 transition hover:opacity-80"
              />
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 border-t border-white/5 pt-6 text-center">
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} Terence. Dự án học tập — không phân phối nội dung bản quyền.
          </p>
        </div>
      </div>
    </footer>
  )
}
