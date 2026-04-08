// ============================================
// Watch Party Module — Repository
// ============================================
// Re-exports from existing repository.
// TODO [MIGRATION] Move server/watch-party/repository.ts content here.

export {
  createRoomRecord,
  findRoomByCode,
  findActiveRooms,
  updateRoomStatus,
  updateRoomSyncTimestamp,
  createParticipant,
  findParticipant,
  markParticipantOffline,
  markParticipantOnline,
  getOnlineParticipants,
  countOnlineParticipants,
  createState,
  getState,
  updateState,
  createMessage,
  getMessages,
  getMessagesSince,
  countMessages,
  findParticipantById,
  transferHost,
  updateRoomHost,
  getNextEligibleHost,
} from '@/server/watch-party/repository'
