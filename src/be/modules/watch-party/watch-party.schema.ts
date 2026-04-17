// ============================================
// Watch Party — Zod Validation Schemas
// ============================================
// Shared validation for all watch party API routes.

import { z } from 'zod'

// ── LiveKit Token ──

export const livekitTokenSchema = z.object({
  room: z
    .string()
    .min(1, 'room is required')
    .max(100)
    .transform((v) => v.trim()),
  username: z
    .string()
    .min(1, 'username is required')
    .max(50)
    .transform((v) => v.trim()),
})

// ── Create Room ──

export const createRoomSchema = z.object({
  title: z
    .string()
    .min(1, 'title is required')
    .max(200)
    .transform((v) => v.trim()),
  movieId: z.string().nullable().optional(),
  episodeId: z.string().nullable().optional(),
  displayName: z
    .string()
    .min(1, 'displayName is required')
    .max(50)
    .transform((v) => v.trim()),
  userId: z.string().nullable().optional(),
  maxMembers: z.number().int().min(2).max(36).optional().default(10),
})

export type CreateRoomBody = z.infer<typeof createRoomSchema>

// ── Join Room ──

export const joinRoomSchema = z.object({
  roomCode: z
    .string()
    .min(1, 'roomCode is required')
    .max(20)
    .transform((v) => v.trim().toUpperCase()),
  displayName: z
    .string()
    .min(1, 'displayName is required')
    .max(50)
    .transform((v) => v.trim()),
  userId: z.string().nullable().optional(),
  isApproved: z.boolean().optional(),
})

export type JoinRoomBody = z.infer<typeof joinRoomSchema>

// ── Leave Room ──

export const leaveRoomSchema = z.object({
  roomCode: z
    .string()
    .min(1, 'roomCode is required')
    .max(20)
    .transform((v) => v.trim().toUpperCase()),
  participantId: z.string().min(1, 'participantId is required'),
})

export type LeaveRoomBody = z.infer<typeof leaveRoomSchema>

// ── Sync State ──

export const syncStateSchema = z.object({
  playbackTime: z.number().min(0).optional(),
  isPlaying: z.boolean().optional(),
  playbackRate: z.number().min(0.25).max(4).optional(),
  eventType: z.enum(['PLAY', 'PAUSE', 'SEEK', 'CHANGE_EPISODE']).optional(),
  eventBy: z.string().optional(),
  episodeId: z.string().nullable().optional(),
})

export type SyncStateBody = z.infer<typeof syncStateSchema>

// ── Send Message ──

export const sendMessageSchema = z.object({
  participantId: z.string().min(1, 'participantId is required'),
  senderName: z
    .string()
    .min(1, 'senderName is required')
    .max(50)
    .transform((v) => v.trim()),
  content: z
    .string()
    .min(1, 'content is required')
    .max(1000)
    .transform((v) => v.trim()),
})

export type SendMessageBody = z.infer<typeof sendMessageSchema>
