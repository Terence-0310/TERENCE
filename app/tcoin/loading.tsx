export default function TCoinLoading() {
  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mx-auto h-10 w-40 rounded-lg skeleton mb-3" />
          <div className="mx-auto h-4 w-72 rounded skeleton" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-card/40 p-6">
              <div className="h-6 w-24 rounded skeleton mb-3" />
              <div className="h-10 w-32 rounded-lg skeleton mb-4" />
              <div className="h-3 w-full rounded skeleton mb-1" />
              <div className="h-3 w-2/3 rounded skeleton mb-4" />
              <div className="h-10 w-full rounded-xl skeleton" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
