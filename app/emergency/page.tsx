'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/shared/Navigation'
import Button from '@/components/ui/Button'
import { Panel } from '@/components/ui/Card'
import { LocationService } from '@/lib/services/location'
import type { LocationFailure } from '@/lib/services/location'
import {
  AlertCircle,
  Phone,
  Flame,
  Car,
  MapPin,
  AlertTriangle,
  Ambulance,
  Navigation as NavigationIcon,
  Loader2,
} from 'lucide-react'

const emergencyTypes = [
  {
    id: 'sos',
    title: 'SOS EMERGENCY',
    description: 'Immediate life-threatening emergency',
    icon: Phone,
    color: 'critical',
    severity: 'CRITICAL',
  },
  {
    id: 'accident',
    title: 'Report Accident',
    description: 'Vehicle collision or road accident',
    icon: Car,
    color: 'warning',
    severity: 'HIGH',
  },
  {
    id: 'fire',
    title: 'Report Fire',
    description: 'Fire emergency or smoke detected',
    icon: Flame,
    color: 'critical',
    severity: 'CRITICAL',
  },
  {
    id: 'medical',
    title: 'Medical Emergency',
    description: 'Medical attention required',
    icon: Ambulance,
    color: 'critical',
    severity: 'HIGH',
  },
  {
    id: 'hazard',
    title: 'Report Road Hazard',
    description: 'Dangerous road condition or obstacle',
    icon: AlertTriangle,
    color: 'warning',
    severity: 'MEDIUM',
  },
  {
    id: 'unsafe',
    title: 'Report Unsafe Location',
    description: 'Safety concern or suspicious activity',
    icon: AlertCircle,
    color: 'info',
    severity: 'MEDIUM',
  },
]

export default function EmergencyPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [locationState, setLocationState] = useState<'idle' | 'locating' | 'shared' | 'error'>('idle')
  const [locationDetail, setLocationDetail] = useState<string | null>(null)

  const handleLocationShare = async () => {
    setLocationState('locating')
    try {
      const location = await LocationService.requestLocation(false)
      setLocationDetail(
        `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)} · ±${Math.round(location.accuracy ?? 0)}m`
      )
      setLocationState('shared')
    } catch (err) {
      const failure = err as LocationFailure
      setLocationDetail(failure.message ?? 'Location unavailable')
      setLocationState('error')
    }
  }

  return (
    <div className="min-h-screen bg-ops-bg">
      <Navigation />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-critical-500/10 px-4 py-2 border border-critical-500/40">
            <AlertCircle className="h-4 w-4 text-critical-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-critical-400">EMERGENCY INTERFACE</span>
          </div>
          <h1 className="text-3xl font-bold text-ops-text">Emergency Reporting</h1>
          <p className="mt-3 text-sm text-ops-muted max-w-2xl mx-auto">
            Select the type of emergency or incident you need to report. SOS routes to the full emergency workflow with
            real GPS, AI analysis and command-center dispatch.
          </p>
        </motion.div>

        {/* Location Sharing */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <Panel className="bg-info-500/10 border-info-500/40">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-6 w-6 text-info-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-ops-text">Location Sharing</h3>
                  <p className="mt-1 text-xs text-ops-muted">
                    {locationState === 'shared'
                      ? `✓ Location acquired — ${locationDetail}`
                      : locationState === 'error'
                        ? `GPS unavailable — ${locationDetail}`
                        : locationState === 'locating'
                          ? 'Acquiring your GPS coordinates…'
                          : 'Share your real location for faster response times'}
                  </p>
                </div>
              </div>
              <Button
                variant={locationState === 'shared' ? 'secondary' : 'primary'}
                size="md"
                onClick={handleLocationShare}
                disabled={locationState === 'locating'}
              >
                {locationState === 'locating' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <NavigationIcon className="mr-2 h-4 w-4" />
                )}
                {locationState === 'shared' ? 'Location Shared' : 'Share Location'}
              </Button>
            </div>
          </Panel>
        </motion.div>

        {/* Emergency Types Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {emergencyTypes.map((type, index) => {
            const Icon = type.icon
            const isSelected = selectedType === type.id
            const isSOS = type.id === 'sos'
            const target = isSOS ? '/emergency/sos' : `/emergency/sos?type=${type.id}`

            return (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
                className={isSOS ? 'sm:col-span-2 lg:col-span-3' : ''}
              >
                <Link
                  href={target}
                  onMouseEnter={() => setSelectedType(type.id)}
                  className="block w-full text-left transition-all"
                >
                  <div
                    className={`rounded-xl border-2 p-6 transition-all ${
                      isSOS
                        ? 'bg-critical-600 border-critical-700 text-white shadow-emergency hover:shadow-xl'
                        : isSelected
                          ? 'bg-ops-panel2 border-ops-border2 shadow-medium'
                          : 'bg-ops-panel border-ops-border shadow-soft hover:border-ops-border2 hover:shadow-medium'
                    }`}
                  >
                    <div className={`flex items-start gap-4 ${isSOS ? 'sm:items-center' : ''}`}>
                      <div
                        className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${
                          isSOS ? 'bg-white/20 text-white' : isSelected ? 'bg-ops-panel text-ops-text' : 'bg-ops-panel2 text-ops-muted'
                        }`}
                      >
                        <Icon className="h-7 w-7" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`text-lg font-bold ${isSOS ? 'text-white text-xl sm:text-2xl' : 'text-ops-text'}`}>
                          {type.title}
                        </h3>
                        <p className={`mt-1 text-sm ${isSOS ? 'text-white/90' : 'text-ops-muted'}`}>
                          {type.description}
                        </p>
                        {isSOS && (
                          <div className="mt-4 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-white animate-pulse-emergency"></div>
                            <span className="text-sm font-semibold text-white uppercase tracking-wide">
                              Full workflow: GPS → AI → dispatch
                            </span>
                          </div>
                        )}
                      </div>

                      {isSOS && (
                        <div className="hidden sm:block">
                          <div className="rounded-full bg-white/20 px-4 py-2">
                            <span className="text-sm font-bold text-white uppercase tracking-wide">{type.severity}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Emergency Guidelines */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="mt-10">
          <Panel>
            <h3 className="text-lg font-semibold text-ops-text mb-4">Emergency Guidelines</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-ops-muted">
              <div>
                <p className="font-medium text-ops-text mb-2">For Life-Threatening Emergencies:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Use the SOS EMERGENCY button</li>
                  <li>Stay calm and provide clear information</li>
                  <li>Share your location when prompted</li>
                  <li>Follow dispatcher instructions</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-ops-text mb-2">For Non-Critical Reports:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Select the appropriate incident type</li>
                  <li>Provide detailed description</li>
                  <li>Include photos if safe to do so</li>
                  <li>Enable location services</li>
                </ul>
              </div>
            </div>
          </Panel>
        </motion.div>
      </div>
    </div>
  )
}