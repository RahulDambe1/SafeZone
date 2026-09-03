// Real device GPS tracking endpoint.
//
// POST — the browser (phone/laptop) sends each real Geolocation API fix:
//   { deviceId, latitude, longitude, accuracy?, speed?, heading?, timestamp? }
// The fix is persisted (locations.json, file driver) and broadcast to every
// SSE subscriber as a LOCATION_UPDATED event. Values are validated; nothing
// is ever simulated server-side.
//
// GET — returns the latest stored fix (optionally filtered by deviceId) so a
// viewer can render the last known position before the realtime stream warms up.

import { NextRequest } from 'next/server'
import type { LocationFix } from '@/types'
import { getHub } from '@/lib/server/hub'
import { roleFromRequest } from '@/lib/server/auth'
import {
  getLatestLocationFix,
  listRecentLocationFixes,
  saveLocationFix,
} from '@/lib/server/db'
import { isValidLatitude, isValidLongitude, sanitizeString } from '@/lib/server/validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function toFiniteNonNegative(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined
  return value
}

function parseDeviceId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const cleaned = sanitizeString(raw, 128).replace(/[^A-Za-z0-9._:-]/g, '')
  return cleaned.length > 0 ? cleaned : null
}

function parseIsoTimestamp(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const cleaned = raw.slice(0, 40)
  if (!/^\d{4}-\d{2}-\d{2}T/.test(cleaned)) return undefined
  return Number.isNaN(Date.parse(cleaned)) ? undefined : cleaned
}

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get('deviceId') || undefined
  const limitRaw = Number(request.nextUrl.searchParams.get('limit') || '1')
  const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 1

  const fixes = await listRecentLocationFixes(limit)
  const fix = deviceId
    ? fixes.find((f) => f.deviceId === deviceId) ?? (await getLatestLocationFix(deviceId))
    : fixes[0] ?? null

  return Response.json({ fix: fix ?? null, recent: fixes, deviceId: deviceId ?? null })
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'INVALID_JSON — send a JSON body' }, { status: 400 })
  }

  const deviceId = parseDeviceId(body.deviceId)
  if (!deviceId) {
    return Response.json({ error: 'deviceId is required (alphanumeric, max 128 chars)' }, { status: 400 })
  }

  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return Response.json({ error: 'Valid numeric latitude/longitude required' }, { status: 400 })
  }

  const accuracy = toFiniteNonNegative(body.accuracy)
  const speed = toFiniteNonNegative(body.speed)
  const heading = toFiniteNonNegative(body.heading)
  const timestamp = parseIsoTimestamp(body.timestamp) ?? new Date().toISOString()

  const fix: LocationFix = {
    deviceId,
    latitude,
    longitude,
    ...(typeof accuracy === 'number' ? { accuracy } : {}),
    ...(typeof speed === 'number' ? { speed } : {}),
    ...(typeof heading === 'number' ? { heading } : {}),
    timestamp,
    receivedAt: new Date().toISOString(),
  }

  // The role gate is enforced the same way as every other mutation endpoint.
  roleFromRequest(request)

  try {
    await saveLocationFix(fix)
  } catch (err) {
    return Response.json(
      { error: `LOCATION STORE FAILED — fix not persisted: ${String(err)}` },
      { status: 503 }
    )
  }

  getHub().publish({
    type: 'LOCATION_UPDATED',
    at: fix.receivedAt,
    location: {
      deviceId: fix.deviceId,
      latitude: fix.latitude,
      longitude: fix.longitude,
      ...(typeof fix.accuracy === 'number' ? { accuracy: fix.accuracy } : {}),
      ...(typeof fix.speed === 'number' ? { speed: fix.speed } : {}),
      ...(typeof fix.heading === 'number' ? { heading: fix.heading } : {}),
      timestamp: fix.timestamp,
    },
  })

  return Response.json({ ok: true, fix }, { status: 201 })
}
