// ============================================
// Mock video provider — development / no-API-key fallback
// ============================================
// Real, freely licensed clips (CC0 / public domain) hosted on Wikimedia
// Commons, so the feed can be built and tested without a Coverr key. The
// 480p VP9 WebM transcodes keep bandwidth low. Metadata is static; nothing is
// fetched from Wikimedia's API at runtime.

import type { LibraryVideo, ProviderListParams, ProviderListResult, VideoProvider } from './types'

const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/transcoded'
const THUMBS = 'https://thumb.wikimedia.org/wikipedia/commons/thumb'

interface Seed {
  key: string
  /** "<hash dir>/<file name>" as in the Commons upload path. */
  file: string
  thumbWidth?: number
  title: string
  original: string
  topics: string[]
  width: number
  height: number
  duration: number
  author: string
  license: 'CC0' | 'Public domain'
  createdAt: string
  /** Relative order for the "trending" sort. */
  score: number
}

const SEEDS: Seed[] = [
  { key: 'waterfall-hubelj', file: 'd/d3/Ajdovscina%2C_waterfall_near_the_Hubelj_Ironworks_01.webm', title: 'Thác nước bên xưởng sắt Hubelj', original: 'Ajdovscina, waterfall near the Hubelj Ironworks', topics: ['nature', 'thác nước'], width: 1080, height: 1920, duration: 7, author: 'Ajznponar', license: 'CC0', createdAt: '2024-05-12T00:00:00Z', score: 9 },
  { key: 'lujiazui-night', file: 'a/aa/Timelapse_de_nuit_de_la_vue_du_quartier_de_Lujiazui.webm', title: 'Đêm Lujiazui, Thượng Hải (timelapse)', original: 'Timelapse de nuit de la vue du quartier de Lujiazui', topics: ['city', 'timelapse', 'đêm'], width: 1920, height: 1080, duration: 8, author: 'Tomtoom03', license: 'CC0', createdAt: '2023-11-02T00:00:00Z', score: 8 },
  { key: 'dean-street', file: '8/87/Dean_Street_timelapse_Albury_NSW.webm', title: 'Phố Dean, Albury (timelapse)', original: 'Dean Street timelapse Albury NSW', topics: ['city', 'timelapse', 'giao thông'], width: 1728, height: 972, duration: 14, author: 'Thennicke', license: 'CC0', createdAt: '2020-03-08T00:00:00Z', score: 4 },
  { key: 'bird-feeding', file: '3/3c/Bird_feeding_King_James_Park.webm', title: 'Cho chim ăn ở công viên King James', original: 'Bird feeding King James Park', topics: ['animals', 'chim'], width: 1280, height: 720, duration: 37, author: 'L. Shyamal', license: 'CC0', createdAt: '2019-06-21T00:00:00Z', score: 5 },
  { key: 'cat-kitten', file: '0/04/A_male_cat_grooms_a_female_kitten_2021-08-25_August_25.webm', title: 'Mèo lớn chải lông cho mèo con', original: 'A male cat grooms a female kitten', topics: ['animals', 'mèo'], width: 1920, height: 1080, duration: 29, author: 'ウィキ太郎 (Wiki Taro)', license: 'Public domain', createdAt: '2021-08-25T00:00:00Z', score: 10 },
  { key: 'arcus-cloud', file: '0/09/Arcus_aftermath_28_July_2021_Galley_Common.webm', title: 'Mây vòng cung sau cơn dông', original: 'Arcus aftermath, Galley Common', topics: ['sky', 'mây'], width: 1920, height: 1080, duration: 18, author: 'Rubbish computer', license: 'CC0', createdAt: '2021-07-28T00:00:00Z', score: 3 },
  { key: 'foggy-sunrise', file: '5/51/Rotunda-And-Lawn-Foggy-Sunrise-Timelapse.webm', thumbWidth: 500, title: 'Bình minh trong sương (timelapse)', original: 'Rotunda and Lawn foggy sunrise timelapse', topics: ['sky', 'timelapse', 'bình minh'], width: 608, height: 1080, duration: 32, author: 'JuxtaposedJacob', license: 'CC0', createdAt: '2022-10-14T00:00:00Z', score: 7 },
  { key: 'annular-eclipse', file: '8/88/Timelapse_of_Annular_Solar_Eclipse_in_Albuqueruqe%2C_New_Mexico.webm', title: 'Nhật thực hình khuyên (timelapse)', original: 'Timelapse of Annular Solar Eclipse in Albuquerque, New Mexico', topics: ['sky', 'timelapse', 'thiên văn'], width: 1080, height: 1920, duration: 10, author: 'PatrykTBrown', license: 'CC0', createdAt: '2023-10-14T00:00:00Z', score: 6 },
  { key: 'chicken-rice', file: '2/2b/Cooking_Chicken_and_Rice.webm', title: 'Nấu cơm gà', original: 'Cooking Chicken and Rice', topics: ['food', 'nấu ăn'], width: 1920, height: 1080, duration: 28, author: 'Alabama Extension', license: 'CC0', createdAt: '2020-09-30T00:00:00Z', score: 2 },
  { key: 'chari-dance', file: '0/0d/Chari_Folk_Dance_of_Rajasthan.webm', title: 'Điệu múa dân gian Chari, Rajasthan', original: 'Chari Folk Dance of Rajasthan', topics: ['people', 'múa'], width: 1080, height: 1920, duration: 6, author: 'Kasyap', license: 'CC0', createdAt: '2022-02-18T00:00:00Z', score: 8 },
  { key: 'libreville-sunset', file: 'e/eb/Sunset_timelapse_on_the_beach_in_Libreville%2C_Gabon.webm', title: 'Hoàng hôn trên biển Libreville (timelapse)', original: 'Sunset timelapse on the beach in Libreville, Gabon', topics: ['ocean', 'sky', 'hoàng hôn'], width: 1920, height: 1080, duration: 15, author: 'In Old News', license: 'CC0', createdAt: '2024-01-20T00:00:00Z', score: 6 },
]

