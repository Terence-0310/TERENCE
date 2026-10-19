'use client'

import { WatchPartyHero } from '@/src/fe/components/watch-party/WatchPartyHero'
import { WatchRoomCard } from '@/src/fe/components/watch-party/WatchRoomCard'
import { useWatchRooms } from '@/lib/watch-party/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs'
import { Loader2, AlertCircle, Users } from 'lucide-react'

// Reusable empty/error/loading skeletons. Layout shell stays identical to the
// previous design so loading state doesn't shift the page when data arrives.
function RoomGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-[3/4] rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse"
        />
      ))}
    </div>
  )
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
      <Users className="w-10 h-10 text-white/30" />
      <p className="text-sm font-medium text-white/80">{title}</p>
      <p className="text-xs text-white/40 text-center max-w-xs">{hint}</p>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border border-red-500/20 bg-red-500/5">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm font-medium text-red-300">Không tải được danh sách phòng</p>
      <p className="text-xs text-white/40">Vui lòng thử lại sau giây lát.</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 text-xs rounded-full bg-white/10 hover:bg-white/15 text-white/80"
        >
          Thử lại
        </button>
      )}
    </div>
  )
}

export default function WatchPartyPage() {
  const { rooms, isLoading, isError } = useWatchRooms()
  const popularRooms = [...rooms].sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0))

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl xl:max-w-7xl px-4 md:px-6 lg:px-8 py-8 space-y-8">
        <WatchPartyHero />

        {/* Công chiếu */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-white">Công chiếu nổi bật</h2>
              <p className="text-xs md:text-sm text-white/60">
                Những phòng xem chung đang hoặc sắp công chiếu các bộ phim hot.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2" aria-hidden>
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse flex items-center justify-center"
                >
                  <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <ErrorState />
          ) : rooms.length === 0 ? (
            <EmptyState title="Chưa có phòng nào" hint="Quay lại sau nhé." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rooms.slice(0, 2).map((room) => (
                <WatchRoomCard key={room.code} room={room} />
              ))}
            </div>
          )}
        </section>

        {/* Xem chung */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-white">Xem chung</h2>
              <p className="text-xs md:text-sm text-white/60">
                Tham gia các phòng đang hoạt động, xem cùng cộng đồng Terence.
              </p>
            </div>
          </div>

          <Tabs defaultValue="latest">
            <TabsList className="inline-flex rounded-full bg-white/5 p-1 border border-white/10 mb-4">
              <TabsTrigger
                value="latest"
                className="px-3 py-1.5 text-xs md:text-sm rounded-full text-white/70 data-[state=active]:bg-white data-[state=active]:text-black"
              >
                Mới nhất
              </TabsTrigger>
              <TabsTrigger
                value="popular"
                className="px-3 py-1.5 text-xs md:text-sm rounded-full text-white/70 data-[state=active]:bg-white data-[state=active]:text-black"
              >
                Phổ biến
              </TabsTrigger>
            </TabsList>

            <TabsContent value="latest" className="space-y-4">
              {isLoading ? (
                <RoomGridSkeleton />
              ) : isError ? (
                <ErrorState />
              ) : rooms.length === 0 ? (
                <EmptyState
                  title="Chưa có phòng xem chung"
                  hint="Hãy là người đầu tiên tạo phòng mời cộng đồng tham gia."
                />
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {rooms.map((room) => (
                    <WatchRoomCard key={room.code} room={room} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="popular" className="space-y-4">
              {isLoading ? (
                <RoomGridSkeleton />
              ) : isError ? (
                <ErrorState />
              ) : rooms.length === 0 ? (
                <EmptyState
                  title="Chưa có phòng phổ biến"
                  hint="Phòng sẽ xuất hiện khi có nhiều người tham gia."
                />
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {popularRooms.map((room) => (
                    <WatchRoomCard key={room.code} room={room} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  )
}
