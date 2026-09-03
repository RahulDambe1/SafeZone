// Server-side input validation and sanitization.
// All API route input passes through here before touching the data store.

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string }

export function fail(message: string): ValidationResult<never> {
  return { ok: false, error: message }
}

export function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value }
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/** Strip control characters, trim, and enforce a maximum length. */
export function sanitizeString(input: unknown, maxLength = 2000): string {
  if (typeof input !== 'string') return ''
  const cleaned = input.replace(CONTROL_CHARS, '').trim().slice(0, maxLength)
  return cleaned
}

const LAT_MIN = -90
const LAT_MAX = 90
const LNG_MIN = -180
const LNG_MAX = 180

export function isValidLatitude(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= LAT_MIN && v <= LAT_MAX
}

export function isValidLongitude(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= LNG_MIN && v <= LNG_MAX
}

export function isValidAccuracy(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 50_000
}

export function isValidSeverity(v: unknown): v is 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  return v === 'CRITICAL' || v === 'HIGH' || v === 'MEDIUM' || v === 'LOW'
}

export function isNonEmptyString(v: unknown, maxLength = 2000): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= maxLength
}

export function isValidId(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v)
}

/** Validates a { latitude, longitude } pair coming from the client. */
export function parseLocation(input: unknown): { latitude: number; longitude: number; accuracy?: number } | null {
  if (typeof input !== 'object' || input === null) return null
  const rec = input as Record<string, unknown>
  if (!isValidLatitude(rec.latitude) || !isValidLongitude(rec.longitude)) return null
  const location: { latitude: number; longitude: number; accuracy?: number } = {
    latitude: rec.latitude,
    longitude: rec.longitude,
  }
  if (isValidAccuracy(rec.accuracy)) location.accuracy = rec.accuracy
  return location
}

/** Simple bounded JSON parser for untrusted LLM output. */
export function tryParseJson(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}