import { NextRequest } from 'next/server'
import { findHospitals } from '@/lib/server/hospitals'
import { isValidLatitude, isValidLongitude } from '@/lib/server/validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const lat = Number(sp.get('lat'))
  const lng = Number(sp.get('lng'))
  const radius = Number(sp.get('radius') ?? 15000)

  if (!isValidLatitude(lat) || !isValidLongitude(lng) || !Number.isFinite(radius) || radius <= 0) {
    return Response.json({ error: 'Valid lat, lng, radius required' }, { status: 400 })
  }

  try {
    const hospitals = await findHospitals(lat, lng, Math.min(radius, 50000))
    return Response.json({ hospitals })
  } catch (err) {
    return Response.json(
      { error: `HOSPITAL DATA UNAVAILABLE — ${(err as Error).message}` },
      { status: 503 }
    )
  }
}