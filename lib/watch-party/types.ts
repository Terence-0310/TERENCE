// ============================================
// Watch Party — Type Definitions
// ============================================
// Unified types for rooms, members, messages, sync events, and call state.
// Used by both client and server code.

// ── Room Types ──

export type WatchRoomVisibility = 'public' | 'private'
export type WatchRoomType = 'duo' | 'small_group' | 'group_chat'
export type WatchRoomStatus = 'live' | 'upcoming' | 'waiting' | 'closed'
export type PlaybackState = 'playing' | 'paused'
export type MemberRole = 'host' | 'cohost' | 'member' | 'guest'

export interface UserSummary {
  id: string
  name: string
  avatarUrl?: string
}

export interface WatchRoom {
  id: string
  code: string
  host: UserSummary
  movieId: string
  movieSlug?: string
  movieTitle?: string
  episodeId?: string
  episodeName?: string
  serverIndex: number
  roomName: string
  roomType: WatchRoomType
  visibility: WatchRoomVisibility
  passwordHash?: string
  maxMembers: number
  isLocked?: boolean
  allowMemberControl: boolean
  chatEnabled: boolean
  reactionsEnabled: boolean
  status: WatchRoomStatus
  scheduledAt?: string
  currentPlaybackTime: number
  playbackState: PlaybackState
  posterUrl?: string
  /** TCoin room-theme perk: host-selected theme id applied to the whole room. */
  theme?: string | null
  createdAt: string
  updatedAt: string
}

// ── Member Types ──

export interface WatchRoomMember {
  id: string
  roomCode: string
  userId?: string
  guestName?: string
  role: MemberRole
  joinedAt: string
  leftAt?: string
  isReady: boolean
  isOnline: boolean
  lastPingAt: string
  isMuted?: boolean
  isCameraOn?: boolean
  /** Avatar URL of the underlying user account (null for guests). */
  avatar?: string | null
  /** TCoin avatar-frame perk active. */
  frameActive?: boolean
  /** TCoin exclusive-badge perk active. */
  badgeActive?: boolean
}

// ── Message Types ──

export type WatchRoomMessageType = 'chat' | 'system'

export interface WatchRoomMessage {
  id: string
  roomCode: string
  senderId?: string
  senderName: string
  type: WatchRoomMessageType
  content: string
  createdAt: string
}

// ── Sync Events ──
// These are the events that flow via the realtime channel.
// Each event has a discriminated `type` field.

export type WatchPartySyncEvent =
  | { type: 'PLAY'; currentTime: number; senderId: string }
  | { type: 'PAUSE'; currentTime: number; senderId: string }
  | { type: 'SEEK'; currentTime: number; senderId: string }
  | { type: 'CHANGE_EPISODE'; episodeSlug: string; episodeName?: string; senderId: string }
  | { type: 'CHANGE_SERVER'; serverIndex: number; senderId: string }
  | { type: 'STATE_SYNC'; currentTime: number; isPlaying: boolean; episodeSlug?: string; serverIndex: number; senderId: string }
  | { type: 'MEMBER_JOIN'; member: WatchRoomMember }
  | { type: 'MEMBER_LEAVE'; memberId: string; memberName: string }
  | { type: 'CHAT_MESSAGE'; message: WatchRoomMessage }
  | { type: 'ROOM_CLOSED'; reason: string }

// ── Room Event Log (for API persistence) ──

export type WatchRoomEventType =
  | 'play'
  | 'pause'
  | 'seek'
  | 'episode_change'
  | 'server_change'
  | 'sync_state'
  | 'lock'
  | 'kick'

export interface WatchRoomEventPayload {
  time?: number
  episodeId?: string
  episodeSlug?: string
  serverIndex?: number
  targetMemberId?: string
}

export interface WatchRoomEvent {
  id: string
  roomCode: string
  type: WatchRoomEventType
  payload: WatchRoomEventPayload
  senderId: string
  createdAt: string
}

// ── Call State ──

export type CallParticipant = {
  peerId: string
  memberId: string
  memberName: string
  isMuted: boolean
  isCameraOn: boolean
  stream?: MediaStream
}

export interface RoomCallState {
  isActive: boolean
  participants: CallParticipant[]
}

// ── Create Room Input ──

export interface CreateRoomInput {
  roomName: string
  roomType: WatchRoomType
  visibility: WatchRoomVisibility
  movieId: string
  movieSlug?: string
  movieTitle?: string
  episodeId?: string
  episodeName?: string
  serverIndex?: number
  maxMembers: number
  allowMemberControl?: boolean
  chatEnabled?: boolean
  reactionsEnabled?: boolean
  password?: string
  scheduledAt?: string
  posterUrl?: string
}

// ── Realtime Channel Names ──

export function getRoomChannelName(code: string): string {
  return `watch-party:${code}`
}

export function getRoomCallChannelName(code: string): string {
  return `watch-party-call:${code}`
}
