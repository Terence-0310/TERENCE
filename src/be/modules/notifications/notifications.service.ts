// ============================================
// Notifications — service
// ============================================
// Persists an in-app notification and pushes it live to the owning user's
// socket room (notification:new). Listing + read-all back the bell UI.

import { prisma } from '@/src/be/shared/db/prisma'
import { notifyUser, RT_EVENTS } from '@/src/be/shared/realtime/notify'

export interface CreateNotificationInput {
  userId: string
  type: string
  title: string
  message?: string | null
  link?: string | null
}

export interface NotificationDTO {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  isRead: boolean
  createdAt: string
}

function toDTO(n: {
  id: string; type: string; title: string; message: string | null
  link: string | null; isRead: boolean; createdAt: Date
}): NotificationDTO {
  return {
    id: n.id, type: n.type, title: n.title, message: n.message,
    link: n.link, isRead: n.isRead, createdAt: n.createdAt.toISOString(),
  }
}

/** Create + persist a notification, then push it live to the user. */
export async function createNotification(input: CreateNotificationInput): Promise<NotificationDTO> {
  const n = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      link: input.link ?? null,
    },
  })
  const dto = toDTO(n)
  notifyUser(input.userId, RT_EVENTS.NOTIFICATION_NEW, dto)
  return dto
}

export async function listNotifications(userId: string, limit = 30): Promise<{ items: NotificationDTO[]; unreadCount: number }> {
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ])
  return { items: rows.map(toDTO), unreadCount }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  })
}
