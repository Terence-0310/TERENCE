// ============================================
// Analytics Module — Barrel Export
// ============================================
// Real-time page-view / movie-view tracking. Writes to prisma.pageView and
// broadcasts live view-count updates to admins, watch rooms, and Top View.

export { AnalyticsService } from './analytics.service'
export type { TrackData } from './analytics.service'
export { AnalyticsController } from './analytics.controller'
