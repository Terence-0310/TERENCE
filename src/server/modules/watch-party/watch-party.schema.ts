// ============================================
// Watch Party Module — Schema
// ============================================
// Re-exports from existing validated schemas.

export {
  livekitTokenSchema,
  createRoomSchema,
  joinRoomSchema,
  leaveRoomSchema,
  syncStateSchema,
  sendMessageSchema,
  type CreateRoomBody,
  type JoinRoomBody,
  type LeaveRoomBody,
  type SyncStateBody,
  type SendMessageBody,
} from '@/server/watch-party/schemas'
