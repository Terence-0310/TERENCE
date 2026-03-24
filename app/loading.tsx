export default function HomeLoading() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <div className="relative h-[65vh] min-h-[480px] skeleton" />

      {/* Content rows skeleton */}
      <div className="-mt-8 relative z-10 space-y-10 pb-16 px-5 md:px-8 lg:px-10">
        {[1, 2, 3].map((i) => (
          <section key={i}>
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-48 rounded-lg skeleton" />
              <div className="h-4 w-20 rounded skeleton" />
            </div>
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="w-[160px] flex-shrink-0">
                  <div className="aspect-[2/3] rounded-xl skeleton" />
                  <div className="mt-2 h-4 w-3/4 rounded skeleton" />
                  <div className="mt-1 h-3 w-1/2 rounded skeleton" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
