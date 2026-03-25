#!/usr/bin/env npx tsx
// ============================================
// TMDB Enrichment Script
// ============================================
// Usage:
//   npm run enrich:tmdb                     # Batch enrich (default 20 movies)
//   npm run enrich:tmdb -- --limit=50       # Batch enrich 50 movies
//   npm run enrich:tmdb -- --movieId=xxx    # Enrich single movie by ID
//   npm run enrich:tmdb -- --delay=1000     # Custom delay between API calls

import { enrichMovie, enrichBatch, disconnect } from '../src/server/tmdb/tmdb-enrichment-service'

async function main() {
  const args = process.argv.slice(2)
  const getArg = (name: string): string | undefined => {
    const arg = args.find(a => a.startsWith(`--${name}=`))
    return arg?.split('=')[1]
  }

  const movieId = getArg('movieId')
  const limit = parseInt(getArg('limit') || '20', 10)
  const delay = parseInt(getArg('delay') || '800', 10)

  console.log('╔══════════════════════════════════════════╗')
  console.log('║   TERENCE — TMDB Enrichment              ║')
  console.log('╚══════════════════════════════════════════╝')

  const startTime = Date.now()

  try {
    if (movieId) {
      // Single movie enrichment
      console.log(`  Mode: Single movie`)
      console.log(`  Movie ID: ${movieId}`)
      console.log('')

      const result = await enrichMovie(movieId)
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)

      console.log('')
      console.log('═══════════════════════════════════════════')
      if (result.action === 'enrich') {
        console.log(`  ✅ Enriched in ${duration}s`)
        console.log(`  Title: ${result.movieTitle}`)
        console.log(`  TMDB ID: ${result.tmdbId}`)
        console.log(`  Confidence: ${result.confidence}`)
        console.log(`  Method: ${result.matchMethod}`)
        console.log(`  Fields: ${result.fieldsUpdated?.join(', ')}`)
      } else if (result.action === 'skip') {
        console.log(`  ⚠ Skipped: ${result.message}`)
      } else {
        console.log(`  ❌ Failed: ${result.error}`)
      }
      console.log('═══════════════════════════════════════════')

    } else {
      // Batch enrichment
      console.log(`  Mode: Batch`)
      console.log(`  Limit: ${limit} movies`)
      console.log(`  Delay: ${delay}ms`)
      console.log('')

      const { jobId, results } = await enrichBatch(limit, delay)
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)

      const enriched = results.filter(r => r.action === 'enrich').length
      const skipped = results.filter(r => r.action === 'skip').length
      const failed = results.filter(r => r.action === 'fail').length

      console.log('')
      console.log('═══════════════════════════════════════════')
      console.log(`  ✅ Completed in ${duration}s`)
      console.log(`  Job ID: ${jobId}`)
      console.log(`  Enriched: ${enriched}`)
      console.log(`  Skipped: ${skipped}`)
      console.log(`  Failed: ${failed}`)
      console.log(`  Total: ${results.length}`)
      console.log('═══════════════════════════════════════════')

      if (skipped > 0) {
        console.log('')
        console.log('  ⚠ Skipped movies:')
        for (const r of results.filter(r => r.action === 'skip').slice(0, 10)) {
          console.log(`    - ${r.movieTitle}: ${r.message}`)
        }
      }

      if (failed > 0) {
        console.log('')
        console.log('  ❌ Failed movies:')
        for (const r of results.filter(r => r.action === 'fail')) {
          console.log(`    - ${r.movieTitle}: ${r.error}`)
        }
      }

      // Show enriched summary
      if (enriched > 0) {
        console.log('')
        console.log('  🎬 Enriched movies:')
        for (const r of results.filter(r => r.action === 'enrich').slice(0, 10)) {
          console.log(`    ✓ ${r.movieTitle} → TMDB ${r.tmdbId} (${r.confidence} via ${r.matchMethod})`)
        }
      }
    }

  } catch (error) {
    console.error('❌ Fatal error:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await disconnect()
  }
}

main()
