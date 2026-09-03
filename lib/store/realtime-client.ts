// Client realtime layer.
//
// - Primary channel: Server-Sent Events from /api/realtime/stream (a genuine
//   server push channel — the UI never polls to simulate realtime).
// - Cross-tab sync: BroadcastChannel so multiple windows stay consistent.
// - Connection state is exposed honestly: connected / connecting / disconnected.

import type { RealtimeEvent } from '@/types'

export type RealtimeConnectionState = 'connecting' | 'connected' | 'disconnected'

type EventListener = (event: RealtimeEvent) => void
type StateListener = (state: RealtimeConnectionState) => void

class RealtimeClient {
  private source: EventSource | null = null
  private listeners = new Set<EventListener>()
  private stateListeners = new Set<StateListener>()
  private reconnectHandlers = new Set<() => void>()
  private channel: BroadcastChannel | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private state: RealtimeConnectionState = 'disconnected'

  connect(): void {
    if (typeof window === 'undefined' || this.source) return

    try {
      this.channel = new BroadcastChannel('safezone-realtime')
      this.channel.onmessage = (ev: MessageEvent<RealtimeEvent>) => {
        this.dispatchLocal(ev.data)
      }
    } catch {
      this.channel = null
    }

    this.setState('connecting')
    this.open()
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.source?.close()
    this.source = null
    try {
      this.channel?.close()
    } catch {
      // ignore
    }
    this.channel = null
    this.setState('disconnected')
  }

  private open(): void {
    if (typeof window === 'undefined') return
    const source = new EventSource('/api/realtime/stream')
    this.source = source

    source.addEventListener('safezone', (ev) => {
      try {
        this.dispatchLocal(JSON.parse((ev as MessageEvent).data as string) as RealtimeEvent)
      } catch {
        // malformed frame — ignore
      }
    })

    source.onopen = () => {
      this.reconnectAttempts = 0
      this.setState('connected')
      // Catch up after any disconnection by re-syncing server state.
      this.reconnectHandlers.forEach((handler) => handler())
    }

    source.onerror = () => {
      source.close()
      if (this.source === source) this.source = null
      this.setState('disconnected')
      const delay = Math.min(30_000, 1000 * 2 ** this.reconnectAttempts)
      this.reconnectAttempts += 1
      this.reconnectTimer = setTimeout(() => this.open(), delay)
    }
  }

  private dispatchLocal(event: RealtimeEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch {
        // a failing listener must not break realtime
      }
    })
    if (this.channel) {
      try {
        this.channel.postMessage(event)
      } catch {
        // ignore
      }
    }
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener)
    listener(this.state)
    return () => {
      this.stateListeners.delete(listener)
    }
  }

  onReconnect(handler: () => void): () => void {
    this.reconnectHandlers.add(handler)
    return () => {
      this.reconnectHandlers.delete(handler)
    }
  }

  getState(): RealtimeConnectionState {
    return this.state
  }

  private setState(next: RealtimeConnectionState): void {
    if (this.state === next) return
    this.state = next
    this.stateListeners.forEach((listener) => listener(next))
  }
}

export const realtimeClient = new RealtimeClient()