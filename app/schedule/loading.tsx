export default function ScheduleLoading() {
  return (
    <main className="min-h-screen bg-background px-4 md:px-6 lg:px-8 py-8">
      <div className="h-8 w-32 rounded-lg skeleton mb-2" />
      <div className="h-4 w-56 rounded skeleton mb-6" />

      {/* Day selector */}
      <div className="flex gap-2 overflow-hidden pb-4 mb-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-16 w-20 flex-shrink-0 rounded-xl skeleton" />
        ))}
      </div>

      {/* Schedule slots */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-card/40 p-4">
            <div className="hidden sm:block h-16 w-12 rounded-lg skeleton" />
            <div className="flex-1">
              <div className="h-4 w-48 rounded skeleton mb-2" />
              <div className="h-3 w-32 rounded skeleton" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-12 rounded-md skeleton" />
              <div className="h-5 w-16 rounded skeleton" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
