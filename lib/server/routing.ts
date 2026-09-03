// Server-side routing engine.
//
// Provider selection:
//   - Mapbox Directions API when MAPBOX_ACCESS_TOKEN / NEXT_PUBLIC_MAPBOX_TOKEN
//     is configured. If the account has traffic enabled, the returned routes are
//     labeled 'TRAFFIC-OPTIMIZED ROUTE' using real congestion annotations.
//   - MapTiler Directions (real OSRM-based road network) when MAPTILER_API_KEY
//     is configured. No live traffic annotations, so routes are labeled
//     'FASTEST ROUTE'.
//   - OSRM public server otherwise (real road network, no traffic data, so the
//     label is always 'FASTEST ROUTE').
//
// Every configured provider is tried in order; when all fail, an error is
// thrown and the client shows "ROUTING UNAVAILABLE" — we never fabricate an
// ETA.

import type { Route } from '@/types'
import { serverEnv } from '@/lib/server/env'

export interface RoutePoint {
  latitude: number
  longitude: number
}

interface ProviderResult {
  routes: Route[]
  provider: 'mapbox' | 'maptiler' | 'osrm'
}

function toLatLng(coordinates: number[][]): [number, number][] {
  return coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
}

function averageCongestion(values: number[] | undefined): 'LOW' | 'MEDIUM' | 'HIGH' | undefined {
  if (!values || values.length === 0) return undefined
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  if (avg < 0.35) return 'LOW'
  if (avg < 0.65) return 'MEDIUM'
  return 'HIGH'
}

async function mapboxRoutes(origin: RoutePoint, destination: RoutePoint): Promise<ProviderResult> {
  const token = serverEnv.mapboxToken
  if (!token) throw new Error('Mapbox token not configured')

  const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`
  const base = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}`
  const common = 'geometries=geojson&alternatives=true&overview=full&steps=false&access_token='

  // Try with real congestion annotations first (requires a traffic-enabled account).
  let body: {
    routes?: {
      distance: number
      duration: number
      geometry: { coordinates: number[][] }
      annotations?: { congestion_numeric?: number[] }
    }[]
    message?: string
    code?: string
  } = {}

  const withTraffic = await fetch(`${base}?${common}&annotations=congestion_numeric,duration,distance`, {
    signal: AbortSignal.timeout(15_000),
  }).then(async (r) => {
    const data = await r.json()
    if (!r.ok) return { ok: false as const, data }
    return { ok: true as const, data }
  })

  if (withTraffic.ok) {
    body = withTraffic.data
  } else {
    const withoutTraffic = await fetch(`${base}?${common}`, { signal: AbortSignal.timeout(15_000) }).then(async (r) => {
      const data = await r.json()
      if (!r.ok) throw new Error(`Mapbox directions failed: ${data.message ?? r.status}`)
      return data
    })
    body = withoutTraffic
  }

  if (!body.routes || body.routes.length === 0) {
    throw new Error('Mapbox directions returned no routes')
  }

  const trafficAvailable = Boolean(body.routes[0].annotations?.congestion_numeric)
  const routes: Route[] = body.routes.map((route, index) => {
    const trafficLevel = trafficAvailable
      ? averageCongestion(route.annotations?.congestion_numeric)
      : undefined
    return {
      id: `mapbox-${Date.now()}-${index}`,
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      geometry: toLatLng(route.geometry.coordinates),
      provider: 'mapbox',
      label: trafficAvailable ? 'TRAFFIC-OPTIMIZED ROUTE' : 'FASTEST ROUTE',
      trafficLevel,
    }
  })

  return { routes, provider: 'mapbox' }
}

async function maptilerRoutes(origin: RoutePoint, destination: RoutePoint): Promise<ProviderResult> {
  const key = serverEnv.maptilerKey
  if (!key) throw new Error('MapTiler key not configured')

  const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`
  const url = `https://api.maptiler.com/routing/driving/${coords}.json?key=${encodeURIComponent(key)}&alternatives=true&overview=full&geometries=geojson&steps=false`

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  const body = (await res.json().catch(() => null)) as {
    code?: string
    message?: string
    routes?: { distance: number; duration: number; geometry: { coordinates: number[][] } }[]
  } | null

  if (!res.ok || !body || body.code !== 'Ok' || !body.routes || body.routes.length === 0) {
    throw new Error(`MapTiler routing failed: ${body?.message ?? body?.code ?? res.status}`)
  }

  const routes: Route[] = body.routes.map((route, index) => ({
    id: `maptiler-${Date.now()}-${index}`,
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.round(route.duration),
    geometry: toLatLng(route.geometry.coordinates),
    provider: 'maptiler',
    label: 'FASTEST ROUTE',
  }))

  return { routes, provider: 'maptiler' }
}

async function osrmRoutes(origin: RoutePoint, destination: RoutePoint): Promise<ProviderResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?alternatives=3&overview=full&geometries=geojson&steps=false`

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  const body = (await res.json()) as {
    code?: string
    message?: string
    routes?: { distance: number; duration: number; geometry: { coordinates: number[][] } }[]
  }

  if (!res.ok || body.code !== 'Ok' || !body.routes || body.routes.length === 0) {
    throw new Error(`OSRM routing failed: ${body.message ?? body.code ?? res.status}`)
  }

  const routes: Route[] = body.routes.map((route, index) => ({
    id: `osrm-${Date.now()}-${index}`,
    distanceMeters: Math.round(route.distance),
    durationSeconds: Math.round(route.duration),
    geometry: toLatLng(route.geometry.coordinates),
    provider: 'osrm',
    label: 'FASTEST ROUTE',
  }))

  return { routes, provider: 'osrm' }
}

export async function getRoutes(
  origin: RoutePoint,
  destination: RoutePoint,
  alternatives = true
): Promise<Route[]> {
  if (!alternatives) {
    const single = await getRoutes(origin, destination, true)
    return single.slice(0, 1)
  }

  const providers: Array<(origin: RoutePoint, destination: RoutePoint) => Promise<ProviderResult>> = []
  if (serverEnv.mapboxToken) providers.push(mapboxRoutes)
  if (serverEnv.maptilerKey) providers.push(maptilerRoutes)
  providers.push(osrmRoutes)

  const failures: string[] = []
  for (const run of providers) {
    try {
      const { routes } = await run(origin, destination)
      return routes
    } catch (err) {
      failures.push((err as Error).message)
    }
  }
  throw new Error(`Routing unavailable (${failures.join('; ')})`)
}