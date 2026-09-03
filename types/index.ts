// Core SafeZone Type Definitions — Production Data Model
// Every entity here is either REAL data (from an actual provider / user / sensor)
// or explicitly marked as demo/test data. Nothing in this file may imply that
// test data is live.

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export type IncidentType =
  | 'ACCIDENT'
  | 'FIRE'
  | 'MEDICAL'
  | 'ROAD_HAZARD'
  | 'CRIME'
  | 'FLOOD'
  | 'UNSAFE_LOCATION'
  | 'OTHER'

/**
 * Incident lifecycle statuses. Every transition appends a TimelineEvent.
 */
export type IncidentStatus =
  | 'REPORTED'
  | 'ANALYZING'
  | 'VERIFIED'
  | 'DISPATCHING'
  | 'RESPONDER_ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'RESOLVED'
  | 'CANCELLED'

export type ResponderType = 'AMBULANCE' | 'POLICE' | 'FIRE'

export type ResponderStatus =
  | 'AVAILABLE'
  | 'DISPATCHED'
  | 'EN_ROUTE'
  | 'ON_SCENE'
  | 'RETURNING'
  | 'OFFLINE'

export interface Location {
  latitude: number
  longitude: number
  accuracy?: number
  address?: string
  timestamp?: string
}

export type TimelineEventType =
  | 'INCIDENT_CREATED'
  | 'LOCATION_ACQUIRED'
  | 'AI_ANALYSIS_STARTED'
  | 'AI_ANALYSIS_COMPLETE'
  | 'AI_ANALYSIS_UNAVAILABLE'
  | 'INCIDENT_VERIFIED'
  | 'DISPATCH_REQUESTED'
  | 'RESPONDER_ASSIGNED'
  | 'RESPONDER_EN_ROUTE'
  | 'RESPONDER_ARRIVED'
  | 'ROUTE_CALCULATED'
  | 'HOSPITAL_SELECTED'
  | 'INCIDENT_RESOLVED'
  | 'INCIDENT_CANCELLED'
  | 'SEVERITY_CHANGED'
  | 'STATUS_CHANGED'
  | 'REPORT_CREATED'
  | 'REPORT_STATUS_CHANGED'

export interface TimelineEvent {
  id: string
  type: TimelineEventType | string
  label: string
  timestamp: string // ISO-8601
}

/**
 * Structured, validated AI output. `status: 'unavailable'` is used when no
 * AI model is reachable — the UI must show "AI ANALYSIS UNAVAILABLE".
 * `engine` states whether the output came from a real LLM or a deterministic
 * rule-based analysis, so confidence is never misrepresented.
 */
export interface AIAnalysis {
  status: 'available' | 'unavailable'
  engine: 'llm' | 'rules'
  incidentType?: IncidentType
  severity?: SeverityLevel
  /** 0–1. Only present when produced by a real computation (LLM or rules). */
  confidence?: number
  peopleAffected?: number
  riskFactors: string[]
  recommendedResponse?: string
  priority?: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW'
  reasoningSummary?: string
  model?: string
  analyzedAt: string
  error?: string
}

export interface Responder {
  id: string
  type: ResponderType
  vehicleId: string
  status: ResponderStatus
  latitude?: number
  longitude?: number
  heading?: number
  speed?: number
  lastUpdated?: string
  assignedIncident?: string
  etaSeconds?: number
  /** 'feed' = live GPS/status feed; 'dispatch-queue' = queued, awaiting feed */
  source: 'feed' | 'dispatch-queue'
}

