// ============================================
// Watch Module — Mapper
// ============================================

import type {
  PlayableMovie,
  PlayableEpisode,
  PlayableSource,
  PlayableSubtitle,
} from '@/lib/player/types'

export function mapMovie(m: any): PlayableMovie {
  return {
    id: m.id,
    tmdbId: m.tmdbId,
    slug: m.slug,
    title: m.title,
    originalTitle: m.originalTitle,
    description: m.description,
    contentType: m.contentType,
    posterUrl: m.posterUrl,
    backdropUrl: m.backdropUrl,
    year: m.year,
    quality: m.quality,
    rating: m.rating,
    earlyAccessUntil: m.earlyAccessUntil ? new Date(m.earlyAccessUntil).toISOString() : null,
  }
}

export function mapEpisode(ep: any): PlayableEpisode {
  return {
    id: ep.id,
    episodeNumber: ep.episodeNumber,
    episodeName: ep.episodeName,
    episodeSlug: ep.episodeSlug,
    title: ep.title,
    description: ep.description,
    thumbnailUrl: ep.thumbnailUrl,
    duration: ep.duration,
    isActive: ep.isActive,
    serverName: ep.serverName,
  }
}

export function mapSource(src: any): PlayableSource {
  return {
    id: src.id,
    sourceType: src.sourceType as 'hls' | 'mp4' | 'youtube' | 'iframe',
    url: src.url,
    label: src.label,
    isPrimary: src.isPrimary,
    mimeType: src.mimeType,
  }
}

export function mapSubtitle(sub: any): PlayableSubtitle {
  return {
    id: sub.id,
    label: sub.label,
    lang: sub.lang,
    url: sub.url,
    isDefault: sub.isDefault,
    kind: sub.kind,
  }
}
