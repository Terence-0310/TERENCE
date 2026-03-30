'use client'

// ============================================
// NewsSkeletons — Loading state components
// ============================================

export function ArticleGridSkeleton({ count = 6, compact = false }: { count?: number; compact?: boolean }) {
  return (
    <div className={`grid gap-5 ${compact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-white/[0.06] bg-card/30 overflow-hidden animate-pulse">
          <div className={`${compact ? 'aspect-[16/9]' : 'aspect-[16/10]'} bg-white/[0.04]`} />
          <div className={`${compact ? 'p-4' : 'p-5'} space-y-2`}>
            <div className="h-3 w-20 rounded bg-white/[0.06]" />
            <div className="h-5 w-3/4 rounded bg-white/[0.06]" />
            {!compact && (
              <>
                <div className="h-3 w-full rounded bg-white/[0.06]" />
                <div className="h-3 w-2/3 rounded bg-white/[0.06]" />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function UpcomingGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] rounded-xl bg-white/[0.04]" />
          <div className="mt-2 h-3.5 w-full rounded bg-white/[0.06]" />
          <div className="mt-1 h-3 w-2/3 rounded bg-white/[0.06]" />
        </div>
      ))}
    </div>
  )
}
