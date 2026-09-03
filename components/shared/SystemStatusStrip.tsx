'use client'

import { cn } from '@/lib/utils'
import type { ServiceStatus, SystemStatus } from '@/types'
import type { RealtimeConnectionState } from '@/lib/store/realtime-client'

function stateDot(state: ServiceStatus['state'] | RealtimeConnectionState): string {
  switch (state) {
    case 'CONNECTED':
    case 'CONFIGURED':
    case 'ACTIVE':
      return 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
    case 'DEGRADED':
    case 'STANDBY':
    case 'connecting':
      return 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
    case 'NOT_CONNECTED':
    case 'UNAVAILABLE':
    case 'disconnected':
      return 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
    default:
      return 'bg-gray-500'
  }
}

function ServicePill({ label, state, detail }: { label: string; state: ServiceStatus['state']; detail?: string }) {
  return (
    <div className="flex items-center gap-2" title={detail}>
      <span className={cn('h-2 w-2 rounded-full', stateDot(state))} />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ops-muted">{label}</span>
      <span
        className={cn('text-[10px] font-bold uppercase tracking-wider', {
          'text-emerald-400': state === 'CONNECTED' || state === 'CONFIGURED' || state === 'ACTIVE',
          'text-amber-400': state === 'DEGRADED' || state === 'STANDBY',
          'text-red-400': state === 'NOT_CONNECTED' || state === 'UNAVAILABLE',
        })}
      >
        {state === 'CONFIGURED' ? 'CONFIGURED' : state === 'NOT_CONNECTED' ? 'NOT CONNECTED' : state}
      </span>
    </div>
  )
}

export function SystemStatusStrip({
  status,
  realtimeState,
}: {
  status: SystemStatus | null
  realtimeState: RealtimeConnectionState
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-ops-border bg-ops-panel px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-ops-faint">SYSTEM STATUS</span>
      </div>

      <ServicePill
        label="REALTIME"
        state={realtimeState === 'connected' ? 'CONNECTED' : realtimeState === 'connecting' ? 'DEGRADED' : 'NOT_CONNECTED'}
        detail={realtimeState === 'connected' ? 'SSE live' : realtimeState === 'connecting' ? 'Reconnecting…' : 'Disconnected — updates paused'}
      />

      {status ? (
        status.services.map((service) => (
          <ServicePill key={service.id} label={service.label} state={service.state} detail={service.detail} />
        ))
      ) : (
        <span className="text-[10px] uppercase tracking-wider text-ops-faint">Fetching service status…</span>
      )}
    </div>
  )
}