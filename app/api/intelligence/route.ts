import { computeHotspots } from '@/lib/server/incidents'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const hotspots = await computeHotspots()
    return Response.json(hotspots)
  } catch (err) {
    return Response.json({ error: `Intelligence unavailable: ${(err as Error).message}` }, { status: 500 })
  }
}