-- TCoin perk application fields
-- Adds denormalised perk state to User, an early-access embargo to Movie,
-- and a per-room theme to WatchPartyRoom so redeemed perks can be applied
-- across the product (avatar frame, chat badge, early access, room theme).

ALTER TABLE "User" ADD COLUMN "avatarFrameUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "exclusiveBadgeUntil" TIMESTAMP(3);

ALTER TABLE "Movie" ADD COLUMN "earlyAccessUntil" TIMESTAMP(3);

ALTER TABLE "WatchPartyRoom" ADD COLUMN "theme" TEXT;
