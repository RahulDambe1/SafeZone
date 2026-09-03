// app/api/incidents/[id]/analyze/route.ts
// POST — runs the server-side AI analysis pipeline for an incident.
// The LLM key never leaves the server; output is deterministically validated.

import { NextRequest } from 'next/server'
import { analyzeIncidentFor, getIncident } from '@/lib/server/incidents'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  _request: NextRequest,
  ctx: RouteContext<'/api/incidents/[id]/analyze'>
) {
  const { id } = await ctx.params

  const incident = await getIncident(id)
  if (!incident) {
    return Response.json({ error: 'Incident not found' }, { status: 404 })
  }

  try {
    const updated = await analyzeIncidentFor(id)
    return Response.json({
      analysis: updated.aiAnalysis,
      incidentId: id,
      timestamp: updated.updatedAt,
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Analysis failed'
    return Response.json(
      {
        error: 'AI analysis failed',
        details: error,
        analysis: {
          status: 'unavailable',
          engine: 'rules',
          riskFactors: [],
          analyzedAt: new Date().toISOString(),
          error: 'Analysis service error',
        },
      },
      { status: 500 }
    )
  }
}