// ============================================
// Playback Service — fetches playable movie + episode data from DB
// ============================================

import { prisma } from "@/lib/db";
import { withCache } from "@/src/lib/redis";
import type {
  EpisodePlaybackData,
  MoviePlaybackData,
} from "@/lib/player/types";
import { mapMovie, mapEpisode, mapSource, mapSubtitle } from "./watch.mapper";
import { searchMovies } from "@/src/be/modules/search/movie-search-service";
import type { PlayableSource, PlayableSubtitle } from "@/lib/player/types";

// ── URL validation ──

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isHlsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.pathname.endsWith(".m3u8");
  } catch {
    return false;
  }
}

function getDemoFallbackSource(movie: { slug: string }) {
  const url = process.env.DEMO_HLS_URL;
  if (
    !movie.slug.startsWith("phim-local-demo-") ||
    !url ||
    !isValidUrl(url) ||
    !isHlsUrl(url)
  ) {
    return null;
  }

  return {
    id: "demo-fallback-source",
    sourceType: "hls" as const,
    url,
    label: "Demo HLS",
    isPrimary: true,
    mimeType: "application/x-mpegURL",
  };
}

// ── Public API ──

/**
 * Get full playback data for a movie by its DB id or slug.
 * Returns null if movie not found or not published.
 */
export async function getMoviePlaybackData(
  movieIdOrSlug: string,
  episodeSlug?: string,
): Promise<MoviePlaybackData | null> {
  return withCache(
    `playback:${movieIdOrSlug}:${episodeSlug || "main"}`,
    3600,
    async () => {
      // Try by ID first, then by slug
      const movie = await prisma.movie.findFirst({
        where: {
          OR: [{ id: movieIdOrSlug }, { slug: movieIdOrSlug }],
          isActive: true,
        },
      });

      if (!movie) return null;

      // Get published episodes
      const episodes = await prisma.episode.findMany({
        where: {
          movieId: movie.id,
          isActive: true,
          isPublished: true,
          status: "active",
        },
        orderBy: [{ episodeOrder: "asc" }, { episodeNumber: "asc" }],
      });

      const playableEpisodes = episodes.map(mapEpisode);

      // Determine current episode
      let currentEpisodeData: EpisodePlaybackData | null = null;
      if (episodes.length > 0) {
        let targetEpisode = episodes[0]; // default to first
        if (episodeSlug) {
          const found = episodes.find(
            (ep) => ep.episodeSlug === episodeSlug || ep.slug === episodeSlug,
          );
          if (found) targetEpisode = found;
        }

        currentEpisodeData = await getEpisodePlaybackData(
          targetEpisode.id,
          episodes,
        );
      }

      // Local demo records can survive a partial seed or an older schema version.
      // Keep those records watchable without weakening validation for real titles.
      const demoFallbackSource = getDemoFallbackSource(movie);
      if (demoFallbackSource && !currentEpisodeData?.primarySource) {
        currentEpisodeData = {
          episode: {
            id: "demo-fallback-episode",
            episodeNumber: 1,
            episodeName: "Tập Full",
            episodeSlug: "tap-full",
            title: movie.title,
            description: null,
            thumbnailUrl: null,
            duration: movie.duration,
            isActive: true,
          },
          sources: [demoFallbackSource],
          primarySource: demoFallbackSource,
          subtitles: [],
          nextEpisode: null,
          prevEpisode: null,
        };
      }

      return {
        movie: mapMovie(movie),
        episodes: playableEpisodes,
        currentEpisode: currentEpisodeData,
        totalEpisodes: episodes.length,
      };
    },
  );
}

/**
 * Get playback data for a specific episode.
 */
