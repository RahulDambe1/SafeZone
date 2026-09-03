import { NextRequest } from 'next/server'
import { analyzeIncident, AnalysisInput } from '@/lib/server/ai'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const input = body as AnalysisInput
  const result = await analyzeIncident({
    type: typeof input.type === 'string' ? input.type : undefined,
    severity: typeof input.severity === 'string' ? input.severity : undefined,
    description: typeof input.description === 'string' ? input.description : undefined,
    peopleAffected: typeof input.peopleAffected === 'number' ? input.peopleAffected : undefined,
    location:
      typeof input.location === 'object' && input.location !== null
        ? {
            latitude: Number(input.location.latitude),
            longitude: Number(input.location.longitude),
            accuracy: Number(input.location.accuracy ?? NaN) || undefined,
          }
        : undefined,
    isDemo: input.isDemo === true,
  })

  return Response.json({ analysis: result })
}