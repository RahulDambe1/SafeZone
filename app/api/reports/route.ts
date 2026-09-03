import { NextRequest } from 'next/server'
import { createReport, listReports, validateCreateReport } from '@/lib/server/incidents'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const reports = await listReports()
    return Response.json({ reports })
  } catch (err) {
    return Response.json({ error: `Failed to load reports: ${(err as Error).message}` }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validated = validateCreateReport(body)
  if (!validated.ok) {
    return Response.json({ error: validated.error }, { status: 400 })
  }

  try {
    const report = await createReport(validated.value)
    return Response.json({ report }, { status: 201 })
  } catch (err) {
    return Response.json({ error: `Failed to create report: ${(err as Error).message}` }, { status: 500 })
  }
}