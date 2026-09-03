'use client'

import { useState } from 'react'
import type { Incident } from '@/types'
import { cn } from '@/lib/utils'
import { StatusBadge, SeverityBadge } from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { RoutingService } from '@/lib/services/routing'
import {
  Brain,
  Truck,
  Hospital,
  Clock,
  MapPin,
  CheckCircle,
  X,
  AlertTriangle,
  Activity,
} from 'lucide-react'

export interface IncidentDetailActions {
  analyze: () => void
  dispatch: () => void
  resolve: () => void
  cancel: () => void
}

function Timestamp({ iso }: { iso: string }) {
  return (
    <span className="text-[10px] font-mono text-ops-faint">
      {new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
    </span>
  )
}

export function IncidentDetailPanel({
  incident,
  isOperator,
  busy,
  actions,
  error,
}: {
  incident: Incident
  isOperator: boolean
  busy: string | null
  actions: IncidentDetailActions
  error?: string | null
}) {
  const [expandedTimeline, setExpandedTimeline] = useState(false)
  const analysis = incident.aiAnalysis
  const responder = incident.assignedResponder
  const hospital = incident.destinationHospital
  const primaryRoute = incident.routes[0]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-xl border border-ops-border bg-ops-panel p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-ops-text">{incident.id}</span>
              {incident.isDemo && (
                <span className="rounded bg-warning-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-warning-400">
                  DEMO
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-ops-muted">
              {incident.type.replace(/_/g, ' ')} · {new Date(incident.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={incident.status} />
            <SeverityBadge severity={incident.severity} className="text-[10px]" />
          </div>
        </div>

        {incident.description && (
          <p className="mt-3 rounded-lg bg-ops-panel2 border border-ops-border p-3 text-xs leading-relaxed text-ops-text">
            {incident.description}
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-ops-muted">
            <MapPin className="h-3.5 w-3.5 text-info-400" />
            <span className="font-mono">
              {incident.location.latitude.toFixed(4)}, {incident.location.longitude.toFixed(4)}
            </span>
          </div>
          {typeof incident.location.accuracy === 'number' && (
            <div className="flex items-center gap-1.5 text-ops-muted">
              <Activity className="h-3.5 w-3.5 text-info-400" />
              <span>Accuracy ±{Math.round(incident.location.accuracy)}m</span>
            </div>
          )}
          {typeof incident.peopleAffected === 'number' && (
            <div className="flex items-center gap-1.5 text-ops-muted">
              <UsersIcon />
              <span>{incident.peopleAffected} affected</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Assessment */}
      <div className="rounded-xl border border-ops-border bg-ops-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-info-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-ops-muted">AI Assessment</h3>
          </div>
          {analysis?.status === 'available' && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-ops-faint">
              ENGINE: {analysis.engine === 'llm' ? `LLM${analysis.model ? ` (${analysis.model})` : ''}` : 'RULE-BASED'}
            </span>
          )}
        </div>

        {!analysis ? (
          <p className="text-xs text-ops-muted">Analysis pending.</p>
        ) : analysis.status === 'unavailable' ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-red-400">AI ANALYSIS UNAVAILABLE</p>
              <p className="mt-1 text-[11px] text-ops-muted">{analysis.error ?? 'No AI provider reachable'}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-ops-panel2 border border-ops-border p-2 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-ops-faint">Severity</p>
                <p className="mt-0.5 text-sm font-bold text-ops-text">{analysis.severity}</p>
              </div>
              <div className="rounded-lg bg-ops-panel2 border border-ops-border p-2 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-ops-faint">Confidence</p>
                <p className="mt-0.5 text-sm font-bold text-ops-text">
                  {typeof analysis.confidence === 'number' ? `${Math.round(analysis.confidence * 100)}%` : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-ops-panel2 border border-ops-border p-2 text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-ops-faint">Priority</p>
                <p className="mt-0.5 text-sm font-bold text-ops-text">{analysis.priority ?? '—'}</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-ops-muted">
              <span className="font-semibold text-ops-text">Response:</span> {analysis.recommendedResponse}
            </p>
            {analysis.riskFactors.length > 0 && (
              <ul className="space-y-1">
                {analysis.riskFactors.map((risk, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-ops-muted">
                    <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-warning-400" />
                    {risk}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Route */}
      <div className="rounded-xl border border-ops-border bg-ops-panel p-4">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-warning-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-ops-muted">Routing</h3>
        </div>
        {primaryRoute ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-warning-400">{primaryRoute.label}</span>
              <span className="text-ops-muted">{primaryRoute.provider.toUpperCase()}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-ops-panel2 border border-ops-border p-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-ops-faint">ETA</p>
                <p className="mt-0.5 text-sm font-bold font-mono text-ops-text">
                  {RoutingService.formatDuration(primaryRoute.durationSeconds)}
                </p>
              </div>
              <div className="rounded-lg bg-ops-panel2 border border-ops-border p-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-ops-faint">Distance</p>
                <p className="mt-0.5 text-sm font-bold font-mono text-ops-text">
                  {RoutingService.formatDistance(primaryRoute.distanceMeters)}
                </p>
              </div>
              <div className="rounded-lg bg-ops-panel2 border border-ops-border p-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-ops-faint">Traffic</p>
                <p className="mt-0.5 text-sm font-bold text-ops-text">
                  {primaryRoute.trafficLevel ?? 'NO DATA'}
                </p>
              </div>
            </div>
            {incident.routes.length > 1 && (
              <p className="text-[11px] text-ops-faint">{incident.routes.length} route alternatives shown on map</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-ops-muted">No route calculated.</p>
        )}
      </div>

      {/* Responder */}
      <div className="rounded-xl border border-ops-border bg-ops-panel p-4">
        <div className="mb-2 flex items-center gap-2">
          <Truck className="h-4 w-4 text-safe-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-ops-muted">Responder</h3>
        </div>
        {responder ? (
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-ops-text">{responder.vehicleId}</span>
              <span
                className={cn(
                  'font-bold uppercase tracking-wider',
                  responder.id.startsWith('DEMO') ? 'text-warning-400' : 'text-safe-400'
                )}
              >
                {responder.id.startsWith('DEMO') ? 'DEMO SIMULATION' : responder.status.replace(/_/g, ' ')}
              </span>
            </div>
            {typeof responder.latitude === 'number' && typeof responder.longitude === 'number' && (
              <p className="font-mono text-ops-muted">
                GPS: {responder.latitude.toFixed(5)}, {responder.longitude.toFixed(5)}
                {typeof responder.speed === 'number' && ` · ${Math.round(responder.speed)} km/h`}
              </p>
            )}
            {responder.lastUpdated && (
              <p className="text-[11px] text-ops-faint">Last update: {new Date(responder.lastUpdated).toLocaleTimeString()}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-ops-muted">
            {incident.status === 'DISPATCHING'
              ? 'DISPATCH REQUEST RECORDED — RESPONDER FEED NOT CONNECTED'
              : 'No responder assigned — dispatch requires operator action.'}
          </p>
        )}
      </div>

      {/* Hospital */}
      <div className="rounded-xl border border-ops-border bg-ops-panel p-4">
        <div className="mb-2 flex items-center gap-2">
          <Hospital className="h-4 w-4 text-safe-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-ops-muted">Destination</h3>
        </div>
        {hospital ? (
          <div className="space-y-1.5 text-xs">
            <p className="font-semibold text-ops-text">{hospital.name}</p>
            <div className="flex items-center justify-between text-ops-muted">
              <span>
                {typeof hospital.distanceMeters === 'number' && `${(hospital.distanceMeters / 1000).toFixed(1)} km away`}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-ops-faint">
                {hospital.source === 'overpass' ? 'SOURCE: OSM' : 'SOURCE: HOSPITAL API'}
              </span>
            </div>
            {hospital.bedAvailability && (
              <p className="text-[11px] text-ops-muted">
                Beds:{' '}
                {hospital.bedAvailability.status === 'UNAVAILABLE'
                  ? 'DATA UNAVAILABLE'
                  : `${hospital.bedAvailability.status}${typeof hospital.bedAvailability.availableBeds === 'number' ? ` (${hospital.bedAvailability.availableBeds})` : ''}`}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-ops-muted">No destination selected.</p>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-ops-border bg-ops-panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-ops-muted">Timeline</h3>
          {incident.timeline.length > 4 && (
            <button
              onClick={() => setExpandedTimeline((v) => !v)}
              className="text-[10px] font-bold uppercase tracking-wider text-info-400 hover:text-info-300"
            >
              {expandedTimeline ? 'Show less' : `Show all (${incident.timeline.length})`}
            </button>
          )}
        </div>
        <div className="space-y-0">
          {incident.timeline
            .slice(0, expandedTimeline ? incident.timeline.length : 5)
            .map((event, index, arr) => (
              <div key={event.id} className="relative flex gap-3 pb-3 last:pb-0">
                {index < arr.length - 1 && (
                  <div className="absolute left-[5px] top-4 bottom-0 w-px bg-ops-border" />
                )}
                <span
                  className={cn(
                    'relative mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full border',
                    index === arr.length - 1
                      ? 'border-info-400 bg-info-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]'
                      : 'border-ops-border2 bg-ops-panel2'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-ops-text">{event.label}</p>
                    <Timestamp iso={event.timestamp} />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Operator actions */}
      <div className="rounded-xl border border-ops-border bg-ops-panel p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-ops-muted">Operator Actions</h3>
        {!isOperator && (
          <p className="mb-3 rounded-lg border border-warning-500/40 bg-warning-500/10 p-2.5 text-[11px] leading-relaxed text-warning-300">
            Session role is CITIZEN. Switch to OPERATOR/ADMIN (session control, dev auth) to take operator actions.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" disabled={!isOperator || busy !== null} onClick={actions.analyze}>
            <Brain className="mr-1.5 h-3.5 w-3.5" />
            {busy === 'analyze' ? 'Analyzing…' : 'Re-analyze'}
          </Button>
          <Button variant="secondary" size="sm" disabled={!isOperator || busy !== null} onClick={actions.dispatch}>
            <Truck className="mr-1.5 h-3.5 w-3.5" />
            {busy === 'dispatch' ? 'Dispatching…' : 'Dispatch'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!isOperator || busy !== null || incident.status === 'RESOLVED' || incident.status === 'CANCELLED'}
            onClick={actions.resolve}
          >
            <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-safe-400" />
            Resolve
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!isOperator || busy !== null || incident.status === 'RESOLVED' || incident.status === 'CANCELLED'}
            onClick={actions.cancel}
          >
            <X className="mr-1.5 h-3.5 w-3.5 text-red-400" />
            Cancel
          </Button>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-[11px] text-red-300">{error}</p>
        )}
      </div>
    </div>
  )
}

function UsersIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-ops-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-2a3 3 0 10-3-3 3 3 0 003 3z" />
    </svg>
  )
}