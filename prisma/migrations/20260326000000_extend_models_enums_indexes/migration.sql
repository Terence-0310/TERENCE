-- AlterTable
ALTER TABLE "Category" ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN "originalName" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MoviePerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'actor',
    "character" TEXT,
    "department" TEXT,
    "job" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MoviePerson_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MoviePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MoviePerson" ("character", "createdAt", "id", "movieId", "personId", "role", "sortOrder") SELECT "character", "createdAt", "id", "movieId", "personId", "role", "sortOrder" FROM "MoviePerson";
DROP TABLE "MoviePerson";
ALTER TABLE "new_MoviePerson" RENAME TO "MoviePerson";
CREATE INDEX "MoviePerson_movieId_idx" ON "MoviePerson"("movieId");
CREATE INDEX "MoviePerson_personId_idx" ON "MoviePerson"("personId");
CREATE INDEX "MoviePerson_role_idx" ON "MoviePerson"("role");
CREATE INDEX "MoviePerson_sortOrder_idx" ON "MoviePerson"("sortOrder");
CREATE UNIQUE INDEX "MoviePerson_movieId_personId_role_key" ON "MoviePerson"("movieId", "personId", "role");
CREATE TABLE "new_MovieSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceId" TEXT,
    "quality" TEXT,
    "language" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "confidence" REAL,
    "notes" TEXT,
    "metadata" TEXT,
    "lastChecked" DATETIME,
    "lastSuccessAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MovieSource_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MovieSource" ("createdAt", "id", "isActive", "language", "lastChecked", "metadata", "movieId", "priority", "quality", "sourceId", "sourceName", "sourceUrl", "updatedAt") SELECT "createdAt", "id", "isActive", "language", "lastChecked", "metadata", "movieId", "priority", "quality", "sourceId", "sourceName", "sourceUrl", "updatedAt" FROM "MovieSource";
DROP TABLE "MovieSource";
ALTER TABLE "new_MovieSource" RENAME TO "MovieSource";
CREATE INDEX "MovieSource_movieId_idx" ON "MovieSource"("movieId");
CREATE INDEX "MovieSource_sourceName_idx" ON "MovieSource"("sourceName");
CREATE INDEX "MovieSource_isActive_idx" ON "MovieSource"("isActive");
CREATE INDEX "MovieSource_isPrimary_isActive_idx" ON "MovieSource"("isPrimary", "isActive");
CREATE UNIQUE INDEX "MovieSource_movieId_sourceName_sourceId_key" ON "MovieSource"("movieId", "sourceName", "sourceId");
CREATE TABLE "new_SyncJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT,
    "source" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "processedItems" INTEGER NOT NULL DEFAULT 0,
    "successItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "skippedItems" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SyncJob_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SyncJob" ("completedAt", "createdAt", "createdBy", "errorMessage", "failedItems", "id", "jobType", "metadata", "processedItems", "skippedItems", "source", "startedAt", "status", "totalItems", "updatedAt") SELECT "completedAt", "createdAt", "createdBy", "errorMessage", "failedItems", "id", "jobType", "metadata", "processedItems", "skippedItems", "source", "startedAt", "status", "totalItems", "updatedAt" FROM "SyncJob";
DROP TABLE "SyncJob";
ALTER TABLE "new_SyncJob" RENAME TO "SyncJob";
CREATE INDEX "SyncJob_movieId_idx" ON "SyncJob"("movieId");
CREATE INDEX "SyncJob_source_idx" ON "SyncJob"("source");
CREATE INDEX "SyncJob_status_idx" ON "SyncJob"("status");
CREATE INDEX "SyncJob_createdAt_idx" ON "SyncJob"("createdAt");
CREATE TABLE "new_SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "syncJobId" TEXT,
    "movieId" TEXT,
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT,
    "context" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncLog_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "SyncJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SyncLog_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SyncLog" ("action", "createdAt", "id", "message", "metadata", "movieId", "source", "status", "syncJobId") SELECT "action", "createdAt", "id", "message", "metadata", "movieId", "source", "status", "syncJobId" FROM "SyncLog";
DROP TABLE "SyncLog";
ALTER TABLE "new_SyncLog" RENAME TO "SyncLog";
CREATE INDEX "SyncLog_syncJobId_idx" ON "SyncLog"("syncJobId");
CREATE INDEX "SyncLog_movieId_idx" ON "SyncLog"("movieId");
CREATE INDEX "SyncLog_source_idx" ON "SyncLog"("source");
CREATE INDEX "SyncLog_action_idx" ON "SyncLog"("action");
CREATE INDEX "SyncLog_level_idx" ON "SyncLog"("level");
CREATE INDEX "SyncLog_createdAt_idx" ON "SyncLog"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

