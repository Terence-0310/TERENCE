// ============================================
// POST /api/watch-party/create
// ============================================
// Creates a new watch party room with host participant + initial state.
// Body: { title, movieId?, episodeId?, displayName, userId? }
// Returns: { room, participant, state }

export { createRoom as POST } from '@/src/be/modules/watch-party/watch-party.controller'
