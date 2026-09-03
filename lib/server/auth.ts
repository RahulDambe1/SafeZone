// Role separation: CITIZEN / OPERATOR / ADMIN.
//
// NOTE: SafeZone does not ship a full authentication provider out of the box.
// Until one is configured (Supabase Auth / Auth0 / enterprise SSO), the role is
// carried in the `x-safezone-role` header, which the UI sets from an explicit
// session-role control. Operator/admin endpoints are DENIED for citizens.
// Production deployment MUST replace this header with verified session tokens;
// see README "Security".

export type Role = 'CITIZEN' | 'OPERATOR' | 'ADMIN'

const ROLES: Role[] = ['CITIZEN', 'OPERATOR', 'ADMIN']

export function roleFromRequest(request: Request): Role {
  const raw = request.headers.get('x-safezone-role')?.toUpperCase().trim()
  return ROLES.includes(raw as Role) ? (raw as Role) : 'CITIZEN'
}

export function isOperator(role: Role): boolean {
  return role === 'OPERATOR' || role === 'ADMIN'
}

export function operatorDenied(): Response {
  return Response.json(
    { error: 'FORBIDDEN — operator privileges required (role: citizen). Configure real auth for production.' },
    { status: 403 }
  )
}