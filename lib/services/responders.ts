// Client ResponderProvider.
//
// Adapter-style surface (getResponders / getResponderStatus / assignResponder /
// subscribeToResponderUpdates). Without an authorized feed the provider
// honestly reports NOT CONNECTED and dispatch requests are queued on the
// server. No fake ambulance GPS is ever produced here.

import type { DispatchResult, Responder } from '@/types'
import { incidentStore } from '@/lib/store/incident-store'
import { realtimeClient } from '@/lib/store/realtime-client'

export interface ResponderFeedStatus {
  connected: boolean
  source: 'http' | 'none'
  detail: string
  responders: Responder[]
  lastSync?: string
}

export class ResponderProvider {
  static async getResponders(): Promise<Responder[]> {
    const status = await ResponderProvider.getStatus()
    return status.responders
  }

  static async getStatus(): Promise<ResponderFeedStatus> {
    try {
      const res = await fetch('/api/responders', { cache: 'no-store' })
      const data = (await res.json()) as ResponderFeedStatus
      return data
    } catch {
      return {
        connected: false,
        source: 'none',
        detail: 'RESPONDER FEED UNAVAILABLE — cannot reach server',
        responders: [],
      }
    }
  }

  /**
   * Requests dispatch for an incident. The server decides: with a connected
   * authorized feed it assigns the nearest available unit; otherwise the
   * request is queued and reported honestly.
   */
  static async assignResponder(incidentId: string, location?: { latitude: number; longitude: number } | null): Promise<DispatchResult> {
    try {
      const incident = await incidentStore.dispatch(incidentId)
      if (incident.assignedResponder) {
        return {
          status: 'ASSIGNED',
          message: `Responder ${incident.assignedResponder.vehicleId} assigned from live feed`,
          responder: incident.assignedResponder,
        }
      }
      const lastEvent = incident.timeline[incident.timeline.length - 1]
      return {
        status: 'QUEUED',
        message: lastEvent?.label ?? 'DISPATCH REQUEST RECORDED — RESPONDER FEED NOT CONNECTED',
      }
    } catch (err) {
      return {
        status: 'QUEUED',
        message: `DISPATCH REQUEST FAILED — ${(err as Error).message}`,
      }
    }
  }

  /** Real responder updates arrive via the realtime channel. */
  static subscribeToResponderUpdates(listener: (event: { type: string; at: string }) => void): () => void {
    return realtimeClient.subscribe((event) => {
      if (event.type === 'RESPONDER_LOCATION_UPDATED' || event.type === 'RESPONDER_STATUS_CHANGED') {
        listener({ type: event.type, at: event.at })
      }
    })
  }
}