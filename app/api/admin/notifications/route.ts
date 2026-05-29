// ============================================
// Admin Notifications API — Dynamic dashboard notifications
// ============================================
// Aggregates recent events from multiple sources:
//   - New user registrations
//   - TCoin topup orders (completed)
//   - Admin audit logs (important actions)
//   - Broken video sources
//
// GET /api/admin/notifications
//   Returns up to 20 most recent notification items.

import { NextResponse } from 'next/server'
import { prisma } from '@/src/be/shared/db/prisma'
import { requireAdmin } from '@/src/be/modules/admin/api-helpers'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'admin-notifications' })

interface Notification {
  id: string
  type: 'payment' | 'user' | 'system' | 'warning' | 'movie'
  title: string
  message: string
  createdAt: string
}

export async function GET() {
  try {
    const auth = await requireAdmin('dashboard.view')
    if (auth instanceof NextResponse) return auth

    const now = new Date()
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Fetch data in parallel from multiple sources
    const [
      recentUsers,
      recentOrders,
      recentLogs,
      brokenEpisodes,
      newMovies,
    ] = await Promise.all([
      // 1. New user registrations (last 7 days)
      prisma.user.findMany({
        where: { createdAt: { gte: since7d } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, createdAt: true },
      }),

      // 2. Recent TCoin topup orders
      prisma.topupOrder.findMany({
        where: { createdAt: { gte: since7d } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          code: true,
          coinAmount: true,
          bonusAmount: true,
          status: true,
          amountVnd: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      }),

      // 3. Recent admin audit logs
      prisma.adminLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      }),

      // 4. Broken video sources
      prisma.episode.count({
        where: { status: 'broken' },
      }),

      // 5. Recently added movies
      prisma.movie.findMany({
        where: { createdAt: { gte: since7d }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, title: true, createdAt: true },
      }),
    ])

    // Build notification items
    const notifications: Notification[] = []

    // User registrations — group if multiple
    if (recentUsers.length > 0) {
      const todayUsers = recentUsers.filter(u => u.createdAt >= since24h)
      if (todayUsers.length > 0) {
        notifications.push({
          id: `user-today-${now.toISOString()}`,
          type: 'user',
          title: 'Thành viên mới',
          message: todayUsers.length === 1
            ? `${todayUsers[0].name} vừa đăng ký tài khoản.`
            : `Hệ thống ghi nhận +${todayUsers.length} người đăng ký mới hôm nay.`,
          createdAt: todayUsers[0].createdAt.toISOString(),
        })
      } else {
        notifications.push({
          id: `user-week-${now.toISOString()}`,
          type: 'user',
          title: 'Thành viên mới tuần này',
          message: `+${recentUsers.length} người dùng đăng ký trong 7 ngày qua.`,
          createdAt: recentUsers[0].createdAt.toISOString(),
        })
      }
    }

    // TCoin topup orders
    for (const order of recentOrders.slice(0, 3)) {
      const userName = order.user?.name || 'Người dùng'
      const totalCoin = order.coinAmount + order.bonusAmount
      if (order.status === 'PAID') {
        notifications.push({
          id: `order-${order.id}`,
          type: 'payment',
          title: 'Nạp TCoin thành công',
          message: `${userName} nạp ${totalCoin.toLocaleString()} TCoin (${order.amountVnd.toLocaleString()}đ).`,
          createdAt: order.createdAt.toISOString(),
        })
      } else if (order.status === 'PENDING') {
        notifications.push({
          id: `order-pending-${order.id}`,
          type: 'payment',
          title: 'Đơn nạp chờ xử lý',
          message: `${userName} tạo đơn nạp ${totalCoin.toLocaleString()} TCoin — đang chờ thanh toán.`,
          createdAt: order.createdAt.toISOString(),
        })
      }
    }

    // Broken video sources warning
    if (brokenEpisodes > 0) {
      notifications.push({
        id: `broken-sources-${now.toISOString()}`,
        type: 'warning',
        title: 'Nguồn phim lỗi',
        message: `Phát hiện ${brokenEpisodes} tập phim có nguồn bị hỏng. Cần kiểm tra và cập nhật.`,
        createdAt: now.toISOString(),
      })
    }

    // Admin audit logs — important actions
    for (const log of recentLogs.slice(0, 3)) {
      const actorName = log.actor?.name || 'Admin'
      const actionLabel = formatAction(log.action, log.resource)
      if (actionLabel) {
        notifications.push({
          id: `log-${log.id}`,
          type: 'system',
          title: 'Nhật ký hệ thống',
          message: `${actorName} ${actionLabel}.`,
          createdAt: log.createdAt.toISOString(),
        })
      }
    }

    // New movies added
    for (const movie of newMovies) {
      notifications.push({
        id: `movie-${movie.id}`,
        type: 'movie',
        title: 'Phim mới',
        message: `"${movie.title}" vừa được thêm vào hệ thống.`,
        createdAt: movie.createdAt.toISOString(),
      })
    }

    // Sort all by createdAt desc, limit to 20
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const result = notifications.slice(0, 20)

    return NextResponse.json({
      success: true,
      data: result,
      unreadCount: result.length,
    })
  } catch (error) {
    log.error({ err: error instanceof Error ? error.message : error }, 'Notifications API error')
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// ── Helpers ──

function formatAction(action: string, resource: string): string | null {
  const a = action.toLowerCase()
  const r = resource.toLowerCase()

  if (a.includes('create') || a.includes('add')) return `đã thêm ${resourceLabel(r)} mới`
  if (a.includes('update') || a.includes('edit')) return `đã cập nhật ${resourceLabel(r)}`
  if (a.includes('delete') || a.includes('remove')) return `đã xóa ${resourceLabel(r)}`
  if (a.includes('block') || a.includes('ban')) return `đã khóa tài khoản người dùng`
  if (a.includes('sync')) return `đã đồng bộ dữ liệu ${resourceLabel(r)}`
  if (a.includes('publish')) return `đã xuất bản ${resourceLabel(r)}`
  return null
}

function resourceLabel(resource: string): string {
  const map: Record<string, string> = {
    movie: 'phim',
    user: 'người dùng',
    episode: 'tập phim',
    genre: 'thể loại',
    country: 'quốc gia',
    news: 'bài viết',
    review: 'đánh giá',
    tcoin: 'TCoin',
    setting: 'cài đặt',
  }
  return map[resource] || resource
}
