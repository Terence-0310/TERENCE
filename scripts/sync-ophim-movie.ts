#!/usr/bin/env npx tsx
// ============================================
// OPhim Single Movie Sync Script
// ============================================
// Usage:
//   npm run sync:ophim:movie -- --slug=cong-thuc-tinh-yeu

import { syncMovieBySlug, disconnect } from '../src/server/ophim/ophim-sync-service'

async function main() {
  const args = process.argv.slice(2)
  const slugArg = args.find(a => a.startsWith('--slug='))
  const slug = slugArg?.split('=')[1]

  if (!slug) {
    console.error('❌ Usage: npm run sync:ophim:movie -- --slug=<movie-slug>')
    console.error('   Example: npm run sync:ophim:movie -- --slug=cong-thuc-tinh-yeu')
    process.exit(1)
  }

  console.log('╔══════════════════════════════════════════╗')
  console.log('║   TERENCE — OPhim Single Movie Sync      ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`  Slug: ${slug}`)
  console.log('')

  const startTime = Date.now()

  try {
    const result = await syncMovieBySlug(slug)
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    if (result.action === 'fail') {
      console.error(`❌ Failed to sync "${slug}": ${result.error}`)
      process.exit(1)
    }

    console.log('')
    console.log('═══════════════════════════════════════════')
    console.log(`  ✅ ${result.action === 'create' ? 'Created' : 'Updated'} in ${duration}s`)
    console.log(`  Title: ${result.movieTitle}`)
    console.log(`  Movie ID: ${result.movieId}`)
    console.log(`  Episodes: ${result.episodeCount}`)
    console.log(`  Message: ${result.message}`)
    console.log('═══════════════════════════════════════════')

  } catch (error) {
    console.error('❌ Fatal error:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await disconnect()
  }
}

main()
