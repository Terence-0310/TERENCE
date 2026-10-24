'use client'

interface NewsHeroProps {
  /** Featured upcoming movie backdrop for dynamic banner */
  featuredBackdrop?: string
  /** In-page anchors for the sections that have content */
  sections?: { href: string; label: string }[]
}

export function NewsHero({ featuredBackdrop, sections = [] }: NewsHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.05]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(45,212,191,0.16),transparent_55%)]" />
      {featuredBackdrop && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.12]"
          style={{ backgroundImage: `url(${featuredBackdrop})` }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 md:px-6 lg:px-8 pt-10 pb-8 md:pt-14 md:pb-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Cập nhật mỗi 20 phút
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
          Tin tức <span className="text-primary">điện ảnh</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm md:text-base leading-relaxed text-white/55">
          Trailer mới, review phim, lịch chiếu và tin nóng giải trí trong một nơi.
        </p>

        {sections.length > 1 && (
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Chuyên mục tin tức">
          {sections.map((s) => (
            <a
              key={s.href}
              href={s.href}
              className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-white/70 transition hover:border-primary/40 hover:text-primary"
            >
              {s.label}
            </a>
          ))}
        </nav>
        )}
      </div>
    </section>
  )
}
