export default function TCoinLoading() {
  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Hero */}
        <div className="rounded-3xl border border-white/[0.06] bg-card/40 p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="h-3 w-32 rounded skeleton" />
              <div className="h-10 w-56 rounded-lg skeleton" />
              <div className="h-4 w-72 rounded skeleton" />
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-48 rounded-xl skeleton" />
              <div className="h-11 w-40 rounded-xl skeleton" />
            </div>
          </div>
        </div>

        {/* Packages */}
        <div className="space-y-3">
          <div className="h-5 w-48 rounded skeleton" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl skeleton" />
            ))}
          </div>
        </div>

        {/* Rewards */}
        <div className="space-y-3">
          <div className="h-5 w-40 rounded skeleton" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl skeleton" />
            ))}
          </div>
        </div>

        {/* Spend */}
        <div className="space-y-3">
          <div className="h-5 w-44 rounded skeleton" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl skeleton" />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