export async function getEpisodePlaybackData(
  episodeId: string,
  allEpisodes?: any[],
): Promise<EpisodePlaybackData | null> {
  const episode = await prisma.episode.findFirst({
    where: { id: episodeId, isActive: true },
    include: {
      videoSources: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }],
      },
      subtitleTracks: {
        where: { isActive: true },
        orderBy: [{ isDefault: "desc" }],
      },
    },
  });

  if (!episode) return null;

  // If allEpisodes not provided, fetch them
  if (!allEpisodes) {
    allEpisodes = await prisma.episode.findMany({
      where: {
        movieId: episode.movieId,
        isActive: true,
        isPublished: true,
        status: "active",
      },
      orderBy: [{ episodeOrder: "asc" }, { episodeNumber: "asc" }],
    });
  }

  // Build sources list — combine VideoSource records + legacy streamUrl
  const sources: PlayableSource[] = [];

  // Add VideoSource records
  for (const src of episode.videoSources) {
    if (!isValidUrl(src.url)) continue;
    // Validate: HLS sources must have .m3u8 URLs
    if (src.sourceType === "hls" && !isHlsUrl(src.url)) continue;
    sources.push(mapSource(src));
  }

  // Fallback: use legacy streamUrl if no VideoSource exists
  if (
    sources.length === 0 &&
    episode.streamUrl &&
    isValidUrl(episode.streamUrl)
  ) {
    const streamTypeRaw = episode.streamType || "";
    const isEmbedOrIframe =
      streamTypeRaw.includes("iframe") ||
      streamTypeRaw.includes("embed") ||
      streamTypeRaw.includes("youtube");
    const mappedType = isEmbedOrIframe
      ? streamTypeRaw.includes("youtube")
        ? "youtube"
        : "iframe"
      : streamTypeRaw === "hls" || streamTypeRaw === "m3u8"
        ? "hls"
        : "mp4";

    if (mappedType === "hls" && !isHlsUrl(episode.streamUrl)) {
      // Skip invalid HLS URL unless it's falsely labeled
    } else {
      sources.push({
        id: `legacy-${episode.id}`,
        sourceType: mappedType as "hls" | "mp4" | "iframe" | "youtube",
        url: episode.streamUrl,
        label: episode.quality || "Main",
        isPrimary: true,
        mimeType:
          mappedType === "hls"
            ? "application/x-mpegURL"
            : mappedType === "mp4"
              ? "video/mp4"
              : null,
      });
    }
  }

  // Build subtitles list — combine SubtitleTrack records + legacy subtitleUrl
  const subtitles: PlayableSubtitle[] = [];

  for (const sub of episode.subtitleTracks) {
    if (!isValidUrl(sub.url)) continue;
    subtitles.push(mapSubtitle(sub));
  }

  // Fallback: use legacy subtitleUrl
  if (
    subtitles.length === 0 &&
    episode.subtitleUrl &&
    isValidUrl(episode.subtitleUrl)
  ) {
    subtitles.push({
      id: `legacy-sub-${episode.id}`,
      label: "Phụ đề",
      lang: episode.language || "vi",
      url: episode.subtitleUrl,
      isDefault: true,
      kind: "subtitles",
    });
  }

  // Find prev/next episodes
  const currentIndex = allEpisodes.findIndex((ep) => ep.id === episode.id);
  const prevEp =
    currentIndex > 0 ? mapEpisode(allEpisodes[currentIndex - 1]) : null;
  const nextEp =
    currentIndex >= 0 && currentIndex < allEpisodes.length - 1
      ? mapEpisode(allEpisodes[currentIndex + 1])
      : null;

  const primarySource = sources.find((s) => s.isPrimary) || sources[0] || null;

  return {
    episode: mapEpisode(episode),
    sources,
    primarySource,
    subtitles,
    nextEpisode: nextEp,
    prevEpisode: prevEp,
  };
}

/**
 * Get movie by TMDB ID and return playback data.
 * Used when watch page receives TMDB ID instead of DB ID.
 */
export async function getMoviePlaybackByTmdbId(
  tmdbId: number,
  episodeSlug?: string,
): Promise<MoviePlaybackData | null> {
  const movie = await prisma.movie.findFirst({
    where: { tmdbId, isActive: true },
  });
  if (!movie) return null;
  return getMoviePlaybackData(movie.id, episodeSlug);
}

