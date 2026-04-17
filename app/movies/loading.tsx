import { MovieCardSkeleton } from '@/src/fe/components/shared/MovieCard'

export default function MoviesLoading() {
  return (
    <main className="min-h-screen bg-background pb-24 md:pb-12">
      {/* Header Skeleton */}
      <div className="border-b border-white/[0.04] bg-card/30">
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 lg:px-10">
          <div className="h-12 w-full max-w-md rounded-2xl skeleton mb-4" />
          <div className="flex flex-wrap gap-2 mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-24 rounded-full skeleton" />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-48 rounded-lg skeleton" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <MovieCardSkeleton key={i} landscape={false} />
          ))}
        </div>
      </div>
    </main>
  )
}

