// ============================================
// Admin Module — Service
// ============================================
// TODO [MIGRATION] Consolidate admin logic from API routes here.

export { logAdminAction, getClientIp } from '@/src/be/modules/admin/audit'
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
} from '@/src/be/modules/admin/validators'
