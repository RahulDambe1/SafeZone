// lib/providers/responder-provider.ts
// Responder GPS feed provider (server-only).
// IMPORTANT: No government ambulance API is invented or scraped. The feed is
// connected ONLY when an authorized RESPONDER_API_URL is configured; otherwise
// the provider honestly reports NOT_CONNECTED and dispatch requests queue.

import type { Responder } from '@/types'
import { getResponderFeedStatus } from '@/lib/server/responders'

export interface ResponderFeedResult {
  available: boolean
  responders: Responder[]
  serviceStatus: {
    state: 'CONNECTED' | 'NOT_CONNECTED' | 'ERROR'
    label: string
    lastChecked: Date
    error?: string
  }
}

export async function getAvailableResponders(): Promise<ResponderFeedResult> {
  const status = await getResponderFeedStatus()
  return {
    available: status.connected,
    responders: status.responders,
    serviceStatus: {
      state: status.connected ? 'CONNECTED' : status.source === 'http' ? 'ERROR' : 'NOT_CONNECTED',
      label: 'RESPONDER FEED',
      lastChecked: new Date(),
      error: status.detail,
    },
  }
}

export async function getNearestResponder(
  latitude: number,
  longitude: number,
  type?: string
): Promise<{ responder: Responder | null; serviceStatus: ResponderFeedResult['serviceStatus'] }> {
  const result = await getAvailableResponders()
  if (!result.available || result.responders.length === 0) {
    return { responder: null, serviceStatus: result.serviceStatus }
  }

  const candidates = result.responders.filter(
    (r) =>
      r.status === 'AVAILABLE' &&
      (!type || r.type === type) &&
      typeof r.latitude === 'number' &&
      typeof r.longitude === 'number'
  )
  if (candidates.length === 0) {
    return {
      responder: null,
      serviceStatus: { ...result.serviceStatus, error: 'No available responders of requested type' },
    }
  }

  const nearest = candidates.reduce((closest, current) => {
    const dCurrent = Math.hypot(current.latitude! - latitude, current.longitude! - longitude)
    const dClosest = Math.hypot(closest.latitude! - latitude, closest.longitude! - longitude)
    return dCurrent < dClosest ? current : closest
  })

  return { responder: nearest, serviceStatus: result.serviceStatus }
}