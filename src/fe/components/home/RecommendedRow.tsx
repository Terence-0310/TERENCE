'use client'

import useSWR from 'swr'
import { Sparkles } from 'lucide-react'
import { Carousel } from '@/src/fe/components/shared/Carousel'
import { MovieCard } from '@/src/fe/components/shared/MovieCard'
import { useSession } from 'next-auth/react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function RecommendedRow() {
  const { data: session } = useSession()
  
  // Fetch recommendations. If not logged in, API handles fallback to trending.
  const { data, error, isLoading } = useSWR(
    '/api/v1/movies/recommendations?limit=12', 
    fetcher,
    { revalidateOnFocus: false }
  )

  if (isLoading) return null
  
  const movies = data?.data || []
  if (!movies || movies.length === 0) return null

  return (
    <section className="group/row relative space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-5 md:px-8 lg:px-10">
        <h2 className="text-lg font-bold tracking-tight text-white md:text-xl flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Dành Cho Bạn
        </h2>
      </div>

      {/* Scrollable Row */}
      <Carousel
        containerClassName="flex gap-3 overflow-x-auto px-5 pb-2 snap-x snap-mandatory md:gap-4 md:px-8 lg:px-10"
        arrowVisibility="hover"
      >
        {movies.map((movie: any, i: number) => (
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
