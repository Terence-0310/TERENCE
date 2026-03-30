'use client'

// ============================================
// useUpcomingMovies — Hook for upcoming movies (optimized)
// ============================================

import useSWR from 'swr'
import { useCallback } from 'react'
import type { UpcomingMovieItem, ApiListResponse } from '@/lib/news/types'

const fetcher = async (url: string): Promise<ApiListResponse<UpcomingMovieItem>> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Upcoming fetch failed: ${res.status}`)
  return res.json()
}

interface UseUpcomingMoviesOptions {
  region?: string
  page?: number
  enabled?: boolean
}

interface UseUpcomingMoviesReturn {
  items: UpcomingMovieItem[]
  total: number
  loading: boolean
  error: boolean
  refresh: () => void
}

export function useUpcomingMovies(options: UseUpcomingMoviesOptions = {}): UseUpcomingMoviesReturn {
  const { region = 'VN', page = 1, enabled = true } = options

  const params = new URLSearchParams({ region, page: String(page) })
  const url = enabled ? `/api/movies/upcoming?${params}` : null

  const { data, error, isLoading, mutate } = useSWR<ApiListResponse<UpcomingMovieItem>>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 600_000, // 10 minutes
      errorRetryCount: 2,
      errorRetryInterval: 5000,
      keepPreviousData: true,
    },
  )

  const refresh = useCallback(() => { mutate() }, [mutate])

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error: !!error,
    refresh,
  }
}
