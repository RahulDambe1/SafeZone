import { NextRequest } from 'next/server'
import { getRoutes } from '@/lib/server/routing'
import { isValidLatitude, isValidLongitude } from '@/lib/server/validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const originLat = Number(sp.get('originLat'))
  const originLng = Number(sp.get('originLng'))
  const destLat = Number(sp.get('destLat'))
  const destLng = Number(sp.get('destLng'))

  if (
    !isValidLatitude(originLat) ||
    !isValidLongitude(originLng) ||
    !isValidLatitude(destLat) ||
    !isValidLongitude(destLng)
  ) {
    return Response.json({ error: 'Valid origin and destination coordinates required' }, { status: 400 })
  }

  try {
    const routes = await getRoutes(
      { latitude: originLat, longitude: originLng },
      { latitude: destLat, longitude: destLng }
    )
    return Response.json({ routes })
  } catch (err) {
    return Response.json(
      { error: `ROUTING UNAVAILABLE — ${(err as Error).message}` },
      { status: 503 }
    )
  }
}