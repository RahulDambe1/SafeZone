// Server-side incident state machine.
//
// Every mutation persists to the database and publishes a realtime event.
// Every status transition appends a TimelineEvent. Demo/test incidents are
// flagged isDemo: true and excluded from production views by default.

import { randomUUID } from 'node:crypto'
import type {
  AIAnalysis,
  CommunityReport,
  Hospital,
  Incident,
  IncidentStatus,
  ReportCategory,
  ReportStatus,
  Responder,
  Route,
  SeverityLevel,
  TimelineEvent,
} from '@/types'
import { db } from '@/lib/server/db'
import { getHub } from '@/lib/server/hub'
import { analyzeIncident, normalizeIncidentType } from '@/lib/server/ai'
import { getRoutes } from '@/lib/server/routing'
import { assignResponder } from '@/lib/server/responders'
import { findHospitals } from '@/lib/server/hospitals'
import {
  isNonEmptyString,
  isValidAccuracy,
  isValidLatitude,
  isValidLongitude,
  isValidSeverity,
  parseLocation,
  sanitizeString,
} from '@/lib/server/validation'

// ---------------------------------------------------------------------------
// IDs / timeline helpers
// ---------------------------------------------------------------------------

export function newIncidentId(): string {
  return `SZ-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`
}

export function newReportId(): string {
  return `RPT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`
}

function uid(): string {
  return randomUUID().slice(0, 8)
}

export function timelineEvent(type: string, label: string): TimelineEvent {
  return { id: uid(), type, label, timestamp: new Date().toISOString() }
}

// ---------------------------------------------------------------------------
// Status machine
// ---------------------------------------------------------------------------

export const INCIDENT_STATUSES: IncidentStatus[] = [
  'REPORTED',
  'ANALYZING',
  'VERIFIED',
  'DISPATCHING',
  'RESPONDER_ASSIGNED',
  'EN_ROUTE',
  'ARRIVED',
  'RESOLVED',
  'CANCELLED',
]

const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  REPORTED: ['ANALYZING'],
  ANALYZING: ['VERIFIED'],
  VERIFIED: ['DISPATCHING'],
  DISPATCHING: ['RESPONDER_ASSIGNED', 'VERIFIED'],
  RESPONDER_ASSIGNED: ['EN_ROUTE'],
  EN_ROUTE: ['ARRIVED'],
  ARRIVED: ['RESOLVED'],
  RESOLVED: [],
  CANCELLED: [],
}

const STATUS_LABELS: Record<IncidentStatus, string> = {
  REPORTED: 'SOS ACTIVATED',
  ANALYZING: 'AI ANALYSIS IN PROGRESS',
  VERIFIED: 'INCIDENT VERIFIED',
  DISPATCHING: 'DISPATCH IN PROGRESS',
  RESPONDER_ASSIGNED: 'RESPONDER ASSIGNED',
  EN_ROUTE: 'RESPONDER EN ROUTE',
  ARRIVED: 'RESPONDER ARRIVED',
  RESOLVED: 'INCIDENT RESOLVED',
  CANCELLED: 'INCIDENT CANCELLED',
}

const STATUS_EVENT_TYPE: Record<IncidentStatus, string> = {
  REPORTED: 'INCIDENT_CREATED',
  ANALYZING: 'STATUS_CHANGED',
  VERIFIED: 'INCIDENT_VERIFIED',
  DISPATCHING: 'DISPATCH_REQUESTED',
  RESPONDER_ASSIGNED: 'RESPONDER_ASSIGNED',
  EN_ROUTE: 'RESPONDER_EN_ROUTE',
  ARRIVED: 'RESPONDER_ARRIVED',
  RESOLVED: 'INCIDENT_RESOLVED',
  CANCELLED: 'INCIDENT_CANCELLED',
}

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  if (from === to) return true
  if (to === 'CANCELLED') return from !== 'RESOLVED' && from !== 'CANCELLED'
  return TRANSITIONS[from]?.includes(to) ?? false
}

// ---------------------------------------------------------------------------
// Incident creation
// ---------------------------------------------------------------------------

export interface CreateIncidentInput {
  type?: string
  severity?: SeverityLevel
  description?: string
  peopleAffected?: number
  location: { latitude: number; longitude: number; accuracy?: number }
  reporter?: string
  isDemo?: boolean
}

