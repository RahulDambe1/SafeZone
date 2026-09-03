import { NextRequest } from 'next/server'
import { createIncident, listIncidents, validateCreateIncident } from '@/lib/server/incidents'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const includeDemo = request.nextUrl.searchParams.get('includeDemo') === 'true'
    const incidents = await listIncidents({ includeDemo })
    return Response.json({ incidents })
  } catch (err) {
    return Response.json({ error: `Failed to load incidents: ${(err as Error).message}` }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validated = validateCreateIncident(body)
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  try {
    const incident = await createIncident(validated.value)
    return Response.json({ incident }, { status: 201 })
  } catch (err) {
    return Response.json({ error: `Failed to create incident: ${(err as Error).message}` }, { status: 500 })
  }
}