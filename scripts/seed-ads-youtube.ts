// Replace prod's demo video ad mediaUrls with YouTube embeds so the
// AdGate iframe path actually renders something visible.
// Picks long-published, globally-available music videos so the demo
// won't break tomorrow if a smaller channel takes the video down.
import { prisma } from '../src/be/shared/db/prisma'

// Native MP4 URLs. We DELIBERATELY avoid YouTube iframes because Brave
// shields / strict-cookie browsers regularly black-screen 3rd-party embeds.
// Native <video> renders an MP4 in every browser with zero CSP friction.
//
// `mov_bbb.mp4` is the 788 KB Big Buck Bunny clip w3schools has hosted for
// years — globally reachable, no CORS, no auth.
const SAMPLE_MP4 = 'https://www.w3schools.com/html/mov_bbb.mp4'

const ADS = [
  {
    title: '[Demo] Trailer Phim Bom Tấn 15s',
    mediaUrl: SAMPLE_MP4,
    targetUrl: 'https://www.terence.com.vn',
    duration: 15,
    skipAfterSeconds: 5,
  },
  {
    title: '[Demo] Quảng cáo Game Mobile 30s',
    mediaUrl: SAMPLE_MP4,
    targetUrl: 'https://www.terence.com.vn',
    duration: 30,
    skipAfterSeconds: 10,
  },
  {
    title: '[Demo] Quảng cáo Thương Hiệu 60s',
    mediaUrl: SAMPLE_MP4,
    targetUrl: 'https://www.terence.com.vn',
    duration: 60,
    skipAfterSeconds: 15,
  },
]

;(async () => {
  let updated = 0
  for (const target of ADS) {
    const ad = await prisma.advertisement.findFirst({ where: { title: target.title } })
    if (!ad) {
      console.log(`SKIP (not found): ${target.title}`)
      continue
    }
    await prisma.advertisement.update({
      where: { id: ad.id },
      data: {
        mediaUrl: target.mediaUrl,
        targetUrl: target.targetUrl,
        duration: target.duration,
        skipAfterSeconds: target.skipAfterSeconds,
        isActive: true,
      },
    })
    console.log(`  + ${target.title} → ${target.mediaUrl}`)
    updated++
  }
  console.log(`\nUpdated ${updated} ad(s).`)
  await prisma.$disconnect()
})().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
