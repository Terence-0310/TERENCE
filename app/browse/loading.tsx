export default function BrowseLoading() {
  return (
    <main className="min-h-screen bg-background">
      {/* Search + genre chips */}
      <div className="border-b border-white/[0.04] bg-card/30">
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 lg:px-10">
          <div className="h-11 w-full rounded-lg skeleton mb-5" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-7 w-16 rounded-full skeleton" />
            ))}
          </div>
        </div>
      </div>

      {/* Results grid */}
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-7 w-48 rounded-lg skeleton" />
          <div className="h-6 w-20 rounded-lg skeleton" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-[2/3] rounded-xl skeleton" />
              <div className="mt-2 h-4 w-3/4 rounded skeleton" />
              <div className="mt-1 h-3 w-1/2 rounded skeleton" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
