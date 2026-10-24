import { describe, it, expect } from 'vitest'
import { MOVIES_INDEX_MAPPING, moviesIndexDefinition } from '@/src/be/modules/search/elastic-client'

// Elastic Cloud Serverless rejects index.number_of_shards / number_of_replicas.
describe('moviesIndexDefinition()', () => {
  it('keeps shard settings for self-hosted Elasticsearch', () => {
    expect(moviesIndexDefinition(false)).toBe(MOVIES_INDEX_MAPPING)
  })

  it('drops shard/replica settings but keeps analysis + mappings on serverless', () => {
    const def = moviesIndexDefinition(true)
    expect(def.settings).not.toHaveProperty('number_of_shards')
    expect(def.settings).not.toHaveProperty('number_of_replicas')
    expect(def.settings.analysis).toEqual(MOVIES_INDEX_MAPPING.settings.analysis)
    expect(def.mappings).toEqual(MOVIES_INDEX_MAPPING.mappings)
  })
})
