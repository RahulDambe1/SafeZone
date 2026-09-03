// Server-side realtime event hub.
//
// A single in-process hub shared by every Route Handler through globalThis.
// The SSE endpoint (/api/realtime/stream) subscribes clients here; every
// mutation route publishes events after it writes to the database. This is a
// genuine push channel — the UI never polls to *simulate* realtime.

import type { RealtimeEvent } from '@/types'

export type HubListener = (event: RealtimeEvent) => void

interface Hub {
  subscribe(listener: HubListener): () => void
  publish(event: RealtimeEvent): void
  listenerCount(): number
}

const GLOBAL_KEY = '__safezone_realtime_hub__'

function createHub(): Hub {
  const listeners = new Set<HubListener>()

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    publish(event) {
      listeners.forEach((listener) => {
        try {
          listener(event)
        } catch {
          // A failing subscriber must never break the hub.
        }
      })
    },
    listenerCount() {
      return listeners.size
    },
  }
}

export function getHub(): Hub {
  const g = globalThis as unknown as Record<string, Hub | undefined>
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = createHub()
  return g[GLOBAL_KEY]
}