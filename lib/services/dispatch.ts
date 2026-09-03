// Dispatch service — honest integration layer.
//
// Removed: fake ambulance roster, Math.random assignment, fabricated ETAs,
// and the invented 25% "smart route" savings. Assignment now runs through the
// server (which consults the authorized responder feed), and routes come from
// the real routing engine.

import type { DispatchResult, Route } from '@/types'
import { incidentStore } from '@/lib/store/incident-store'
import { RoutingService } from '@/lib/services/routing'

export class DispatchService {
  /**
   * Requests dispatch for an incident. Without an authorized responder feed
   * the request is queued and this is reported honestly.
   */
  static async assignResponder(
    incidentId: string,
    _location?: { latitude: number; longitude: number } | null
  ): Promise<DispatchResult> {
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

  /** Real routing via the server proxy. Returns null when routing is unavailable. */
  static async calculateRoute(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): Promise<Route | null> {
    try {
      const routes = await RoutingService.getRoutes(from, to)
      return routes[0] ?? null
    } catch {
      return null
    }
  }
}