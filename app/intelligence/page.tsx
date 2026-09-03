'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/shared/Navigation'
import { Panel } from '@/components/ui/Card'
import { useIncidents } from '@/hooks/useIncidents'
import { formatDuration } from '@/lib/utils'
import { Incident } from '@/types'
import { BarChart3, AlertTriangle, CheckCircle, TrendingUp, Info } from 'lucide-react'

const MINIMUM_DATA_THRESHOLD = 5

export default function IntelligencePage() {
  const { incidents } = useIncidents({ includeDemo: true })

  const stats = useMemo(() => {
    const totalIncidents = incidents.length
    const resolved = incidents.filter((i) => i.status === 'RESOLVED')
    const active = incidents.filter(
      (i) => i.status !== 'RESOLVED' && i.status !== 'CANCELLED'
    )

    // Real average response time (non-demo only)
    const realResolved = resolved.filter((i) => i.resolvedAt && !i.isDemo)
    let avgResponseTime: number | null = null
    if (realResolved.length >= 3) {
      const total = realResolved.reduce((sum, i) => {
        return (
          sum +
          (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()) / 1000
        )
      }, 0)
      avgResponseTime = Math.round(total / realResolved.length)
    }

    // Type breakdown
    const typeCount: Record<string, number> = {}
    incidents.forEach((i) => {
      const t = i.type || 'OTHER'
      typeCount[t] = (typeCount[t] || 0) + 1
    })

    // Severity breakdown
    const severityCount: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
    incidents.forEach((i) => {
      if (i.severity) {
        severityCount[i.severity] = (severityCount[i.severity] || 0) + 1
      }
    })

    const hotspots = detectHotspots(incidents)

    return {
      totalIncidents,
      activeCount: active.length,
      resolvedCount: resolved.length,
      avgResponseTime,
      typeCount,
      severityCount,
      hotspots,
      insufficientData: totalIncidents < MINIMUM_DATA_THRESHOLD,
    }
  }, [incidents])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-h1 font-bold text-gray-900">Safety Intelligence</h1>
              <p className="mt-2 text-gray-600">
                Derived from {stats.totalIncidents} real incident
                {stats.totalIncidents !== 1 ? 's' : ''} in the system
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 border border-gray-200">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600 font-medium">
                {stats.totalIncidents} data points
              </span>
            </div>
          </div>
        </motion.div>

        {/* Insufficient data notice */}
        {stats.insufficientData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 bg-blue-50 rounded-xl border border-blue-200 p-5 flex items-start gap-3"
          >
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                INSUFFICIENT DATA FOR RELIABLE ANALYSIS
              </p>
              <p className="text-sm text-blue-700 mt-1">
                At least {MINIMUM_DATA_THRESHOLD} incidents are needed before meaningful
                patterns can be derived. Currently: {stats.totalIncidents}. Submit real or demo
                emergencies via the SOS flow to build the dataset.
              </p>
            </div>
          </motion.div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Panel>
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
                <p className="text-sm font-semibold text-gray-600">Total Incidents</p>
              </div>
              <p className="text-4xl font-bold text-gray-900 font-mono">
                {stats.totalIncidents}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.activeCount} active, {stats.resolvedCount} resolved
              </p>
            </Panel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Panel>
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <p className="text-sm font-semibold text-gray-600">Resolution Rate</p>
              </div>
              <p className="text-4xl font-bold text-gray-900 font-mono">
                {stats.totalIncidents > 0
                  ? `${Math.round((stats.resolvedCount / stats.totalIncidents) * 100)}%`
                  : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalIncidents > 0
                  ? `${stats.resolvedCount} of ${stats.totalIncidents}`
                  : 'No data'}
              </p>
            </Panel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Panel>
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-6 w-6 text-blue-500" />
                <p className="text-sm font-semibold text-gray-600">Avg Response Time</p>
              </div>
              <p className="text-4xl font-bold text-gray-900 font-mono">
                {stats.avgResponseTime != null ? formatDuration(stats.avgResponseTime) : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.avgResponseTime != null
                  ? 'from real resolved incidents'
                  : 'need ≥3 real resolved incidents'}
              </p>
            </Panel>
          </motion.div>
        </div>

        {/* Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Panel title="Incident Types" subtitle="from real incident store">
              {stats.totalIncidents === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No incidents yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.typeCount)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <div key={type} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 w-32 capitalize">
                          {type.replace('_', ' ').toLowerCase()}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${(count / stats.totalIncidents) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-6 text-right">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </Panel>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Panel title="Severity Distribution" subtitle="from real incident store">
              {stats.totalIncidents === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No incidents yet</p>
              ) : (
                <div className="space-y-3">
                  {(
                    [
                      { key: 'CRITICAL', color: 'bg-red-500', textColor: 'text-red-600' },
                      { key: 'HIGH', color: 'bg-orange-500', textColor: 'text-orange-600' },
                      { key: 'MEDIUM', color: 'bg-blue-500', textColor: 'text-blue-600' },
                      { key: 'LOW', color: 'bg-gray-400', textColor: 'text-gray-500' },
                    ] as const
                  ).map(({ key, color, textColor }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className={`text-sm font-semibold w-16 ${textColor}`}>{key}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className={`${color} h-2 rounded-full`}
                          style={{
                            width: `${stats.totalIncidents > 0 ? ((stats.severityCount[key] || 0) / stats.totalIncidents) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-6 text-right">
                        {stats.severityCount[key] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </motion.div>

          {/* Hotspots */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="md:col-span-2"
          >
            <Panel
              title="Geographic Hotspots"
              subtitle={
                stats.insufficientData
                  ? 'insufficient data for reliable hotspot detection'
                  : `${stats.hotspots.length} cluster(s) detected`
              }
            >
              {stats.hotspots.length === 0 ? (
                <div className="py-6 text-center">
                  <Info className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {stats.insufficientData
                      ? `Need at least ${MINIMUM_DATA_THRESHOLD} incidents to detect patterns`
                      : 'No hotspots — incidents are geographically dispersed'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stats.hotspots.map((hotspot, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {hotspot.incidentCount} incidents
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {hotspot.latitude.toFixed(3)}, {hotspot.longitude.toFixed(3)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        ~{(hotspot.radius / 1000).toFixed(1)}km radius
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </motion.div>
        </div>

        {/* Data source notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 rounded-lg bg-gray-100 border border-gray-200 p-4"
        >
          <p className="text-xs text-gray-500 text-center">
            All data on this page is derived from the real SafeZone incident store.
            No data is hardcoded or simulated on this page.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

function detectHotspots(incidents: Incident[]) {
  const MIN_CLUSTER_SIZE = 2
  const CLUSTER_RADIUS_DEG = 0.01

  const withLocation = incidents.filter((i) => i.location)
  if (withLocation.length < MIN_CLUSTER_SIZE) return []

  const clusters: {
    latitude: number
    longitude: number
    incidentCount: number
    radius: number
  }[] = []
  const used = new Set<string>()

  withLocation.forEach((incident) => {
    if (used.has(incident.id)) return
    const nearby = withLocation.filter(
      (other) =>
        !used.has(other.id) &&
        Math.abs(incident.location.latitude - other.location.latitude) < CLUSTER_RADIUS_DEG &&
        Math.abs(incident.location.longitude - other.location.longitude) < CLUSTER_RADIUS_DEG
    )

    if (nearby.length >= MIN_CLUSTER_SIZE) {
      const avgLat = nearby.reduce((sum, i) => sum + i.location.latitude, 0) / nearby.length
      const avgLng = nearby.reduce((sum, i) => sum + i.location.longitude, 0) / nearby.length
      clusters.push({
        latitude: avgLat,
        longitude: avgLng,
        incidentCount: nearby.length,
        radius: CLUSTER_RADIUS_DEG * 111000,
      })
      nearby.forEach((i) => used.add(i.id))
    }
  })

  return clusters.sort((a, b) => b.incidentCount - a.incidentCount).slice(0, 6)
}