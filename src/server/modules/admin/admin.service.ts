// ============================================
// Admin Module — Service
// ============================================
// TODO [MIGRATION] Consolidate admin logic from API routes here.

export { logAdminAction, getClientIp } from '@/lib/admin/audit'
export {
  movieCreateSchema,
  movieUpdateSchema,
  episodeCreateSchema,
  episodeUpdateSchema,
  shortCreateSchema,
  shortUpdateSchema,
  userCreateSchema,
  userUpdateSchema,
  generateSlug,
} from '@/lib/admin/validators'
