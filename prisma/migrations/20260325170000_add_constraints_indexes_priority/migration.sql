-- Migration: add_constraints_indexes_priority
-- Adds: VideoSource.priority, Episode unique constraints, composite indexes

-- RedefineTables: VideoSource (add priority column)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_VideoSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'hls',
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Main',
    "mimeType" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "drmType" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoSource_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_VideoSource" ("id", "episodeId", "sourceType", "url", "label", "mimeType", "isPrimary", "isActive", "drmType", "createdAt", "updatedAt")
SELECT "id", "episodeId", "sourceType", "url", "label", "mimeType", "isPrimary", "isActive", "drmType", "createdAt", "updatedAt" FROM "VideoSource";

DROP TABLE "VideoSource";
ALTER TABLE "new_VideoSource" RENAME TO "VideoSource";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Episode uniqueness constraints
CREATE UNIQUE INDEX "Episode_movieId_episodeNumber_key" ON "Episode"("movieId", "episodeNumber");
CREATE UNIQUE INDEX "Episode_movieId_slug_key" ON "Episode"("movieId", "slug");

-- Episode index on slug
CREATE INDEX "Episode_slug_idx" ON "Episode"("slug");

-- VideoSource indexes
CREATE INDEX "VideoSource_episodeId_idx" ON "VideoSource"("episodeId");
CREATE INDEX "VideoSource_sourceType_idx" ON "VideoSource"("sourceType");
CREATE INDEX "VideoSource_isPrimary_isActive_idx" ON "VideoSource"("isPrimary", "isActive");
CREATE INDEX "VideoSource_isActive_idx" ON "VideoSource"("isActive");

-- SubtitleTrack indexes
CREATE INDEX "SubtitleTrack_lang_idx" ON "SubtitleTrack"("lang");
CREATE INDEX "SubtitleTrack_isDefault_isActive_idx" ON "SubtitleTrack"("isDefault", "isActive");

-- WatchHistory composite index for continue watching
CREATE INDEX "WatchHistory_userId_lastWatchedAt_idx" ON "WatchHistory"("userId", "lastWatchedAt");
