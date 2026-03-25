#!/usr/bin/env npx tsx
// ============================================
// Full Pipeline Script (OPhim18 + TMDB)
// ============================================
// Usage:
//   npm run pipeline:movie -- --slug=cong-thuc-tinh-yeu
//   npm run pipeline:movie -- --slug=lat-mat-7
//
// Runs the merged pipeline:
//   1. Sync metadata + episodes from OPhim18
//   2. Enrich with TMDB (trailer, backdrop, cast, IDs)

import { runMoviePipeline, disconnect } from '../src/server/pipeline/movie-enrichment-pipeline'

async function main() {
  const args = process.argv.slice(2)
  const slugArg = args.find(a => a.startsWith('--slug='))
  const slug = slugArg?.split('=')[1]

  if (!slug) {
    console.error('❌ Usage: npm run pipeline:movie -- --slug=<movie-slug>')
    console.error('   Example: npm run pipeline:movie -- --slug=cong-thuc-tinh-yeu')
    process.exit(1)
  }

  console.log('╔══════════════════════════════════════════╗')
  console.log('║   TERENCE — Full Movie Pipeline          ║')
  console.log('║   OPhim18 Sync + TMDB Enrichment         ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`  Slug: ${slug}`)
  console.log('')

  const startTime = Date.now()

  try {
    const result = await runMoviePipeline(slug)
    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('')
    console.log('═══════════════════════════════════════════')
    console.log(`  Pipeline completed in ${duration}s`)
    console.log(`  Overall: ${result.overall.toUpperCase()}`)
    console.log('')
    console.log('  OPhim18:')
    console.log(`    Status: ${result.ophim18.status}`)
    if (result.ophim18.message) console.log(`    Message: ${result.ophim18.message}`)
    if (result.ophim18.episodeCount !== undefined) console.log(`    Episodes: ${result.ophim18.episodeCount}`)
    if (result.ophim18.error) console.log(`    Error: ${result.ophim18.error}`)

    console.log('')
    console.log('  TMDB:')
    console.log(`    Status: ${result.tmdb.status}`)
    if (result.tmdb.tmdbId) console.log(`    TMDB ID: ${result.tmdb.tmdbId}`)
    if (result.tmdb.imdbId) console.log(`    IMDb ID: ${result.tmdb.imdbId}`)
    if (result.tmdb.confidence) console.log(`    Confidence: ${result.tmdb.confidence}`)
    if (result.tmdb.fieldsUpdated) console.log(`    Fields: ${result.tmdb.fieldsUpdated.join(', ')}`)
    if (result.tmdb.message) console.log(`    Message: ${result.tmdb.message}`)
    if (result.tmdb.error) console.log(`    Error: ${result.tmdb.error}`)
    console.log('═══════════════════════════════════════════')

    if (result.overall === 'failed') {
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Fatal error:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await disconnect()
  }
}

main()
