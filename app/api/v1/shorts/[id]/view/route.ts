// POST /api/v1/shorts/[id]/view — count a view (once per IP / 10 min)
export { recordView as POST } from '@/src/be/modules/shorts/shorts.controller'
