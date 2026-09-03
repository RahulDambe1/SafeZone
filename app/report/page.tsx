'use client'

import { useEffect, useState } from 'react'
import { Navigation } from '@/components/shared/Navigation'
import Button from '@/components/ui/Button'
import { LocationService } from '@/lib/services/location'
import type { LocationFailure } from '@/lib/services/location'
import type { CommunityReport, ReportCategory } from '@/types'
import { cn } from '@/lib/utils'
import {
  ClipboardList,
  MapPin,
  Navigation as NavigationIcon,
  AlertTriangle,
  CheckCircle,
  FileWarning,
  Loader2,
} from 'lucide-react'

const CATEGORIES: { id: ReportCategory; label: string; description: string }[] = [
  { id: 'ACCIDENT', label: 'Accident', description: 'Vehicle collision or road accident' },
  { id: 'FIRE', label: 'Fire', description: 'Fire or smoke hazard' },
  { id: 'ROAD_HAZARD', label: 'Road Hazard', description: 'Dangerous road condition or obstacle' },
  { id: 'CRIME', label: 'Crime / Security', description: 'Suspicious or criminal activity' },
  { id: 'FLOOD', label: 'Flood', description: 'Flooding or water hazard' },
  { id: 'MEDICAL', label: 'Medical Emergency', description: 'Medical situation requiring attention' },
  { id: 'OTHER', label: 'Other', description: 'Anything else' },
]

const STATUS_LABELS: Record<CommunityReport['status'], string> = {
  UNVERIFIED: 'UNVERIFIED — awaiting operator review',
  UNDER_REVIEW: 'UNDER REVIEW — flagged as possible duplicate',
  VERIFIED: 'VERIFIED by operator',
  DISMISSED: 'DISMISSED',
}

export default function ReportPage() {
  const [category, setCategory] = useState<ReportCategory>('ROAD_HAZARD')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null)
  const [gpsState, setGpsState] = useState<'idle' | 'locating' | 'acquired' | 'error'>('idle')
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CommunityReport | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const acquireLocation = async () => {
    setGpsState('locating')
    setGpsError(null)
    try {
      const loc = await LocationService.requestLocation(false)
      setLocation({ latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy })
      setGpsState('acquired')
    } catch (err) {
      const failure = err as LocationFailure
      setGpsError(failure.message ?? 'Failed to acquire location')
      setGpsState('error')
    }
  }

  const submit = async () => {
    if (!location || !description.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    setResult(null)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          description: description.trim(),
          location,
        }),
      })
      const body = (await res.json()) as { report?: CommunityReport; error?: string }
      if (!res.ok || !body.report) {
        throw new Error(body.error ?? `Failed (${res.status})`)
      }
      setResult(body.report)
    } catch (err) {
      setSubmitError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-ops-bg">
      <Navigation />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-safe-500/15 border border-safe-500/40">
            <ClipboardList className="h-6 w-6 text-safe-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ops-text">Community Reporting</h1>
            <p className="text-xs text-ops-muted">
              Reports are stored and reviewed by operators — never auto-verified, duplicates flagged automatically
            </p>
          </div>
        </div>

        {result ? (
          <div className="rounded-xl border border-ops-border bg-ops-panel p-6">
            <div className="flex items-start gap-3">
              {result.duplicateOf ? (
                <FileWarning className="h-6 w-6 flex-shrink-0 text-warning-400" />
              ) : (
                <CheckCircle className="h-6 w-6 flex-shrink-0 text-safe-400" />
              )}
              <div>
                <h2 className="font-bold text-ops-text">
                  Report {result.id} submitted
                </h2>
                <p className="mt-1.5 text-sm text-ops-muted">{STATUS_LABELS[result.status]}</p>
                {result.duplicateOf && (
                  <p className="mt-2 rounded-lg border border-warning-500/40 bg-warning-500/10 p-3 text-xs leading-relaxed text-warning-300">
                    This report matches an existing report within 500m / 24h / same category and was placed{' '}
                    <strong>UNDER REVIEW</strong> as a possible duplicate (reference {result.duplicateOf}). An operator
                    will verify or dismiss it.
                  </p>
                )}
                <div className="mt-4 flex gap-3">
                  <Button variant="outline" size="sm" onClick={() => { setResult(null); setDescription('') }}>
                    Submit another
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Category */}
            <div className="rounded-xl border border-ops-border bg-ops-panel p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ops-muted">Category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all',
                      category === c.id
                        ? 'border-safe-500/50 bg-safe-500/10'
                        : 'border-ops-border bg-ops-panel2 hover:border-ops-border2'
                    )}
                  >
                    <p className={cn('text-sm font-bold', category === c.id ? 'text-safe-400' : 'text-ops-text')}>
                      {c.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-ops-faint">{c.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="rounded-xl border border-ops-border bg-ops-panel p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-ops-muted">Description</h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Describe what you observed… (e.g. broken traffic light at junction, waterlogging on main road)"
                className="w-full rounded-lg border border-ops-border bg-ops-panel2 px-3 py-2.5 text-sm text-ops-text placeholder:text-ops-faint focus:border-info-500/60 focus:outline-none"
              />
              <p className="mt-1 text-right text-[10px] text-ops-faint">{description.length}/2000</p>
            </div>

            {/* Location */}
            <div className="rounded-xl border border-ops-border bg-ops-panel p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-ops-muted">Location</h2>
                <Button variant="secondary" size="sm" onClick={acquireLocation} disabled={gpsState === 'locating'}>
                  {gpsState === 'locating' ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <NavigationIcon className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {gpsState === 'acquired' ? 'Update location' : 'Use my location'}
                </Button>
              </div>

              {location ? (
                <div className="rounded-lg border border-safe-500/40 bg-safe-500/10 p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-safe-400" />
                    <span className="font-mono text-sm text-ops-text">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </span>
                  </div>
                  {typeof location.accuracy === 'number' && (
                    <p className="mt-1 text-[11px] text-ops-muted">Accuracy ±{Math.round(location.accuracy)}m</p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-ops-border bg-ops-panel2 p-3">
                  <p className="text-xs text-ops-muted">No location set. Use your device GPS (real coordinates are captured).</p>
                </div>
              )}

              {gpsState === 'error' && gpsError && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-red-400">GPS UNAVAILABLE</p>
                    <p className="mt-1 text-[11px] text-ops-muted">{gpsError}</p>
                  </div>
                </div>
              )}
            </div>

            {submitError && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                <p className="text-xs text-red-300">{submitError}</p>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!location || !description.trim() || submitting}
              onClick={submit}
            >
              {submitting ? 'Submitting…' : 'Submit Report'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}