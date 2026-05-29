import { NextResponse } from 'next/server'
import { getMovieDetail } from '@/src/be/services/tmdb/movie-service'
import { getTvDetail } from '@/src/be/services/tmdb/tv-service'
import { logger } from '@/src/be/shared/utils/logger'

const log = logger.child({ module: 'tmdb-image' })

export const revalidate = 86400 // Cache 24 hours

// Kích thước chuẩn cho TMDB Image Proxy
const SIZES = {
  poster: {
    sm: 'w185',
    md: 'w500',
    lg: 'w780',
    original: 'original'
  },
  backdrop: {
    sm: 'w300',
    md: 'w780',
    lg: 'w1280',
    original: 'original'
  }
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const { searchParams } = new URL(request.url)
  
  const type = (searchParams.get('type') === 'backdrop' ? 'backdrop' : 'poster') as keyof typeof SIZES
  const sizeClass = (searchParams.get('size') || 'md') as keyof typeof SIZES['poster']
  const isTv = searchParams.get('isTv') === 'true'
  const rawUrl = searchParams.get('url')
  
  if (!id || isNaN(Number(id))) {
    // Return early transparently with 404 to let frontend fallback handle it or return placeholder
    return fetchPlaceholder(request.url)
  }

  try {
    const tmdbId = Number(id)
    let imagePath = ''
    
    // 1. Phân tích image path
    if (rawUrl) {
      const decodedUrl = decodeURIComponent(rawUrl)
      // Extract the file name (e.g. /kqjL17yufvn9OVLyKxgcbzaE1Pd.jpg) from URL
      const match = decodedUrl.match(/\/([^/]+\.(jpg|jpeg|png|webp))$/i)
      if (match) {
        imagePath = `/${match[1]}`
      }
    } 
    
    // 2. Fallback sang fetch từ Server TMDB nếu URL vô dụng
    if (!imagePath) {
      const detail = isTv ? await getTvDetail(tmdbId) : await getMovieDetail(tmdbId)
      const fullUrl = type === 'backdrop' ? detail.backdropUrl : detail.posterUrl
      if (fullUrl) {
        const match = fullUrl.match(/\/([^/]+\.(jpg|jpeg|png|webp))$/i)
        if (match) imagePath = `/${match[1]}`
      }
    }
    
    // 3. Chuẩn hoá kích thước và tạo URI cuối cùng
    if (imagePath) {
      const resolution = SIZES[type][sizeClass] || SIZES[type]['md']
      const tmdbProxyUrl = `https://image.tmdb.org/t/p/${resolution}${imagePath}`

      try {
        const imageRes = await fetch(tmdbProxyUrl, { 
          next: { revalidate: 86400 },
          // Chống treo fetch
          signal: AbortSignal.timeout(5000)
        })

        if (imageRes.ok) {
          const buffer = await imageRes.arrayBuffer()
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': imageRes.headers.get('Content-Type') || 'image/jpeg',
              'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
              // Cho phép browser cache mạnh mẽ để tiết kiệm bandwidth
              'ETag': `"${imagePath.replace('/', '')}-${resolution}"`,
            },
          })
        }
      } catch (e) {
        log.error({ tmdbProxyUrl, err: e instanceof Error ? e.message : e }, 'Fetch failed')
      }
    }
  } catch (err) {
    log.error({ id, err: err instanceof Error ? err.message : err }, 'Metadata retrieval failed')
  }

  // Fallback nếu 404 hoặc lỗi (trả về placeholder tĩnh)
  return fetchPlaceholder(request.url)
}

function fetchPlaceholder(baseUrl: string) {
  // Thay vì redirect về /placeholder.jpg làm tăng 1 vòng request
  // Ta trả lời redirect nhưng với header Cache
  return NextResponse.redirect(new URL('/placeholder.jpg', baseUrl), {
    status: 302,
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  })
}
