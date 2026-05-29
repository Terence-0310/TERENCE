'use client'

// ============================================
// UserAvatar — avatar with optional TCoin perks
// ============================================
// Shared across profile, header, comments and watch-party so a user's
// redeemed perks (neon avatar frame, exclusive badge) render consistently.
// `frameActive` / `badgeActive` are usually derived from the denormalised
// User.avatarFrameUntil / User.exclusiveBadgeUntil columns via isPerkActive().

import { Avatar, AvatarImage, AvatarFallback } from '@/src/fe/components/ui/avatar'
import { cn } from '@/lib/utils'
import { BadgeCheck } from 'lucide-react'

/** True when a denormalised perk-expiry date is set and still in the future. */
export function isPerkActive(until?: string | Date | null): boolean {
  if (!until) return false
  const t = until instanceof Date ? until.getTime() : new Date(until).getTime()
  return Number.isFinite(t) && t > Date.now()
}

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  /** Render the spinning neon ring (avatar-frame perk). */
  frameActive?: boolean
  /** Render the verified-style badge (exclusive-badge perk). */
  badgeActive?: boolean
  /** Tailwind size classes for the avatar, e.g. "h-9 w-9". */
  className?: string
  /** Extra classes for the wrapper (positioning). */
  wrapperClassName?: string
}

export function UserAvatar({
  src,
  name,
  frameActive = false,
  badgeActive = false,
  className,
  wrapperClassName,
}: UserAvatarProps) {
  const initial = (name?.trim()?.[0] || 'U').toUpperCase()

  return (
    <div className={cn('relative inline-flex shrink-0', wrapperClassName)}>
      {frameActive && (
        <span
          aria-hidden
          className="absolute -inset-1 rounded-full pointer-events-none animate-spin-slow"
          style={{
            background:
              'conic-gradient(from 0deg, #2dd4bf, #38bdf8, #a78bfa, #f472b6, #2dd4bf)',
            filter: 'blur(2px)',
          }}
        />
      )}
      <Avatar
        className={cn(
          'relative bg-background',
          frameActive
            ? 'border-2 border-transparent shadow-[0_0_14px_rgba(45,212,191,0.5)]'
            : '',
          className,
        )}
      >
        {src ? <AvatarImage src={src} alt={name || 'avatar'} /> : null}
        <AvatarFallback className="bg-gradient-to-br from-primary/25 to-primary/5 text-primary font-bold">
          {initial}
        </AvatarFallback>
      </Avatar>
      {badgeActive && (
        <span
          title="Huy hiệu đặc biệt"
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background"
        >
          <BadgeCheck className="h-3.5 w-3.5 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]" />
        </span>
      )}
    </div>
  )
}
