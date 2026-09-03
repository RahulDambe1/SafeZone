// app/api/events/route.ts
// Legacy SSE endpoint — now backed by the shared server hub, identical to
// /api/realtime/stream. Kept so older clients keep working.

import type { RealtimeEvent } from '@/types'
import { getHub } from '@/lib/server/hub'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const encoder = new TextEncoder()

export async function GET() {
  const hub = getHub()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false

      const send = (event: RealtimeEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: safezone\ndata: ${JSON.stringify(event)}\n\n`))
        } catch {
          closed = true
        }
      }

      const ping = setInterval(() => {
        if (closed) {
          clearInterval(ping)
          return
        }
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          closed = true
          clearInterval(ping)
        }
      }, 25_000)

      const unsubscribe = hub.subscribe(send)
      send({ type: 'SYSTEM_STATUS', at: new Date().toISOString() })

      return () => {
        if (closed) return
        closed = true
        clearInterval(ping)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
    cancel() {
      // cleanup handled by start() return
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}