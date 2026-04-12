'use client'

import { WatchPartyHero } from '@/src/fe/components/watch-party/WatchPartyHero'
import { WatchRoomCard } from '@/src/fe/components/watch-party/WatchRoomCard'
import { useWatchRooms } from '@/lib/watch-party/client'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@radix-ui/react-tabs'

export default function WatchPartyPage() {
  const { rooms } = useWatchRooms()

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

          <div className="grid gap-4 md:grid-cols-2">
            {rooms.slice(0, 2).map((room) => (
              <WatchRoomCard key={room.code} room={room} />
            ))}
          </div>
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {rooms.map((room) => (
                  <WatchRoomCard key={room.code} room={room} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="popular" className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {rooms.map((room) => (
                  <WatchRoomCard key={room.code} room={room} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  )
}

