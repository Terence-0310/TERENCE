const randomUUID = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).substring(2) + Date.now().toString(36)
import type {
  PlaybackState,
  UserSummary,
  WatchRoom,
  WatchRoomEvent,
  WatchRoomEventPayload,
  WatchRoomEventType,
  WatchRoomMember,
  WatchRoomMessage,
  WatchRoomStatus,
  WatchRoomType,
  WatchRoomVisibility,
} from './types'

type CreateRoomInput = {
  roomName: string
  roomType: WatchRoomType
  visibility: WatchRoomVisibility
  roomMode: WatchRoom['roomMode']
  movieId: string
  episodeId?: string
  maxMembers: number
  allowMemberControl: boolean
  chatEnabled: boolean
  reactionsEnabled: boolean
  password?: string
  scheduledAt?: string
}

type ListRoomsFilters = {
  status?: WatchRoomStatus
  visibility?: WatchRoomVisibility
  roomType?: WatchRoomType
  limit?: number
}

const rooms = new Map<string, WatchRoom>()
const members = new Map<string, WatchRoomMember[]>()
const messages = new Map<string, WatchRoomMessage[]>()

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// ── Seed demo data ──
function seedDemoRooms() {
  if (rooms.size > 0) return

  const now = new Date().toISOString()
  const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

  const demoRooms: Array<{
    code: string
    roomName: string
    movieId: string
    status: WatchRoomStatus
    host: { id: string; name: string }
    maxMembers: number
    roomMode: WatchRoom['roomMode']
    roomType: WatchRoomType
    memberNames: string[]
    scheduledAt?: string
  }> = [
    {
      code: 'PHIM01',
      roomName: '🎬 Xem chung: Avengers Endgame',
      movieId: '299534',
      status: 'live',
      host: { id: 'u1', name: 'Minh Anh' },
      maxMembers: 20,
      roomMode: 'cinema',
      roomType: 'group',
      memberNames: ['Hoàng', 'Linh', 'Tuấn'],
    },
    {
      code: 'PHIM02',
      roomName: '💑 Date Night: Your Name',
      movieId: '372058',
      status: 'live',
      host: { id: 'u2', name: 'Thu Hà' },
      maxMembers: 2,
      roomMode: 'couple',
      roomType: 'couple',
      memberNames: ['Đức'],
    },
    {
      code: 'PHIM03',
      roomName: '🍿 Công chiếu: Dune Part 3',
      movieId: '693134',
      status: 'upcoming',
      host: { id: 'u3', name: 'Admin Terence' },
      maxMembers: 50,
      roomMode: 'cinema',
      roomType: 'group',
      memberNames: ['Huy', 'Lan', 'Phương', 'Quang', 'Nhung'],
      scheduledAt: futureDate,
    },
    {
      code: 'PHIM04',
      roomName: '🎉 Party: Spider-Man',
      movieId: '634649',
      status: 'waiting',
      host: { id: 'u4', name: 'Khoa' },
      maxMembers: 12,
      roomMode: 'party',
      roomType: 'group',
      memberNames: ['Trâm', 'Bảo'],
    },
  ]

  for (const d of demoRooms) {
    const room: WatchRoom = {
      id: d.code.toLowerCase(),
      code: d.code,
      host: d.host,
      movieId: d.movieId,
      roomName: d.roomName,
      roomType: d.roomType,
      visibility: 'public',
      roomMode: d.roomMode,
      maxMembers: d.maxMembers,
      allowMemberControl: false,
      chatEnabled: true,
      reactionsEnabled: true,
      status: d.status,
      scheduledAt: d.scheduledAt,
      currentPlaybackTime: d.status === 'live' ? Math.floor(Math.random() * 3600) : 0,
      playbackState: d.status === 'live' ? 'playing' : 'paused',
      createdAt: now,
      updatedAt: now,
    }
    rooms.set(d.code, room)

    const hostMember: WatchRoomMember = {
      id: `${d.code}-host`,
      roomCode: d.code,
      userId: d.host.id,
      role: 'host',
      joinedAt: now,
      isReady: true,
      isOnline: true,
      lastPingAt: now,
    }
    const otherMembers: WatchRoomMember[] = d.memberNames.map((name, i) => ({
      id: `${d.code}-m${i}`,
      roomCode: d.code,
      guestName: name,
      role: 'member' as const,
      joinedAt: now,
      isReady: true,
      isOnline: Math.random() > 0.3,
      lastPingAt: now,
    }))
    members.set(d.code, [hostMember, ...otherMembers])

    messages.set(d.code, [
      { id: `${d.code}-msg0`, roomCode: d.code, senderName: 'Hệ thống', type: 'system', content: `${d.host.name} đã tạo phòng`, createdAt: now },
      { id: `${d.code}-msg1`, roomCode: d.code, senderName: d.host.name, senderId: d.host.id, type: 'chat', content: 'Chào mọi người! Chuẩn bị xem nào 🎬', createdAt: now },
    ])
  }
}

seedDemoRooms()

