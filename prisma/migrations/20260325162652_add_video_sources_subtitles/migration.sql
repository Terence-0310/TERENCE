-- CreateTable
CREATE TABLE "VideoSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'hls',
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Main',
    "mimeType" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "drmType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoSource_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubtitleTrack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "episodeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "kind" TEXT NOT NULL DEFAULT 'subtitles',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubtitleTrack_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "sourceName" TEXT,
    "serverName" TEXT,
    "episodeName" TEXT,
    "episodeSlug" TEXT,
    "episodeNumber" INTEGER NOT NULL DEFAULT 1,
    "episodeOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "slug" TEXT,
    "streamType" TEXT NOT NULL DEFAULT 'mp4',
    "streamUrl" TEXT,
    "sourceUrl" TEXT,
    "backupSourceUrl" TEXT,
    "subtitleUrl" TEXT,
    "duration" INTEGER,
    "quality" TEXT,
    "language" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Episode_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("backupSourceUrl", "createdAt", "duration", "episodeName", "episodeNumber", "episodeOrder", "episodeSlug", "id", "isActive", "language", "movieId", "quality", "serverName", "slug", "sortOrder", "sourceName", "sourceUrl", "status", "streamType", "streamUrl", "subtitleUrl", "title", "updatedAt", "viewCount") SELECT "backupSourceUrl", "createdAt", "duration", "episodeName", "episodeNumber", "episodeOrder", "episodeSlug", "id", "isActive", "language", "movieId", "quality", "serverName", "slug", "sortOrder", "sourceName", "sourceUrl", "status", "streamType", "streamUrl", "subtitleUrl", "title", "updatedAt", "viewCount" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE INDEX "Episode_movieId_idx" ON "Episode"("movieId");
CREATE INDEX "Episode_episodeSlug_idx" ON "Episode"("episodeSlug");
CREATE INDEX "Episode_isActive_idx" ON "Episode"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "VideoSource_episodeId_idx" ON "VideoSource"("episodeId");

-- CreateIndex
CREATE INDEX "VideoSource_isActive_idx" ON "VideoSource"("isActive");

-- CreateIndex
CREATE INDEX "VideoSource_isPrimary_idx" ON "VideoSource"("isPrimary");

-- CreateIndex
CREATE INDEX "SubtitleTrack_episodeId_idx" ON "SubtitleTrack"("episodeId");

-- CreateIndex
CREATE INDEX "SubtitleTrack_isActive_idx" ON "SubtitleTrack"("isActive");
