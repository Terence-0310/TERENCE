export default function MovieDetailLoading() {
  return (
    <main className="min-h-screen bg-background">
      {/* Backdrop skeleton */}
      <div className="h-[55vh] min-h-[420px] skeleton md:h-[65vh]" />

      <section className="relative z-10 mx-auto -mt-48 max-w-7xl px-5 md:-mt-52 md:px-8 lg:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:gap-10">
          {/* Poster */}
          <div className="mx-auto w-44 flex-shrink-0 md:mx-0 md:w-60 lg:w-72">
            <div className="aspect-[2/3] rounded-2xl skeleton" />
            <div className="mt-4 h-14 rounded-xl skeleton" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-5">
            <div className="h-4 w-32 rounded skeleton" />
            <div className="h-10 w-3/4 rounded-lg skeleton" />
            <div className="h-5 w-1/2 rounded skeleton" />
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded-lg skeleton" />
              <div className="h-8 w-20 rounded-lg skeleton" />
              <div className="h-8 w-20 rounded-lg skeleton" />
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-16 rounded-full skeleton" />
              <div className="h-7 w-16 rounded-full skeleton" />
              <div className="h-7 w-16 rounded-full skeleton" />
            </div>
            <div className="flex gap-3">
              <div className="h-12 w-36 rounded-xl skeleton" />
              <div className="h-12 w-28 rounded-xl skeleton" />
            </div>
            <div className="space-y-2 rounded-xl p-5">
              <div className="h-4 w-20 rounded skeleton" />
              <div className="h-3 w-full rounded skeleton" />
              <div className="h-3 w-full rounded skeleton" />
              <div className="h-3 w-3/4 rounded skeleton" />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
