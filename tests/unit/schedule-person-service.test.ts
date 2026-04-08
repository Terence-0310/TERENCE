// ============================================
// Unit Tests — Schedule & Person Services
// ============================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockScheduleRepo, mockPersonRepo, mockCache } = vi.hoisted(() => ({
  mockScheduleRepo: {
    findByDate: vi.fn(),
    findRecent: vi.fn(),
    findAvailableDates: vi.fn(),
  },
  mockPersonRepo: {
    findPopular: vi.fn(),
    findBySlug: vi.fn(),
    search: vi.fn(),
  },
  mockCache: {
    getOrSet: vi.fn((_key: string, fetcher: () => unknown) => fetcher()),
    invalidate: vi.fn(),
    invalidateTag: vi.fn(),
  },
}))

vi.mock('@/lib/repositories/schedule.repository', () => ({ scheduleRepository: mockScheduleRepo }))
vi.mock('@/lib/repositories/person.repository', () => ({ personRepository: mockPersonRepo }))
vi.mock('@/lib/cache', () => ({
  cache: mockCache,
  CacheKeys: {
    schedule: (d: string) => `schedule:${d}`,
    popularActors: (p: number) => `people:popular:${p}`,
    personDetail: (s: string) => `person:detail:${s}`,
  },
  CacheTags: { SCHEDULE: 'schedule', PERSON: 'person' },
}))

import { scheduleService } from '@/lib/services/schedule.service'
import { personService } from '@/lib/services/person.service'

describe('scheduleService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCache.getOrSet.mockImplementation((_key: string, fetcher: () => unknown) => fetcher())
  })

  it('should return episodes for a date', async () => {
    mockScheduleRepo.findByDate.mockResolvedValue([{ id: 'ep-1' }])
    const result = await scheduleService.getByDate('2026-01-15')
    expect(result).toHaveLength(1)
    expect(mockScheduleRepo.findByDate).toHaveBeenCalledWith('2026-01-15')
  })

  it('should return empty for no updates', async () => {
    mockScheduleRepo.findByDate.mockResolvedValue([])
    expect(await scheduleService.getByDate('2020-01-01')).toEqual([])
  })

  it('should return recent episodes', async () => {
    mockScheduleRepo.findRecent.mockResolvedValue([])
    const result = await scheduleService.getRecent(7)
    expect(result).toEqual([])
    expect(mockScheduleRepo.findRecent).toHaveBeenCalledWith(7)
  })

  it('should return available dates', async () => {
    mockScheduleRepo.findAvailableDates.mockResolvedValue(['2026-01-15', '2026-01-14'])
    const result = await scheduleService.getAvailableDates()
    expect(result).toHaveLength(2)
  })
})

describe('personService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCache.getOrSet.mockImplementation((_key: string, fetcher: () => unknown) => fetcher())
  })

  it('should return paginated popular people', async () => {
    mockPersonRepo.findPopular.mockResolvedValue({
      data: [{ id: 'p1', name: 'Tom Hanks', movieCount: 50 }],
      total: 1, page: 1, limit: 24,
    })
    const result = await personService.getPopular(1, 24)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].name).toBe('Tom Hanks')
  })

  it('should return person by slug', async () => {
    mockPersonRepo.findBySlug.mockResolvedValue({ id: 'p1', name: 'Tom Hanks', slug: 'tom-hanks', movies: [] })
    const result = await personService.getBySlug('tom-hanks')
    expect(result?.name).toBe('Tom Hanks')
  })

  it('should return null for non-existent person', async () => {
    mockPersonRepo.findBySlug.mockResolvedValue(null)
    expect(await personService.getBySlug('nobody')).toBeNull()
  })

  it('should forward search to repository', async () => {
    mockPersonRepo.search.mockResolvedValue([])
    await personService.search('tom', 5)
    expect(mockPersonRepo.search).toHaveBeenCalledWith('tom', 5)
  })
})
