export default function ReviewsLoading() {
  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="h-8 w-40 rounded-lg skeleton mb-2" />
          <div className="h-4 w-64 rounded skeleton" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-card/40 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full skeleton" />
                <div>
                  <div className="h-4 w-24 rounded skeleton mb-1" />
                  <div className="h-3 w-16 rounded skeleton" />
                </div>
              </div>
              <div className="h-5 w-3/4 rounded skeleton mb-2" />
              <div className="h-3 w-full rounded skeleton" />
              <div className="h-3 w-full rounded skeleton mt-1" />
              <div className="h-3 w-2/3 rounded skeleton mt-1" />
              <div className="flex gap-1 mt-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="h-4 w-4 rounded skeleton" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