/**
 * Search for a movie by title — used as final fallback when TMDB ID
 * doesn't match any DB record.
 *
 * Strategy (strict, to keep poster ↔ playback in sync):
 * 1. Exact slug match
 * 2. Case-insensitive exact title match
 * 3. ES search filtered by strict slug-token set equality + year hint
 *
 * Hints are used to reject obviously-wrong candidates: if the DB movie
 * already carries a different tmdbId, or its year is far from the
 * requested year, we refuse to substitute it.
 *
 * Only returns movies that have at least one episode with a streamUrl.
 */
export async function getMoviePlaybackByTitle(
  title: string,
  episodeSlug?: string,
  hints?: { year?: number | null; tmdbId?: number | null },
): Promise<MoviePlaybackData | null> {
  // Generate slug from title
  const slug = toSlug(title);
  const hintYear = hints?.year ?? null;
  const hintTmdbId = hints?.tmdbId ?? null;

  // 1. Exact slug match
  const bySlug = await prisma.movie.findFirst({
    where: {
      slug,
      isActive: true,
      episodes: { some: { streamUrl: { not: null } } },
    },
  });
  if (bySlug && acceptCandidate(bySlug, hintYear, hintTmdbId)) {
    return getMoviePlaybackData(bySlug.id, episodeSlug);
  }

  // 2. Case-insensitive title match
  const byTitle = await prisma.movie.findFirst({
    where: {
      title: { equals: title, mode: "insensitive" },
      isActive: true,
      episodes: { some: { streamUrl: { not: null } } },
    },
  });
  if (byTitle && acceptCandidate(byTitle, hintYear, hintTmdbId)) {
    return getMoviePlaybackData(byTitle.id, episodeSlug);
  }

  // 3. Elasticsearch Full-Text Search — fuzzy bridge with strict guards.
  //    Requires identical set of significant tokens (≥2) AND matching year.
  //    Previously used a subset check that false-matched "Wonder" → "Wonder Park".
  try {
    const searchResult = await searchMovies(title, 1, 5);
    for (const item of searchResult.items) {
      if (!isSameSlugTokens(slug, item.slug)) continue;
      if (!yearMatches(item.year, hintYear)) continue;
      if (!tmdbIdMatches(item.tmdbId, hintTmdbId)) continue;
      return getMoviePlaybackData(item.id, episodeSlug);
    }
  } catch {
    // Ignore ES errors
  }

  return null;
}

// True iff two slugs share the SAME set of significant (≥3 char) tokens.
// Requires both slugs to carry ≥2 significant tokens to avoid single-word
// false positives like "wonder" ↔ "wonder-park".
function isSameSlugTokens(a: string, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const aTokens = a.split("-").filter((t) => t.length >= 3);
  const bTokens = b.split("-").filter((t) => t.length >= 3);
  if (aTokens.length < 2 || bTokens.length < 2) return false;
  if (aTokens.length !== bTokens.length) return false;
  const bSet = new Set(bTokens);
  return aTokens.every((t) => bSet.has(t));
}

// Year hint: accept candidate if either side is unknown, otherwise require
// ±1 year (covers re-releases / region-specific release year drift).
function yearMatches(
  candidateYear: number | null | undefined,
  hintYear: number | null,
): boolean {
  if (hintYear == null || candidateYear == null) return true;
  return Math.abs(candidateYear - hintYear) <= 1;
}

// TMDB id hint: if the DB candidate is already enriched with a *different*
// tmdbId, refuse the match — it's a different movie, no matter how similar
// the title looks.
function tmdbIdMatches(
  candidateTmdbId: number | null | undefined,
  hintTmdbId: number | null,
): boolean {
  if (hintTmdbId == null || candidateTmdbId == null) return true;
  return candidateTmdbId === hintTmdbId;
}

