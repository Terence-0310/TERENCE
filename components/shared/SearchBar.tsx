'use client'

import { Search, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useTransition } from 'react'

interface SearchBarProps {
  defaultValue?: string
}

export function SearchBar({ defaultValue = '' }: SearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setQuery(defaultValue), [defaultValue])

  function handleChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        if (value.trim()) {
          router.push(`/browse?q=${encodeURIComponent(value.trim())}`)
        } else {
          router.push('/browse')
        }
      })
    }, 400)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim()) {
      startTransition(() => {
        router.push(`/browse?q=${encodeURIComponent(query.trim())}`)
      })
    }
  }

  function handleClear() {
    setQuery('')
    startTransition(() => {
      router.push('/browse')
    })
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-5">
      <div className="relative group">
        {isPending ? (
          <Loader2 className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-primary animate-spin" />
        ) : (
          <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Tìm kiếm phim, đạo diễn, diễn viên..."
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-3.5 pl-11 pr-10 text-sm text-white placeholder:text-muted-foreground/60 outline-none transition-all focus:border-primary/40 focus:bg-white/[0.06] focus:shadow-lg focus:shadow-primary/5"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  )
}