export interface Route {
  id: string
  distanceMeters: number
  durationSeconds: number
  /** [lat, lng] pairs */
  geometry: [number, number][]
  provider: 'mapbox' | 'maptiler' | 'osrm'
  /**
   * 'TRAFFIC-OPTIMIZED ROUTE' is only used when the provider returned real
   * traffic data. Otherwise 'FASTEST ROUTE'.
   */
  label: 'FASTEST ROUTE' | 'TRAFFIC-OPTIMIZED ROUTE'
  trafficLevel?: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface BedAvailability {
  status: 'AVAILABLE' | 'LIMITED' | 'FULL' | 'UNAVAILABLE'
  availableBeds?: number
  reason?: string
}

export interface Hospital {
  id: string
  name: string
  latitude: number
  longitude: number
  distanceMeters?: number
  source: 'overpass' | 'api'
  address?: string
  emergencyCapability?: string
  contact?: string
  /**
   * Only populated when the actual hospital API provides it.
   * Otherwise { status: 'UNAVAILABLE', reason: 'DATA UNAVAILABLE — hospital API does not expose capacity' }.
   */
  bedAvailability?: BedAvailability
}

export type ReportCategory =
  | 'ACCIDENT'
  | 'FIRE'
  | 'ROAD_HAZARD'
  | 'CRIME'
  | 'FLOOD'
  | 'MEDICAL'
  | 'OTHER'

export type ReportStatus = 'UNVERIFIED' | 'UNDER_REVIEW' | 'VERIFIED' | 'DISMISSED'

export interface CommunityReport {
  id: string
  category: ReportCategory
  description: string
  latitude: number
  longitude: number
  accuracy?: number
  status: ReportStatus
  duplicateOf?: string
  createdAt: string
  updatedAt: string
}

export interface Incident {
  id: string
  type: IncidentType
  severity: SeverityLevel
  status: IncidentStatus
  description?: string
  peopleAffected?: number
  location: Location
  reporter?: string
  aiAnalysis?: AIAnalysis
  assignedResponder?: Responder
  destinationHospital?: Hospital
  routes: Route[]
  timeline: TimelineEvent[]
  /** True only for explicitly-labeled demo/test incidents. */
  isDemo: boolean
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  version: number
}

export interface DispatchResult {
  status: 'QUEUED' | 'ASSIGNED'
  message: string
  responder?: Responder
}

export interface SafetyReport extends CommunityReport {
  verified?: boolean
  upvotes?: number
}

export type ServiceState =
  | 'CONNECTED'
  | 'CONFIGURED'
  | 'NOT_CONNECTED'
  | 'UNAVAILABLE'
  | 'ACTIVE'
  | 'STANDBY'
  | 'DEGRADED'

export interface ServiceStatus {
  id: string
  label: string
  state: ServiceState
  detail?: string
}

export interface SystemStatus {
  services: ServiceStatus[]
  activeIncidents: number
  criticalIncidents: number
  respondersActive: number
  averageResponseEtaSeconds?: number
  unresolved: number
  realtimeClients: number
  lastUpdated: string
}

export type RealtimeEventType =
  | 'INCIDENT_CREATED'
  | 'INCIDENT_UPDATED'
  | 'SEVERITY_CHANGED'
  | 'RESPONDER_ASSIGNED'
  | 'RESPONDER_LOCATION_UPDATED'
  | 'RESPONDER_STATUS_CHANGED'
  | 'HOSPITAL_UPDATED'
  | 'INCIDENT_RESOLVED'
  | 'INCIDENT_CANCELLED'
  | 'REPORT_CREATED'
  | 'REPORT_UPDATED'
  | 'LOCATION_UPDATED'
  | 'SYSTEM_STATUS'

export interface RealtimeEvent {
  type: RealtimeEventType
  incidentId?: string
  incident?: Incident
  report?: CommunityReport
  location?: Pick<LocationFix, 'deviceId' | 'latitude' | 'longitude' | 'accuracy' | 'speed' | 'heading' | 'timestamp'>
  at: string
}

/**
 * A real GPS fix shared by a device through the browser Geolocation API and
 * stored server-side. `speed`/`heading` (m/s and degrees) come straight from
 * the device when the browser provides them.
 */
export interface LocationFix {
  deviceId: string
  latitude: number
  longitude: number
  /** Meters. Real device-reported accuracy — never fabricated. */
  accuracy?: number
  /** m/s when the browser/device reports it. */
  speed?: number
  /** Degrees clockwise from true north, when reported. */
  heading?: number
  /** Device GPS fix time (ISO-8601). */
  timestamp?: string
  /** Server receive time (ISO-8601). */
  receivedAt: string
}