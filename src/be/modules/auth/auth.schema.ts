// ============================================
// Auth Module — Zod Schemas
// ============================================

import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ').transform(v => v.toLowerCase().trim()),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
})

// Password minimum unified to 8 across signup + reset (was inconsistent: signup 6, FE 8).
export const signupSchema = z.object({
  email: z.string().email('Email không hợp lệ').transform(v => v.toLowerCase().trim()),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự').max(200),
  name: z.string().min(1, 'Tên là bắt buộc').max(100).transform(v => v.trim()),
  // Optional referral code — the inviter's user id (passed via /signup?ref=...)
  // We accept it loosely; the signup controller validates the id is real
  // before crediting any TCoin to avoid race-condition farming.
  referralCode: z.string().min(1).max(50).optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ').transform(v => v.toLowerCase().trim()),
}).strict()

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token là bắt buộc'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự').max(200),
}).strict()

export const resendVerifySchema = z.object({
  email: z.string().email('Email không hợp lệ').transform(v => v.toLowerCase().trim()),
}).strict()

export type LoginBody = z.infer<typeof loginSchema>
export type SignupBody = z.infer<typeof signupSchema>
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>
