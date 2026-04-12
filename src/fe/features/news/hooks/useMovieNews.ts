'use client'

// ============================================
// useMovieNews — Hook for news articles (optimized)
// ============================================
// SWR-based with error recovery, stable refresh,
// and smart URL construction for related news context.

import useSWR from 'swr'
import { useCallback } from 'react'
import type { NewsArticle, ApiListResponse } from '@/src/be/modules/news/legacy-types'

const fetcher = async (url: string): Promise<ApiListResponse<NewsArticle>> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`News fetch failed: ${res.status}`)
  return res.json()
}

interface UseMovieNewsOptions {
  /** Type of news to fetch */
  type: 'top' | 'related'
  /** Query for related news (movie title) */
  query?: string
  /** Original title for related news (better English search) */
  originalTitle?: string
  /** Release year for context */
  year?: number
  /** Country code for top news */
  country?: string
  /** Language code */
  lang?: string
  /** Max items */
  limit?: number
  /** Whether to fetch (default: true) */
  enabled?: boolean
}

interface UseMovieNewsReturn {
  items: NewsArticle[]
  loading: boolean
  error: boolean
  refresh: () => void
}

export function useMovieNews(options: UseMovieNewsOptions): UseMovieNewsReturn {
  const {
    type, query, originalTitle, year,
    country, lang, limit, enabled = true,
  } = options

  // Build URL
  let url: string | null = null
  if (enabled) {
    if (type === 'top') {
      const params = new URLSearchParams()
      if (country) params.set('country', country)
      if (lang) params.set('lang', lang)
      if (limit) params.set('limit', String(limit))
      url = `/api/news${params.toString() ? `?${params}` : ''}`
    } else if (type === 'related' && query?.trim()) {
      const params = new URLSearchParams({ q: query.trim() })
      if (limit) params.set('limit', String(limit))
      // Pass context for better relevance scoring
      if (originalTitle) params.set('title', originalTitle)
      if (year) params.set('year', String(year))
      url = `/api/news/related?${params}`
    }
  }

  const { data, error, isLoading, mutate } = useSWR<ApiListResponse<NewsArticle>>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300_000, // 5 minutes
      errorRetryCount: 2,
      errorRetryInterval: 5000,
      // Keep stale data on error
      keepPreviousData: true,
    },
  )

  // Stable refresh callback
  const refresh = useCallback(() => { mutate() }, [mutate])

  return {
    items: data?.items ?? [],
    loading: isLoading,
    error: !!error,
    refresh,
  }
}