export function validateCreateIncident(input: unknown): { ok: true; value: CreateIncidentInput } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'Invalid request body' }
  const rec = input as Record<string, unknown>

  const location = parseLocation(rec.location)
  if (!location) {
    return { ok: false, error: 'A valid { latitude, longitude } location is required' }
  }

  let severity: SeverityLevel = 'MEDIUM'
  if (rec.severity !== undefined) {
    if (!isValidSeverity(rec.severity)) return { ok: false, error: 'Invalid severity' }
    severity = rec.severity
  }

  let peopleAffected: number | undefined
  if (rec.peopleAffected !== undefined) {
    if (typeof rec.peopleAffected !== 'number' || !Number.isFinite(rec.peopleAffected)) {
      return { ok: false, error: 'Invalid peopleAffected' }
    }
    peopleAffected = Math.min(1000, Math.max(0, Math.round(rec.peopleAffected)))
  }

  const description = sanitizeString(rec.description, 2000) || undefined
  const reporter = sanitizeString(rec.reporter, 200) || undefined

  return {
    ok: true,
    value: {
      type: sanitizeString(rec.type, 50) || undefined,
      severity,
      description,
      peopleAffected,
      location,
      reporter,
      isDemo: rec.isDemo === true,
    },
  }
}

export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  const location = input.location
  const type = normalizeIncidentType(input.type)
  const now = new Date().toISOString()

  const incident: Incident = {
    id: newIncidentId(),
    type,
    severity: input.severity ?? ('MEDIUM' as SeverityLevel),
    status: 'REPORTED',
    description: input.description,
    peopleAffected: input.peopleAffected,
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: isValidAccuracy(location.accuracy) ? location.accuracy : undefined,
    },
    reporter: input.reporter,
    routes: [],
    timeline: [
      timelineEvent('INCIDENT_CREATED', 'SOS ACTIVATED'),
      timelineEvent('LOCATION_ACQUIRED', `LOCATION ACQUIRED (${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)})`),
    ],
    isDemo: input.isDemo === true,
    createdAt: now,
    updatedAt: now,
    version: 1,
  }

  await db.upsertIncident(incident)
  getHub().publish({ type: 'INCIDENT_CREATED', incidentId: incident.id, incident, at: now })
  return incident
}

// ---------------------------------------------------------------------------
// Reads / mutations
// ---------------------------------------------------------------------------

export async function listIncidents(opts: { includeDemo?: boolean } = {}): Promise<Incident[]> {
  const all = await db.listIncidents()
  const sorted = all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  if (opts.includeDemo) return sorted
  return sorted.filter((i) => !i.isDemo)
}

export async function getIncident(id: string): Promise<Incident | undefined> {
  return db.getIncident(id)
}

async function mutate(id: string, fn: (incident: Incident) => Incident | Promise<Incident>): Promise<Incident> {
  const incident = await db.getIncident(id)
  if (!incident) throw new Error(`Incident ${id} not found`)
  const updated = await fn(incident)
  updated.version += 1
  updated.updatedAt = new Date().toISOString()
  await db.upsertIncident(updated)

  const hub = getHub()
  if (updated.status === 'RESOLVED') {
    hub.publish({ type: 'INCIDENT_RESOLVED', incidentId: id, incident: updated, at: updated.updatedAt })
  } else if (updated.status === 'CANCELLED') {
    hub.publish({ type: 'INCIDENT_CANCELLED', incidentId: id, incident: updated, at: updated.updatedAt })
  } else {
    hub.publish({ type: 'INCIDENT_UPDATED', incidentId: id, incident: updated, at: updated.updatedAt })
  }
  return updated
}

export async function transitionIncident(id: string, status: IncidentStatus): Promise<Incident> {
  if (!INCIDENT_STATUSES.includes(status)) throw new Error('Invalid status')
  return mutate(id, (incident) => {
    if (incident.status === status) return incident
    if (!canTransition(incident.status, status)) {
      throw new Error(`Invalid transition ${incident.status} → ${status}`)
    }
    const eventType = STATUS_EVENT_TYPE[status]
    const label = STATUS_LABELS[status]

    const updated: Incident = {
      ...incident,
      status,
      timeline: [...incident.timeline, timelineEvent(eventType, label)],
    }
    if (status === 'RESOLVED') updated.resolvedAt = new Date().toISOString()
    return updated
  })
}

