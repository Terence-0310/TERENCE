// GET  /api/admin/shorts — list + stats (short.manage)
// POST /api/admin/shorts — add from YouTube link / MP4 / HLS URL
export { adminList as GET, adminCreate as POST } from '@/src/be/modules/shorts/shorts.controller'
