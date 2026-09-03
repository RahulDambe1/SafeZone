// Server-side hospital intelligence.
//
// Provider selection:
//   - HOSPITAL_API_URL (+ HOSPITAL_API_KEY) when configured — an authorized
//     hospital API. Capacity fields are shown ONLY if that API provides them.
//   - OpenStreetMap Overpass otherwise — real hospital locations and names,
//     but no capacity data. We say so explicitly.
//
// We never fabricate bed availability or ER capacity.

import type { BedAvailability, Hospital } from '@/types'
import { serverEnv } from '@/lib/server/env'

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const CAPACITY_UNAVAILABLE: BedAvailability = {
  status: 'UNAVAILABLE',
  reason: 'DATA UNAVAILABLE — hospital API does not expose capacity',
}

// ---------------------------------------------------------------------------
// Authorized hospital API adapter
// ---------------------------------------------------------------------------

interface ApiHospitalRow {
  id?: string | number
  name?: string
  latitude?: number | string
  lat?: number | string
  longitude?: number | string
  lng?: number | string
  lon?: number | string
  address?: string
  emergencyCapability?: string
  contact?: string
  availableBeds?: number | string
  beds?: number | string
  capacityStatus?: string
}

async function apiHospitals(lat: number, lng: number, radiusMeters: number): Promise<Hospital[]> {
  const baseUrl = serverEnv.hospitalApiUrl as string
  const sep = baseUrl.includes('?') ? '&' : '?'
  const url = `${baseUrl}${sep}lat=${lat}&lng=${lng}&radius=${radiusMeters}`

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (serverEnv.hospitalApiKey) headers.Authorization = `Bearer ${serverEnv.hospitalApiKey}`

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Hospital API returned ${res.status}`)
  const body = (await res.json()) as { hospitals?: ApiHospitalRow[]; data?: ApiHospitalRow[] } | ApiHospitalRow[]
  const rows = Array.isArray(body) ? body : (body.hospitals ?? body.data ?? [])

  return rows
    .map((row, index): Hospital | null => {
      const name = typeof row.name === 'string' ? row.name.trim().slice(0, 200) : ''
      const rowLat = Number(row.latitude ?? row.lat)
      const rowLng = Number(row.longitude ?? row.lng ?? row.lon)
      if (!name || !Number.isFinite(rowLat) || !Number.isFinite(rowLng)) return null

      let bedAvailability: BedAvailability | undefined
      const beds = Number(row.availableBeds ?? row.beds)
      if (Number.isFinite(beds) && beds >= 0) {
        const status = beds === 0 ? 'FULL' : beds < 5 ? 'LIMITED' : 'AVAILABLE'
        bedAvailability = { status, availableBeds: Math.round(beds) }
      }

      return {
        id: String(row.id ?? `api-hospital-${index}-${rowLat.toFixed(4)}`),
        name,
        latitude: rowLat,
        longitude: rowLng,
        distanceMeters: Math.round(haversineMeters(lat, lng, rowLat, rowLng)),
        source: 'api',
        address: row.address,
        emergencyCapability: row.emergencyCapability,
        contact: row.contact,
        bedAvailability: bedAvailability ?? CAPACITY_UNAVAILABLE,
      }
    })
    .filter((h): h is Hospital => h !== null)
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
}

// ---------------------------------------------------------------------------
// OpenStreetMap Overpass adapter (real locations, no capacity data)
// ---------------------------------------------------------------------------

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

async function overpassHospitals(lat: number, lng: number, radiusMeters: number): Promise<Hospital[]> {
  const query = `[out:json][timeout:15];(node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});way["amenity"="hospital"](around:${radiusMeters},${lat},${lng}););out center tags 40;`

  let lastError: Error | null = null
  let res: Response | null = null
  for (const endpoint of OVERPASS_MIRRORS) {
    try {
      const attempt = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SafeZoneEmergencyResponse/1.0 (public-safety platform)',
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(20_000),
      })
      if (attempt.ok) {
        res = attempt
        break
      }
      lastError = new Error(`Overpass API returned ${attempt.status}`)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Overpass network error')
    }
  }
  if (!res) {
    throw lastError ?? new Error('All Overpass mirrors unavailable')
  }

  const body = (await res.json()) as { elements?: OverpassElement[] }

  return (body.elements ?? [])
    .map((el): Hospital | null => {
      const hLat = el.lat ?? el.center?.lat
      const hLng = el.lon ?? el.center?.lon
      if (typeof hLat !== 'number' || typeof hLng !== 'number') return null
      const name = el.tags?.name?.trim().slice(0, 200) || `Hospital (OSM ${el.id})`
      return {
        id: `osm-${el.id}`,
        name,
        latitude: hLat,
        longitude: hLng,
        distanceMeters: Math.round(haversineMeters(lat, lng, hLat, hLng)),
        source: 'overpass',
        address: el.tags?.addr_full || el.tags?.['addr:street'] || undefined,
        emergencyCapability: el.tags?.emergency ? 'EMERGENCY (OSM tag)' : undefined,
        bedAvailability: {
          status: 'UNAVAILABLE',
          reason: 'DATA UNAVAILABLE — OpenStreetMap does not expose bed capacity',
        },
      }
    })
    .filter((h): h is Hospital => h !== null)
    .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
    .slice(0, 20)
}

// ---------------------------------------------------------------------------
// Cache (in-memory, 5 minutes) so repeated command-center queries are cheap.
// ---------------------------------------------------------------------------

const GLOBAL_KEY = '__safezone_hospital_cache__'
interface CacheEntry {
  key: string
  expires: number
  hospitals: Hospital[]
}

function getCache(): { get(key: string): CacheEntry | undefined; set(entry: CacheEntry): void } {
  const g = globalThis as unknown as Record<string, { get: (k: string) => CacheEntry | undefined; set: (e: CacheEntry) => void }>
  if (!g[GLOBAL_KEY]) {
    const map = new Map<string, CacheEntry>()
    g[GLOBAL_KEY] = {
      get: (key) => {
        const entry = map.get(key)
        if (entry && entry.expires > Date.now()) return entry
        map.delete(key)
        return undefined
      },
      set: (entry) => map.set(entry.key, entry),
    }
  }
  return g[GLOBAL_KEY]
}

export async function findHospitals(lat: number, lng: number, radiusMeters = 15000): Promise<Hospital[]> {
  const cache = getCache()
  const key = `${lat.toFixed(3)},${lng.toFixed(3)},${radiusMeters}`

  const cached = cache.get(key)
  if (cached) return cached.hospitals

  let hospitals: Hospital[]
  try {
    if (serverEnv.hasHospitalApi) {
      hospitals = await apiHospitals(lat, lng, radiusMeters)
    } else {
      hospitals = await overpassHospitals(lat, lng, radiusMeters)
    }
  } catch (err) {
    throw new Error(`Hospital lookup unavailable (${(err as Error).message})`)
  }

  cache.set({ key, expires: Date.now() + 5 * 60_000, hospitals })
  return hospitals
}