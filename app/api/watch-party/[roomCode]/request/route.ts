// ============================================
// POST /api/watch-party/[roomCode]/request
// ============================================
// Request to join a locked room (creates a PENDING participant).

export { requestJoin as POST } from '@/src/be/modules/watch-party/watch-party.controller'
