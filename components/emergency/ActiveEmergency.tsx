'use client'

import { motion } from 'framer-motion'
import { StatusBadge } from '@/components/ui/Badge'
import { EmergencyState } from '@/types/emergency'
import { EMERGENCY_TYPES } from '@/types/emergency'
import type { Incident } from '@/types'
import { useIncident } from '@/hooks/useIncidents'
import { RoutingService } from '@/lib/services/routing'
import { formatTime } from '@/lib/utils'
import {
  Phone,
  X,
  AlertCircle,
  Brain,
  Ambulance as AmbulanceIcon,
  Hospital,
  MapPin,
  Route as RouteIcon,
  CheckCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react'

interface ActiveEmergencyProps {
  state: EmergencyState
  incident: Incident | null
  processingError?: string
  onCancel: () => void
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'bad' }) {
  const toneClass =
    tone === 'ok'
      ? 'text-safe-400'
      : tone === 'warn'
        ? 'text-warning-400'
        : tone === 'bad'
          ? 'text-red-400'
          : 'text-ops-text'
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-ops-muted">{label}</span>
      <span className={`text-xs font-bold text-right ${toneClass}`}>{value}</span>
    </div>
  )
}

export function ActiveEmergency({ state, incident: initialIncident, processingError, onCancel }: ActiveEmergencyProps) {
  const emergencyType = EMERGENCY_TYPES.find((t) => t.id === state.type)
  const { incident: liveIncident } = useIncident(initialIncident?.id)
  const incident = liveIncident ?? initialIncident

  const analysis = incident?.aiAnalysis
  const responder = incident?.assignedResponder
  const hospital = incident?.destinationHospital
  const route = incident?.routes[0]

  return (
    <div className="min-h-screen bg-ops-bg">
      {/* Header */}
      <div className="bg-critical-600 px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm animate-pulse-emergency">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white">🚨 EMERGENCY ACTIVE</h1>
            <p className="mt-1 text-sm text-white/90">{emergencyType?.label}</p>
            {incident && (
              <p className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 font-mono text-xs text-white">
                {incident.id}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-5 pb-28">
        <div className="space-y-3">
          {!incident && (
            <div className="flex items-center gap-3 rounded-xl border border-ops-border bg-ops-panel p-5">
              <Loader2 className="h-5 w-5 animate-spin text-info-400" />
              <div>
                <p className="text-sm font-bold text-ops-text">Creating your emergency record…</p>
                <p className="mt-0.5 text-xs text-ops-muted">Registering with the command center</p>
              </div>
            </div>
          )}

          {incident && processingError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-400">PIPELINE PARTIAL</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ops-muted">
                  {processingError} — your incident is registered; the command center will continue processing it.
                </p>
              </div>
            </div>
          )}

          {incident && (
            <>
              {/* Status */}
              <div className="rounded-xl border border-ops-border bg-ops-panel p-5">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-ops-muted">Status</p>
                  <StatusBadge status={incident.status} />
                </div>
                <div className="space-y-2.5">
                  <StatusRow
                    label="Request time"
                    value={state.activatedAt ? formatTime(state.activatedAt) : '—'}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-medium text-ops-muted">Location</span>
                    <span className="font-mono text-xs text-ops-text text-right">
                      {incident.location.latitude.toFixed(5)}, {incident.location.longitude.toFixed(5)}
                    </span>
                  </div>
                  {typeof incident.location.accuracy === 'number' && (
                    <StatusRow
                      label="GPS accuracy"
                      value={`±${Math.round(incident.location.accuracy)}m`}
                      tone={incident.location.accuracy > 500 ? 'warn' : 'ok'}
                    />
                  )}
                  {incident.location.address && <StatusRow label="Address" value={incident.location.address} />}
                  {state.isDemo && (
                    <div className="rounded-lg border border-warning-500/40 bg-warning-500/10 p-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-warning-400">
                        DEMO MODE — simulated emergency, no real services contacted
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Analysis */}
              <div className="rounded-xl border border-ops-border bg-ops-panel p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-info-500/15">
                    <Brain className="h-5 w-5 text-info-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ops-text">AI ANALYSIS</h3>
                    {analysis?.status === 'available' && (
                      <p className="text-[10px] uppercase tracking-wider text-ops-faint">
                        engine: {analysis.engine === 'llm' ? 'LLM' : 'RULE-BASED'} · {analysis.model}
                      </p>
                    )}
                  </div>
                </div>

                {!analysis ? (
                  <div className="flex items-center gap-2 text-xs text-ops-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analyzing incident…
                  </div>
                ) : analysis.status === 'unavailable' ? (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-400">AI ANALYSIS UNAVAILABLE</p>
                    <p className="mt-1 text-[11px] text-ops-muted">
                      {analysis.error ?? 'No AI provider reachable'} — the emergency workflow continues without it.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
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
                    {analysis.recommendedResponse && (
                      <p className="text-xs leading-relaxed text-ops-muted">{analysis.recommendedResponse}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Response */}
              <div className="rounded-xl border border-ops-border bg-ops-panel p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-safe-500/15">
                    <AmbulanceIcon className="h-5 w-5 text-safe-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ops-text">RESPONSE</h3>
                    <p className="text-[10px] uppercase tracking-wider text-ops-faint">
                      {responder ? 'RESPONDER ASSIGNED' : incident.status === 'DISPATCHING' ? 'DISPATCH REQUESTED' : 'AWAITING DISPATCH'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {responder ? (
                    <>
                      <StatusRow
                        label="Responder"
                        value={responder.vehicleId}
                        tone={responder.id.startsWith('DEMO') ? 'warn' : 'ok'}
                      />
                      <StatusRow label="Status" value={responder.status.replace(/_/g, ' ')} tone="ok" />
                      {typeof responder.latitude === 'number' && typeof responder.longitude === 'number' && (
                        <StatusRow
                          label="GPS"
                          value={
                            responder.id.startsWith('DEMO')
                              ? 'DEMO — not real'
                              : `${responder.latitude.toFixed(5)}, ${responder.longitude.toFixed(5)}`
                          }
                          tone={responder.id.startsWith('DEMO') ? 'warn' : 'ok'}
                        />
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-warning-500/40 bg-warning-500/10 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-warning-400">
                        RESPONDER FEED NOT CONNECTED
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-ops-muted">
                        {incident.status === 'DISPATCHING'
                          ? 'Your dispatch request is recorded. An operator will assign a unit once the authorized responder feed is available.'
                          : 'An operator will dispatch a responder. You will see live status updates here.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Hospital + Route */}
              <div className="rounded-xl border border-ops-border bg-ops-panel p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-safe-500/15">
                    <Hospital className="h-5 w-5 text-safe-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ops-text">DESTINATION</h3>
                    <p className="text-[10px] uppercase tracking-wider text-ops-faint">
                      {hospital ? 'HOSPITAL IDENTIFIED' : 'PENDING'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {hospital ? (
                    <>
                      <StatusRow label="Hospital" value={hospital.name} tone="ok" />
                      {typeof hospital.distanceMeters === 'number' && (
                        <StatusRow label="Distance" value={`${(hospital.distanceMeters / 1000).toFixed(1)} km`} />
                      )}
                      {hospital.bedAvailability && (
                        <StatusRow
                          label="Beds"
                          value={
                            hospital.bedAvailability.status === 'UNAVAILABLE'
                              ? 'DATA UNAVAILABLE'
                              : hospital.bedAvailability.status
                          }
                          tone={hospital.bedAvailability.status === 'UNAVAILABLE' ? 'warn' : 'ok'}
                        />
                      )}
                      {route && (
                        <StatusRow
                          label="Route ETA"
                          value={`${RoutingService.formatDuration(route.durationSeconds)} · ${route.label}`}
                          tone="ok"
                        />
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-ops-muted">No destination hospital identified yet.</p>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-xl border border-ops-border bg-ops-panel p-5">
                <div className="mb-3 flex items-center gap-2">
                  <RouteIcon className="h-4 w-4 text-info-400" />
                  <h3 className="text-sm font-bold text-ops-text">EMERGENCY TIMELINE</h3>
                </div>
                <div className="space-y-0">
                  {incident.timeline.map((event, index, arr) => (
                    <div key={event.id} className="relative flex gap-3 pb-3 last:pb-0">
                      {index < arr.length - 1 && <div className="absolute left-[5px] top-4 bottom-0 w-px bg-ops-border" />}
                      {index === arr.length - 1 ? (
                        <CheckCircle className="relative mt-0.5 h-2.5 w-2.5 flex-shrink-0 text-info-400" />
                      ) : (
                        <span className="relative mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full border border-ops-border2 bg-ops-panel2" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-ops-text">{event.label}</p>
                          <span className="font-mono text-[10px] text-ops-faint">
                            {new Date(event.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Emergency Actions */}
          <div className="rounded-xl border border-ops-border bg-ops-panel p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-ops-muted">Emergency Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="tel:108"
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-safe-500/50 bg-safe-500/10 p-4 hover:bg-safe-500/20 transition-colors"
              >
                <Phone className="h-6 w-6 text-safe-400" />
                <span className="text-xs font-bold text-safe-300">CALL 108</span>
              </a>
              <button
                onClick={onCancel}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-critical-500/50 bg-critical-500/10 p-4 hover:bg-critical-500/20 transition-colors"
              >
                <X className="h-6 w-6 text-red-400" />
                <span className="text-xs font-bold text-red-300">CANCEL REQUEST</span>
              </button>
            </div>
          </div>

          {/* Notice */}
          <div className="rounded-xl border border-ops-border bg-ops-panel p-4">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-info-400" />
              <p className="text-xs leading-relaxed text-ops-muted">
                {state.isDemo ? (
                  <>
                    <strong className="text-ops-text">Demo Mode:</strong> this incident is stored and visible in the
                    Command Center labeled DEMO, but no real emergency services are contacted.
                  </>
                ) : (
                  <>
                    <strong className="text-ops-text">Help is on the way.</strong> Your incident is registered with the
                    Command Center. Stay calm and follow any instructions from responders.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}