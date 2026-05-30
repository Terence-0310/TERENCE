// ============================================
// Notifications — service
// ============================================
// Persists an in-app notification and pushes it live to the owning user's
// socket room (notification:new). Listing + read-all back the bell UI.

import { prisma } from '@/src/be/shared/db/prisma'
import { notifyUser, notifyAll, RT_EVENTS } from '@/src/be/shared/realtime/notify'

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

/**
 * System-wide broadcast (admin). Persists one notification per active user so
 * offline users see it later, then pushes a single live event to everyone
 * currently connected. Returns the recipient count.
 */
export async function broadcastNotification(input: {
  type?: string
  title: string
  message?: string | null
  link?: string | null
}): Promise<{ recipients: number }> {
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } })
  const type = input.type ?? 'system'
  const message = input.message ?? null
  const link = input.link ?? null

  const CHUNK = 1000
  for (let i = 0; i < users.length; i += CHUNK) {
    await prisma.notification.createMany({
      data: users.slice(i, i + CHUNK).map((u) => ({
        userId: u.id, type, title: input.title, message, link,
      })),
    })
  }

  // One live push to all connected clients (their bell prepends it instantly).
  const stamp = new Date()
  notifyAll(RT_EVENTS.NOTIFICATION_NEW, {
    id: `broadcast-${stamp.getTime()}`,
    type, title: input.title, message, link,
    isRead: false, createdAt: stamp.toISOString(),
  })

  return { recipients: users.length }
}
