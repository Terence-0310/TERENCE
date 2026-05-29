export default function ReviewsLoading() {
  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8 pt-[88px]">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="rounded-2xl border border-white/10 bg-card/40 p-6 md:p-8 space-y-3">
          <div className="h-3 w-32 rounded skeleton" />
          <div className="h-9 w-56 rounded-lg skeleton" />
          <div className="h-4 w-2/3 rounded skeleton" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-lg skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    </main>
  )
}