export async function attachAIAnalysis(id: string, analysis: AIAnalysis): Promise<Incident> {
  return mutate(id, (incident) => {
    const events: TimelineEvent[] = []
    if (analysis.status === 'available') {
      events.push(timelineEvent('AI_ANALYSIS_COMPLETE', `AI ANALYSIS COMPLETE (${analysis.engine === 'llm' ? 'LLM' : 'RULE-BASED'}, ${Math.round((analysis.confidence ?? 0) * 100)}% confidence)`))
    } else {
      events.push(timelineEvent('AI_ANALYSIS_UNAVAILABLE', 'AI ANALYSIS UNAVAILABLE'))
    }
    return { ...incident, aiAnalysis: analysis, timeline: [...incident.timeline, ...events] }
  })
}

export async function analyzeIncidentFor(id: string): Promise<Incident> {
  const incident = await db.getIncident(id)
  if (!incident) throw new Error(`Incident ${id} not found`)

  const analysis = await analyzeIncident({
    type: incident.type,
    severity: incident.severity,
    description: incident.description,
    peopleAffected: incident.peopleAffected,
    location: incident.location,
  })

  return attachAIAnalysis(id, analysis)
}

export async function calculateRoutesFor(id: string, opts: { to?: { latitude: number; longitude: number } } = {}): Promise<Incident> {
  return mutate(id, async (incident) => {
    const hasResponderGps =
      incident.assignedResponder?.latitude !== undefined &&
      incident.assignedResponder?.longitude !== undefined

    const destination = opts.to ?? { latitude: incident.location.latitude, longitude: incident.location.longitude }
    const origin = hasResponderGps
      ? { latitude: incident.assignedResponder!.latitude!, longitude: incident.assignedResponder!.longitude! }
      : undefined

    let routes: Route[] = []
    let routeEvents: TimelineEvent[] = []
    try {
      if (origin) {
        // Real responder GPS → incident (response route)
        routes = await getRoutes(origin, destination)
        routeEvents.push(timelineEvent('ROUTE_CALCULATED', `ROUTE CALCULATED (${routes.length} option${routes.length > 1 ? 's' : ''})`))
      } else if (opts.to) {
        // Incident → destination (transport planning to hospital)
        routes = await getRoutes(
          { latitude: incident.location.latitude, longitude: incident.location.longitude },
          destination
        )
        routeEvents.push(timelineEvent('ROUTE_CALCULATED', `TRANSPORT ROUTE CALCULATED (${routes.length} option${routes.length > 1 ? 's' : ''})`))
      } else {
        routeEvents.push(
          timelineEvent('ROUTE_CALCULATED', 'ROUTE PLANNING — awaiting responder GPS feed for origin')
        )
      }
    } catch (err) {
      routeEvents.push(timelineEvent('ROUTE_CALCULATED', `ROUTING UNAVAILABLE (${(err as Error).message.slice(0, 120)})`))
    }

    return { ...incident, routes, timeline: [...incident.timeline, ...routeEvents] }
  })
}

export async function dispatchIncident(id: string): Promise<Incident> {
  const incident = await db.getIncident(id)
  if (!incident) throw new Error(`Incident ${id} not found`)

  const result = await assignResponder(id, incident.location, incident.type === 'FIRE' ? 'FIRE' : incident.type === 'CRIME' ? 'POLICE' : 'AMBULANCE')

  return mutate(id, (current) => {
    const events: TimelineEvent[] = []
    if (result.status === 'ASSIGNED' && result.responder) {
      events.push(timelineEvent('RESPONDER_ASSIGNED', `RESPONDER ASSIGNED (${result.responder.vehicleId})`))
      return {
        ...current,
        status: 'RESPONDER_ASSIGNED',
        assignedResponder: result.responder,
        timeline: [...current.timeline, ...events],
      }
    }
    events.push(timelineEvent('DISPATCH_REQUESTED', 'DISPATCH REQUESTED — RESPONDER FEED NOT CONNECTED'))
    return {
      ...current,
      status: current.status === 'VERIFIED' || current.status === 'REPORTED' || current.status === 'ANALYZING'
        ? 'DISPATCHING'
        : current.status,
      timeline: [...current.timeline, ...events],
    }
  })
}

