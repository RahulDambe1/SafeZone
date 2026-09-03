// Client routing service — real routing through the server proxy
// (Mapbox Directions or OSRM). Never computes fake ETAs client-side.

import type { Route } from '@/types'

export interface RoutePoint {
  latitude: number
  longitude: number
}

export class RoutingService {
  static async getRoutes(origin: RoutePoint, destination: RoutePoint): Promise<Route[]> {
    const qs = new URLSearchParams({
      originLat: String(origin.latitude),
      originLng: String(origin.longitude),
      destLat: String(destination.latitude),
      destLng: String(destination.longitude),
    })
    const res = await fetch(`/api/routing?${qs.toString()}`, { cache: 'no-store' })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? 'ROUTING UNAVAILABLE')
    }
    const { routes } = (await res.json()) as { routes: Route[] }
    return routes
  }

  static formatDuration(seconds: number): string {
    const mins = Math.round(seconds / 60)
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  static formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`
    return `${(meters / 1000).toFixed(1)} km`
  }
}