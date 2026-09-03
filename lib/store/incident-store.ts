'use client'

import type {
  AIAnalysis,
  CommunityReport,
  Hospital,
  Incident,
  IncidentStatus,
  Responder,
  Route,
} from '@/types'
import { realtimeClient } from '@/lib/store/realtime-client'
import { sessionRoleHeader } from '@/lib/store/session'

export type IncidentListener = (incidents: Incident[]) => void

export interface CreateIncidentInput {
  type?: string
  severity?: string
  description?: string
  peopleAffected?: number
  location?: { latitude: number; longitude: number; accuracy?: number }
  reporter?: string
  isDemo?: boolean
}

const JSON_HEADERS = { 'Content-Type': 'application/json' }

class IncidentStore {
  private incidents = new Map<string, Incident>()
  private listeners = new Set<IncidentListener>()
  private initialized = false
  private initPromise: Promise<void> | null = null

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  connectRealtime(): void {
    realtimeClient.connect()
    realtimeClient.onReconnect(() => {
      this.refresh().catch(() => undefined)
    })
    realtimeClient.subscribe((event) => {
      if (event.incident) {
        this.applyIncident(event.incident)
      } else if (event.report) {
        this.applyReport(event.report)
      } else if (event.incidentId) {
        this.refresh().catch(() => undefined)
      }
    })
  }

  async init(): Promise<void> {
    if (this.initialized) return this.initPromise ?? Promise.resolve()
    this.initPromise = this.load()
    await this.initPromise
  }

  private async load(): Promise<void> {
    try {
      const res = await fetch('/api/incidents?includeDemo=true', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Failed to load incidents (${res.status})`)
      const data = (await res.json()) as { incidents: Incident[] }
      const next = new Map<string, Incident>()
      data.incidents.forEach((incident) => next.set(incident.id, incident))
      this.incidents = next
      this.initialized = true
      this.notify()
    } catch (err) {
      this.initialized = true
      throw err
    }
  }

  async refresh(): Promise<void> {
    try {
      const res = await fetch('/api/incidents?includeDemo=true', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { incidents: Incident[] }
      const next = new Map<string, Incident>()
      data.incidents.forEach((incident) => next.set(incident.id, incident))
      this.incidents = next
      this.initialized = true
      this.notify()
    } catch {
      // keep current cache; realtime will catch up when the connection returns
    }
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  subscribe(listener: IncidentListener): () => void {
    this.listeners.add(listener)
    listener(this.getAll())
    return () => {
      this.listeners.delete(listener)
    }
  }

  get(id: string): Incident | undefined {
    return this.incidents.get(id)
  }

  getAll(includeDemo = true): Incident[] {
    return Array.from(this.incidents.values())
      .filter((i) => includeDemo || !i.isDemo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  getActive(): Incident[] {
    return this.getAll().filter((i) => i.status !== 'RESOLVED' && i.status !== 'CANCELLED')
  }

  getCritical(): Incident[] {
    return this.getActive().filter((i) => i.severity === 'CRITICAL')
  }

  getResolved(): Incident[] {
    return this.getAll().filter((i) => i.status === 'RESOLVED')
  }

  // -------------------------------------------------------------------------
  // Mutations (all proxied to the server, then applied locally)
  // -------------------------------------------------------------------------

  async create(input: CreateIncidentInput): Promise<Incident> {
    await this.init()
    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(input),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? `Failed to create incident (${res.status})`)
    }
    const { incident } = (await res.json()) as { incident: Incident }
    this.applyIncident(incident)
    return incident
  }

  /** Automated pipeline: ANALYZING → AI → hospital → route → VERIFIED. */
  async process(id: string): Promise<Incident> {
    return this.patch(id, { action: 'process' })
  }

  async analyze(id: string): Promise<Incident> {
    return this.patch(id, { action: 'analyze' })
  }

  async transition(id: string, status: IncidentStatus): Promise<Incident> {
    return this.patch(id, { action: 'transition', status })
  }

  async dispatch(id: string): Promise<Incident> {
    return this.patch(id, { action: 'dispatch' })
  }

  async route(id: string, to?: { latitude: number; longitude: number }): Promise<Incident> {
    return this.patch(id, to ? { action: 'route', to } : { action: 'route' })
  }

  async attachHospital(id: string, hospital: Hospital): Promise<Incident> {
    return this.patch(id, { action: 'hospital', hospital })
  }

  async resolve(id: string): Promise<Incident> {
    return this.patch(id, { action: 'resolve' })
  }

  async cancel(id: string): Promise<Incident> {
    return this.patch(id, { action: 'cancel' })
  }

  /** Demo mode only: attaches a clearly-labeled DEMO SIMULATION responder. */
  async demoAssign(id: string, responder: Responder): Promise<Incident> {
    return this.patch(id, { action: 'demo-assign', responder })
  }

  async reportStatus(id: string, status: CommunityReport['status']): Promise<CommunityReport> {
    const res = await fetch(`/api/reports/${id}`, {
      method: 'PATCH',
      headers: { ...JSON_HEADERS, 'x-safezone-role': sessionRoleHeader() },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? `Failed to update report (${res.status})`)
    }
    const { report } = (await res.json()) as { report: CommunityReport }
    this.applyReport(report)
    return report
  }

  /** Backward-compatible aliases used by the demo and SOS flow. */
  async updateStatus(id: string, status: IncidentStatus): Promise<Incident | undefined> {
    return this.transition(id, status)
  }

  async addAIAnalysis(id: string, analysis: AIAnalysis): Promise<Incident | undefined> {
    const current = this.get(id)
    if (!current) return undefined
    const updated = { ...current, aiAnalysis: analysis }
    this.incidents.set(id, updated)
    this.notify()
    return updated
  }

  async assignResponders(id: string, responders: Responder[]): Promise<Incident | undefined> {
    const current = this.get(id)
    if (!current) return undefined
    const updated = {
      ...current,
      assignedResponder: responders[0],
      status: 'RESPONDER_ASSIGNED' as IncidentStatus,
    }
    this.incidents.set(id, updated)
    this.notify()
    return updated
  }

  async updateRoute(id: string, route: Route, _smartRoute?: Route): Promise<Incident | undefined> {
    const current = this.get(id)
    if (!current) return undefined
    const updated = { ...current, routes: [route] }
    this.incidents.set(id, updated)
    this.notify()
    return updated
  }

  async updateETA(id: string, _eta: number): Promise<Incident | undefined> {
    return this.get(id)
  }

  async resolveLocal(id: string): Promise<Incident | undefined> {
    return this.resolve(id)
  }

  clear(): void {
    this.incidents.clear()
    this.notify()
  }

  // -------------------------------------------------------------------------

  private async patch(id: string, body: unknown): Promise<Incident> {
    const res = await fetch(`/api/incidents/${id}`, {
      method: 'PATCH',
      headers: { ...JSON_HEADERS, 'x-safezone-role': sessionRoleHeader() },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(errBody?.error ?? `Request failed (${res.status})`)
    }
    const { incident } = (await res.json()) as { incident: Incident }
    this.applyIncident(incident)
    return incident
  }

  private applyIncident(incident: Incident): void {
    const existing = this.incidents.get(incident.id)
    if (existing && incident.version < existing.version) return
    this.incidents.set(incident.id, incident)
    this.notify()
  }

  private applyReport(report: CommunityReport): void {
    // Reports are not cached in this store; notify so report views can refetch.
    this.notify()
  }

  private notify(): void {
    const snapshot = this.getAll()
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot)
      } catch {
        // ignore listener errors
      }
    })
  }
}

export const incidentStore = new IncidentStore()