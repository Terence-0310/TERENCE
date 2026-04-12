'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname()
  
  // Áp đặt vĩnh viễn Dark Mode cho tất cả các trang người dùng bên ngoài.
  // Chỉ cho phép Dashboard (Admin) sử dụng Theme được lưu trong Cookie/Context.
  const isDashboard = pathname?.startsWith('/dashboard')
  const forcedTheme = !isDashboard ? 'dark' : undefined

  return (
    <NextThemesProvider {...props} forcedTheme={forcedTheme}>
      {children}
    </NextThemesProvider>
  )
}
