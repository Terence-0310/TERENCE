// ============================================
// Integration tests — Watch Party waiting room (locked rooms)
// ============================================
// Exercises the real service layer (repository + DB mocked):
//   request → host notified → approve → the waiting user can join.

import { describe, it, expect, vi, beforeEach } from 'vitest'

type Participant = {
  id: string
  roomId: string
  userId: string | null
  displayName: string
  role: string
  status: string
  isOnline: boolean
  leftAt: Date | null
}

let participants: Participant[] = []
let room: { id: string; roomCode: string; status: string; isLocked: boolean; maxMembers: number; state: null; participants: Participant[] }
let seq = 0

const repo = {
  findRoomByCode: vi.fn(async (code: string) =>
    code === room.roomCode ? { ...room, participants: participants.filter((p) => !p.leftAt) } : null),
  findParticipant: vi.fn(async (_roomId: string, identity: { userId?: string; displayName?: string }) => {
    const rows = participants.filter((p) => !p.leftAt && (identity.userId
      ? p.userId === identity.userId
      : p.userId === null && p.displayName === identity.displayName))
    return rows.find((r) => r.status === 'ACTIVE') ?? rows[rows.length - 1] ?? null
  }),
  markParticipantOnline: vi.fn(async (id: string) => {
    const p = participants.find((x) => x.id === id)!
    p.isOnline = true
    return p
  }),
  createParticipant: vi.fn(async (data: Partial<Participant>) => {
    const p = { id: `p${++seq}`, status: 'ACTIVE', isOnline: true, leftAt: null, ...data } as Participant
    participants.push(p)
    return p
  }),
  createMessage: vi.fn(async () => ({})),
}

const mockPrisma = {
  watchPartyParticipant: {
    create: vi.fn(async ({ data }: { data: Partial<Participant> }) => {
      const p = { id: `p${++seq}`, leftAt: null, ...data } as Participant
      participants.push(p)
      return p
    }),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Participant> }) => {
      const p = participants.find((x) => x.id === where.id)!
      Object.assign(p, data)
      return p
    }),
  },
}

const notifyRoom = vi.fn()

// Factories are hoisted above the `repo` declaration, so delegate lazily.
vi.mock('@/src/be/modules/watch-party/watch-party.repository', () => ({
  findRoomByCode: (...a: [string]) => repo.findRoomByCode(...a),
  findParticipant: (...a: [string, { userId?: string; displayName?: string }]) => repo.findParticipant(...a),
  markParticipantOnline: (...a: [string]) => repo.markParticipantOnline(...a),
  createParticipant: (...a: [Partial<Participant>]) => repo.createParticipant(...a),
  createMessage: () => repo.createMessage(),
}))
vi.mock('@/lib/db', () => ({ get prisma() { return mockPrisma } }))
vi.mock('@/src/lib/redis', () => ({ redis: null }))
vi.mock('@/src/be/shared/realtime/notify', () => ({ notifyRoom: (...a: unknown[]) => notifyRoom(...a) }))
vi.mock('@/lib/livekit', () => ({ sendLiveKitDataMessage: vi.fn(async () => undefined) }))
vi.mock('@/src/be/shared/db/loaders', () => ({
  getUserLoader: () => ({ load: async (id: string) => ({ id }) }),
  getMovieLoader: () => ({ load: async () => null }),
  getEpisodeLoader: () => ({ load: async () => null }),
}))

import * as service from '@/src/be/modules/watch-party/watch-party.service'

const HOST = 'host-user'
const GUEST_USER = 'guest-user'

beforeEach(() => {
  vi.clearAllMocks()
  seq = 0
  participants = [{
    id: 'host-p', roomId: 'r1', userId: HOST, displayName: 'Host', role: 'HOST',
    status: 'ACTIVE', isOnline: true, leftAt: null,
  }]
  room = { id: 'r1', roomCode: 'ROOM01', status: 'ACTIVE', isLocked: true, maxMembers: 4, state: null, participants: [] }
})

