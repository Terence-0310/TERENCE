-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "type" TEXT NOT NULL DEFAULT 'movie',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "posterUrl" TEXT,
    "backdropUrl" TEXT,
    "thumbnailUrl" TEXT,
    "trailerUrl" TEXT,
    "releaseYear" INTEGER,
    "duration" INTEGER,
    "quality" TEXT,
    "language" TEXT,
    "rating" REAL DEFAULT 0,
    "ageRating" TEXT,
    "country" TEXT,
    "genre" TEXT,
    "cast" TEXT,
    "director" TEXT,
    "tags" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isTrending" BOOLEAN NOT NULL DEFAULT false,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sourceStatus" TEXT NOT NULL DEFAULT 'pending',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
INSERT INTO "new_Movie" ("backdropUrl", "country", "createdAt", "createdBy", "description", "duration", "genre", "id", "isFeatured", "isRecommended", "isTrending", "language", "originalTitle", "posterUrl", "quality", "rating", "releaseYear", "slug", "status", "thumbnailUrl", "title", "trailerUrl", "type", "updatedAt", "viewCount") SELECT "backdropUrl", "country", "createdAt", "createdBy", "description", "duration", "genre", "id", "isFeatured", "isRecommended", "isTrending", "language", "originalTitle", "posterUrl", "quality", "rating", "releaseYear", "slug", "status", "thumbnailUrl", "title", "trailerUrl", "type", "updatedAt", "viewCount" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
