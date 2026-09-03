import { NextRequest } from 'next/server'
import { serverEnv } from '@/lib/server/env'
import { isValidLatitude, isValidLongitude, sanitizeString } from '@/lib/server/validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const lat = Number(sp.get('lat'))
  const lng = Number(sp.get('lng'))
  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    return Response.json({ error: 'Valid lat/lng required' }, { status: 400 })
  }

  const attempts: string[] = []

  if (serverEnv.mapboxToken) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${serverEnv.mapboxToken}&limit=1`
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (res.ok) {
        const body = (await res.json()) as { features?: { place_name?: string }[] }
        const address = body.features?.[0]?.place_name
        if (address) {
          return Response.json({ address: sanitizeString(address, 300) })
        }
        attempts.push('mapbox: no result')
      } else {
        attempts.push(`mapbox: http ${res.status}`)
      }
    } catch (err) {
      attempts.push(`mapbox: ${(err as Error).message}`)
    }
  }

  if (serverEnv.maptilerKey) {
    try {
      const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${encodeURIComponent(serverEnv.maptilerKey)}&limit=1&language=en`
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (res.ok) {
        const body = (await res.json()) as { features?: { place_name?: string }[] }
        const address = body.features?.[0]?.place_name
        if (address) {
          return Response.json({ address: sanitizeString(address, 300) })
        }
        attempts.push('maptiler: no result')
      } else {
        attempts.push(`maptiler: http ${res.status}`)
      }
    } catch (err) {
      attempts.push(`maptiler: ${(err as Error).message}`)
    }
  }

  return Response.json({
    address: undefined,
    detail: `REVERSE GEOCODING UNAVAILABLE — ${attempts.length > 0 ? attempts.join('; ') : 'no geocoding provider configured (set MAPBOX_ACCESS_TOKEN or MAPTILER_API_KEY)'}. Showing coordinates.`,
  })
}