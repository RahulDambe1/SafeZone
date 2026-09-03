import type { ServiceStatus, SystemStatus } from '@/types'
import { dbHealth } from '@/lib/server/db'
import { getHub } from '@/lib/server/hub'
import { serverEnv } from '@/lib/server/env'
import { getResponderFeedStatus } from '@/lib/server/responders'
import { listIncidents } from '@/lib/server/incidents'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Honest MAP state: when a MapTiler key is configured, probe it once (cached
 * 30s) so a rejected/restricted key shows NOT_CONNECTED instead of a fake
 * CONNECTED. Mapbox is reported CONNECTED when configured (matching the
 * previous behavior); with no key the keyless CARTO tiles are genuinely up.
 */
let maptilerProbeCache: { at: number; ok: boolean } | null = null

async function probeMaptiler(key: string): Promise<boolean> {
  if (maptilerProbeCache && Date.now() - maptilerProbeCache.at < 30_000) {
    return maptilerProbeCache.ok
  }
  let ok = false
  try {
    const res = await fetch(
      `https://api.maptiler.com/maps/dark-v2/1/0/0.png?key=${encodeURIComponent(key)}`,
      { signal: AbortSignal.timeout(6_000) }
    )
    ok = res.ok
  } catch {
    ok = false
  }
  maptilerProbeCache = { at: Date.now(), ok }
  return ok
}

export async function GET() {
  const [db, incidents, responderFeed] = await Promise.all([
    dbHealth(),
    listIncidents(),
    getResponderFeedStatus(),
  ])

  const maptilerConfigured = serverEnv.maptilerKey ? true : false
  const mapboxConfigured = serverEnv.mapboxToken ? true : false
  const maptilerOk = maptilerConfigured ? await probeMaptiler(serverEnv.maptilerKey as string) : false
  const mapService: ServiceStatus = mapboxConfigured
    ? {
        id: 'map',
        label: 'MAP',
        state: 'CONNECTED',
        detail: 'MAPBOX DARK STYLE (token configured)',
      }
    : maptilerConfigured && maptilerOk
      ? {
          id: 'map',
          label: 'MAP',
          state: 'CONNECTED',
          detail: 'MAPTILER DARK STYLE (key verified)',
        }
      : maptilerConfigured
        ? {
            id: 'map',
            label: 'MAP',
            state: 'NOT_CONNECTED',
            detail: 'MAPTILER KEY REJECTED OR RESTRICTED — falling back to keyless OSM dark tiles. Check the key allowlist in cloud.maptiler.com.',
          }
        : {
            id: 'map',
            label: 'MAP',
            state: 'CONNECTED',
            detail: 'OPENSTREETMAP DARK TILES (keyless, real roads)',
          }

  const routingConfigured = mapboxConfigured || maptilerConfigured
  const routingService: ServiceStatus = {
    id: 'routing',
    label: 'ROUTING',
    state: routingConfigured ? 'CONFIGURED' : 'CONNECTED',
    detail: mapboxConfigured
      ? 'MAPBOX DIRECTIONS (traffic-aware if account enabled)'
      : maptilerConfigured
        ? 'MAPTILER DIRECTIONS (configured — OSRM public fallback)'
        : 'OSRM PUBLIC SERVER (real roads, no traffic data)',
  }

  const services: ServiceStatus[] = [
    {
      id: 'database',
      label: 'DATABASE',
      state: db.connected ? 'CONNECTED' : 'NOT_CONNECTED',
      detail: db.connected ? db.detail : db.detail,
    },
    {
      id: 'realtime',
      label: 'REALTIME',
      state: 'CONNECTED',
      detail: `SSE hub active (${getHub().listenerCount()} client${getHub().listenerCount() === 1 ? '' : 's'} connected)`,
    },
    mapService,
    routingService,
    {
      id: 'ai',
      label: 'AI ANALYSIS',
      state: serverEnv.hasAi ? 'CONFIGURED' : 'STANDBY',
      detail: serverEnv.hasAi
        ? serverEnv.hasGemini
          ? 'LLM configured (GEMINI)'
          : `LLM configured (${serverEnv.aiModel})`
        : 'RULE-BASED ANALYSIS ONLY — set AI_API_KEY or GEMINI_API_KEY for LLM analysis',
    },
    {
      id: 'responder-feed',
      label: 'RESPONDER FEED',
      state: responderFeed.connected ? 'CONNECTED' : 'NOT_CONNECTED',
      detail: responderFeed.detail,
    },
    {
      id: 'hospitals',
      label: 'HOSPITALS',
      state: serverEnv.hasHospitalApi ? 'CONFIGURED' : 'CONNECTED',
      detail: serverEnv.hasHospitalApi
        ? 'AUTHORIZED HOSPITAL API'
        : 'OPENSTREETMAP OVERPASS (real locations, no capacity data)',
    },
  ]

  const active = incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CANCELLED')
  const enRoute = incidents.filter((i) => i.status === 'EN_ROUTE' || i.status === 'RESPONDER_ASSIGNED')
  const durations = enRoute
    .flatMap((i) => i.routes)
    .filter((r) => r.durationSeconds > 0)
    .map((r) => r.durationSeconds)

  const status: SystemStatus = {
    services,
    activeIncidents: active.length,
    criticalIncidents: active.filter((i) => i.severity === 'CRITICAL').length,
    respondersActive: responderFeed.responders.filter((r) => r.status === 'AVAILABLE' || r.status === 'EN_ROUTE').length,
    averageResponseEtaSeconds:
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : undefined,
    unresolved: incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CANCELLED').length,
    realtimeClients: getHub().listenerCount(),
    lastUpdated: new Date().toISOString(),
  }

  return Response.json(status)
}