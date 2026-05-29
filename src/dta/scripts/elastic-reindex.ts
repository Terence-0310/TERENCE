#!/usr/bin/env npx tsx
// ============================================
// Elasticsearch Reindex / Sync / Clear CLI
// ============================================
// Usage:
//   npm run search:reindex              # full reindex (recreates index)
//   npm run search:reindex -- --batch=200
//   npm run search:sync -- --movieId=xxx
//   npm run search:clear                # delete the entire movies index
//
// Backwards-compatible aliases: `elastic:reindex`, `elastic:sync`.

import { reindexAll, indexMovie, clearIndex, disconnect } from '../../be/modules/search/movie-search-indexer'
import { closeClient, isAvailable, getMoviesIndex } from '../../be/modules/search/elastic-client'

async function main() {
  const args = process.argv.slice(2)
  const getArg = (name: string): string | undefined => {
    const arg = args.find((a) => a.startsWith(`--${name}=`))
    return arg?.split('=')[1]
  }
  const hasFlag = (name: string): boolean => args.includes(`--${name}`)

  console.log('╔══════════════════════════════════════════╗')
  console.log('║   TERENCE — Elasticsearch Indexer        ║')
  console.log('╚══════════════════════════════════════════╝')

  // Check availability
  const esOk = await isAvailable()
  if (!esOk) {
    console.error('❌ Elasticsearch is not available.')
    console.error('   Check ELASTICSEARCH_HOST env variable and ES server.')
    process.exit(1)
  }

  console.log('  ✓ Elasticsearch connected')
  console.log(`  Index: ${getMoviesIndex()}`)
  console.log('')

  const startTime = Date.now()
  const movieId = getArg('movieId')
  const clear = hasFlag('clear')

  try {
    if (clear) {
      // Clear mode — drop the entire index without rebuilding.
      console.log('  Mode: Clear index')
      console.log('')
      const result = await clearIndex()
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(result.deleted
        ? `  ✅ Index deleted in ${duration}s`
        : `  ℹ️  Index did not exist (no-op)`)
    } else if (movieId) {
      // Single movie index / re-index.
      console.log('  Mode: Single movie')
      console.log(`  Movie ID: ${movieId}`)
      console.log('')

      const ok = await indexMovie(movieId)
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)

      if (ok) {
        console.log(`  ✅ Indexed in ${duration}s`)
      } else {
        console.log(`  ❌ Failed to index movie (not found or inactive)`)
        process.exit(1)
      }
    } else {
      // Full reindex
      const batch = parseInt(getArg('batch') || '100', 10)
      console.log('  Mode: Full reindex')
      console.log(`  Batch size: ${batch}`)
      console.log('')

      const stats = await reindexAll(batch)
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)

      console.log('')
      console.log('═══════════════════════════════════════════')
      console.log(`  ✅ Reindex completed in ${duration}s`)
      console.log(`  Total:   ${stats.total}`)
      console.log(`  Indexed: ${stats.indexed}`)
      console.log(`  Errors:  ${stats.errors}`)
      console.log('═══════════════════════════════════════════')
    }
  } catch (error) {
    console.error('❌ Fatal error:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await closeClient()
    await disconnect()
  }
}

main()
