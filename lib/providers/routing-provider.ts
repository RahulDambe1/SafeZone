// lib/providers/routing-provider.ts
// Real routing provider (server-only). Delegates to the SafeZone server
// engine: Mapbox Directions when MAPBOX_ACCESS_TOKEN is configured (traffic
// label only with real congestion data), otherwise the public OSRM server
// (real roads, real ETAs, no traffic data — labeled FASTEST ROUTE).

import type { Location, Route } from '@/types'
import { getRoutes } from '@/lib/server/routing'

export interface RoutingResult {
  success: boolean
  route?: Route
  error?: string
  serviceStatus: {
    state: 'CONNECTED' | 'CONNECTING' | 'ERROR'
    label: string
    lastChecked: Date
    error?: string
  }
}

export async function calculateRoute(
  from: Location,
  to: Location,
  incidentId: string
): Promise<RoutingResult> {
  try {
    const routes = await getRoutes(
      { latitude: from.latitude, longitude: from.longitude },
      { latitude: to.latitude, longitude: to.longitude }
    )
    const route = routes[0]
    if (!route) throw new Error('No routes returned')
    return {
      success: true,
      route: { ...route, id: `route-${incidentId}-${route.id}` },
      serviceStatus: { state: 'CONNECTED', label: 'ROUTING', lastChecked: new Date() },
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown routing error'
    return {
      success: false,
      error,
      serviceStatus: { state: 'ERROR', label: 'ROUTING', lastChecked: new Date(), error },
    }
  }
}

// Straight-line estimate, used only as a labeled fallback display value.
export function estimateDistanceMeters(from: Location, to: Location): number {
  const R = 6371000
  const dLat = toRad(to.latitude - from.latitude)
  const dLon = toRad(to.longitude - from.longitude)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}