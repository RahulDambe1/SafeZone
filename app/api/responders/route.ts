import { getResponderFeedStatus } from '@/lib/server/responders'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const status = await getResponderFeedStatus()
    return Response.json(status)
  } catch (err) {
    return Response.json(
      {
        connected: false,
        source: 'http',
        detail: `RESPONDER FEED UNAVAILABLE — ${(err as Error).message}`,
        responders: [],
      },
      { status: 503 }
    )
  }
}