import React from 'react'
import { cn } from '@/lib/utils'

interface AppContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'full' | 'default' | 'narrow' | 'wide'
  noPadding?: boolean
}

/**
 * AppContainer
 * 
 * - Standardizes container widths across Web, Mobile Web, and prepares bounds
 *   for generic Cross-platform migrations (like React Native `SafeAreaView`).
 * - Encapsulates logic for max-width and paddings.
 */
export function AppContainer({
  children,
  variant = 'default',
  noPadding = false,
  className,
  ...props
}: AppContainerProps) {
  
  const variants = {
    full: 'w-full',
    default: 'max-w-7xl mx-auto',
    narrow: 'max-w-4xl mx-auto',
    wide: 'max-w-[1920px] mx-auto',   // Ultra-wide displays
  }

  return (
    <div
      className={cn(
        'w-full',
        variants[variant],
        !noPadding && 'px-4 sm:px-6 md:px-8',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
