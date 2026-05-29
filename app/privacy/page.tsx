import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Chính sách bảo mật — Terence',
  description: 'Chính sách bảo mật và xử lý dữ liệu cá nhân tại Terence.',
}

// Basic legal placeholder so signup's "Chính sách bảo mật" link is no longer href="#".
// Replace this with vetted legal copy when available.
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-4 md:px-6 lg:px-8 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay về trang chủ
        </Link>

        <header>
          <h1 className="text-2xl md:text-3xl font-bold">Chính sách bảo mật</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
          </p>
        </header>

        <section className="space-y-4 text-sm leading-relaxed text-white/80">
          <p>
            Terence tôn trọng quyền riêng tư của bạn. Tài liệu này mô tả những dữ liệu
            chúng tôi thu thập, cách chúng tôi sử dụng và quyền của bạn liên quan đến
            dữ liệu cá nhân.
          </p>

          <h2 className="text-lg font-semibold text-white mt-6">1. Dữ liệu thu thập</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Thông tin tài khoản: email, tên hiển thị, mật khẩu (đã hash).</li>
            <li>Lịch sử xem phim, tiến độ xem, đánh giá và bình luận.</li>
            <li>Dữ liệu thiết bị: trình duyệt, hệ điều hành, địa chỉ IP để phục vụ chống gian lận.</li>
            <li>Giao dịch TCoin và lịch sử nạp tiền.</li>
          </ul>

          <h2 className="text-lg font-semibold text-white mt-6">2. Mục đích sử dụng</h2>
          <p>
            Chúng tôi sử dụng dữ liệu để cung cấp dịch vụ, cá nhân hoá đề xuất phim,
            xử lý giao dịch, hỗ trợ khách hàng và phát hiện vi phạm.
          </p>

          <h2 className="text-lg font-semibold text-white mt-6">3. Chia sẻ dữ liệu</h2>
          <p>
            Terence không bán dữ liệu cá nhân của bạn. Dữ liệu chỉ được chia sẻ với
            đối tác cần thiết để vận hành dịch vụ (ví dụ: cổng thanh toán, dịch vụ
            email) và tuân thủ yêu cầu của cơ quan có thẩm quyền nếu có.
          </p>

          <h2 className="text-lg font-semibold text-white mt-6">4. Quyền của bạn</h2>
          <p>
            Bạn có quyền truy cập, chỉnh sửa hoặc yêu cầu xoá dữ liệu cá nhân của
            mình thông qua trang hồ sơ, hoặc liên hệ trực tiếp với chúng tôi.
          </p>

          <h2 className="text-lg font-semibold text-white mt-6">5. Bảo mật</h2>
          <p>
            Chúng tôi áp dụng các biện pháp kỹ thuật và quản trị hợp lý để bảo vệ
            dữ liệu, bao gồm mã hoá khi truyền, hash mật khẩu, và phân quyền truy cập.
          </p>
        </section>
      </div>
    </main>
  )
}