/**
 * Demo-only: records a clearly-labeled DEMO SIMULATION responder unit.
 * The unit id prefix and source flag make it render as DEMO everywhere.
 */
export async function attachDemoResponder(id: string, responder: Responder): Promise<Incident> {
  return mutate(id, (incident) => {
    const unit: Responder = {
      ...responder,
      id: responder.id.startsWith('DEMO') ? responder.id : `DEMO-${responder.id}`,
      vehicleId: responder.vehicleId.startsWith('DEMO') ? responder.vehicleId : `DEMO-${responder.vehicleId}`,
      source: 'dispatch-queue',
      assignedIncident: id,
      lastUpdated: new Date().toISOString(),
    }
    return {
      ...incident,
      status: 'RESPONDER_ASSIGNED',
      assignedResponder: unit,
      timeline: [
        ...incident.timeline,
        timelineEvent('RESPONDER_ASSIGNED', `RESPONDER ASSIGNED (${unit.vehicleId} — DEMO SIMULATION)`),
      ],
    }
  })
}

export async function attachHospital(id: string, hospital: Hospital): Promise<Incident> {
  return mutate(id, (incident) => ({
    ...incident,
    destinationHospital: hospital,
    timeline: [
      ...incident.timeline,
      timelineEvent('HOSPITAL_SELECTED', `HOSPITAL DESTINATION SELECTED (${hospital.name})`),
    ],
  }))
}

export async function resolveIncident(id: string): Promise<Incident> {
  return transitionIncident(id, 'RESOLVED')
}

export async function cancelIncident(id: string): Promise<Incident> {
  return transitionIncident(id, 'CANCELLED')
}

/**
 * Automated post-creation pipeline (triggered by the citizen client):
 * REPORTED → ANALYZING → (real AI analysis) → nearest hospital identified →
 * transport route calculated → VERIFIED. Dispatch is deliberately NOT
 * automated — it requires an operator action.
 */
export async function processIncident(id: string): Promise<Incident> {
  await transitionIncident(id, 'ANALYZING')
  let incident = await analyzeIncidentFor(id)

  let hospital: Hospital | undefined
  try {
    const hospitals = await findHospitals(incident.location.latitude, incident.location.longitude, 15000)
    hospital = hospitals[0]
  } catch {
    hospital = undefined
  }

  if (hospital) {
    incident = await mutate(id, (current) => ({
      ...current,
      destinationHospital: hospital,
      timeline: [
        ...current.timeline,
        timelineEvent('HOSPITAL_SELECTED', `NEAREST HOSPITAL IDENTIFIED (${hospital.name})`),
      ],
    }))
    incident = await calculateRoutesFor(id, {
      to: { latitude: hospital.latitude, longitude: hospital.longitude },
    })
  }

  incident = await transitionIncident(id, 'VERIFIED')
  return incident
}

export const REPORT_CATEGORIES: ReportCategory[] = [
  'ACCIDENT',
  'FIRE',
  'ROAD_HAZARD',
  'CRIME',
  'FLOOD',
  'MEDICAL',
  'OTHER',
]

export function validateCreateReport(input: unknown): { ok: true; value: CreateReportInput } | { ok: false; error: string } {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'Invalid request body' }
  const rec = input as Record<string, unknown>

  const category = String(rec.category ?? '').toUpperCase().replace(/[\s-]/g, '_')
  if (!REPORT_CATEGORIES.includes(category as ReportCategory)) {
    return { ok: false, error: 'Invalid report category' }
  }

  const description = sanitizeString(rec.description, 2000)
  if (!isNonEmptyString(description, 2000)) {
    return { ok: false, error: 'A description is required' }
  }

  const location = parseLocation(rec.location)
  if (!location) return { ok: false, error: 'A valid location is required' }

  return {
    ok: true,
    value: {
      category: category as ReportCategory,
      description,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
    },
  }
}

export interface CreateReportInput {
  category: ReportCategory
  description: string
  latitude: number
  longitude: number
  accuracy?: number
}

