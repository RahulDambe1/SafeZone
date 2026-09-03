// Client-side session role.
//
// SafeZone separates CITIZEN / OPERATOR / ADMIN privileges. Until a real auth
// provider (Supabase Auth / Auth0 / SSO) is configured, the role is chosen
// explicitly in the UI and carried in the x-safezone-role header. The server
// still enforces the gate — citizen sessions get 403 on operator actions.
// Production must replace this with verified session tokens.

export type SessionRole = 'CITIZEN' | 'OPERATOR' | 'ADMIN'

const KEY = 'safezone.session.role'
const ROLES: SessionRole[] = ['CITIZEN', 'OPERATOR', 'ADMIN']

type RoleListener = (role: SessionRole) => void

const listeners = new Set<RoleListener>()

export function getSessionRole(): SessionRole {
  if (typeof window === 'undefined') return 'CITIZEN'
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw && ROLES.includes(raw as SessionRole)) return raw as SessionRole
  } catch {
    // storage unavailable — default to citizen
  }
  return 'CITIZEN'
}

export function setSessionRole(role: SessionRole): void {
  if (!ROLES.includes(role)) return
  try {
    window.localStorage.setItem(KEY, role)
  } catch {
    // ignore
  }
  listeners.forEach((l) => l(role))
}

export function subscribeSessionRole(listener: RoleListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function sessionRoleHeader(): string {
  return getSessionRole()
}