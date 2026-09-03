'use client'

import { useEffect, useState } from 'react'
import type { SystemStatus } from '@/types'
import { realtimeClient } from '@/lib/store/realtime-client'

const POLL_INTERVAL_MS = 20_000

export function useSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let timer: ReturnType<typeof setInterval> | null = null

    const refresh = async () => {
      try {
        const res = await fetch('/api/system/status', { cache: 'no-store' })
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = (await res.json()) as SystemStatus
        if (mounted) {
          setStatus(data)
          setError(null)
        }
      } catch (err) {
        if (mounted) setError((err as Error).message)
      }
    }

    refresh()
    timer = setInterval(refresh, POLL_INTERVAL_MS)

    const unsubscribe = realtimeClient.subscribe((event) => {
      if (
        event.type === 'SYSTEM_STATUS' ||
        event.type === 'INCIDENT_CREATED' ||
        event.type === 'INCIDENT_UPDATED' ||
        event.type === 'INCIDENT_RESOLVED' ||
        event.type === 'INCIDENT_CANCELLED'
      ) {
        refresh()
      }
    })

    return () => {
      mounted = false
      if (timer) clearInterval(timer)
      unsubscribe()
    }
  }, [])

  return { status, error }
}