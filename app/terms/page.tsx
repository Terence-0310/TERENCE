import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Điều khoản sử dụng — Terence',
  description: 'Điều khoản sử dụng dịch vụ Terence.',
}

// Basic legal placeholder so signup's "Điều khoản" link is no longer href="#".
// Replace this with vetted legal copy when available.
export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background text-foreground px-4 md:px-6 lg:px-8 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay về trang chủ
        </Link>

        <header>
          <h1 className="text-2xl md:text-3xl font-bold">Điều khoản sử dụng</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
          </p>
        </header>

        <section className="space-y-4 text-sm leading-relaxed text-white/80">
          <p>
            Bằng việc truy cập và sử dụng Terence, bạn đồng ý tuân thủ các điều khoản
            dưới đây. Vui lòng đọc kỹ trước khi tiếp tục.
          </p>

          <h2 className="text-lg font-semibold text-white mt-6">1. Tài khoản</h2>
          <p>
            Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động dưới tài
            khoản của mình. Cấm chia sẻ tài khoản hoặc sử dụng tài khoản người khác mà
            không có sự đồng ý.
          </p>

          <h2 className="text-lg font-semibold text-white mt-6">2. Nội dung &amp; Bản quyền</h2>
          <p>
            Toàn bộ phim, hình ảnh và dữ liệu trên Terence thuộc về các đơn vị giữ
            bản quyền tương ứng. Cấm sao chép, phát tán hoặc khai thác thương mại
            nếu không có sự cho phép bằng văn bản.
          </p>

          <h2 className="text-lg font-semibold text-white mt-6">3. Thanh toán TCoin</h2>
          <p>
            TCoin là điểm thưởng nội bộ của Terence và không phải tiền tệ pháp định.
            Giao dịch nạp/đổi TCoin là không hoàn trả ngoại trừ trường hợp do lỗi
            hệ thống được xác minh.
          </p>

          <h2 className="text-lg font-semibold text-white mt-6">4. Hành vi bị cấm</h2>
          <p>
            Không sử dụng dịch vụ cho mục đích bất hợp pháp, không tấn công hệ thống,
            không phát tán nội dung độc hại, không spam và không thực hiện hành vi
            gian lận.
          </p>

          <h2 className="text-lg font-semibold text-white mt-6">5. Thay đổi điều khoản</h2>
          <p>
            Terence có thể cập nhật điều khoản theo thời gian. Việc bạn tiếp tục sử
            dụng dịch vụ sau khi điều khoản được cập nhật đồng nghĩa với việc bạn
            chấp nhận phiên bản mới nhất.
          </p>
        </section>
      </div>
    </main>
  )
}
