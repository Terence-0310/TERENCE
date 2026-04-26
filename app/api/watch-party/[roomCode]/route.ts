// ============================================
// GET /api/watch-party/[roomCode]
// PATCH /api/watch-party/[roomCode]
// ============================================
// Returns room detail with participants, state, and recent messages.

export { 
  getRoom as GET,
  updateRoom as PATCH 
} from '@/src/be/modules/watch-party/watch-party.controller'
