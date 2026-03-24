export default function PeopleLoading() {
  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="h-8 w-56 rounded-lg skeleton mb-2" />
          <div className="h-4 w-64 rounded skeleton" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-card/40 overflow-hidden">
              <div className="aspect-[2/3] skeleton" />
              <div className="p-3">
                <div className="h-4 w-3/4 rounded skeleton mb-1" />
                <div className="h-3 w-1/2 rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
