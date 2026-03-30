// ============================================
// Watch Party — Repository Layer
// ============================================
// All Prisma queries for watch party models.
// Used by service layer, never called directly from routes.

import { prisma } from '@/lib/db'

// ── Room ──

export async function createRoomRecord(data: {
  roomCode: string
  title: string
  hostUserId?: string | null
  movieId?: string | null
  episodeId?: string | null
  shareCode?: string | null
}) {
  return prisma.watchPartyRoom.create({
    data: {
      roomCode: data.roomCode,
      title: data.title,
      hostUserId: data.hostUserId ?? null,
      movieId: data.movieId ?? null,
      episodeId: data.episodeId ?? null,
      shareCode: data.shareCode ?? null,
      status: 'ACTIVE',
    },
  })
}

export async function findRoomByCode(roomCode: string) {
  return prisma.watchPartyRoom.findUnique({
    where: { roomCode },
    include: {
      host: { select: { id: true, name: true, avatar: true } },
      participants: {
        where: { leftAt: null },
        orderBy: { joinedAt: 'asc' },
      },
      state: true,
    },
  })
}

export async function findActiveRooms(limit = 20) {
  return prisma.watchPartyRoom.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      host: { select: { id: true, name: true } },
      _count: { select: { participants: { where: { leftAt: null, isOnline: true } } } },
    },
  })
}

export async function updateRoomStatus(roomCode: string, status: 'ACTIVE' | 'ENDED') {
  return prisma.watchPartyRoom.update({
    where: { roomCode },
    data: { status, updatedAt: new Date() },
  })
}

export async function updateRoomSyncTimestamp(roomCode: string) {
  return prisma.watchPartyRoom.update({
    where: { roomCode },
    data: { lastSyncedAt: new Date() },
  })
}

// ── Participant ──

export async function createParticipant(data: {
  roomId: string
  userId?: string | null
  displayName: string
  role: 'HOST' | 'MEMBER' | 'GUEST'
}) {
  return prisma.watchPartyParticipant.create({
    data: {
      roomId: data.roomId,
      userId: data.userId ?? null,
      displayName: data.displayName,
      role: data.role,
      isOnline: true,
      lastSeenAt: new Date(),
    },
  })
}

export async function findParticipant(roomId: string, identity: { userId?: string; displayName?: string }) {
  if (identity.userId) {
    return prisma.watchPartyParticipant.findFirst({
      where: { roomId, userId: identity.userId, leftAt: null },
    })
  }
  if (identity.displayName) {
    return prisma.watchPartyParticipant.findFirst({
      where: { roomId, displayName: identity.displayName, leftAt: null },
    })
  }
  return null
}

export async function markParticipantOffline(participantId: string) {
  return prisma.watchPartyParticipant.update({
    where: { id: participantId },
    data: { isOnline: false, leftAt: new Date() },
  })
}

export async function markParticipantOnline(participantId: string) {
  return prisma.watchPartyParticipant.update({
    where: { id: participantId },
    data: { isOnline: true, leftAt: null, lastSeenAt: new Date() },
  })
}

export async function getOnlineParticipants(roomId: string) {
  return prisma.watchPartyParticipant.findMany({
    where: { roomId, leftAt: null, isOnline: true },
    orderBy: { joinedAt: 'asc' },
  })
}

export async function countOnlineParticipants(roomId: string) {
  return prisma.watchPartyParticipant.count({
    where: { roomId, leftAt: null, isOnline: true },
  })
}

// ── State ──

export async function createState(data: {
  roomId: string
  movieId?: string | null
  episodeId?: string | null
}) {
  return prisma.watchPartyState.create({
    data: {
      roomId: data.roomId,
      movieId: data.movieId ?? null,
      episodeId: data.episodeId ?? null,
      playbackTime: 0,
      isPlaying: false,
      playbackRate: 1,
      version: 1,
    },
  })
}

export async function getState(roomId: string) {
  return prisma.watchPartyState.findUnique({ where: { roomId } })
}

export async function updateState(
  roomId: string,
  data: {
    playbackTime?: number
    isPlaying?: boolean
    playbackRate?: number
    lastEventType?: string
    lastEventBy?: string
    episodeId?: string | null
    movieId?: string | null
  },
) {
  return prisma.watchPartyState.update({
    where: { roomId },
    data: {
      ...data,
      version: { increment: 1 },
    },
  })
}

// ── Messages ──

export async function createMessage(data: {
  roomId: string
  participantId?: string | null
  senderName: string
  type: 'chat' | 'system' | 'reaction'
  content: string
}) {
  return prisma.watchPartyMessage.create({
    data: {
      roomId: data.roomId,
      participantId: data.participantId ?? null,
      senderName: data.senderName,
      type: data.type,
      content: data.content,
    },
  })
}

export async function getMessages(roomId: string, limit = 100, cursor?: string) {
  return prisma.watchPartyMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })
}

export async function getMessagesSince(roomId: string, since: Date) {
  return prisma.watchPartyMessage.findMany({
    where: { roomId, createdAt: { gt: since } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
}

export async function countMessages(roomId: string) {
  return prisma.watchPartyMessage.count({ where: { roomId } })
}

// ── Host Transfer ──

export async function findParticipantById(participantId: string) {
  return prisma.watchPartyParticipant.findUnique({ where: { id: participantId } })
}

export async function transferHost(roomId: string, oldHostId: string, newHostId: string) {
  // Demote old host, promote new host
  await prisma.$transaction([
    prisma.watchPartyParticipant.update({
      where: { id: oldHostId },
      data: { role: 'MEMBER' },
    }),
    prisma.watchPartyParticipant.update({
      where: { id: newHostId },
      data: { role: 'HOST' },
    }),
  ])
}

export async function updateRoomHost(roomCode: string, newHostUserId: string | null) {
  return prisma.watchPartyRoom.update({
    where: { roomCode },
    data: { hostUserId: newHostUserId },
  })
}

export async function getNextEligibleHost(roomId: string, excludeId: string) {
  return prisma.watchPartyParticipant.findFirst({
    where: {
      roomId,
      id: { not: excludeId },
      isOnline: true,
      leftAt: null,
    },
    orderBy: { joinedAt: 'asc' },
  })
}
