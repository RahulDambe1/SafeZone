import type { RealtimeEvent } from '@/types'
import { getHub } from '@/lib/server/hub'
import { startResponderFeedPump } from '@/lib/server/responders'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const encoder = new TextEncoder()

export async function GET() {
  const hub = getHub()
  startResponderFeedPump()

  let cleanup: (() => void) | null = null

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

      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat)
          return
        }
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
        } catch {
          closed = true
          clearInterval(heartbeat)
        }
      }, 25_000)

      const unsubscribe = hub.subscribe(send)

      // Initial hello so the client can confirm the stream is live.
      send({ type: 'SYSTEM_STATUS', at: new Date().toISOString() })

      cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
    cancel() {
      cleanup?.()
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