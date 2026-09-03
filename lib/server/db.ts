// Server-side persistent storage.
//
// Default driver: atomic JSON file store under `.data/` (real persistence,
// survives restarts). Optional driver: Supabase (set SAFEZONE_DB_DRIVER=supabase
// plus the SAFEZONE_SUPABASE_* env vars). The active driver is reported
// honestly through the /api/system/status endpoint.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { CommunityReport, Incident, LocationFix } from '@/types'
import { serverEnv } from '@/lib/server/env'

export interface DatabaseHealth {
  connected: boolean
  driver: 'file' | 'supabase'
  detail: string
}

interface DatabaseAdapter {
  health(): Promise<DatabaseHealth>
  listIncidents(): Promise<Incident[]>
  getIncident(id: string): Promise<Incident | undefined>
  upsertIncident(incident: Incident): Promise<void>
  listReports(): Promise<CommunityReport[]>
  upsertReport(report: CommunityReport): Promise<void>
}

// ---------------------------------------------------------------------------
// File driver
// ---------------------------------------------------------------------------

const DATA_DIR = process.env.SAFEZONE_DATA_DIR
  ? path.resolve(process.env.SAFEZONE_DATA_DIR)
  : path.join(process.cwd(), '.data')

const INCIDENTS_FILE = path.join(DATA_DIR, 'incidents.json')
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json')

/** Serializes writes so concurrent mutations cannot corrupt the JSON files. */
class WriteQueue {
  private tail: Promise<unknown> = Promise.resolve()

  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.tail.then(fn, fn)
    this.tail = next.catch(() => undefined)
    return next
  }
}

async function readJsonFile<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

async function writeJsonFile(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  await fs.rename(tmp, file)
}

class FileAdapter implements DatabaseAdapter {
  private queue = new WriteQueue()

  async health(): Promise<DatabaseHealth> {
    return { connected: true, driver: 'file', detail: `LOCAL FILE STORE (${INCIDENTS_FILE})` }
  }

  async listIncidents(): Promise<Incident[]> {
    return this.queue.run(() => readJsonFile<Incident[]>(INCIDENTS_FILE, []))
  }

  async getIncident(id: string): Promise<Incident | undefined> {
    const all = await this.listIncidents()
    return all.find((i) => i.id === id)
  }

  async upsertIncident(incident: Incident): Promise<void> {
    await this.queue.run(async () => {
      const all = await readJsonFile<Incident[]>(INCIDENTS_FILE, [])
      const idx = all.findIndex((i) => i.id === incident.id)
      if (idx >= 0) all[idx] = incident
      else all.push(incident)
      await writeJsonFile(INCIDENTS_FILE, all)
    })
  }

  async listReports(): Promise<CommunityReport[]> {
    return this.queue.run(() => readJsonFile<CommunityReport[]>(REPORTS_FILE, []))
  }

  async upsertReport(report: CommunityReport): Promise<void> {
    await this.queue.run(async () => {
      const all = await readJsonFile<CommunityReport[]>(REPORTS_FILE, [])
      const idx = all.findIndex((r) => r.id === report.id)
      if (idx >= 0) all[idx] = report
      else all.push(report)
      await writeJsonFile(REPORTS_FILE, all)
    })
  }
}

// ---------------------------------------------------------------------------
// Supabase driver
// ---------------------------------------------------------------------------

class SupabaseAdapter implements DatabaseAdapter {
  private client: SupabaseClient | null = null

  private getClient(): SupabaseClient {
    if (!this.client) {
      this.client = createClient(
        serverEnv.supabaseUrl as string,
        serverEnv.supabaseServiceKey as string
      )
    }
    return this.client
  }

  async health(): Promise<DatabaseHealth> {
    if (!serverEnv.hasSupabase) {
      return {
        connected: false,
        driver: 'supabase',
        detail: 'SAFEZONE_SUPABASE_URL / SAFEZONE_SUPABASE_SERVICE_KEY missing',
      }
    }
    try {
      const { error } = await this.getClient().from('incidents').select('id').limit(1)
      if (error) {
        return {
          connected: false,
          driver: 'supabase',
          detail: `Supabase query failed: ${error.message}`,
        }
      }
      return { connected: true, driver: 'supabase', detail: 'SUPABASE CONNECTED (tables: incidents, reports)' }
    } catch (err) {
      return { connected: false, driver: 'supabase', detail: `Supabase unreachable: ${String(err)}` }
    }
  }

  async listIncidents(): Promise<Incident[]> {
    const { data, error } = await this.getClient()
      .from('incidents')
      .select('data')
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Supabase listIncidents failed: ${error.message}`)
    return (data ?? []).map((row) => row.data as Incident)
  }

  async getIncident(id: string): Promise<Incident | undefined> {
    const { data, error } = await this.getClient()
      .from('incidents')
      .select('data')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Supabase getIncident failed: ${error.message}`)
    return data ? (data.data as Incident) : undefined
  }

  async upsertIncident(incident: Incident): Promise<void> {
    const { error } = await this.getClient()
      .from('incidents')
      .upsert({ id: incident.id, data: incident, created_at: incident.createdAt, updated_at: incident.updatedAt })
    if (error) throw new Error(`Supabase upsertIncident failed: ${error.message}`)
  }

  async listReports(): Promise<CommunityReport[]> {
    const { data, error } = await this.getClient()
      .from('reports')
      .select('data')
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Supabase listReports failed: ${error.message}`)
    return (data ?? []).map((row) => row.data as CommunityReport)
  }

  async upsertReport(report: CommunityReport): Promise<void> {
    const { error } = await this.getClient()
      .from('reports')
      .upsert({ id: report.id, data: report, created_at: report.createdAt, updated_at: report.updatedAt })
    if (error) throw new Error(`Supabase upsertReport failed: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------

function pickAdapter(): DatabaseAdapter {
  if (serverEnv.dbDriver === 'supabase') return new SupabaseAdapter()
  return new FileAdapter()
}

const adapter = pickAdapter()

export const db: DatabaseAdapter = adapter

export async function dbHealth(): Promise<DatabaseHealth> {
  try {
    return await adapter.health()
  } catch (err) {
    return { connected: false, driver: serverEnv.dbDriver, detail: `Health check failed: ${String(err)}` }
  }
}

// ---------------------------------------------------------------------------
// Device location fixes (real GPS tracking)
//
// Stored in locations.json (file driver — the default). The Supabase driver
// does not persist fixes yet; if SAFEZONE_DB_DRIVER=supabase the location API
// keeps working in memory only, which is reported honestly by the route.
// ---------------------------------------------------------------------------

const LOCATIONS_FILE = path.join(DATA_DIR, 'locations.json')
const MAX_LOCATION_FIXES = 1200
const locationQueue = new WriteQueue()

export async function saveLocationFix(fix: LocationFix): Promise<void> {
  await locationQueue.run(async () => {
    const all = await readJsonFile<LocationFix[]>(LOCATIONS_FILE, [])
    all.push(fix)
    const trimmed = all.slice(-MAX_LOCATION_FIXES)
    await writeJsonFile(LOCATIONS_FILE, trimmed)
  })
}

export async function listRecentLocationFixes(limit = 60): Promise<LocationFix[]> {
  const all = await locationQueue.run(() => readJsonFile<LocationFix[]>(LOCATIONS_FILE, []))
  return all.slice(-limit).reverse()
}

export async function getLatestLocationFix(deviceId?: string): Promise<LocationFix | undefined> {
  const recent = await listRecentLocationFixes(200)
  if (!deviceId) return recent[0]
  return recent.find((f) => f.deviceId === deviceId)
}