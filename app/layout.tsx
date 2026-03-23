import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/auth-context'
import { LayoutWrapper } from '@/components/layout-wrapper'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Terence — Xem phim online chất lượng cao',
  description: 'Nền tảng khám phá và thưởng thức phim hàng đầu. Hàng ngàn bộ phim, trailer HD, đánh giá từ cộng đồng.',
  keywords: ['xem phim', 'phim online', 'phim hay', 'terence', 'movie streaming'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'Terence — Xem phim online',
    description: 'Khám phá kho phim khổng lồ trên Terence.',
    siteName: 'Terence',
    type: 'website',
  },
  icons: {
    icon: '/assets/logo/terence-logo.svg',
    apple: '/assets/logo/terence-logo.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <AuthProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
