import { PERMISSIONS } from '@/src/constants/permissions'
import { ROLES } from '@/src/constants/roles'
import { ActionScope } from '@/src/types/permission'

export type RolePermissionConfig = {
  permission: string
  scope: ActionScope
}

export const ROLE_PERMISSION_MATRIX: Record<string, RolePermissionConfig[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS).map(p => ({ permission: p, scope: 'all' as ActionScope })),

  [ROLES.ADMIN]: [
    { permission: PERMISSIONS.DASHBOARD_VIEW, scope: 'all' },
    { permission: PERMISSIONS.MOVIE_READ, scope: 'all' },
    { permission: PERMISSIONS.MOVIE_CREATE, scope: 'all' },
    { permission: PERMISSIONS.MOVIE_UPDATE, scope: 'all' },
    { permission: PERMISSIONS.MOVIE_PUBLISH, scope: 'all' },
    { permission: PERMISSIONS.EPISODE_READ, scope: 'all' },
    { permission: PERMISSIONS.EPISODE_CREATE, scope: 'all' },
    { permission: PERMISSIONS.EPISODE_UPDATE, scope: 'all' },
    { permission: PERMISSIONS.REVIEW_READ, scope: 'all' },
    { permission: PERMISSIONS.REVIEW_MODERATE, scope: 'all' },
    { permission: PERMISSIONS.USER_READ, scope: 'all' },
    { permission: PERMISSIONS.USER_UPDATE, scope: 'all' },
    { permission: PERMISSIONS.USER_BLOCK, scope: 'all' },
    { permission: PERMISSIONS.USER_ROLE_UPDATE, scope: 'all' },
    { permission: PERMISSIONS.PAYMENT_READ, scope: 'all' },
    { permission: PERMISSIONS.PAYMENT_UPDATE, scope: 'all' },
    { permission: PERMISSIONS.ADMINLOG_READ, scope: 'all' },
    { permission: PERMISSIONS.SETTINGS_READ, scope: 'all' },
    { permission: PERMISSIONS.NEWS_MANAGE, scope: 'all' },
    { permission: PERMISSIONS.NEWS_DELETE, scope: 'all' },
    { permission: PERMISSIONS.METADATA_MANAGE, scope: 'all' },
    { permission: PERMISSIONS.METADATA_DELETE, scope: 'all' },
    { permission: PERMISSIONS.UPLOAD_MANAGE, scope: 'all' },
    { permission: PERMISSIONS.ADS_MANAGE, scope: 'all' },
    { permission: PERMISSIONS.NOTIFICATION_BROADCAST, scope: 'all' },
    { permission: PERMISSIONS.SYSTEM_MANAGE, scope: 'all' },
    // KHÔNG có settings.update
    // KHÔNG có movie.delete / user.delete
  ],

  [ROLES.STAFF]: [
    { permission: PERMISSIONS.DASHBOARD_VIEW, scope: 'all' },
    { permission: PERMISSIONS.MOVIE_READ, scope: 'all' },
    { permission: PERMISSIONS.MOVIE_CREATE, scope: 'all' },
    { permission: PERMISSIONS.MOVIE_UPDATE, scope: 'all' },
    { permission: PERMISSIONS.EPISODE_READ, scope: 'all' },
    { permission: PERMISSIONS.EPISODE_CREATE, scope: 'all' },
    { permission: PERMISSIONS.EPISODE_UPDATE, scope: 'all' },
    { permission: PERMISSIONS.REVIEW_READ, scope: 'all' },
    { permission: PERMISSIONS.METADATA_MANAGE, scope: 'all' },
    { permission: PERMISSIONS.UPLOAD_MANAGE, scope: 'all' },
    // KHÔNG có movie.delete
    // KHÔNG quản lý user
  ],

  [ROLES.EDITOR]: [
    { permission: PERMISSIONS.DASHBOARD_VIEW, scope: 'all' },
    { permission: PERMISSIONS.MOVIE_READ, scope: 'all' },
    { permission: PERMISSIONS.MOVIE_UPDATE, scope: 'all' },
    { permission: PERMISSIONS.EPISODE_READ, scope: 'all' },
    { permission: PERMISSIONS.EPISODE_UPDATE, scope: 'all' },
    { permission: PERMISSIONS.REVIEW_READ, scope: 'all' },
    { permission: PERMISSIONS.NEWS_MANAGE, scope: 'all' },
    { permission: PERMISSIONS.UPLOAD_MANAGE, scope: 'all' },
    // KHÔNG create / delete / publish / users
  ],

  [ROLES.USER]: [
    { permission: PERMISSIONS.USER_PROFILE_READ, scope: 'own' },
    { permission: PERMISSIONS.USER_PROFILE_UPDATE, scope: 'own' },
    { permission: PERMISSIONS.REVIEW_CREATE, scope: 'own' },
    { permission: PERMISSIONS.REVIEW_READ, scope: 'own' }, // or all if public
    { permission: PERMISSIONS.WATCH_HISTORY_READ, scope: 'own' },
    { permission: PERMISSIONS.WATCH_HISTORY_UPDATE, scope: 'own' },
  ],
}
