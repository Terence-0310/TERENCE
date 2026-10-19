import { NextRequest, NextResponse } from 'next/server'
import { createRoomSchema, joinRoomSchema, leaveRoomSchema } from './watch-party.schema'
import * as service from './watch-party.service'
import { WatchPartyError } from './watch-party.service'
import { AuthService } from '@/src/be/modules/auth'

/**
 * The signed-in user's id, or null for guests. Identity always comes from the
 * session — any `userId` in the request body is ignored.
 */
async function getCallerUserId(): Promise<string | null> {
  const user = await AuthService.getCurrentUser()
  return user?.id || null
}

/** Public lobby list for /xem-chung — shaped as the client `WatchRoom` type. */
export async function listRooms() {
  try {
    const rooms = await service.listActiveRooms(30)
    return NextResponse.json({
      rooms: rooms.map((r) => ({
        id: r.id,
        code: r.roomCode,
        host: { id: r.host?.id ?? '', name: r.host?.name ?? 'Khách', avatarUrl: r.host?.avatar ?? undefined },
        movieId: r.movieId ?? '',
        movieSlug: r.movie?.slug,
        movieTitle: r.movie?.title,
        episodeId: r.episodeId ?? undefined,
        serverIndex: 0,
        roomName: r.title,
        roomType: r.maxMembers <= 2 ? 'duo' : r.maxMembers <= 4 ? 'small_group' : 'group_chat',
        visibility: r.isLocked ? 'private' : 'public',
        maxMembers: r.maxMembers,
        isLocked: r.isLocked,
        allowMemberControl: false,
        chatEnabled: true,
        reactionsEnabled: true,
        status: r._count.participants > 0 ? 'live' : 'waiting',
        currentPlaybackTime: 0,
        playbackState: 'paused',
        posterUrl: r.movie?.backdropUrl || r.movie?.posterUrl || r.movie?.thumbUrl || undefined,
        theme: r.theme,
        memberCount: r._count.participants,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list rooms'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function createRoom(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = createRoomSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await service.createRoom({ ...parsed.data, userId: await getCallerUserId() })

    return NextResponse.json({
      room: {
        id: result.room.id,
        code: result.room.roomCode,
        title: result.room.title,
        status: result.room.status,
        movieId: result.room.movieId,
        episodeId: result.room.episodeId,
        maxMembers: result.room.maxMembers,
        roomType: result.room.maxMembers <= 2 ? 'duo' : result.room.maxMembers <= 4 ? 'small_group' : 'group_chat',
        createdAt: result.room.createdAt,
      },
      participant: {
        id: result.hostParticipant.id,
        displayName: result.hostParticipant.displayName,
        role: result.hostParticipant.role,
      },
      state: {
        playbackTime: result.state.playbackTime,
        isPlaying: result.state.isPlaying,
        version: result.state.version,
      },
    }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create room'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function joinRoom(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = joinRoomSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await service.joinRoom({ ...parsed.data, userId: await getCallerUserId() })

    return NextResponse.json({
      room: {
        id: result.room.id,
        code: result.room.roomCode,
        title: result.room.title,
        status: result.room.status,
        movieId: result.room.movieId,
        episodeId: result.room.episodeId,
        maxMembers: result.room.maxMembers,
        isLocked: result.room.isLocked,
        roomType: result.room.maxMembers <= 2 ? 'duo' : result.room.maxMembers <= 4 ? 'small_group' : 'group_chat',
      },
      participant: {
        id: result.participant.id,
        displayName: result.participant.displayName,
        role: result.participant.role,
        isOnline: result.participant.isOnline,
      },
      state: result.state ? {
        playbackTime: result.state.playbackTime,
        isPlaying: result.state.isPlaying,
        playbackRate: result.state.playbackRate,
        episodeId: result.state.episodeId,
        version: result.state.version,
      } : null,
      isRejoin: result.isRejoin,
    })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      const statusMap: Record<string, number> = { ROOM_NOT_FOUND: 404, ROOM_ENDED: 410, ROOM_LOCKED: 403 }
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusMap[err.code] || 400 })
    }
    const message = err instanceof Error ? err.message : 'Failed to join room'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function leaveRoom(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = leaveRoomSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const result = await service.leaveRoom({ ...parsed.data, callerUserId: await getCallerUserId() })

    return NextResponse.json({ ok: true, ended: result.ended, newHost: result.newHost })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      const status = err.code === 'ROOM_NOT_FOUND' || err.code === 'PARTICIPANT_NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 400
      return NextResponse.json({ error: err.message, code: err.code }, { status })
    }
    const message = err instanceof Error ? err.message : 'Failed to leave room'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface RouteContext {
  params: Promise<{ roomCode: string }>
}

export async function getRoom(request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params
    if (!roomCode) {
      return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })
    }

    const room = await service.getRoom(roomCode.toUpperCase())
    const messages = await service.getMessages(roomCode.toUpperCase(), 50)

    const now = Date.now()
    const isActive = (d: Date | null | undefined) => !!d && new Date(d).getTime() > now

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.roomCode,
        title: room.title,
        status: room.status,
        movieId: room.movieId,
        episodeId: room.episodeId,
        hostUserId: room.hostUserId,
        host: room.host,
        maxMembers: room.maxMembers,
        isLocked: room.isLocked,
        theme: room.theme ?? null,
        roomType: room.maxMembers <= 2 ? 'duo' : room.maxMembers <= 4 ? 'small_group' : 'group_chat',
        createdAt: room.createdAt,
        lastSyncedAt: room.lastSyncedAt,
      },
      participants: room.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        displayName: p.displayName,
        guestName: p.displayName,
        avatar: p.user?.avatar ?? null,
        frameActive: isActive(p.user?.avatarFrameUntil),
        badgeActive: isActive(p.user?.exclusiveBadgeUntil),
        role: p.role,
        isOnline: p.isOnline,
        joinedAt: p.joinedAt,
        status: p.status,
      })),
      state: room.state ? {
        playbackTime: room.state.playbackTime,
        isPlaying: room.state.isPlaying,
        playbackRate: room.state.playbackRate,
        episodeId: room.state.episodeId,
        lastEventType: room.state.lastEventType,
        lastEventBy: room.state.lastEventBy,
        version: room.state.version,
        updatedAt: room.state.updatedAt,
      } : null,
      messages: messages.map((m) => ({
        id: m.id,
        roomId: m.roomId,
        senderId: m.participantId,
        senderName: m.senderName,
        type: m.type,
        content: m.content,
        createdAt: m.createdAt,
      })),
    })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.code === 'ROOM_NOT_FOUND' ? 404 : 400 })
    }
    const message = err instanceof Error ? err.message : 'Failed to get room'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function requestJoin(request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params
    if (!roomCode) return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })

    const { requestJoinSchema } = await import('./watch-party.schema')
    const body = await request.json()
    const parsed = requestJoinSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const result = await service.requestJoin({
      roomCode: roomCode.toUpperCase(),
      displayName: parsed.data.displayName,
      userId: await getCallerUserId()
    })

    return NextResponse.json({
      ok: true,
      participant: {
        id: result.participant.id,
        displayName: result.participant.displayName,
        status: result.participant.status
      }
    })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.code === 'ROOM_NOT_FOUND' ? 404 : 400 })
    }
    const message = err instanceof Error ? err.message : 'Failed to request join'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function approveParticipant(request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params
    if (!roomCode) return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })

    const { approveParticipantSchema } = await import('./watch-party.schema')
    const body = await request.json()
    const parsed = approveParticipantSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const result = await service.approveParticipant({
      roomCode: roomCode.toUpperCase(),
      callerUserId: await getCallerUserId(),
      hostParticipantId: parsed.data.hostParticipantId,
      targetParticipantId: parsed.data.targetParticipantId,
      action: parsed.data.action
    })

    return NextResponse.json({
      ok: true,
      participant: {
        id: result.id,
        displayName: result.displayName,
        status: result.status
      }
    })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      const statusMap: Record<string, number> = { ROOM_NOT_FOUND: 404, FORBIDDEN: 403, PARTICIPANT_NOT_FOUND: 404, NOT_PENDING: 409, ROOM_FULL: 409 }
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusMap[err.code] || 400 })
    }
    const message = err instanceof Error ? err.message : 'Failed to approve participant'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function updateRole(request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params
    if (!roomCode) return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })

    const { updateRoleSchema } = await import('./watch-party.schema')
    const body = await request.json()
    const parsed = updateRoleSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const result = await service.updateParticipantRole({
      roomCode: roomCode.toUpperCase(),
      callerUserId: await getCallerUserId(),
      hostParticipantId: parsed.data.hostParticipantId,
      targetParticipantId: parsed.data.targetParticipantId,
      role: parsed.data.role
    })

    return NextResponse.json({
      ok: true,
      participant: {
        id: result.id,
        displayName: result.displayName,
        role: result.role
      }
    })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      const statusMap: Record<string, number> = { ROOM_NOT_FOUND: 404, FORBIDDEN: 403, PARTICIPANT_NOT_FOUND: 404 }
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusMap[err.code] || 400 })
    }
    const message = err instanceof Error ? err.message : 'Failed to update role'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function updateRoom(request: NextRequest, context: RouteContext) {
  try {
    const { roomCode } = await context.params
    if (!roomCode) {
      return NextResponse.json({ error: 'roomCode is required' }, { status: 400 })
    }

    const { updateRoomSchema } = await import('./watch-party.schema')
    const body = await request.json()
    const parsed = updateRoomSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const updated = await service.updateRoom({
      roomCode: roomCode.toUpperCase(),
      title: parsed.data.title,
      isLocked: parsed.data.isLocked,
      theme: parsed.data.theme,
      participantId: parsed.data.participantId,
      callerUserId: await getCallerUserId()
    })

    return NextResponse.json({
      ok: true,
      room: {
        id: updated.id,
        roomCode: updated.roomCode,
        isLocked: updated.isLocked,
        title: updated.title,
        theme: updated.theme ?? null
      }
    })
  } catch (err: unknown) {
    if (err instanceof WatchPartyError) {
      const statusMap: Record<string, number> = { ROOM_NOT_FOUND: 404, ROOM_ENDED: 410, FORBIDDEN: 403 }
      return NextResponse.json({ error: err.message, code: err.code }, { status: statusMap[err.code] || 400 })
    }
    const message = err instanceof Error ? err.message : 'Failed to update room'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
