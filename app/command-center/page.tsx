'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/shared/Navigation'
import { MapContainer } from '@/components/shared/MapContainer'
import { SystemStatus } from '@/components/shared/SystemStatus'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { useIncidents } from '@/hooks/useIncidents'
import { Incident, Route } from '@/types'
import { formatDuration, getRelativeTime } from '@/lib/utils'
import {
  Radio,
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  MapPin,
  Ambulance,
  Building2,
  WifiOff,
  Activity,
} from 'lucide-react'

export default function CommandCenterPage() {
  const { incidents, activeIncidents, criticalIncidents } = useIncidents({ includeDemo: true })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIncident = incidents.find((i) => i.id === selectedId) ?? null

  const realResolved = incidents.filter((i) => i.status === 'RESOLVED' && i.resolvedAt && !i.isDemo)
  const avgResponseTime: number | null =
    realResolved.length >= 3
      ? Math.round(
          realResolved.reduce(
            (sum, i) =>
              sum + (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()) / 1000,
            0
          ) / realResolved.length
        )
      : null

  const selectedRoutes: Route[] = selectedIncident?.routes ?? []

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navigation />

      {/* System Status Bar */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm px-4 py-2">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-red-400 animate-pulse" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              SAFEZONE COMMAND CENTER
            </span>
          </div>
          <SystemStatus />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4">
        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <MetricCard
            label="ACTIVE INCIDENTS"
            value={activeIncidents.length.toString()}
            sub="from incident store"
            icon={<AlertTriangle className="h-5 w-5 text-orange-400" />}
            color="orange"
          />
          <MetricCard
            label="CRITICAL"
            value={criticalIncidents.length.toString()}
            sub="require immediate response"
            icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
            color="red"
          />
          <MetricCard
            label="RESOLVED"
            value={incidents.filter((i) => i.status === 'RESOLVED').length.toString()}
            sub="total"
            icon={<CheckCircle className="h-5 w-5 text-green-400" />}
            color="green"
          />
          <MetricCard
            label="AVG RESPONSE TIME"
            value={avgResponseTime != null ? formatDuration(avgResponseTime) : '—'}
            sub={avgResponseTime != null ? 'from real incidents' : 'insufficient data'}
            icon={<Clock className="h-5 w-5 text-blue-400" />}
            color="blue"
          />
        </div>

        {/* Three-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Incident Queue */}
          <div className="lg:col-span-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Incidents
              </h2>
              <span className="text-xs text-gray-600">{activeIncidents.length} active</span>
            </div>

            {activeIncidents.length === 0 && (
              <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-gray-500">No active incidents</p>
                <p className="text-xs text-gray-700 mt-1">
                  Incidents submitted via the SOS flow appear here
                </p>
              </div>
            )}

            {activeIncidents.map((incident) => (
              <button
                key={incident.id}
                onClick={() => setSelectedId(incident.id === selectedId ? null : incident.id)}
                className={`w-full text-left rounded-lg border p-3 transition-all ${
                  selectedId === incident.id
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs font-mono font-bold text-gray-400">{incident.id}</span>
                  {incident.severity && <SeverityBadge severity={incident.severity} />}
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="h-3 w-3 text-gray-600 flex-shrink-0" />
                  <span className="text-xs text-gray-300 truncate">
                    {incident.location?.address ||
                      (incident.location
                        ? `${incident.location.latitude.toFixed(4)}, ${incident.location.longitude.toFixed(4)}`
                        : 'Location unknown')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={incident.status} variant="dot" />
                  <span className="text-[10px] text-gray-600">
                    {getRelativeTime(new Date(incident.createdAt))}
                  </span>
                </div>
                {incident.isDemo && (
                  <span className="mt-1 inline-block text-[10px] font-semibold text-yellow-500 uppercase">
                    DEMO
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Center: Map */}
          <div className="lg:col-span-6">
            <MapContainer
              className="h-[500px] lg:h-[600px]"
              incidents={incidents}
              selectedIncidentId={selectedId}
              onSelectIncident={(id) => setSelectedId(id)}
              routes={selectedRoutes}
            />
          </div>

          {/* Right: Incident Detail */}
          <div className="lg:col-span-3">
            {selectedIncident ? (
              <IncidentDetail incident={selectedIncident} />
            ) : (
              <div className="bg-gray-900 rounded-xl border border-gray-800 h-full flex flex-col items-center justify-center p-6 text-center min-h-[200px]">
                <Activity className="h-10 w-10 text-gray-700 mb-3" />
                <p className="text-sm text-gray-500">Select an incident</p>
                <p className="text-xs text-gray-700 mt-1">
                  Click an incident card or map marker to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  color: 'red' | 'orange' | 'blue' | 'green'
}) {
  const borderColors = {
    red: 'border-red-500/20',
    orange: 'border-orange-500/20',
    blue: 'border-blue-500/20',
    green: 'border-green-500/20',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-900 rounded-xl border ${borderColors[color]} p-4`}
    >
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-3xl font-bold text-white font-mono mb-0.5">{value}</p>
      <p className="text-xs text-gray-600">{sub}</p>
    </motion.div>
  )
}

function IncidentDetail({ incident }: { incident: Incident }) {
  const route = incident.routes?.[0]
  return (
    <div className="space-y-3">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-bold text-gray-400">{incident.id}</span>
          {incident.severity && <SeverityBadge severity={incident.severity} />}
        </div>
        <p className="text-sm font-semibold text-white capitalize mb-1">
          {incident.type?.replace('_', ' ')}
        </p>
        {incident.location?.address && (
          <p className="text-xs text-gray-400">{incident.location.address}</p>
        )}
        {incident.location && (
          <p className="text-xs font-mono text-gray-600 mt-1">
            {incident.location.latitude.toFixed(5)}, {incident.location.longitude.toFixed(5)}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <StatusBadge status={incident.status} variant="dot" />
          {incident.isDemo && (
            <span className="text-[10px] text-yellow-500 font-semibold uppercase">DEMO</span>
          )}
        </div>
      </div>

      {incident.aiAnalysis && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold text-gray-400 uppercase">AI Analysis</span>
            {incident.aiAnalysis.engine && (
              <span className="text-[10px] text-gray-600 uppercase">
                ({incident.aiAnalysis.engine === 'llm' ? 'LLM' : 'Rule-based'})
              </span>
            )}
          </div>
          {incident.aiAnalysis.status === 'available' ? (
            <div className="space-y-1.5 text-xs">
              {incident.aiAnalysis.engine === 'rules' && (
                <p className="text-yellow-500 font-semibold">⚠ Rule-based estimate</p>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Confidence</span>
                <span className="font-mono text-white">
                  {incident.aiAnalysis.confidence != null
                    ? `${Math.round(incident.aiAnalysis.confidence * 100)}%`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Priority</span>
                <span className="font-mono text-white">{incident.aiAnalysis.priority ?? '—'}</span>
              </div>
              {incident.aiAnalysis.recommendedResponse && (
                <p className="text-gray-400 pt-1">{incident.aiAnalysis.recommendedResponse}</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-600">
              AI analysis unavailable
              {incident.aiAnalysis.error && ` — ${incident.aiAnalysis.error}`}
            </p>
          )}
        </div>
      )}

      {route && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ambulance className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-bold text-gray-400 uppercase">Route</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Distance</span>
              <span className="font-mono text-white">
                {(route.distanceMeters / 1000).toFixed(1)} km
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">ETA</span>
              <span className="font-mono text-white">
                {Math.round(route.durationSeconds / 60)} min
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Source</span>
              <span className="text-gray-500">{route.provider}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <WifiOff className="h-4 w-4 text-gray-600" />
          <span className="text-xs font-bold text-gray-600 uppercase">Responder Feed</span>
        </div>
        <p className="text-xs text-gray-600">
          ○ NOT CONNECTED — no authorized dispatch feed configured
        </p>
      </div>

      {incident.destinationHospital && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-green-400" />
            <span className="text-xs font-bold text-gray-400 uppercase">Nearest Hospital</span>
          </div>
          <p className="text-sm font-semibold text-white mb-1">
            {incident.destinationHospital.name}
          </p>
          <p className="text-xs text-gray-500">
            {incident.destinationHospital.distanceMeters != null
              ? `${(incident.destinationHospital.distanceMeters / 1000).toFixed(1)} km`
              : 'Distance unknown'}
          </p>
          <p className="text-xs text-gray-700 mt-1">
            Capacity:{' '}
            {incident.destinationHospital.bedAvailability?.status === 'UNAVAILABLE'
              ? 'DATA UNAVAILABLE'
              : incident.destinationHospital.bedAvailability?.status ?? 'DATA UNAVAILABLE'}
          </p>
        </div>
      )}

      {incident.timeline && incident.timeline.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Timeline</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...incident.timeline].reverse().map((event) => (
              <div key={event.id} className="flex items-start gap-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gray-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-300">{event.label}</p>
                  <p className="text-[10px] text-gray-700">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}