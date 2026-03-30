'use client'

import useSWR from 'swr'
import useSWRMutation from 'swr/mutation'
import type { WatchRoom, CreateRoomInput } from './types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useWatchRooms() {
  const { data, error, isLoading } = useSWR<{ rooms: WatchRoom[] }>('/api/watch-rooms', fetcher, {
    refreshInterval: 5000,
  })

  return {
    rooms: data?.rooms ?? [],
    isLoading,
    isError: !!error,
  }
}

export function useCreateRoom() {
  const { trigger, isMutating } = useSWRMutation(
    '/api/watch-rooms',
    (url: string, { arg }: { arg: Partial<CreateRoomInput> & { hostId?: string; hostName?: string } }) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arg),
      }).then((r) => r.json()),
  )

  return {
    createRoom: trigger,
    isCreating: isMutating,
  }
}
