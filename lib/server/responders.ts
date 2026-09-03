// Server-side responder integration.
//
// An authorized responder feed is integrated ONLY when RESPONDER_API_URL
// (+ RESPONDER_API_KEY) is configured by the operator. Without it the feed is
// reported as NOT CONNECTED and dispatch requests are queued — we never invent
// ambulance GPS or movement.

import type { DispatchResult, Responder, ResponderStatus, ResponderType } from '@/types'
import { serverEnv } from '@/lib/server/env'
import { getHub } from '@/lib/server/hub'

export interface ResponderFeedStatus {
  connected: boolean
  source: 'http' | 'none'
  detail: string
  responders: Responder[]
  lastSync?: string
}

const VALID_TYPES: ResponderType[] = ['AMBULANCE', 'POLICE', 'FIRE']
const VALID_STATUSES: ResponderStatus[] = ['AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'ON_SCENE', 'RETURNING', 'OFFLINE']

interface FeedRow {
  id?: string | number
  type?: string
  vehicleId?: string
  vehicle_id?: string
  name?: string
  status?: string
  latitude?: number | string
  lat?: number | string
  longitude?: number | string
  lng?: number | string
  lon?: number | string
  heading?: number | string
  speed?: number | string
  lastUpdated?: string
  last_updated?: string
}

function normalizeFeedRow(row: FeedRow): Responder | null {
  const lat = Number(row.latitude ?? row.lat)
  const lng = Number(row.longitude ?? row.lng ?? row.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const type = VALID_TYPES.includes(row.type as ResponderType) ? (row.type as ResponderType) : 'AMBULANCE'
  const status = VALID_STATUSES.includes(row.status as ResponderStatus) ? (row.status as ResponderStatus) : 'OFFLINE'
  const vehicleId = String(row.vehicleId ?? row.vehicle_id ?? row.name ?? row.id ?? 'UNKNOWN')
  return {
    id: String(row.id ?? vehicleId),
    type,
    vehicleId,
    status,
    latitude: lat,
    longitude: lng,
    heading: Number.isFinite(Number(row.heading)) ? Number(row.heading) : undefined,
    speed: Number.isFinite(Number(row.speed)) ? Number(row.speed) : undefined,
    lastUpdated: row.lastUpdated ?? row.last_updated ?? new Date().toISOString(),
    source: 'feed',
  }
}

async function fetchFeed(): Promise<Responder[]> {
  const url = serverEnv.responderApiUrl as string
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (serverEnv.responderApiKey) headers.Authorization = `Bearer ${serverEnv.responderApiKey}`

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`Responder feed returned ${res.status}`)

  const body = (await res.json()) as { responders?: FeedRow[]; data?: FeedRow[] } | FeedRow[]
  const rows = Array.isArray(body) ? body : (body.responders ?? body.data ?? [])
  return rows.map(normalizeFeedRow).filter((r): r is Responder => r !== null)
}

export async function getResponderFeedStatus(): Promise<ResponderFeedStatus> {
  if (!serverEnv.hasResponderFeed) {
    return {
      connected: false,
      source: 'none',
      detail: 'NOT CONNECTED — RESPONDER_API_URL not configured. No authorized responder feed is available.',
      responders: [],
    }
  }

  try {
    const responders = await fetchFeed()
    return {
      connected: true,
      source: 'http',
      detail: `CONNECTED — authorized feed (${responders.length} responders)`,
      responders,
      lastSync: new Date().toISOString(),
    }
  } catch (err) {
    return {
      connected: false,
      source: 'http',
      detail: `UNAVAILABLE — feed error: ${(err as Error).message}`,
      responders: [],
    }
  }
}

/**
 * Dispatch. With a real feed we look for an available responder of a matching
 * type and mark it. Without a feed, the request is queued honestly.
 */
export async function assignResponder(
  incidentId: string,
  location?: { latitude: number; longitude: number } | null,
  preferredType: ResponderType = 'AMBULANCE'
): Promise<DispatchResult> {
  const status = await getResponderFeedStatus()
  if (!status.connected) {
    return {
      status: 'QUEUED',
      message:
        'DISPATCH REQUEST RECORDED — RESPONDER FEED NOT CONNECTED. No authorized responder feed is configured, so no unit could be assigned.',
    }
  }

  const available = status.responders.filter(
    (r) => r.status === 'AVAILABLE' && r.type === preferredType
  )
  if (available.length === 0) {
    return {
      status: 'QUEUED',
      message: `No AVAILABLE ${preferredType} unit in the connected feed. Request queued for operator review.`,
    }
  }

  // Nearest available unit of the requested type.
  const chosen = available.sort((a, b) => {
    const da = location ? distanceMeters(location, a) : 0
    const db = location ? distanceMeters(location, b) : 0
    return da - db
  })[0]

  return {
    status: 'ASSIGNED',
    message: `${chosen.vehicleId} assigned from live feed`,
    responder: {
      ...chosen,
      status: 'DISPATCHED',
      assignedIncident: incidentId,
      lastUpdated: new Date().toISOString(),
    },
  }
}

function distanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude?: number; longitude?: number }
): number {
  if (typeof to.latitude !== 'number' || typeof to.longitude !== 'number') return Number.MAX_SAFE_INTEGER
  const R = 6371000
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.latitude * Math.PI) / 180) * Math.cos((to.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ---------------------------------------------------------------------------
// Live feed pump: when an authorized feed is configured AND clients are
// subscribed to realtime, poll the real feed and publish real position
// updates. This is a real integration with an authorized provider — not a
// simulation. When no feed is configured nothing is published.
// ---------------------------------------------------------------------------

let pumpStarted = false

export function startResponderFeedPump(intervalMs = 10_000): void {
  if (pumpStarted || !serverEnv.hasResponderFeed) return
  pumpStarted = true

  const hub = getHub()
  setInterval(async () => {
    if (hub.listenerCount() === 0) return
    const status = await getResponderFeedStatus()
    if (!status.connected) return
    for (const responder of status.responders) {
      if (typeof responder.latitude !== 'number' || typeof responder.longitude !== 'number') continue
      hub.publish({
        type: 'RESPONDER_LOCATION_UPDATED',
        at: new Date().toISOString(),
      })
    }
    hub.publish({
      type: 'RESPONDER_STATUS_CHANGED',
      at: new Date().toISOString(),
    })
  }, intervalMs)
}