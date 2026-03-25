/*
  Warnings:

  - You are about to drop the column `sourceType` on the `Episode` table. All the data in the column will be lost.
  - You are about to drop the column `cast` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `director` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `genre` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `releaseYear` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Movie` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tmdbId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MovieCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovieCategory_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MovieCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MovieCountry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MovieCountry_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MovieCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tmdbId" INTEGER,
    "imdbId" TEXT,
    "profileUrl" TEXT,
    "biography" TEXT,
    "birthDate" DATETIME,
    "deathDate" DATETIME,
    "gender" INTEGER,
    "knownFor" TEXT,
    "popularity" REAL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MoviePerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'actor',
    "character" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MoviePerson_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MoviePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovieSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceId" TEXT,
    "quality" TEXT,
    "language" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "lastChecked" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MovieSource_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "skippedItems" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "syncJobId" TEXT,
    "movieId" TEXT,
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "message" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncLog_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "SyncJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SyncLog_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "episodeId" TEXT,
    "watchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastWatchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" REAL NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "currentTime" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "deviceType" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WatchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WatchHistory_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WatchHistory_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Episode_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("backupSourceUrl", "createdAt", "duration", "episodeNumber", "id", "language", "movieId", "quality", "slug", "sortOrder", "sourceUrl", "status", "subtitleUrl", "title", "updatedAt", "viewCount") SELECT "backupSourceUrl", "createdAt", "duration", "episodeNumber", "id", "language", "movieId", "quality", "slug", "sortOrder", "sourceUrl", "status", "subtitleUrl", "title", "updatedAt", "viewCount" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE INDEX "Episode_movieId_idx" ON "Episode"("movieId");
CREATE INDEX "Episode_episodeSlug_idx" ON "Episode"("episodeSlug");
CREATE INDEX "Episode_isActive_idx" ON "Episode"("isActive");
CREATE TABLE "new_Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ophimId" TEXT,
    "tmdbId" INTEGER,
    "imdbId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "description" TEXT,
    "shortDescription" TEXT,
    "contentType" TEXT NOT NULL DEFAULT 'movie',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "quality" TEXT,
    "language" TEXT,
    "year" INTEGER,
    "duration" INTEGER,
    "episodeCurrent" TEXT,
    "episodeTotal" INTEGER,
    "trailerUrl" TEXT,
    "trailerSite" TEXT,
    "trailerKey" TEXT,
    "thumbUrl" TEXT,
    "posterUrl" TEXT,
    "backdropUrl" TEXT,
    "rating" REAL DEFAULT 0,
    "ageRating" TEXT,
    "actorText" TEXT,
    "directorText" TEXT,
    "countryText" TEXT,
    "categoryText" TEXT,
    "tags" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "isCopyright" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "metadataSource" TEXT,
    "matchConfidence" REAL,
    "sourceStatus" TEXT NOT NULL DEFAULT 'pending',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" DATETIME,
    "lastSyncedAt" DATETIME,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
INSERT INTO "new_Movie" ("ageRating", "backdropUrl", "createdAt", "createdBy", "deletedAt", "description", "duration", "id", "isFeatured", "isPublished", "isRecommended", "isTrending", "language", "originalTitle", "posterUrl", "quality", "rating", "seoDescription", "seoKeywords", "seoTitle", "shortDescription", "slug", "sourceStatus", "status", "tags", "title", "trailerUrl", "updatedAt", "updatedBy", "viewCount") SELECT "ageRating", "backdropUrl", "createdAt", "createdBy", "deletedAt", "description", "duration", "id", "isFeatured", "isPublished", "isRecommended", "isTrending", "language", "originalTitle", "posterUrl", "quality", "rating", "seoDescription", "seoKeywords", "seoTitle", "shortDescription", "slug", "sourceStatus", "status", "tags", "title", "trailerUrl", "updatedAt", "updatedBy", "viewCount" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_ophimId_key" ON "Movie"("ophimId");
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");
CREATE INDEX "Movie_title_idx" ON "Movie"("title");
CREATE INDEX "Movie_originalTitle_idx" ON "Movie"("originalTitle");
CREATE INDEX "Movie_year_idx" ON "Movie"("year");
CREATE INDEX "Movie_tmdbId_idx" ON "Movie"("tmdbId");
CREATE INDEX "Movie_imdbId_idx" ON "Movie"("imdbId");
CREATE INDEX "Movie_isActive_idx" ON "Movie"("isActive");
CREATE INDEX "Movie_contentType_idx" ON "Movie"("contentType");
CREATE INDEX "Movie_status_idx" ON "Movie"("status");
CREATE INDEX "Movie_isPublished_idx" ON "Movie"("isPublished");
CREATE INDEX "Movie_isFeatured_idx" ON "Movie"("isFeatured");
CREATE INDEX "Movie_lastSyncedAt_idx" ON "Movie"("lastSyncedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tmdbId_key" ON "Category"("tmdbId");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

-- CreateIndex
CREATE INDEX "MovieCategory_movieId_idx" ON "MovieCategory"("movieId");

-- CreateIndex
CREATE INDEX "MovieCategory_categoryId_idx" ON "MovieCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieCategory_movieId_categoryId_key" ON "MovieCategory"("movieId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_slug_key" ON "Country"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "Country_slug_idx" ON "Country"("slug");

-- CreateIndex
CREATE INDEX "Country_code_idx" ON "Country"("code");

-- CreateIndex
CREATE INDEX "Country_isActive_idx" ON "Country"("isActive");

-- CreateIndex
CREATE INDEX "MovieCountry_movieId_idx" ON "MovieCountry"("movieId");

-- CreateIndex
CREATE INDEX "MovieCountry_countryId_idx" ON "MovieCountry"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieCountry_movieId_countryId_key" ON "MovieCountry"("movieId", "countryId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Person_tmdbId_key" ON "Person"("tmdbId");

-- CreateIndex
CREATE INDEX "Person_name_idx" ON "Person"("name");

-- CreateIndex
CREATE INDEX "Person_slug_idx" ON "Person"("slug");

-- CreateIndex
CREATE INDEX "Person_tmdbId_idx" ON "Person"("tmdbId");

-- CreateIndex
CREATE INDEX "Person_isActive_idx" ON "Person"("isActive");

-- CreateIndex
CREATE INDEX "MoviePerson_movieId_idx" ON "MoviePerson"("movieId");

-- CreateIndex
CREATE INDEX "MoviePerson_personId_idx" ON "MoviePerson"("personId");

-- CreateIndex
CREATE INDEX "MoviePerson_role_idx" ON "MoviePerson"("role");

-- CreateIndex
CREATE UNIQUE INDEX "MoviePerson_movieId_personId_role_key" ON "MoviePerson"("movieId", "personId", "role");

-- CreateIndex
CREATE INDEX "MovieSource_movieId_idx" ON "MovieSource"("movieId");

-- CreateIndex
CREATE INDEX "MovieSource_sourceName_idx" ON "MovieSource"("sourceName");

-- CreateIndex
CREATE INDEX "MovieSource_isActive_idx" ON "MovieSource"("isActive");

-- CreateIndex
CREATE INDEX "SyncJob_source_idx" ON "SyncJob"("source");

-- CreateIndex
CREATE INDEX "SyncJob_status_idx" ON "SyncJob"("status");

-- CreateIndex
CREATE INDEX "SyncJob_createdAt_idx" ON "SyncJob"("createdAt");

-- CreateIndex
CREATE INDEX "SyncLog_syncJobId_idx" ON "SyncLog"("syncJobId");

-- CreateIndex
CREATE INDEX "SyncLog_movieId_idx" ON "SyncLog"("movieId");

-- CreateIndex
CREATE INDEX "SyncLog_source_idx" ON "SyncLog"("source");

-- CreateIndex
CREATE INDEX "SyncLog_action_idx" ON "SyncLog"("action");

-- CreateIndex
CREATE INDEX "SyncLog_createdAt_idx" ON "SyncLog"("createdAt");

-- CreateIndex
CREATE INDEX "WatchHistory_userId_idx" ON "WatchHistory"("userId");

-- CreateIndex
CREATE INDEX "WatchHistory_movieId_idx" ON "WatchHistory"("movieId");

-- CreateIndex
CREATE INDEX "WatchHistory_episodeId_idx" ON "WatchHistory"("episodeId");

-- CreateIndex
CREATE INDEX "WatchHistory_lastWatchedAt_idx" ON "WatchHistory"("lastWatchedAt");

-- CreateIndex
CREATE INDEX "WatchHistory_isCompleted_idx" ON "WatchHistory"("isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "WatchHistory_userId_movieId_episodeId_key" ON "WatchHistory"("userId", "movieId", "episodeId");