const LICENSE_URL: Record<Seed['license'], string> = {
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
  'Public domain': 'https://commons.wikimedia.org/wiki/Help:Public_domain',
}

function toVideo(s: Seed): LibraryVideo {
  const fileName = s.file.split('/').pop()!
  const page = `https://commons.wikimedia.org/wiki/File:${fileName}`
  return {
    id: `mock:${s.key}`,
    title: s.title,
    description: s.original,
    videoUrl: `${COMMONS}/${s.file}/${fileName}.480p.vp9.webm`,
    thumbnailUrl: `${THUMBS}/${s.file}/${s.thumbWidth ?? 960}px--${fileName}.jpg`,
    duration: s.duration,
    width: s.width,
    height: s.height,
    author: { name: s.author, url: page },
    tags: s.topics,
    source: 'mock',
    // CC0 / public domain need no credit; we still link the source page.
    license: { name: s.license, url: LICENSE_URL[s.license], attribution: 'Wikimedia Commons', attributionUrl: page },
    createdAt: s.createdAt,
  }
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()

export const mockProvider: VideoProvider = {
  name: 'mock',

  isConfigured: () => true,

  async list({ sort, query, page, pageSize }: ProviderListParams): Promise<ProviderListResult> {
    const needle = query?.trim() ? fold(query.trim()) : ''
    let seeds = needle
      ? SEEDS.filter((s) => fold([s.title, s.original, ...s.topics].join(' ')).includes(needle))
      : [...SEEDS]
    if (sort === 'latest') seeds = seeds.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    else if (sort === 'trending') seeds = seeds.sort((a, b) => b.score - a.score)
    const start = page * pageSize
    return { items: seeds.slice(start, start + pageSize).map(toVideo), hasMore: start + pageSize < seeds.length }
  },

  async getById(providerId: string): Promise<LibraryVideo | null> {
    const seed = SEEDS.find((s) => s.key === providerId)
    return seed ? toVideo(seed) : null
  },
}
