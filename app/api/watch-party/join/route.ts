// ============================================
// POST /api/watch-party/join
// ============================================
// Join an existing watch party room.
// Body: { roomCode, displayName, userId? }
// Returns: { room, participant, state, isRejoin }

export { joinRoom as POST } from '@/src/be/modules/watch-party/watch-party.controller'
