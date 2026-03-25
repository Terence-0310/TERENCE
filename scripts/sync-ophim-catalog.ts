#!/usr/bin/env npx tsx
// ============================================
// OPhim Catalog Sync Script
// ============================================
// Usage:
//   npm run sync:ophim:catalog
//   npm run sync:ophim:catalog -- --pages=3
//   npm run sync:ophim:catalog -- --start=1 --end=5
//   npm run sync:ophim:catalog -- --delay=1000

import { syncCatalog, disconnect } from '../src/server/ophim/ophim-sync-service'

async function main() {
  const args = process.argv.slice(2)
  const getArg = (name: string): string | undefined => {
    const arg = args.find(a => a.startsWith(`--${name}=`))
    return arg?.split('=')[1]
  }

  const startPage = parseInt(getArg('start') || '1', 10)
  const pages = parseInt(getArg('pages') || '1', 10)
  const endPage = parseInt(getArg('end') || String(startPage + pages - 1), 10)
  const delay = parseInt(getArg('delay') || '500', 10)

  console.log('╔══════════════════════════════════════════╗')
  console.log('║   TERENCE — OPhim Catalog Sync           ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`  Pages: ${startPage} → ${endPage}`)
  console.log(`  Delay: ${delay}ms between movies`)
  console.log('')

  const startTime = Date.now()

  try {
    const { jobId, results } = await syncCatalog(startPage, endPage, delay)

    const created = results.filter(r => r.action === 'create').length
    const updated = results.filter(r => r.action === 'update').length
    const failed = results.filter(r => r.action === 'fail').length

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('')
    console.log('═══════════════════════════════════════════')
    console.log(`  ✅ Sync completed in ${duration}s`)
    console.log(`  Job ID: ${jobId}`)
    console.log(`  Created: ${created}`)
    console.log(`  Updated: ${updated}`)
    console.log(`  Failed: ${failed}`)
    console.log(`  Total: ${results.length}`)
    console.log('═══════════════════════════════════════════')

    if (failed > 0) {
      console.log('')
      console.log('  ⚠ Failed movies:')
      for (const r of results.filter(r => r.action === 'fail')) {
        console.log(`    - ${r.movieSlug}: ${r.error}`)
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