// Direct-Prisma candidate check (same guards as ES path).
function acceptCandidate(
  candidate: { year: number | null; tmdbId: number | null },
  hintYear: number | null,
  hintTmdbId: number | null,
): boolean {
  return (
    yearMatches(candidate.year, hintYear) &&
    tmdbIdMatches(candidate.tmdbId, hintTmdbId)
  );
}

// ── Multi-Server Sources ──

export interface ServerSource {
  name: string;
  episodes: { name: string; slug: string; url: string }[];
}

/**
 * Shared helper to group episodes into server sources.
 * @param singleSourcePerEpisode If true, picks only the first valid video source per episode.
 */
function _buildServerSourcesMap(
  episodes: any[],
  singleSourcePerEpisode: boolean,
): ServerSource[] {
  const serverMap = new Map<
    string,
    { name: string; slug: string; url: string }[]
  >();

  for (const ep of episodes) {
    const serverName = ep.serverName || "Server 1";
    const epName = ep.episodeName || `Tập ${ep.episodeNumber}`;
    const epSlug = ep.episodeSlug || `tap-${ep.episodeNumber}`;

    let foundSource = false;

    // Try VideoSource records first
    for (const src of ep.videoSources || []) {
      if (!isValidUrl(src.url)) continue;
      if (src.sourceType === "iframe" || src.sourceType === "youtube") continue;
      if (src.sourceType === "hls" && !isHlsUrl(src.url)) continue;

      if (!serverMap.has(serverName)) {
        serverMap.set(serverName, []);
      }
      serverMap
        .get(serverName)!
        .push({ name: epName, slug: epSlug, url: src.url });
      foundSource = true;

      if (singleSourcePerEpisode) break;
    }

    // Fallback to legacy streamUrl
    if (!foundSource && ep.streamUrl && isValidUrl(ep.streamUrl)) {
      const isEmbed =
        ep.streamType?.includes("iframe") ||
        ep.streamType?.includes("embed") ||
        ep.streamType?.includes("youtube");
      if (!isEmbed) {
        const isHls = ep.streamType === "hls" || ep.streamType === "m3u8";
        if (!isHls || isHlsUrl(ep.streamUrl)) {
          if (!serverMap.has(serverName)) serverMap.set(serverName, []);
          serverMap
            .get(serverName)!
            .push({ name: epName, slug: epSlug, url: ep.streamUrl });
        }
      }
    }
  }

  const servers: ServerSource[] = [];
  for (const [name, eps] of serverMap) {
    if (eps.length > 0) servers.push({ name, episodes: eps });
  }
  return servers;
}

/**
 * Get all available server sources for a specific episode.
 * Groups episodes with the same episodeNumber but different serverName.
 * Used for multi-server fallback in HLSPlayer.
 */
export async function getMultiServerSources(
  movieId: string,
  episodeNumber: number,
): Promise<ServerSource[]> {
  // Find all episodes for this movie with the same episode number
  const episodes = await prisma.episode.findMany({
    where: {
      movieId,
      episodeNumber,
      isActive: true,
      isPublished: true,
      status: "active",
    },
    include: {
      videoSources: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { priority: "desc" }],
      },
    },
    orderBy: [{ episodeOrder: "asc" }],
  });

  return _buildServerSourcesMap(episodes, false);
}

/**
 * Get all servers for a movie with full episode lists.
 * Each server has all its episodes with stream URLs.
 * Used for building the complete server list in the watch page.
 */
export async function getAllMovieServers(
  movieId: string,
): Promise<ServerSource[]> {
  const episodes = await prisma.episode.findMany({
    where: {
      movieId,
      isActive: true,
      isPublished: true,
      status: "active",
    },
    include: {
      videoSources: {
        where: { isActive: true },
        orderBy: [{ isPrimary: "desc" }, { priority: "desc" }],
      },
    },
    orderBy: [{ episodeOrder: "asc" }, { episodeNumber: "asc" }],
  });

  return _buildServerSourcesMap(episodes, true);
}

// ── Slug helper ──
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
