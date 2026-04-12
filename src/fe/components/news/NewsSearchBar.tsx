'use client'

// ============================================
// NewsSearchBar — Search input for /news page
// ============================================

import { Search, X, Loader2 } from 'lucide-react'
import { useRef, useEffect } from 'react'

interface NewsSearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  loading?: boolean
  placeholder?: string
}

export function NewsSearchBar({
  value,
  onChange,
  onClear,
  loading = false,
  placeholder = 'Tìm tin theo tên phim... (VD: Avatar, Dune)',
}: NewsSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus on Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && value) {
        onClear()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [value, onClear])

  return (
    <div className="relative group">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary/60 transition">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full rounded-xl bg-white/5 border border-white/[0.08]
          pl-10 pr-20 py-3 text-sm text-white placeholder:text-white/25
          outline-none transition-all duration-200
          focus:bg-white/[0.07] focus:border-primary/30 focus:ring-1 focus:ring-primary/20
          hover:border-white/[0.12]
        "
      />

      {/* Right side: clear button + shortcut hint */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {value ? (
          <button
            onClick={onClear}
            className="rounded-md p-1 text-white/30 hover:text-white/60 hover:bg-white/10 transition"
            aria-label="Xóa tìm kiếm"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 text-[10px] text-white/20 font-mono">
            Ctrl+K
          </kbd>
        )}
      </div>
    </div>
  )
}