describe('locked room waiting list', () => {
  it('rejects a direct join while the room is locked', async () => {
    await expect(service.joinRoom({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER }))
      .rejects.toMatchObject({ code: 'ROOM_LOCKED' })
  })

  it('creates one pending request, notifies the host and does not count it online', async () => {
    const { participant } = await service.requestJoin({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER })
    expect(participant.status).toBe('PENDING')
    expect(participant.isOnline).toBe(false)
    expect(notifyRoom).toHaveBeenCalledWith('ROOM01', 'wp:join-request', {
      userId: participant.id, displayName: 'An', socketId: '',
    })

    // Asking again reuses the same request instead of stacking duplicates.
    const again = await service.requestJoin({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER })
    expect(again.participant.id).toBe(participant.id)
    expect(participants.filter((p) => p.userId === GUEST_USER)).toHaveLength(1)
  })

  it('a pending request alone does not open the door', async () => {
    await service.requestJoin({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER })
    await expect(service.joinRoom({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER }))
      .rejects.toMatchObject({ code: 'ROOM_LOCKED' })
  })

  it('after the host approves, the waiting user joins with the same seat', async () => {
    const { participant } = await service.requestJoin({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER })
    await service.approveParticipant({
      roomCode: 'ROOM01', callerUserId: HOST, hostParticipantId: 'host-p',
      targetParticipantId: participant.id, action: 'APPROVE',
    })

    const joined = await service.joinRoom({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER })
    expect(joined.isRejoin).toBe(true)
    expect(joined.participant.id).toBe(participant.id)
    expect(joined.participant.isOnline).toBe(true)
  })

  it('works for guests (matched by name among guest seats only)', async () => {
    const { participant } = await service.requestJoin({ roomCode: 'ROOM01', displayName: 'Khách A', userId: null })
    await service.approveParticipant({
      roomCode: 'ROOM01', callerUserId: HOST, hostParticipantId: 'host-p',
      targetParticipantId: participant.id, action: 'APPROVE',
    })
    const joined = await service.joinRoom({ roomCode: 'ROOM01', displayName: 'Khách A', userId: null })
    expect(joined.participant.id).toBe(participant.id)
  })

  it('a rejected user can ask again, which re-opens the same request', async () => {
    const { participant } = await service.requestJoin({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER })
    await service.approveParticipant({
      roomCode: 'ROOM01', callerUserId: HOST, hostParticipantId: 'host-p',
      targetParticipantId: participant.id, action: 'REJECT',
    })
    expect(participant.status).toBe('REJECTED')

    const again = await service.requestJoin({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER })
    expect(again.participant.id).toBe(participant.id)
    expect(again.participant.status).toBe('PENDING')
  })

  it('only the host account can approve, and only pending requests', async () => {
    const { participant } = await service.requestJoin({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER })
    // Someone else replaying the host's participant id.
    await expect(service.approveParticipant({
      roomCode: 'ROOM01', callerUserId: 'intruder', hostParticipantId: 'host-p',
      targetParticipantId: participant.id, action: 'APPROVE',
    })).rejects.toMatchObject({ code: 'FORBIDDEN' })

    await service.approveParticipant({
      roomCode: 'ROOM01', callerUserId: HOST, hostParticipantId: 'host-p',
      targetParticipantId: participant.id, action: 'APPROVE',
    })
    await expect(service.approveParticipant({
      roomCode: 'ROOM01', callerUserId: HOST, hostParticipantId: 'host-p',
      targetParticipantId: participant.id, action: 'REJECT',
    })).rejects.toMatchObject({ code: 'NOT_PENDING' })
  })

  it('approving respects the room capacity', async () => {
    room.maxMembers = 1 // the host already fills it
    const { participant } = await service.requestJoin({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER })
    await expect(service.approveParticipant({
      roomCode: 'ROOM01', callerUserId: HOST, hostParticipantId: 'host-p',
      targetParticipantId: participant.id, action: 'APPROVE',
    })).rejects.toMatchObject({ code: 'ROOM_FULL' })
  })

  it('an unlocked room admits a leftover pending request directly', async () => {
    await service.requestJoin({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER })
    room.isLocked = false
    const joined = await service.joinRoom({ roomCode: 'ROOM01', displayName: 'An', userId: GUEST_USER })
    expect(joined.participant.status).toBe('ACTIVE')
  })
})
