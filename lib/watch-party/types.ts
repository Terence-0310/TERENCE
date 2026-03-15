export type WatchRoomVisibility = 'public' | 'private'
export type WatchRoomType = 'group' | 'couple'
export type WatchRoomStatus = 'live' | 'upcoming' | 'waiting' | 'closed'
export type PlaybackState = 'playing' | 'paused'

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
  episodeId?: string
  roomName: string
  roomType: WatchRoomType
  visibility: WatchRoomVisibility
  roomMode: 'cinema' | 'couple' | 'party'
  passwordHash?: string
  maxMembers: number
  allowMemberControl: boolean
  chatEnabled: boolean
  reactionsEnabled: boolean
  status: WatchRoomStatus
  scheduledAt?: string
  currentPlaybackTime: number
  playbackState: PlaybackState
  createdAt: string
  updatedAt: string
}

export type MemberRole = 'host' | 'cohost' | 'member' | 'guest'

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
}

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

export type WatchRoomEventType =
  | 'play'
  | 'pause'
  | 'seek'
  | 'episode_change'
  | 'sync_state'
  | 'lock'
  | 'kick'

export interface WatchRoomEventPayload {
  time?: number
  episodeId?: string
  targetMemberId?: string
}

export interface WatchRoomEvent {
  id: string
  roomCode: string
  type: WatchRoomEventType
  payload: WatchRoomEventPayload
  createdAt: string
}

