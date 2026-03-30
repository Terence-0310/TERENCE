'use client'

// ============================================
// useNewsPage — Hook for /news page state
// ============================================
// Manages tabs, search, and data fetching
// for the complete news page.

import useSWR from 'swr'
import { useState, useCallback, useRef, useEffect } from 'react'
import type { NewsArticle, UpcomingMovieItem, ApiListResponse } from '@/lib/news/types'

// ── Types ──

export type NewsTab = 'breaking' | 'upcoming' | 'trailer' | 'review'

interface UseNewsPageReturn {
  // Tab state
  activeTab: NewsTab
  setActiveTab: (tab: NewsTab) => void
  // Search
  searchQuery: string
  setSearchQuery: (q: string) => void
  isSearching: boolean
  searchResults: NewsArticle[]
  searchLoading: boolean
  clearSearch: () => void
  // Tab data
  breakingNews: NewsArticle[]
  breakingLoading: boolean
  trailerNews: NewsArticle[]
  trailerLoading: boolean
  reviewNews: NewsArticle[]
  reviewLoading: boolean
  upcomingMovies: UpcomingMovieItem[]
  upcomingLoading: boolean
  // Actions
  refresh: () => void
}

// ── Fetchers ──

const newsFetcher = async (url: string): Promise<ApiListResponse<NewsArticle>> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return res.json()
}

const upcomingFetcher = async (url: string): Promise<ApiListResponse<UpcomingMovieItem>> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return res.json()
}

// ── SWR config ──

const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  errorRetryCount: 2,
  errorRetryInterval: 5000,
  keepPreviousData: true,
}

// ── Hook ──

export function useNewsPage(): UseNewsPageReturn {
  const [activeTab, setActiveTab] = useState<NewsTab>('breaking')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim())
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  const isSearching = debouncedQuery.length > 0

  // ── Breaking news (always fetched) ──
  const { data: breakingData, isLoading: breakingLoading, mutate: mutateBreaking } =
    useSWR<ApiListResponse<NewsArticle>>(
      '/api/news?limit=10',
      newsFetcher,
      { ...swrConfig, dedupingInterval: 300_000 },
    )

  // ── Upcoming movies (always fetched) ──
  const { data: upcomingData, isLoading: upcomingLoading } =
    useSWR<ApiListResponse<UpcomingMovieItem>>(
      '/api/movies/upcoming?region=VN',
      upcomingFetcher,
      { ...swrConfig, dedupingInterval: 600_000 },
    )

  // ── Trailer news (fetched only when tab is active) ──
  const { data: trailerData, isLoading: trailerLoading } =
    useSWR<ApiListResponse<NewsArticle>>(
      activeTab === 'trailer' ? '/api/news/category?type=trailer' : null,
      newsFetcher,
      { ...swrConfig, dedupingInterval: 300_000 },
    )

  // ── Review news (fetched only when tab is active) ──
  const { data: reviewData, isLoading: reviewLoading } =
    useSWR<ApiListResponse<NewsArticle>>(
      activeTab === 'review' ? '/api/news/category?type=review' : null,
      newsFetcher,
      { ...swrConfig, dedupingInterval: 300_000 },
    )

  // ── Search results (only when searching) ──
  const searchUrl = isSearching
    ? `/api/news/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`
    : null
  const { data: searchData, isLoading: searchLoading } =
    useSWR<ApiListResponse<NewsArticle>>(
      searchUrl,
      newsFetcher,
      { ...swrConfig, dedupingInterval: 120_000 },
    )

  // ── Callbacks ──

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setDebouncedQuery('')
  }, [])

  const refresh = useCallback(() => {
    mutateBreaking()
  }, [mutateBreaking])

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults: searchData?.items ?? [],
    searchLoading,
    clearSearch,
    breakingNews: breakingData?.items ?? [],
    breakingLoading,
    trailerNews: trailerData?.items ?? [],
    trailerLoading,
    reviewNews: reviewData?.items ?? [],
    reviewLoading,
    upcomingMovies: upcomingData?.items ?? [],
    upcomingLoading,
    refresh,
  }
}
