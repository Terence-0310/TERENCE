export default function WatchLoading() {
  return (
    <main className="min-h-screen bg-black">
      {/* Video player skeleton */}
      <div className="w-full aspect-video skeleton max-h-[80vh]" />
      
      {/* Info below player */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8">
        <div className="h-7 w-2/3 rounded-lg skeleton mb-3" />
        <div className="h-4 w-1/3 rounded skeleton mb-4" />
        <div className="flex gap-3 mb-6">
          <div className="h-10 w-28 rounded-xl skeleton" />
          <div className="h-10 w-28 rounded-xl skeleton" />
        </div>
        <div className="h-px bg-white/[0.06] mb-6" />
        <div className="h-4 w-full rounded skeleton mb-2" />
        <div className="h-4 w-full rounded skeleton mb-2" />
        <div className="h-4 w-2/3 rounded skeleton" />
      </div>
    </main>
  )
}
