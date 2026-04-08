// ============================================
// Watch Party Module — Service
// ============================================
// Re-exports from existing service.
// TODO [MIGRATION] Move server/watch-party/service.ts content here.

export {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  sendMessage,
  getMessages,
  getNewMessages,
  syncState,
  listActiveRooms,
  WatchPartyError,
  type CreateRoomInput,
  type JoinRoomInput,
  type LeaveRoomInput,
  type SendMessageInput,
  type SyncStateInput,
} from '@/server/watch-party/service'
