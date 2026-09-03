'use client'

import { useEffect, useState } from 'react'
import type { RealtimeEvent } from '@/types'
import { realtimeClient } from '@/lib/store/realtime-client'

export function useRealtimeEvents(limit = 50) {
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const [connection, setConnection] = useState(realtimeClient.getState())

  useEffect(() => {
    const unsubscribeEvents = realtimeClient.subscribe((event) => {
      setEvents((prev) => [event, ...prev].slice(0, limit))
    })
    const unsubscribeState = realtimeClient.onStateChange(setConnection)
    return () => {
      unsubscribeEvents()
      unsubscribeState()
    }
  }, [limit])

  return { events, connection }
}