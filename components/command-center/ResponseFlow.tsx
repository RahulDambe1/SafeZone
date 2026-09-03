'use client'

import type { Incident } from '@/types'
import { cn } from '@/lib/utils'
import { RoutingService } from '@/lib/services/routing'
import { MapPin, Route as RouteIcon, Truck, Hospital, ArrowDown, Radar } from 'lucide-react'

function FlowNode({
  icon,
  title,
  subtitle,
  state,
  detail,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  state: 'connected' | 'pending' | 'unavailable' | 'demo'
  detail?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border',
          state === 'connected' && 'border-safe-500/40 bg-safe-500/10 text-safe-400',
          state === 'pending' && 'border-ops-border2 bg-ops-panel2 text-ops-muted',
          state === 'unavailable' && 'border-red-500/40 bg-red-500/10 text-red-400',
          state === 'demo' && 'border-warning-500/40 bg-warning-500/10 text-warning-400'
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ops-text">{title}</span>
          {detail && <span className="text-[10px] font-bold uppercase tracking-wider text-ops-faint">{detail}</span>}
        </div>
        {subtitle && <p className="mt-0.5 text-xs text-ops-muted">{subtitle}</p>}
      </div>
    </div>
  )
}

export function ResponseFlow({ incident }: { incident: Incident }) {
  const primaryRoute = incident.routes[0]
  const responder = incident.assignedResponder
  const hospital = incident.destinationHospital

  const responderConnected = Boolean(responder?.latitude !== undefined && responder?.longitude !== undefined)
  const responderIsDemo = Boolean(responder && (responder.id.startsWith('DEMO') || responder.source !== 'feed'))

  const routeSubtitle = primaryRoute
    ? `${RoutingService.formatDuration(primaryRoute.durationSeconds)} · ${RoutingService.formatDistance(primaryRoute.distanceMeters)} · ${primaryRoute.label}${primaryRoute.trafficLevel ? ` · TRAFFIC ${primaryRoute.trafficLevel}` : ''}`
    : incident.timeline.some((t) => t.label.startsWith('ROUTING UNAVAILABLE'))
      ? 'ROUTING UNAVAILABLE'
      : incident.status === 'REPORTED' || incident.status === 'ANALYZING'
        ? 'Awaiting analysis…'
        : 'No route calculated yet'

  return (
    <div className="rounded-xl border border-ops-border bg-ops-panel p-4">
      <div className="mb-4 flex items-center gap-2">
        <Radar className="h-4 w-4 text-info-400" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-ops-muted">
          Live Emergency Response Visualization
        </h3>
      </div>

      <div className="space-y-1.5">
        <FlowNode
          icon={<MapPin className="h-4 w-4" />}
          title="INCIDENT LOCATION"
          subtitle={`${incident.location.latitude.toFixed(5)}, ${incident.location.longitude.toFixed(5)}${typeof incident.location.accuracy === 'number' ? ` · ±${Math.round(incident.location.accuracy)}m` : ''}`}
          state="connected"
          detail={incident.isDemo ? 'DEMO' : 'VERIFIED'}
        />
        <div className="flex justify-center py-0.5">
          <ArrowDown className="h-3.5 w-3.5 text-ops-faint" />
        </div>

        <FlowNode
          icon={<RouteIcon className="h-4 w-4" />}
          title="RECOMMENDED ROUTE"
          subtitle={routeSubtitle}
          state={primaryRoute ? 'connected' : 'pending'}
          detail={primaryRoute ? primaryRoute.provider.toUpperCase() : undefined}
        />
        <div className="flex justify-center py-0.5">
          <ArrowDown className="h-3.5 w-3.5 text-ops-faint" />
        </div>

        <FlowNode
          icon={<Truck className="h-4 w-4" />}
          title={responder ? `RESPONDER · ${responder.vehicleId}` : 'RESPONDER'}
          subtitle={
            responder
              ? `${responder.status.replace(/_/g, ' ')}${typeof responder.speed === 'number' ? ` · ${Math.round(responder.speed)} km/h` : ''}`
              : incident.status === 'DISPATCHING'
                ? 'DISPATCH REQUEST RECORDED — RESPONDER FEED NOT CONNECTED'
                : 'AWAITING OPERATOR DISPATCH'
          }
          state={responder ? (responderIsDemo ? 'demo' : responderConnected ? 'connected' : 'pending') : 'pending'}
          detail={responderIsDemo ? 'DEMO SIMULATION' : responderConnected ? 'LIVE GPS FEED' : 'FEED NOT CONNECTED'}
        />
        <div className="flex justify-center py-0.5">
          <ArrowDown className="h-3.5 w-3.5 text-ops-faint" />
        </div>

        <FlowNode
          icon={<Hospital className="h-4 w-4" />}
          title={hospital ? `DESTINATION · ${hospital.name}` : 'DESTINATION'}
          subtitle={
            hospital
              ? `${typeof hospital.distanceMeters === 'number' ? `${(hospital.distanceMeters / 1000).toFixed(1)} km · ` : ''}${hospital.source === 'overpass' ? 'SOURCE: OPENSTREETMAP' : 'SOURCE: HOSPITAL API'}`
              : 'No destination hospital selected'
          }
          state={hospital ? 'connected' : 'pending'}
        />
      </div>

      {/* 3D / live GPS honesty panel */}
      <div className="mt-4 rounded-lg border border-ops-border bg-ops-panel2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-ops-faint">
            3D RESPONSE VISUALIZATION
          </span>
          <span
            className={cn(
              'text-[10px] font-bold uppercase tracking-wider',
              responderConnected && !responderIsDemo
                ? 'text-safe-400'
                : 'text-warning-400'
            )}
          >
            {responderConnected && !responderIsDemo
              ? 'LIVE GPS FEED CONNECTED'
              : 'LIVE GPS FEED NOT CONNECTED'}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ops-muted">
          {responderConnected && !responderIsDemo
            ? `Responder ${responder?.vehicleId} is broadcasting real GPS (heading ${responder?.heading ?? '—'}°, ${Math.round(responder?.speed ?? 0)} km/h). Map and timeline reflect live positions — no simulation.`
            : responderIsDemo
              ? 'This unit is a DEMO SIMULATION unit — no real GPS is being transmitted. Live tracking activates automatically when an authorized responder feed is configured.'
              : 'No authorized responder feed is configured (RESPONDER_API_URL). Real GPS will stream here automatically once an authorized feed is connected.'}
        </p>
      </div>
    </div>
  )
}