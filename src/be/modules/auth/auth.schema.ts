// ============================================
// Auth Module — Zod Schemas
// ============================================

import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ').transform(v => v.toLowerCase().trim()),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
})

export const signupSchema = z.object({
  email: z.string().email('Email không hợp lệ').transform(v => v.toLowerCase().trim()),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  name: z.string().min(1, 'Tên là bắt buộc').max(100).transform(v => v.trim()),
})

export type LoginBody = z.infer<typeof loginSchema>
export type SignupBody = z.infer<typeof signupSchema>
