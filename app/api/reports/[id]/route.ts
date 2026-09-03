import { NextRequest } from 'next/server'
import { setReportStatus } from '@/lib/server/incidents'
import { isOperator, operatorDenied, roleFromRequest } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/reports/[id]'>) {
  const role = roleFromRequest(request)
  if (!isOperator(role)) return operatorDenied()

  const { id } = await ctx.params
  let body: { status?: string }
  try {
    body = (await request.json()) as { status?: string }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const status = body.status
  if (status !== 'UNVERIFIED' && status !== 'UNDER_REVIEW' && status !== 'VERIFIED' && status !== 'DISMISSED') {
    return Response.json({ error: 'Invalid report status' }, { status: 400 })
  }

  try {
    const report = await setReportStatus(id, status)
    return Response.json({ report })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 404 })
  }
}