/** Rough description similarity for duplicate detection. */
function similarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter((w) => w.length > 2))
  const wb = new Set(b.toLowerCase().split(/\W+/).filter((w) => w.length > 2))
  if (wa.size === 0 || wb.size === 0) return 0
  let overlap = 0
  wa.forEach((w) => {
    if (wb.has(w)) overlap += 1
  })
  return overlap / Math.min(wa.size, wb.size)
}

export async function createReport(input: CreateReportInput): Promise<CommunityReport> {
  const now = new Date().toISOString()
  const recent = await db.listReports()

  // Duplicate detection: same category, within ~500m, within last 24h,
  // description similarity >= 0.5.
  const windowStart = Date.now() - 24 * 60 * 60 * 1000
  const duplicate = recent.find((r) => {
    if (r.category !== input.category) return false
    if (new Date(r.createdAt).getTime() < windowStart) return false
    const dLat = r.latitude - input.latitude
    const dLng = r.longitude - input.longitude
    const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111_320
    if (dist > 500) return false
    return similarity(r.description, input.description) >= 0.5
  })

  const report: CommunityReport = {
    id: newReportId(),
    category: input.category,
    description: input.description,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    status: duplicate ? 'UNDER_REVIEW' : 'UNVERIFIED',
    duplicateOf: duplicate?.id,
    createdAt: now,
    updatedAt: now,
  }

  await db.upsertReport(report)
  getHub().publish({ type: 'REPORT_CREATED', report, at: now })
  return report
}

export async function listReports(): Promise<CommunityReport[]> {
  const all = await db.listReports()
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function setReportStatus(id: string, status: ReportStatus): Promise<CommunityReport> {
  const reports = await db.listReports()
  const report = reports.find((r) => r.id === id)
  if (!report) throw new Error(`Report ${id} not found`)

  const updated: CommunityReport = { ...report, status, updatedAt: new Date().toISOString() }
  await db.upsertReport(updated)
  getHub().publish({ type: 'REPORT_UPDATED', report: updated, at: updated.updatedAt })
  return updated
}

// ---------------------------------------------------------------------------
// Safety intelligence — computed ONLY from stored incident/report data.
// ---------------------------------------------------------------------------

export interface Hotspot {
  latitude: number
  longitude: number
  incidentCount: number
  severities: Record<SeverityLevel, number>
  categories: string[]
}

const MIN_HOTSPOT_INCIDENTS = 3
const HOTSPOT_RADIUS_METERS = 800

export async function computeHotspots(): Promise<{ status: 'available' | 'insufficient'; minRequired: number; hotspots: Hotspot[]; sourceCount: number }> {
  const incidents = (await listIncidents()).filter((i) => i.status !== 'CANCELLED' && i.status !== 'RESOLVED')
  const reports = (await listReports()).filter((r) => r.status === 'VERIFIED')

  const points: { latitude: number; longitude: number; severity: SeverityLevel; category: string }[] = [
    ...incidents.map((i) => ({ latitude: i.location.latitude, longitude: i.location.longitude, severity: i.severity, category: i.type })),
    ...reports.map((r) => ({ latitude: r.latitude, longitude: r.longitude, severity: 'MEDIUM' as SeverityLevel, category: r.category })),
  ]

  const hotspots: Hotspot[] = []
  const used = new Set<number>()

  for (let i = 0; i < points.length; i++) {
    if (used.has(i)) continue
    const cluster = [i]
    for (let j = i + 1; j < points.length; j++) {
      if (used.has(j)) continue
      const dLat = points[j].latitude - points[i].latitude
      const dLng = points[j].longitude - points[i].longitude
      const dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111_320
      if (dist <= HOTSPOT_RADIUS_METERS) cluster.push(j)
    }

    if (cluster.length >= MIN_HOTSPOT_INCIDENTS) {
      cluster.forEach((idx) => used.add(idx))
      const severities: Record<SeverityLevel, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
      const categories = new Set<string>()
      cluster.forEach((idx) => {
        severities[points[idx].severity] += 1
        categories.add(points[idx].category)
      })
      hotspots.push({
        latitude: points[i].latitude,
        longitude: points[i].longitude,
        incidentCount: cluster.length,
        severities,
        categories: Array.from(categories),
      })
    }
  }

  return {
    status: hotspots.length > 0 ? 'available' : 'insufficient',
    minRequired: MIN_HOTSPOT_INCIDENTS,
    hotspots,
    sourceCount: points.length,
  }
}