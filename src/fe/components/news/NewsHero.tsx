'use client'

interface NewsHeroProps {
  /** Featured upcoming movie backdrop for dynamic banner */
  featuredBackdrop?: string
}

export function NewsHero({ featuredBackdrop }: NewsHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.04]">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-background" />
      {featuredBackdrop ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.12] transition-opacity duration-1000"
          style={{ backgroundImage: `url(${featuredBackdrop})` }}
        />
      ) : (
        <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-primary/30 via-transparent to-primary/10" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-10 md:py-16">
        <div className="max-w-xl">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
            Tin tức phim
          </h1>
          <p className="text-sm md:text-base text-white/50 leading-relaxed">
            Cập nhật trailer mới, review phim, lịch chiếu và tin nóng điện ảnh hàng ngày.
          </p>
        </div>
      </div>
    </section>
  )
}
