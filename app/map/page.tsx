'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/shared/Navigation'
import { MapContainer } from '@/components/shared/MapContainer'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { Panel } from '@/components/ui/Card'
import { useIncidents } from '@/hooks/useIncidents'
import { useLocationTracker } from '@/hooks/useLocationTracker'
import { LiveGpsCard } from '@/components/tracker/LiveGpsCard'
import { realtimeClient } from '@/lib/store/realtime-client'
import { sessionRoleHeader } from '@/lib/store/session'
import { AlertCircle, Ambulance, Clock, MapPin } from 'lucide-react'
import { getRelativeTime } from '@/lib/utils'

/** Shape the map consumes: real lat/lng plus optional accuracy/device/time. */
interface ViewFix {
  latitude: number
  longitude: number
  accuracy?: number
  deviceId?: string
  timestamp?: string
}

export default function MapPage() {
  const { activeIncidents, incidents } = useIncidents({ includeDemo: true })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIncident = incidents.find((i) => i.id === selectedId)

  // --- Real GPS sharing (this device) ---
  const { tracker, start, stop } = useLocationTracker()

  // --- Last fix shared by ANY device (viewed live over SSE) ---
  const [remoteFix, setRemoteFix] = useState<ViewFix | null>(null)
  const [focusOn, setFocusOn] = useState<{ latitude: number; longitude: number } | null>(null)
  const hasFocusedRef = useRef(false)

  // Catch up with the latest stored fix when the page opens (before SSE
  // delivers the next one).
  useEffect(() => {
    let mounted = true
    fetch('/api/location', {
      headers: { 'x-safezone-role': sessionRoleHeader() },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { fix?: ViewFix } | null) => {
        if (mounted && body?.fix) setRemoteFix(body.fix)
      })
      .catch(() => {
        // offline — the SSE stream will catch up when connected
      })
    return () => {
      mounted = false
    }
  }, [])

  // Live realtime push: every LOCATION_UPDATED event moves the dot.
  useEffect(() => {
    return realtimeClient.subscribe((event) => {
      if (event.type === 'LOCATION_UPDATED' && event.location) {
        setRemoteFix({
          latitude: event.location.latitude,
          longitude: event.location.longitude,
          ...(typeof event.location.accuracy === 'number'
            ? { accuracy: event.location.accuracy }
            : {}),
          deviceId: event.location.deviceId,
          timestamp: event.location.timestamp,
        })
      }
    })
  }, [])

  // While this device is sharing, show its own live fix; otherwise show the
  // most recent fix shared by another device (e.g. the phone). Memoized so the
  // value only changes when an actual fix changes.
  const mapFix: ViewFix | null = useMemo(
    () =>
      tracker.running && tracker.fix
        ? {
            latitude: tracker.fix.latitude,
            longitude: tracker.fix.longitude,
            ...(typeof tracker.fix.accuracy === 'number'
              ? { accuracy: tracker.fix.accuracy }
              : {}),
            deviceId: tracker.fix.deviceId,
            timestamp: tracker.fix.timestamp,
          }
        : remoteFix,
    [tracker.running, tracker.fix, remoteFix]
  )

  // Focus the map on the first real fix that arrives, then let the user pan.
  useEffect(() => {
    if (mapFix && !hasFocusedRef.current) {
      hasFocusedRef.current = true
      setFocusOn({ latitude: mapFix.latitude, longitude: mapFix.longitude })
    }
  }, [mapFix])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-h1 font-bold text-gray-900">Live Safety Map</h1>
              <p className="mt-2 text-gray-600">
                Real incidents from the SafeZone store — updated in real time
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 border border-blue-200">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">
                {activeIncidents.length} Active
              </span>
            </div>
          </div>
        </motion.div>

        {/* Map + Incidents */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <MapContainer
              className="h-[500px] lg:h-[600px]"
              incidents={incidents}
              selectedIncidentId={selectedId}
              onSelectIncident={(id) => setSelectedId(id)}
              routes={selectedIncident?.routes ?? []}
              showUserLocation={!!mapFix}
              userLocation={mapFix ? { latitude: mapFix.latitude, longitude: mapFix.longitude, accuracy: mapFix.accuracy } : null}
              focusOn={focusOn}
              externalTracker={{ tracker, start, stop }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="mb-6">
              <LiveGpsCard tracker={tracker} onStart={start} onStop={stop} />
            </div>
            <Panel
              title="Active Incidents"
              subtitle={
                activeIncidents.length > 0
                  ? `${activeIncidents.length} incidents`
                  : 'No active incidents'
              }
            >
              {activeIncidents.length === 0 && (
                <div className="py-8 text-center">
                  <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No active incidents right now</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Incidents submitted via the SOS flow appear here
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {activeIncidents.map((incident, index) => (
                  <motion.button
                    key={incident.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                    onClick={() =>
                      setSelectedId(incident.id === selectedId ? null : incident.id)
                    }
                    className={`w-full text-left rounded-lg border p-4 transition-all ${
                      selectedId === incident.id
                        ? 'border-blue-500 bg-blue-50 shadow-medium'
                        : 'border-gray-200 bg-white hover:shadow-medium'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-gray-500">
                          {incident.id}
                        </span>
                        {incident.severity && <SeverityBadge severity={incident.severity} />}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-medium text-gray-900">
                          {incident.location?.address ||
                            (incident.location
                              ? `${incident.location.latitude.toFixed(4)}, ${incident.location.longitude.toFixed(4)}`
                              : 'Location unknown')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {getRelativeTime(new Date(incident.createdAt))}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <StatusBadge status={incident.status} variant="dot" />
                        {incident.routes?.[0] && (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                            <Ambulance className="h-3.5 w-3.5" />
                            ETA {Math.round(incident.routes[0].durationSeconds / 60)} min
                          </div>
                        )}
                      </div>
                    </div>
                    {incident.isDemo && (
                      <p className="mt-2 text-[10px] text-yellow-600 font-semibold uppercase">
                        DEMO
                      </p>
                    )}
                  </motion.button>
                ))}
              </div>
            </Panel>
          </motion.div>
        </div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-6"
        >
          <Panel>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Map Legend</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span>Critical incident</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                <span>High severity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span>Medium severity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span>Your location</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Map data © OpenStreetMap contributors | Tiles © CARTO
            </p>
          </Panel>
        </motion.div>
      </div>
    </div>
  )
}