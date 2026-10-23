// GET  /api/v1/shorts/[id]/comments — list (newest first)
// POST /api/v1/shorts/[id]/comments — add { content } (login required)
export { listComments as GET, addComment as POST } from '@/src/be/modules/shorts/shorts.controller'
