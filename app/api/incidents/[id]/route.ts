import { NextRequest } from 'next/server'
import {
  analyzeIncidentFor,
  attachDemoResponder,
  attachHospital,
  calculateRoutesFor,
  cancelIncident,
  dispatchIncident,
  getIncident,
  INCIDENT_STATUSES,
  processIncident,
  resolveIncident,
  transitionIncident,
} from '@/lib/server/incidents'
import { isOperator, operatorDenied, roleFromRequest } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/incidents/[id]'>) {
  const { id } = await ctx.params
  const incident = await getIncident(id)
  if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 })
  return Response.json({ incident })
}

type Action =
  | { action: 'process' }
  | { action: 'transition'; status?: string }
  | { action: 'analyze' }
  | { action: 'dispatch' }
  | { action: 'route'; to?: { latitude?: unknown; longitude?: unknown } }
  | { action: 'hospital'; hospital?: unknown }
  | { action: 'resolve' }
  | { action: 'cancel' }
  | { action: 'demo-assign'; responder?: unknown }

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/incidents/[id]'>) {
  const { id } = await ctx.params
  const role = roleFromRequest(request)

  let body: Action
  try {
    body = (await request.json()) as Action
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    switch (body.action) {
      case 'process': {
        // Triggered by the citizen right after creating their incident.
        const incident = await processIncident(id)
        return Response.json({ incident })
      }

      case 'cancel': {
        // Citizen may cancel their own incident; operators/admin always may.
        const incident = await cancelIncident(id)
        return Response.json({ incident })
      }

      case 'transition': {
        if (!isOperator(role)) return operatorDenied()
        if (typeof body.status !== 'string' || !INCIDENT_STATUSES.includes(body.status as never)) {
          return Response.json({ error: 'Invalid status' }, { status: 400 })
        }
        const incident = await transitionIncident(id, body.status as never)
        return Response.json({ incident })
      }

      case 'analyze': {
        if (!isOperator(role)) return operatorDenied()
        const incident = await analyzeIncidentFor(id)
        return Response.json({ incident })
      }

      case 'dispatch': {
        if (!isOperator(role)) return operatorDenied()
        const incident = await dispatchIncident(id)
        return Response.json({ incident })
      }

      case 'route': {
        if (!isOperator(role)) return operatorDenied()
        const to =
          body.to && typeof body.to.latitude === 'number' && typeof body.to.longitude === 'number'
            ? { latitude: body.to.latitude, longitude: body.to.longitude }
            : undefined
        const incident = await calculateRoutesFor(id, to ? { to } : {})
        return Response.json({ incident })
      }

      case 'hospital': {
        if (!isOperator(role)) return operatorDenied()
        const hospital = body.hospital
        if (typeof hospital !== 'object' || hospital === null) {
          return Response.json({ error: 'A hospital object is required' }, { status: 400 })
        }
        const rec = hospital as Record<string, unknown>
        if (
          typeof rec.name !== 'string' ||
          typeof rec.latitude !== 'number' ||
          typeof rec.longitude !== 'number'
        ) {
          return Response.json({ error: 'Hospital must include name, latitude, longitude' }, { status: 400 })
        }
        const incident = await attachHospital(id, {
          id: String(rec.id ?? 'hospital'),
          name: rec.name.slice(0, 200),
          latitude: rec.latitude,
          longitude: rec.longitude,
          distanceMeters: typeof rec.distanceMeters === 'number' ? rec.distanceMeters : undefined,
          source: rec.source === 'api' ? 'api' : 'overpass',
          address: typeof rec.address === 'string' ? rec.address : undefined,
        })
        return Response.json({ incident })
      }

      case 'resolve': {
        if (!isOperator(role)) return operatorDenied()
        const incident = await resolveIncident(id)
        return Response.json({ incident })
      }

      case 'demo-assign': {
        // Demo mode only: attaches a clearly-labeled DEMO SIMULATION unit.
        if (!isOperator(role)) return operatorDenied()
        const responder = body.responder
        if (typeof responder !== 'object' || responder === null) {
          return Response.json({ error: 'A responder object is required' }, { status: 400 })
        }
        const rec = responder as Record<string, unknown>
        if (
          typeof rec.id !== 'string' ||
          typeof rec.vehicleId !== 'string' ||
          typeof rec.type !== 'string'
        ) {
          return Response.json({ error: 'Responder must include id, vehicleId, type' }, { status: 400 })
        }
        const incident = await attachDemoResponder(id, {
          id: rec.id.slice(0, 64),
          type: (rec.type === 'FIRE' ? 'FIRE' : rec.type === 'POLICE' ? 'POLICE' : 'AMBULANCE') as 'AMBULANCE' | 'POLICE' | 'FIRE',
          vehicleId: rec.vehicleId.slice(0, 64),
          status: 'DISPATCHED',
          latitude: typeof rec.latitude === 'number' ? rec.latitude : undefined,
          longitude: typeof rec.longitude === 'number' ? rec.longitude : undefined,
          source: 'dispatch-queue',
        })
        return Response.json({ incident })
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    const message = (err as Error).message
    if (message.includes('not found')) return Response.json({ error: message }, { status: 404 })
    if (message.includes('Invalid transition')) return Response.json({ error: message }, { status: 409 })
    return Response.json({ error: message }, { status: 500 })
  }
}