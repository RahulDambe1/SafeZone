// DEMO-ONLY responder fixtures.
//
// This module is imported exclusively by the demo flow and every unit it
// produces is labeled DEMO. It is NEVER used by production views, the
// command center, or any live workflow. Incidents assigned from here are
// marked isDemo on the server and excluded from production metrics.
//
// This is category (A) in the reality check: a legitimate test fixture,
// isolated under /demo.

import type { DispatchResult, Responder } from '@/types'

const DEMO_RESPONDERS: Responder[] = [
  {
    id: 'DEMO-AMB-007',
    type: 'AMBULANCE',
    vehicleId: 'DEMO-AMB-007',
    status: 'AVAILABLE',
    latitude: 12.9789,
    longitude: 77.6021,
    lastUpdated: new Date().toISOString(),
    source: 'dispatch-queue',
  },
  {
    id: 'DEMO-AMB-012',
    type: 'AMBULANCE',
    vehicleId: 'DEMO-AMB-012',
    status: 'AVAILABLE',
    latitude: 12.9352,
    longitude: 77.6245,
    lastUpdated: new Date().toISOString(),
    source: 'dispatch-queue',
  },
  {
    id: 'DEMO-FIRE-03',
    type: 'FIRE',
    vehicleId: 'DEMO-FIRE-03',
    status: 'AVAILABLE',
    latitude: 13.001,
    longitude: 77.58,
    lastUpdated: new Date().toISOString(),
    source: 'dispatch-queue',
  },
]

export class DemoResponderProvider {
  static isDemoFeed(): true {
    return true
  }

  static async getResponders(): Promise<Responder[]> {
    return DEMO_RESPONDERS
  }

  static async assignResponder(incidentId: string, preferredType: Responder['type'] = 'AMBULANCE'): Promise<DispatchResult> {
    const pool = DEMO_RESPONDERS.filter((r) => r.type === preferredType && r.status === 'AVAILABLE')
    const unit = (pool.length > 0 ? pool : DEMO_RESPONDERS)[0]
    const assigned: Responder = {
      ...unit,
      status: 'DISPATCHED',
      assignedIncident: incidentId,
      lastUpdated: new Date().toISOString(),
    }
    return {
      status: 'ASSIGNED',
      message: `${assigned.vehicleId} assigned (DEMO SIMULATION — no live feed)`,
      responder: assigned,
    }
  }
}