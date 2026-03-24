export default function LoginLoading() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-card/40 p-8">
        <div className="mx-auto h-10 w-10 rounded-xl skeleton mb-6" />
        <div className="mx-auto h-7 w-40 rounded-lg skeleton mb-2" />
        <div className="mx-auto h-4 w-56 rounded skeleton mb-8" />
        <div className="space-y-4">
          <div className="h-11 w-full rounded-lg skeleton" />
          <div className="h-11 w-full rounded-lg skeleton" />
          <div className="h-11 w-full rounded-xl skeleton" />
        </div>
      </div>
    </main>
  )
}
