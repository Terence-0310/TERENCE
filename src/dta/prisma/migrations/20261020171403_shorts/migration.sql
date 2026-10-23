-- CreateTable
CREATE TABLE "Short" (
    "id" TEXT NOT NULL,
    "movieId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "hashtags" TEXT,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "externalId" TEXT,
    "videoType" TEXT NOT NULL DEFAULT 'youtube',
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "orientation" TEXT NOT NULL DEFAULT 'landscape',
    "duration" INTEGER,
    "language" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Short_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortLike" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortComment" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Short_externalId_key" ON "Short"("externalId");

-- CreateIndex
CREATE INDEX "Short_status_publishedAt_idx" ON "Short"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Short_movieId_idx" ON "Short"("movieId");

-- CreateIndex
CREATE INDEX "ShortLike_userId_idx" ON "ShortLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortLike_shortId_userId_key" ON "ShortLike"("shortId", "userId");

-- CreateIndex
CREATE INDEX "ShortComment_shortId_createdAt_idx" ON "ShortComment"("shortId", "createdAt");

-- AddForeignKey
ALTER TABLE "Short" ADD CONSTRAINT "Short_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortLike" ADD CONSTRAINT "ShortLike_shortId_fkey" FOREIGN KEY ("shortId") REFERENCES "Short"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortLike" ADD CONSTRAINT "ShortLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortComment" ADD CONSTRAINT "ShortComment_shortId_fkey" FOREIGN KEY ("shortId") REFERENCES "Short"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortComment" ADD CONSTRAINT "ShortComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
