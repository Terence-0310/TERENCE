'use client'

// ============================================
// Watch Party — Player Sync Service
// ============================================
// Manages the sync logic between the local player and the watch party room.
// 
// Key responsibilities:
// 1. Distinguish local vs remote actions (anti-loop)
// 2. Throttle/debounce outgoing events
// 3. Enforce host-controlled sync (only host's actions broadcast)
// 4. Apply remote actions to local player

import type { WatchPartySyncEvent } from './types'
import type { RealtimeChannel } from './realtime'
import { SEEK_THROTTLE_MS, MAX_TIME_DRIFT_SECONDS } from './constants'

// ── Types ──

export type PlayerActions = {
  play: () => void
  pause: () => void
  seek: (time: number) => void
  changeEpisode: (slug: string) => void
  changeServer: (index: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  getIsPlaying: () => boolean
}

export interface SyncServiceOptions {
  channel: RealtimeChannel
  memberId: string
  isHost: boolean
  allowMemberControl: boolean
  onRemotePlay?: (time: number) => void
  onRemotePause?: (time: number) => void
  onRemoteSeek?: (time: number) => void
  onRemoteEpisodeChange?: (slug: string) => void
  onRemoteServerChange?: (index: number) => void
  onRoomClosed?: (reason: string) => void
}

// ── Sync Service ──

export class PlayerSyncService {
  private channel: RealtimeChannel
  private memberId: string
  private isHost: boolean
  private allowMemberControl: boolean
  private options: SyncServiceOptions

  // Anti-loop: flag to suppress re-emitting events received from remote
  private _isApplyingRemote = false
  // Throttle: last seek event timestamp
  private _lastSeekSent = 0
  private _seekThrottleTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: SyncServiceOptions) {
    this.channel = options.channel
    this.memberId = options.memberId
    this.isHost = options.isHost
    this.allowMemberControl = options.allowMemberControl
    this.options = options

    // Listen for remote events
    this.channel.onEvent(this.handleRemoteEvent)
  }

  // ── Public API ──

  /** Whether this member can send control events */
  get canControl(): boolean {
    return this.isHost || this.allowMemberControl
  }

  /** Call when the LOCAL user plays */
  localPlay(currentTime: number): void {
    if (this._isApplyingRemote) return
    if (!this.canControl) return

    this.channel.send({
      type: 'PLAY',
      currentTime,
      senderId: this.memberId,
    })
  }

  /** Call when the LOCAL user pauses */
  localPause(currentTime: number): void {
    if (this._isApplyingRemote) return
    if (!this.canControl) return

    this.channel.send({
      type: 'PAUSE',
      currentTime,
      senderId: this.memberId,
    })
  }

  /** Call when the LOCAL user seeks */
  localSeek(currentTime: number): void {
    if (this._isApplyingRemote) return
    if (!this.canControl) return

    const now = Date.now()
    if (now - this._lastSeekSent < SEEK_THROTTLE_MS) {
      // Throttle: schedule a delayed send
      if (this._seekThrottleTimer) clearTimeout(this._seekThrottleTimer)
      this._seekThrottleTimer = setTimeout(() => {
        this._lastSeekSent = Date.now()
        this.channel.send({
          type: 'SEEK',
          currentTime,
          senderId: this.memberId,
        })
      }, SEEK_THROTTLE_MS)
      return
    }

    this._lastSeekSent = now
    this.channel.send({
      type: 'SEEK',
      currentTime,
      senderId: this.memberId,
    })
  }

  /** Call when the LOCAL user changes episode */
  localChangeEpisode(slug: string, name?: string): void {
    if (this._isApplyingRemote) return
    if (!this.canControl) return

    this.channel.send({
      type: 'CHANGE_EPISODE',
      episodeSlug: slug,
      episodeName: name,
      senderId: this.memberId,
    })
  }

  /** Call when the LOCAL user changes server */
  localChangeServer(index: number): void {
    if (this._isApplyingRemote) return
    if (!this.canControl) return

    this.channel.send({
      type: 'CHANGE_SERVER',
      serverIndex: index,
      senderId: this.memberId,
    })
  }

  /** Request a full state sync (e.g., when joining a room) */
  requestStateSync(): void {
    // Host responds with current state when a new member requests it
    // For now, the poll mechanism handles initial state
  }

  /** Cleanup */
  destroy(): void {
    this.channel.offEvent(this.handleRemoteEvent)
    if (this._seekThrottleTimer) {
      clearTimeout(this._seekThrottleTimer)
    }
  }

  // ── Remote Event Handler ──

  private handleRemoteEvent = (event: WatchPartySyncEvent): void => {
    // Never process our own events
    if ('senderId' in event && event.senderId === this.memberId) return

    // Set anti-loop flag
    this._isApplyingRemote = true

    try {
      switch (event.type) {
        case 'PLAY':
          this.options.onRemotePlay?.(event.currentTime)
          break
        case 'PAUSE':
          this.options.onRemotePause?.(event.currentTime)
          break
        case 'SEEK':
          this.options.onRemoteSeek?.(event.currentTime)
          break
        case 'CHANGE_EPISODE':
          this.options.onRemoteEpisodeChange?.(event.episodeSlug)
          break
        case 'CHANGE_SERVER':
          this.options.onRemoteServerChange?.(event.serverIndex)
          break
        case 'STATE_SYNC':
          // Full state sync (e.g., when joining)
          if (event.isPlaying) {
            this.options.onRemotePlay?.(event.currentTime)
          } else {
            this.options.onRemotePause?.(event.currentTime)
          }
          if (event.episodeSlug) {
            this.options.onRemoteEpisodeChange?.(event.episodeSlug)
          }
          if (event.serverIndex !== undefined) {
            this.options.onRemoteServerChange?.(event.serverIndex)
          }
          break
        case 'ROOM_CLOSED':
          this.options.onRoomClosed?.(event.reason)
          break
        // MEMBER_JOIN, MEMBER_LEAVE, CHAT_MESSAGE handled elsewhere
        default:
          break
      }
    } finally {
      // Clear anti-loop flag after a short delay
      // This ensures any synchronous or immediate async state updates triggered by the
      // callbacks above don't re-emit events
      setTimeout(() => {
        this._isApplyingRemote = false
      }, 500)
    }
  }
}
