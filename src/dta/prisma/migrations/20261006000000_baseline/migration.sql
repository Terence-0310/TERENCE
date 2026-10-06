-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'EDITOR', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "MovieType" AS ENUM ('MOVIE', 'SERIES', 'ANIME', 'TRAILER', 'SHORT');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('HLS', 'MP4', 'DASH', 'IFRAME', 'YOUTUBE');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('ACTIVE', 'MISSING', 'BROKEN', 'PENDING');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "PartyMemberRole" AS ENUM ('HOST', 'CO_HOST', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "PersonRoleType" AS ENUM ('ACTOR', 'DIRECTOR', 'PRODUCER', 'WRITER', 'CREATOR', 'OTHER');

-- CreateEnum
CREATE TYPE "MetadataSourceType" AS ENUM ('TMDB', 'IMDB', 'OPHIM', 'KKPHIM', 'MANUAL', 'INTERNAL');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "SyncLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "avatar" TEXT,
    "image" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" TIMESTAMP(3),
    "bio" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "blockedReason" TEXT,
    "avatarFrameUntil" TIMESTAMP(3),
    "exclusiveBadgeUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
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
    "rating" DOUBLE PRECISION DEFAULT 0,
    "ageRating" TEXT,
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
    "matchConfidence" DOUBLE PRECISION,
    "sourceStatus" TEXT NOT NULL DEFAULT 'pending',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "earlyAccessUntil" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoSource" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'hls',
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Main',
    "mimeType" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "drmType" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtitleTrack" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "kind" TEXT NOT NULL DEFAULT 'subtitles',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubtitleTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tmdbId" INTEGER,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieGenre" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieCountry" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "originalName" TEXT,
    "tmdbId" INTEGER,
    "imdbId" TEXT,
    "profileUrl" TEXT,
    "biography" TEXT,
    "birthDate" TIMESTAMP(3),
    "deathDate" TIMESTAMP(3),
    "gender" INTEGER,
    "knownFor" TEXT,
    "popularity" DOUBLE PRECISION DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoviePerson" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'actor',
    "character" TEXT,
    "department" TEXT,
    "job" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoviePerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieSource" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceId" TEXT,
    "quality" TEXT,
    "language" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "confidence" DOUBLE PRECISION,
    "notes" TEXT,
    "metadata" TEXT,
    "lastChecked" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "episodeId" TEXT,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastWatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "currentTime" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "deviceType" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT,
    "coverImage" TEXT,
    "authorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "tags" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'CREDIT',
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "provider" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TCoinPackage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "bonusAmount" INTEGER NOT NULL DEFAULT 0,
    "priceVnd" INTEGER NOT NULL,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TCoinPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopupOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "coinAmount" INTEGER NOT NULL,
    "bonusAmount" INTEGER NOT NULL,
    "transferContent" TEXT NOT NULL,
    "qrImageUrl" TEXT,
    "status" TEXT NOT NULL,
    "matchedBankTxnId" TEXT,
    "matchedBankAccount" TEXT,
    "matchedBankAmount" INTEGER,
    "matchedBankContent" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopupOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankWebhookLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT,
    "rawPayload" JSONB NOT NULL,
    "signature" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "transactionId" TEXT,
    "orderCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advertisement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "duration" INTEGER,
    "mediaUrl" TEXT NOT NULL,
    "targetUrl" TEXT,
    "skipAfterSeconds" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "impressionCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdImpression" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "placement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdImpression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchPartyRoom" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hostUserId" TEXT,
    "movieId" TEXT,
    "episodeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "shareCode" TEXT,
    "maxMembers" INTEGER NOT NULL DEFAULT 10,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "WatchPartyRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchPartyParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "WatchPartyParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchPartyMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "participantId" TEXT,
    "senderName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'chat',
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchPartyMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchPartyState" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "movieId" TEXT,
    "episodeId" TEXT,
    "playbackTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPlaying" BOOLEAN NOT NULL DEFAULT false,
    "playbackRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "lastEventType" TEXT,
    "lastEventBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchPartyState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL DEFAULT 'unknown',
    "resourceId" TEXT,
    "targetUserId" TEXT,
    "metadataJson" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permissionId" TEXT NOT NULL,
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "scope" TEXT,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "movieId" TEXT,
    "shortId" TEXT,
    "userId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
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
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "syncJobId" TEXT,
    "movieId" TEXT,
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT,
    "context" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "group" TEXT NOT NULL DEFAULT 'general',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieReport" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "userId" TEXT,
    "episodeSlug" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MovieReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_ophimId_key" ON "Movie"("ophimId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");

-- CreateIndex
CREATE INDEX "Movie_slug_idx" ON "Movie"("slug");

-- CreateIndex
CREATE INDEX "Movie_title_idx" ON "Movie"("title");

-- CreateIndex
CREATE INDEX "Movie_originalTitle_idx" ON "Movie"("originalTitle");

-- CreateIndex
CREATE INDEX "Movie_year_idx" ON "Movie"("year");

-- CreateIndex
CREATE INDEX "Movie_tmdbId_idx" ON "Movie"("tmdbId");

-- CreateIndex
CREATE INDEX "Movie_imdbId_idx" ON "Movie"("imdbId");

-- CreateIndex
CREATE INDEX "Movie_isActive_idx" ON "Movie"("isActive");

-- CreateIndex
CREATE INDEX "Movie_contentType_idx" ON "Movie"("contentType");

-- CreateIndex
CREATE INDEX "Movie_status_idx" ON "Movie"("status");

-- CreateIndex
CREATE INDEX "Movie_isPublished_idx" ON "Movie"("isPublished");

-- CreateIndex
CREATE INDEX "Movie_isFeatured_idx" ON "Movie"("isFeatured");

-- CreateIndex
CREATE INDEX "Movie_lastSyncedAt_idx" ON "Movie"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "Episode_movieId_idx" ON "Episode"("movieId");

-- CreateIndex
CREATE INDEX "Episode_episodeNumber_idx" ON "Episode"("episodeNumber");

-- CreateIndex
CREATE INDEX "Episode_title_idx" ON "Episode"("title");

-- CreateIndex
CREATE INDEX "Episode_episodeSlug_idx" ON "Episode"("episodeSlug");

-- CreateIndex
CREATE INDEX "Episode_slug_idx" ON "Episode"("slug");

-- CreateIndex
CREATE INDEX "Episode_isActive_idx" ON "Episode"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_movieId_episodeNumber_serverName_key" ON "Episode"("movieId", "episodeNumber", "serverName");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_movieId_slug_key" ON "Episode"("movieId", "slug");

-- CreateIndex
CREATE INDEX "VideoSource_episodeId_idx" ON "VideoSource"("episodeId");

-- CreateIndex
CREATE INDEX "VideoSource_sourceType_idx" ON "VideoSource"("sourceType");

-- CreateIndex
CREATE INDEX "VideoSource_isPrimary_isActive_idx" ON "VideoSource"("isPrimary", "isActive");

-- CreateIndex
CREATE INDEX "VideoSource_isActive_idx" ON "VideoSource"("isActive");

-- CreateIndex
CREATE INDEX "SubtitleTrack_episodeId_idx" ON "SubtitleTrack"("episodeId");

-- CreateIndex
CREATE INDEX "SubtitleTrack_lang_idx" ON "SubtitleTrack"("lang");

-- CreateIndex
CREATE INDEX "SubtitleTrack_isDefault_isActive_idx" ON "SubtitleTrack"("isDefault", "isActive");

-- CreateIndex
CREATE INDEX "SubtitleTrack_isActive_idx" ON "SubtitleTrack"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_tmdbId_key" ON "Genre"("tmdbId");

-- CreateIndex
CREATE INDEX "Genre_slug_idx" ON "Genre"("slug");

-- CreateIndex
CREATE INDEX "Genre_isActive_idx" ON "Genre"("isActive");

-- CreateIndex
CREATE INDEX "MovieGenre_movieId_idx" ON "MovieGenre"("movieId");

-- CreateIndex
CREATE INDEX "MovieGenre_genreId_idx" ON "MovieGenre"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "MovieGenre_movieId_genreId_key" ON "MovieGenre"("movieId", "genreId");

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
CREATE INDEX "MoviePerson_sortOrder_idx" ON "MoviePerson"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MoviePerson_movieId_personId_role_key" ON "MoviePerson"("movieId", "personId", "role");

-- CreateIndex
CREATE INDEX "MovieSource_movieId_idx" ON "MovieSource"("movieId");

-- CreateIndex
CREATE INDEX "MovieSource_sourceName_idx" ON "MovieSource"("sourceName");

-- CreateIndex
CREATE INDEX "MovieSource_isActive_idx" ON "MovieSource"("isActive");

-- CreateIndex
CREATE INDEX "MovieSource_isPrimary_isActive_idx" ON "MovieSource"("isPrimary", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MovieSource_movieId_sourceName_sourceId_key" ON "MovieSource"("movieId", "sourceName", "sourceId");

-- CreateIndex
CREATE INDEX "WatchHistory_userId_idx" ON "WatchHistory"("userId");

-- CreateIndex
CREATE INDEX "WatchHistory_userId_lastWatchedAt_idx" ON "WatchHistory"("userId", "lastWatchedAt");

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

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_movieId_idx" ON "Favorite"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_movieId_key" ON "Favorite"("userId", "movieId");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_movieId_idx" ON "Review"("movieId");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_userId_movieId_key" ON "Review"("userId", "movieId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsPost_slug_key" ON "NewsPost"("slug");

-- CreateIndex
CREATE INDEX "NewsPost_slug_idx" ON "NewsPost"("slug");

-- CreateIndex
CREATE INDEX "NewsPost_status_idx" ON "NewsPost"("status");

-- CreateIndex
CREATE INDEX "NewsPost_publishedAt_idx" ON "NewsPost"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_idx" ON "WalletTransaction"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TCoinPackage_slug_key" ON "TCoinPackage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TopupOrder_code_key" ON "TopupOrder"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TopupOrder_matchedBankTxnId_key" ON "TopupOrder"("matchedBankTxnId");

-- CreateIndex
CREATE INDEX "TopupOrder_userId_idx" ON "TopupOrder"("userId");

-- CreateIndex
CREATE INDEX "TopupOrder_code_idx" ON "TopupOrder"("code");

-- CreateIndex
CREATE INDEX "Advertisement_placement_isActive_priority_idx" ON "Advertisement"("placement", "isActive", "priority");

-- CreateIndex
CREATE INDEX "Advertisement_isActive_startAt_endAt_idx" ON "Advertisement"("isActive", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "AdImpression_adId_createdAt_idx" ON "AdImpression"("adId", "createdAt");

-- CreateIndex
CREATE INDEX "AdImpression_userId_idx" ON "AdImpression"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchPartyRoom_roomCode_key" ON "WatchPartyRoom"("roomCode");

-- CreateIndex
CREATE UNIQUE INDEX "WatchPartyRoom_shareCode_key" ON "WatchPartyRoom"("shareCode");

-- CreateIndex
CREATE INDEX "WatchPartyRoom_status_idx" ON "WatchPartyRoom"("status");

-- CreateIndex
CREATE INDEX "WatchPartyRoom_hostUserId_idx" ON "WatchPartyRoom"("hostUserId");

-- CreateIndex
CREATE INDEX "WatchPartyRoom_roomCode_idx" ON "WatchPartyRoom"("roomCode");

-- CreateIndex
CREATE INDEX "WatchPartyRoom_createdAt_idx" ON "WatchPartyRoom"("createdAt");

-- CreateIndex
CREATE INDEX "WatchPartyParticipant_roomId_idx" ON "WatchPartyParticipant"("roomId");

-- CreateIndex
CREATE INDEX "WatchPartyParticipant_userId_idx" ON "WatchPartyParticipant"("userId");

-- CreateIndex
CREATE INDEX "WatchPartyParticipant_roomId_isOnline_idx" ON "WatchPartyParticipant"("roomId", "isOnline");

-- CreateIndex
CREATE INDEX "WatchPartyParticipant_roomId_status_idx" ON "WatchPartyParticipant"("roomId", "status");

-- CreateIndex
CREATE INDEX "WatchPartyMessage_roomId_idx" ON "WatchPartyMessage"("roomId");

-- CreateIndex
CREATE INDEX "WatchPartyMessage_roomId_createdAt_idx" ON "WatchPartyMessage"("roomId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchPartyState_roomId_key" ON "WatchPartyState"("roomId");

-- CreateIndex
CREATE INDEX "WatchPartyState_roomId_idx" ON "WatchPartyState"("roomId");

-- CreateIndex
CREATE INDEX "AdminLog_actorId_createdAt_idx" ON "AdminLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminLog_resource_createdAt_idx" ON "AdminLog"("resource", "createdAt");

-- CreateIndex
CREATE INDEX "AdminLog_action_createdAt_idx" ON "AdminLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permissionId_scope_key" ON "RolePermission"("role", "permissionId", "scope");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE INDEX "UserPermission_permissionId_idx" ON "UserPermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permissionId_scope_key" ON "UserPermission"("userId", "permissionId", "scope");

-- CreateIndex
CREATE INDEX "PageView_path_idx" ON "PageView"("path");

-- CreateIndex
CREATE INDEX "PageView_movieId_idx" ON "PageView"("movieId");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "SyncJob_movieId_idx" ON "SyncJob"("movieId");

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
CREATE INDEX "SyncLog_level_idx" ON "SyncLog"("level");

-- CreateIndex
CREATE INDEX "SyncLog_createdAt_idx" ON "SyncLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_group_idx" ON "SystemSetting"("group");

-- CreateIndex
CREATE INDEX "SystemSetting_isPublic_idx" ON "SystemSetting"("isPublic");

-- CreateIndex
CREATE INDEX "MovieReport_movieId_idx" ON "MovieReport"("movieId");

-- CreateIndex
CREATE INDEX "MovieReport_userId_idx" ON "MovieReport"("userId");

-- CreateIndex
CREATE INDEX "MovieReport_status_idx" ON "MovieReport"("status");

-- CreateIndex
CREATE INDEX "MovieReport_createdAt_idx" ON "MovieReport"("createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSource" ADD CONSTRAINT "VideoSource_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtitleTrack" ADD CONSTRAINT "SubtitleTrack_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieGenre" ADD CONSTRAINT "MovieGenre_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieGenre" ADD CONSTRAINT "MovieGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieCountry" ADD CONSTRAINT "MovieCountry_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieCountry" ADD CONSTRAINT "MovieCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoviePerson" ADD CONSTRAINT "MoviePerson_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoviePerson" ADD CONSTRAINT "MoviePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieSource" ADD CONSTRAINT "MovieSource_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchHistory" ADD CONSTRAINT "WatchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchHistory" ADD CONSTRAINT "WatchHistory_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchHistory" ADD CONSTRAINT "WatchHistory_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopupOrder" ADD CONSTRAINT "TopupOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopupOrder" ADD CONSTRAINT "TopupOrder_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "TCoinPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdImpression" ADD CONSTRAINT "AdImpression_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdImpression" ADD CONSTRAINT "AdImpression_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchPartyRoom" ADD CONSTRAINT "WatchPartyRoom_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchPartyRoom" ADD CONSTRAINT "WatchPartyRoom_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchPartyRoom" ADD CONSTRAINT "WatchPartyRoom_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchPartyParticipant" ADD CONSTRAINT "WatchPartyParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "WatchPartyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchPartyParticipant" ADD CONSTRAINT "WatchPartyParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchPartyMessage" ADD CONSTRAINT "WatchPartyMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "WatchPartyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchPartyState" ADD CONSTRAINT "WatchPartyState_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "WatchPartyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "SyncJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieReport" ADD CONSTRAINT "MovieReport_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovieReport" ADD CONSTRAINT "MovieReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

