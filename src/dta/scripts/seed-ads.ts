#!/usr/bin/env npx tsx
// ============================================
// Seed sample advertisements for demo
// ============================================
// Idempotent — re-running won't duplicate. We key by `title` since
// the schema has no unique-by-content constraint.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SAMPLES = [
  {
    title: '[Demo] Trailer Phim Bom Tấn 15s',
    type: 'VIDEO',
    placement: 'PRE_ROLL',
    duration: 15,
    skipAfterSeconds: 5,
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    targetUrl: 'https://terence.com.vn/movies',
    priority: 90,
    isActive: true,
  },
  {
    title: '[Demo] Quảng cáo Game Mobile 30s',
    type: 'VIDEO',
    placement: 'PRE_ROLL',
    duration: 30,
    skipAfterSeconds: 10,
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    targetUrl: 'https://play.google.com',
    priority: 60,
    isActive: true,
  },
  {
    title: '[Demo] Quảng cáo Thương Hiệu 60s',
    type: 'VIDEO',
    placement: 'PRE_ROLL',
    duration: 60,
    skipAfterSeconds: 15,
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    targetUrl: 'https://terence.com.vn',
    priority: 30,
    isActive: true,
  },
  {
    title: '[Demo] Banner Trang Chủ - Khuyến Mãi TCoin',
    type: 'BANNER',
    placement: 'HOME_BANNER',
    mediaUrl: 'https://placehold.co/1920x320/0ea5e9/ffffff/png?text=NAP+TCOIN+%2B50%25+BONUS',
    targetUrl: '/tcoin',
    priority: 100,
    isActive: true,
  },
  {
    title: '[Demo] Banner Chi Tiết Phim',
    type: 'BANNER',
    placement: 'DETAIL_BANNER',
    mediaUrl: 'https://placehold.co/1280x200/8b5cf6/ffffff/png?text=XEM+PHIM+CHAT+LUONG+CAO',
    targetUrl: '/browse?category=top-rated',
    priority: 50,
    isActive: true,
  },
] as const

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   TERENCE — Seed Sample Ads              ║')
  console.log('╚══════════════════════════════════════════╝')

  let created = 0
  let kept = 0
  for (const ad of SAMPLES) {
    const existing = await prisma.advertisement.findFirst({ where: { title: ad.title } })
    if (existing) {
      // Refresh fields so re-running pulls latest demo asset URLs
      await prisma.advertisement.update({
        where: { id: existing.id },
        data: {
          type: ad.type,
          placement: ad.placement,
          duration: 'duration' in ad ? ad.duration : null,
          skipAfterSeconds: 'skipAfterSeconds' in ad ? ad.skipAfterSeconds : null,
          mediaUrl: ad.mediaUrl,
          targetUrl: ad.targetUrl,
          priority: ad.priority,
          isActive: ad.isActive,
        },
      })
      kept++
      console.log(`  · kept (refreshed) — ${ad.title}`)
    } else {
      await prisma.advertisement.create({
        data: {
          title: ad.title,
          type: ad.type,
          placement: ad.placement,
          duration: 'duration' in ad ? ad.duration : null,
          skipAfterSeconds: 'skipAfterSeconds' in ad ? ad.skipAfterSeconds : null,
          mediaUrl: ad.mediaUrl,
          targetUrl: ad.targetUrl,
          priority: ad.priority,
          isActive: ad.isActive,
        },
      })
      created++
      console.log(`  + created — ${ad.title}`)
    }
  }

  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log(`  Created: ${created}`)
  console.log(`  Kept:    ${kept}`)
  console.log('═══════════════════════════════════════════')

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
