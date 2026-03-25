#!/usr/bin/env npx tsx
// ============================================
// Elasticsearch Reindex Script
// ============================================
// Usage:
//   npm run elastic:reindex
//   npm run elastic:reindex -- --batch=200
//   npm run elastic:sync -- --movieId=xxx

import { reindexAll, indexMovie, disconnect } from '../src/server/search/movie-search-indexer'
import { closeClient, isAvailable } from '../src/server/search/elastic-client'

async function main() {
  const args = process.argv.slice(2)
  const getArg = (name: string): string | undefined => {
    const arg = args.find(a => a.startsWith(`--${name}=`))
    return arg?.split('=')[1]
  }

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
  console.log('')

  const startTime = Date.now()
  const movieId = getArg('movieId')

  try {
    if (movieId) {
      // Single movie index
      console.log(`  Mode: Single movie`)
      console.log(`  Movie ID: ${movieId}`)
      console.log('')

      const ok = await indexMovie(movieId)
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)

      if (ok) {
        console.log(`  ✅ Indexed in ${duration}s`)
      } else {
        console.log(`  ❌ Failed to index movie`)
        process.exit(1)
      }

    } else {
      // Full reindex
      const batch = parseInt(getArg('batch') || '100', 10)
      console.log(`  Mode: Full reindex`)
      console.log(`  Batch size: ${batch}`)
      console.log('')

      const stats = await reindexAll(batch)
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)

      console.log('')
      console.log('═══════════════════════════════════════════')
      console.log(`  ✅ Reindex completed in ${duration}s`)
      console.log(`  Total: ${stats.total}`)
      console.log(`  Indexed: ${stats.indexed}`)
      console.log(`  Errors: ${stats.errors}`)
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
