'use client'

// Live GPS sharing panel.
//
// Start/Stop toggles real device GPS sharing. All numbers come from the
// browser Geolocation API and the /api/location backend — none are simulated.
// Every failure mode (permission denied, GPS disabled/lost, timeout, insecure
// origin, offline) is shown with its real cause.

import { Activity, AlertTriangle, Clock, MapPin, Play, Radio, Square, WifiOff } from 'lucide-react'
import type { TrackerState } from '@/hooks/useLocationTracker'

function relativeTime(at: number | null): string {
  if (!at) return '—'
  const seconds = Math.max(0, Math.floor((Date.now() - at) / 1000))
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

const ERROR_LABEL: Record<string, string> = {
  PERMISSION_DENIED: 'PERMISSION DENIED',
  POSITION_UNAVAILABLE: 'GPS SIGNAL LOST',
  TIMEOUT: 'GPS TIMEOUT',
  UNSUPPORTED: 'NOT SUPPORTED',
  UNKNOWN: 'GPS ERROR',
  OFFLINE: 'SERVER UNREACHABLE',
  INSECURE_CONTEXT: 'HTTPS REQUIRED',
}

export function LiveGpsCard({
  tracker,
  onStart,
  onStop,
}: {
  tracker: TrackerState
  onStart: () => void
  onStop: () => void
}) {
  const { running, phase, fix, lastSyncAt, syncPending, error, deviceId } = tracker
  const live = phase === 'live'
  const acquiring = running && phase === 'acquiring'
  const failed = phase === 'error'

  const statusColor = live
    ? 'bg-emerald-500'
    : acquiring
      ? 'bg-amber-500 animate-pulse'
      : failed
        ? 'bg-red-500'
        : 'bg-gray-300'
  const statusText = live
    ? 'LIVE'
    : acquiring
      ? 'ACQUIRING'
      : failed
        ? 'ERROR'
        : 'STOPPED'

  const speedKmh =
    typeof fix?.speed === 'number' ? `${Math.max(0, Math.round(fix.speed * 3.6))} km/h` : '—'
  const headingDeg = typeof fix?.heading === 'number' ? `${Math.round(fix.heading)}°` : '—'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-widest text-gray-700">
            Live GPS Sharing
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1">
          <span className={`h-2 w-2 rounded-full ${statusColor}`} />
          <span className="text-[10px] font-bold tracking-wider text-gray-600">{statusText}</span>
        </span>
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-700 uppercase">{ERROR_LABEL[error.code] ?? error.code}</p>
            <p className="text-xs text-red-600 mt-0.5">{error.message}</p>
          </div>
        </div>
      )}

      {syncPending && !error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <WifiOff className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Fix kept on this device — waiting for the server. Auto-retries on the next GPS tick.
          </p>
        </div>
      )}

      {!running && !fix && (
        <p className="mb-3 text-xs text-gray-500">
          Share this device&apos;s real GPS position so it appears live on the map. Uses the
          browser&apos;s high-accuracy Geolocation API — never simulated.
        </p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Metric label="LATITUDE" value={fix ? fix.latitude.toFixed(6) : '—'} mono />
        <Metric label="LONGITUDE" value={fix ? fix.longitude.toFixed(6) : '—'} mono />
        <Metric
          label="ACCURACY"
          value={typeof fix?.accuracy === 'number' ? `±${Math.round(fix.accuracy)} m` : '—'}
        />
        <Metric label="SPEED" value={speedKmh} />
        <Metric label="HEADING" value={headingDeg} />
        <Metric label="UPDATED" value={relativeTime(tracker.lastUpdateAt)} />
      </div>

      <button
        type="button"
        onClick={running ? onStop : onStart}
        className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition-all ${
          running
            ? 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
            : 'bg-blue-600 text-white shadow-soft hover:bg-blue-700'
        }`}
      >
        {running ? (
          <>
            <Square className="h-4 w-4" /> Stop Sharing
          </>
        ) : (
          <>
            <Play className="h-4 w-4" /> Start Sharing Location
          </>
        )}
      </button>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <Activity className="h-3 w-3" />
          Saved to server {relativeTime(lastSyncAt)}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <MapPin className="h-3 w-3" /> {deviceId.slice(0, 18) || 'this device'}
        </span>
      </div>

      {live && fix && (
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400">
          <Clock className="h-3 w-3" />
          Live fix at {new Date(fix.timestamp).toLocaleTimeString()} — real device GPS, forwarded
          over the realtime stream.
        </p>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-xs text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
