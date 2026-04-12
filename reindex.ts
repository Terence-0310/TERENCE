// Run this script to reindex all movies to Elasticsearch
import { reindexAll, disconnect } from './src/be/modules/search/movie-search-indexer'

async function run() {
  console.log('Starting full reindex...')
  try {
    const stats = await reindexAll(100)
    console.log(`Reindex complete: \n- Total found: ${stats.total}\n- Indexed: ${stats.indexed}\n- Errors: ${stats.errors}`)
  } catch (err) {
    console.error('Reindex failed:', err)
  } finally {
    await disconnect()
    process.exit(0)
  }
}

run()
