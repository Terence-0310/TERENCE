import { redirect } from 'next/navigation'

// `/watch` has no index UI by design. The watch player lives at /watch/[id].
// Bare /watch typically gets hit by stale bookmarks or broken share links, so
// we send the visitor to the movie listing where they can pick something to play.
export default function WatchIndexPage() {
  redirect('/movies')
}
