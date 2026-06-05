'use client'

import useSWR from 'swr'
import { Carousel } from '@/src/fe/components/shared/Carousel'
import { MovieCard } from '@/src/fe/components/shared/MovieCard'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function RecommendedRow() {
  // Fetch recommendations. If not logged in, API handles fallback to trending.
  const { data, isLoading } = useSWR(
    '/api/v1/movies/recommendations?limit=12',
    fetcher,
    { revalidateOnFocus: false }
  )

  if (isLoading) return null

  const movies = data?.data || []
  if (!movies || movies.length === 0) return null

  return (
    // Padding on the section (same as InterestsSection) so the heading AND the
    // first card share the exact same left edge as the rest of the page.
    <section className="group/row relative space-y-3 px-5 py-2 md:px-8 lg:px-10">
      <h2 className="text-lg font-bold tracking-tight text-white md:text-xl">
        Dành Cho Bạn
      </h2>

      <Carousel
        containerClassName="flex gap-3 pb-2 snap-x snap-mandatory md:gap-4"
        arrowVisibility="hover"
      >
        {movies.map((movie: any) => (
          <div
            key={movie.id}
            className="w-[140px] flex-shrink-0 snap-start sm:w-[160px] md:w-[180px] lg:w-[200px] relative hover:z-[60]"
          >
            <MovieCard movie={movie} />
          </div>
        ))}
      </Carousel>
    </section>
  )
}