export function createRoom(input: CreateRoomInput, host: UserSummary): { room: WatchRoom; hostMember: WatchRoomMember } {
  const now = new Date().toISOString()
  const code = generateCode()
  const room: WatchRoom = {
    id: randomUUID(),
    code,
    host,
    movieId: input.movieId,
    episodeId: input.episodeId,
    roomName: input.roomName,
    roomType: input.roomType,
    visibility: input.visibility,
    roomMode: input.roomMode,
    passwordHash: input.password,
    maxMembers: input.maxMembers,
    allowMemberControl: input.allowMemberControl,
    chatEnabled: input.chatEnabled,
    reactionsEnabled: input.reactionsEnabled,
    status: input.scheduledAt ? 'upcoming' : 'waiting',
    scheduledAt: input.scheduledAt,
    currentPlaybackTime: 0,
    playbackState: 'paused',
    createdAt: now,
    updatedAt: now,
  }

  rooms.set(code, room)

  const hostMember: WatchRoomMember = {
    id: randomUUID(),
    roomCode: code,
    userId: host.id,
    role: 'host',
    joinedAt: now,
    isReady: false,
    isOnline: true,
    lastPingAt: now,
  }

  members.set(code, [hostMember])
  messages.set(code, [])

  return { room, hostMember }
}

export function listRooms(filters: ListRoomsFilters = {}): WatchRoom[] {
  let values = Array.from(rooms.values())

  if (filters.status) values = values.filter((r) => r.status === filters.status)
  if (filters.visibility) values = values.filter((r) => r.visibility === filters.visibility)
  if (filters.roomType) values = values.filter((r) => r.roomType === filters.roomType)

  values.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  const limit = filters.limit ?? 20
  return values.slice(0, limit)
}

export function getRoomByCode(code: string): WatchRoom | undefined {
  return rooms.get(code)
}

export function getMembers(code: string): WatchRoomMember[] {
  return members.get(code) ?? []
}

export function getMessages(code: string, limit = 50): WatchRoomMessage[] {
  const all = messages.get(code) ?? []
  return all.slice(-limit)
}

export function joinRoom(
  code: string,
  user: { id?: string; name: string },
  options: { password?: string },
): { room: WatchRoom; member: WatchRoomMember } {
  const room = rooms.get(code)
  if (!room) throw new Error('ROOM_NOT_FOUND')

  if (room.passwordHash && room.passwordHash !== options.password) {
    throw new Error('INVALID_PASSWORD')
  }

  const roomMembers = members.get(code) ?? []
  if (roomMembers.length >= room.maxMembers) {
    throw new Error('ROOM_FULL')
  }

  const now = new Date().toISOString()
  const member: WatchRoomMember = {
    id: randomUUID(),
    roomCode: code,
    userId: user.id,
    guestName: user.id ? undefined : user.name,
    role: 'member',
    joinedAt: now,
    isReady: false,
    isOnline: true,
    lastPingAt: now,
  }

  members.set(code, [...roomMembers, member])

  const joinMessage: WatchRoomMessage = {
    id: randomUUID(),
    roomCode: code,
    senderName: 'Hệ thống',
    type: 'system',
    content: `${user.name} đã tham gia phòng`,
    createdAt: now,
  }
  const roomMessages = messages.get(code) ?? []
  messages.set(code, [...roomMessages, joinMessage])

  return { room, member }
}

export function leaveRoom(code: string, memberId: string): void {
  const room = rooms.get(code)
  if (!room) return

  const roomMembers = members.get(code) ?? []
  const member = roomMembers.find((m) => m.id === memberId)
  if (!member) return

  const now = new Date().toISOString()
  member.leftAt = now
  member.isOnline = false

  const remaining = roomMembers.filter((m) => m.id !== memberId && !m.leftAt)
  members.set(code, remaining)

  const leaveMessage: WatchRoomMessage = {
    id: randomUUID(),
    roomCode: code,
    senderName: 'Hệ thống',
    type: 'system',
    content: `${member.guestName ?? 'Thành viên'} đã rời phòng`,
    createdAt: now,
  }
  const roomMessages = messages.get(code) ?? []
  messages.set(code, [...roomMessages, leaveMessage])

  if (remaining.length === 0) {
    rooms.delete(code)
    members.delete(code)
    messages.delete(code)
  }
}

export function addMessage(code: string, sender: UserSummary | { name: string }, content: string): WatchRoomMessage {
  const now = new Date().toISOString()
  const message: WatchRoomMessage = {
    id: randomUUID(),
    roomCode: code,
    senderId: 'id' in sender ? sender.id : undefined,
    senderName: sender.name,
    type: 'chat',
    content,
    createdAt: now,
  }
  const roomMessages = messages.get(code) ?? []
  messages.set(code, [...roomMessages, message])
  return message
}

export function updatePlayback(
  code: string,
  payload: { time?: number; state?: PlaybackState; episodeId?: string },
): WatchRoom | undefined {
  const room = rooms.get(code)
  if (!room) return

  const now = new Date().toISOString()
  const updated: WatchRoom = {
    ...room,
    currentPlaybackTime: payload.time ?? room.currentPlaybackTime,
    playbackState: payload.state ?? room.playbackState,
    episodeId: payload.episodeId ?? room.episodeId,
    updatedAt: now,
  }
  rooms.set(code, updated)
  return updated
}

export function addEvent(
  code: string,
  type: WatchRoomEventType,
  payload: WatchRoomEventPayload,
): WatchRoomEvent | undefined {
  const room = rooms.get(code)
  if (!room) return

  const now = new Date().toISOString()
  const event: WatchRoomEvent = {
    id: randomUUID(),
    roomCode: code,
    type,
    payload,
    createdAt: now,
  }
  // For MVP we don't persist events separately – could be added later.
  return event
}

