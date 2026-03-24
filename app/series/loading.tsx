export default function SeriesLoading() {
  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="h-8 w-40 rounded-lg skeleton mb-2" />
          <div className="h-4 w-56 rounded skeleton" />
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
