'use client'

import type { RealtimeEvent } from '@/types'
import type { RealtimeConnectionState } from '@/lib/store/realtime-client'
import { cn } from '@/lib/utils'

const EVENT_STYLE: Record<string, { color: string; label: string }> = {
  INCIDENT_CREATED: { color: 'text-red-400', label: 'INCIDENT CREATED' },
  INCIDENT_UPDATED: { color: 'text-info-400', label: 'INCIDENT UPDATED' },
  INCIDENT_RESOLVED: { color: 'text-safe-400', label: 'INCIDENT RESOLVED' },
  INCIDENT_CANCELLED: { color: 'text-gray-400', label: 'INCIDENT CANCELLED' },
  RESPONDER_ASSIGNED: { color: 'text-warning-400', label: 'RESPONDER ASSIGNED' },
  RESPONDER_LOCATION_UPDATED: { color: 'text-safe-400', label: 'RESPONDER GPS UPDATE' },
  RESPONDER_STATUS_CHANGED: { color: 'text-warning-400', label: 'RESPONDER STATUS' },
  HOSPITAL_UPDATED: { color: 'text-safe-400', label: 'HOSPITAL UPDATED' },
  SEVERITY_CHANGED: { color: 'text-red-400', label: 'SEVERITY CHANGED' },
  REPORT_CREATED: { color: 'text-info-400', label: 'REPORT CREATED' },
  REPORT_UPDATED: { color: 'text-info-400', label: 'REPORT UPDATED' },
  LOCATION_UPDATED: { color: 'text-info-400', label: 'GPS FIX RECEIVED' },
  SYSTEM_STATUS: { color: 'text-ops-faint', label: 'STREAM CONNECTED' },
}

export function LiveEventTimeline({
  events,
  connection,
}: {
  events: RealtimeEvent[]
  connection: RealtimeConnectionState
}) {
  return (
    <div className="rounded-xl border border-ops-border bg-ops-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn('h-2 w-2 rounded-full', {
              'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]': connection === 'connected',
              'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]': connection === 'connecting',
              'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]': connection === 'disconnected',
            })}
          />
          <h3 className="text-xs font-bold uppercase tracking-widest text-ops-muted">Live Event Stream</h3>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ops-faint">
            {connection === 'connected' ? 'LIVE' : connection === 'connecting' ? 'RECONNECTING' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      {events.length === 0 ? (
        <p className="py-4 text-center text-xs text-ops-faint">
          {connection === 'connected' ? 'Listening for events…' : 'No events yet'}
        </p>
      ) : (
        <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
          {events.slice(0, 40).map((event, index) => {
            const style = EVENT_STYLE[event.type] ?? { color: 'text-ops-muted', label: event.type.replace(/_/g, ' ') }
            return (
              <div key={`${event.at}-${index}`} className="flex items-center gap-2 text-[11px]">
                <span className="font-mono text-ops-faint flex-shrink-0">
                  {new Date(event.at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                </span>
                <span className={cn('font-bold uppercase tracking-wider flex-shrink-0', style.color)}>
                  {style.label}
                </span>
                {event.incidentId && <span className="font-mono text-ops-faint">{event.incidentId}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}