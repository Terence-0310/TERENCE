// ============================================
// POST /api/watch-party/leave
// ============================================
// Leave a watch party room. Handles host transfer.
// Body: { roomCode, participantId }
// Returns: { ok, ended, newHost? }

export { leaveRoom as POST } from '@/src/be/modules/watch-party/watch-party.controller'
