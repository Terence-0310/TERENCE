import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/src/fe/components/ui/dialog'
import { Button } from '@/src/fe/components/ui/button'

interface Props {
  children: React.ReactNode
}

export function CreateWatchRoomGuideModal({ children }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-[480px] bg-background border-transparent sm:rounded-[20px] overflow-hidden p-0 gap-0 shadow-2xl">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-[20px] font-bold text-white">
            Tạo phòng xem chung
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="relative">
            {/* Continuous vertical line */}
            <div className="absolute left-[16px] top-[16px] bottom-[30px] w-[1px] bg-white/10" />

            <div className="space-y-[26px]">
              {/* Step 1 */}
              <div className="flex items-start gap-4 relative">
                <div className="relative w-[34px] h-[34px] rounded-full bg-[#18363A] border border-[#234E50] flex items-center justify-center shrink-0 z-10 shadow-[0_0_0_8px_#0E131F]">
                  <span className="text-[14px] font-bold text-primary">1</span>
                </div>
                <div className="pt-1.5 flex-1 w-0">
                  <h4 className="text-[15px] font-semibold text-white/95 leading-none">Tìm phim bạn muốn xem chung.</h4>
                  <p className="text-[13px] text-white/50 mt-2 leading-[1.6]">
                    Bạn có thể tìm phim trong thanh tìm kiếm hoặc chọn từ danh sách phim đang hot.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-4 relative">
                <div className="relative w-[34px] h-[34px] rounded-full bg-[#18363A] border border-[#234E50] flex items-center justify-center shrink-0 z-10 shadow-[0_0_0_8px_#0E131F]">
                  <span className="text-[14px] font-bold text-primary">2</span>
                </div>
                <div className="pt-1.5 flex-1 w-0">
                  <h4 className="text-[15px] font-semibold text-white/95 leading-none">Chuyển tới trang xem phim</h4>
                  <p className="text-[13px] text-white/50 mt-2 leading-[1.6]">
                    Tại trang xem của tập phim đó, chọn biểu tượng <strong className="font-semibold text-white/70">[Xem chung]</strong> trên thanh công cụ phía dưới player.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-4 relative">
                <div className="relative w-[34px] h-[34px] rounded-full bg-[#18363A] border border-[#234E50] flex items-center justify-center shrink-0 z-10 shadow-[0_0_0_8px_#0E131F]">
                  <span className="text-[14px] font-bold text-primary">3</span>
                </div>
                <div className="pt-1.5 flex-1 w-0">
                  <h4 className="text-[15px] font-semibold text-white/95 leading-none">Điền thông tin</h4>
                  <p className="text-[13px] text-white/50 mt-2 leading-[1.6]">
                    Thiết lập tên phòng và cài đặt các quyền bảo mật cho phòng chiếu của bạn.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-4 relative">
                <div className="relative w-[34px] h-[34px] rounded-full bg-[#18363A] border border-[#234E50] flex items-center justify-center shrink-0 z-10 shadow-[0_0_0_8px_#0E131F]">
                  <span className="text-[14px] font-bold text-primary">4</span>
                </div>
                <div className="pt-1.5 flex-1 w-0">
                  <h4 className="text-[15px] font-semibold text-white/95 leading-none">Hoàn thành & Chia sẻ</h4>
                  <p className="text-[13px] text-white/50 mt-2 leading-[1.6]">
                    Copy đường dẫn (link) hoặc mã phòng gửi cho bạn bè để cùng tham gia xem chung.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 pb-8 bg-transparent">
          <DialogTrigger asChild>
            <Button className="w-full h-[48px] rounded-[14px] bg-primary text-[#0A0F1E] font-bold text-[15px] hover:bg-[#2CBDA9] transition-colors">
              Đã hiểu
            </Button>
          </DialogTrigger>
        </div>
      </DialogContent>
    </Dialog>
  )
}

