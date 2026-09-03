'use client'

// Real GPS tracking hook.
//
// Drives the browser Geolocation API (watchPosition, high accuracy) on the
// device — a phone or laptop. Every real fix is POSTed to /api/location,
// persisted server-side, and pushed to viewers over the SSE realtime stream.
//
// Honest by construction:
//   - Only real navigator.geolocation data is sent. There is no simulated
//     movement anywhere in this hook.
//   - Permission denied, GPS lost/disabled, timeout, insecure origin and an
//     unreachable backend are all surfaced with their real code and message.
//   - If the browser cannot return a fix (e.g. plain-HTTP origin on a phone),
//     the UI says so instead of inventing coordinates.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LocationErrorCode, LocationFailure } from '@/lib/services/location'
import { sessionRoleHeader } from '@/lib/store/session'

export interface GpsFix {
  latitude: number
  longitude: number
  accuracy?: number
  speed?: number
  heading?: number
  timestamp: string
  deviceId: string
}

export interface TrackerState {
  /** true while the user wants sharing on (even mid-acquisition). */
  running: boolean
  phase: 'idle' | 'acquiring' | 'live' | 'error'
  fix: GpsFix | null
  /** When the last REAL fix was produced by the device. */
  lastUpdateAt: number | null
  /** When the backend last confirmed a saved fix. */
  lastSyncAt: number | null
  /** A fix exists but the server has not confirmed it (offline/backend down). */
  syncPending: boolean
  error: LocationFailure | null
  supported: boolean
  /** Browsers expose geolocation only on secure origins (or localhost). */
  secureContext: boolean
  deviceId: string
}

const POST_INTERVAL_MS = 3000
const RETRY_WATCH_MS = 8000

function randomDeviceId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `dev-${crypto.randomUUID().slice(0, 8)}`
    }
  } catch {
    // fall through
  }
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function loadDeviceId(): string {
  if (typeof window === 'undefined') return randomDeviceId()
  const KEY = 'safezone.gps.deviceId'
  try {
    const existing = window.localStorage.getItem(KEY)
    if (existing) return existing
    const id = randomDeviceId()
    window.localStorage.setItem(KEY, id)
    return id
  } catch {
    return randomDeviceId()
  }
}

function isSecure(): boolean {
  if (typeof window === 'undefined') return true
  if (window.isSecureContext) return true
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

function toFailure(error: GeolocationPositionError | null, fallback: string): LocationFailure {
  switch (error?.code) {
    case 1:
      return { code: 'PERMISSION_DENIED', message: 'Location permission denied. Allow location access for SafeZone in your browser settings.' }
    case 2:
      return { code: 'POSITION_UNAVAILABLE', message: 'GPS signal lost or unavailable. Move to an open area and keep location services ON.' }
    case 3:
      return { code: 'TIMEOUT', message: 'No GPS fix yet. Make sure Location is enabled for the browser (Settings → Location).' }
    default:
      return { code: 'UNKNOWN', message: fallback }
  }
}

export function useLocationTracker() {
  // The id identifies this browser/device (stored in localStorage). It is
  // generated only on the client so SSR and hydration render identical HTML
  // (no Math.random/crypto mismatch), then set once after mount.
  const deviceIdRef = useRef<string>('')

  const [supported] = useState(() =>
    typeof navigator !== 'undefined' && 'geolocation' in navigator
  )
  const [secureContext] = useState(() => isSecure())

  const [state, setState] = useState<TrackerState>({
    running: false,
    phase: 'idle',
    fix: null,
    lastUpdateAt: null,
    lastSyncAt: null,
    syncPending: false,
    error: null,
    supported,
    secureContext,
    deviceId: '',
  })

  const watchIdRef = useRef<number | null>(null)
  const runningRef = useRef(false)

  // Generate the device id on the client only, then expose it via state so the
  // UI can show it.
  useEffect(() => {
    if (deviceIdRef.current) return
    const id = loadDeviceId()
    deviceIdRef.current = id
    setState((prev) => (prev.deviceId ? prev : { ...prev, deviceId: id }))
  }, [])
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPostRef = useRef(0)
  const postInFlightRef = useRef(false)
  const fixRef = useRef<GpsFix | null>(null)

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      try {
        navigator.geolocation.clearWatch(watchIdRef.current)
      } catch {
        // ignore
      }
      watchIdRef.current = null
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }, [])

  const sendFix = useCallback(async (fix: GpsFix) => {
    const now = Date.now()
    if (now - lastPostRef.current < POST_INTERVAL_MS) return
    if (postInFlightRef.current) return
    lastPostRef.current = now
    postInFlightRef.current = true
    try {
      const res = await fetch('/api/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-safezone-role': sessionRoleHeader(),
        },
        body: JSON.stringify(fix),
      })
      if (res.ok) {
        setState((prev) => ({
          ...prev,
          lastSyncAt: Date.now(),
          syncPending: false,
          error: prev.error?.code === 'OFFLINE' ? null : prev.error,
        }))
      } else {
        // Backend reachable but rejected the fix — surface honestly.
        setState((prev) => ({ ...prev, syncPending: true }))
      }
    } catch {
      // Offline / server unreachable. Keep the real fix locally and retry on
      // the next fix tick — never invent anything.
      setState((prev) => ({
        ...prev,
        syncPending: true,
        error: { code: 'OFFLINE', message: 'Server unreachable — fix kept locally. Retrying on next GPS tick.' },
      }))
    } finally {
      postInFlightRef.current = false
    }
  }, [])

  const onPosition = useCallback(
    (position: GeolocationPosition) => {
      const coords = position.coords
      const fix: GpsFix = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        ...(typeof coords.accuracy === 'number' && Number.isFinite(coords.accuracy)
          ? { accuracy: coords.accuracy }
          : {}),
        ...(typeof coords.speed === 'number' && Number.isFinite(coords.speed)
          ? { speed: coords.speed }
          : {}),
        ...(typeof coords.heading === 'number' && Number.isFinite(coords.heading)
          ? { heading: coords.heading }
          : {}),
        timestamp: new Date(position.timestamp).toISOString(),
        deviceId: deviceIdRef.current,
      }
      fixRef.current = fix
      setState((prev) => ({
        ...prev,
        phase: 'live',
        fix,
        lastUpdateAt: Date.now(),
        error: prev.error?.code === 'OFFLINE' ? prev.error : null,
      }))
      void sendFix(fix)
    },
    [sendFix]
  )

  const onWatchError = useCallback(
    (error: GeolocationPositionError | null) => {
      const failure = toFailure(error, 'Unknown geolocation error.')
      // Terminal permission denial must not auto-restart (it would re-prompt in a loop).
      const terminal = failure.code === 'PERMISSION_DENIED' || failure.code === 'UNSUPPORTED'
      setState((prev) => ({
        ...prev,
        phase: 'error',
        error: failure,
        ...(terminal ? { running: false } : {}),
      }))
      if (terminal) {
        runningRef.current = false
        clearWatch()
        return
      }
      // GPS lost/timeout: keep the session armed and retry the watch.
      if (runningRef.current && watchIdRef.current !== null) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current)
        } catch {
          // ignore
        }
        watchIdRef.current = null
        retryTimerRef.current = setTimeout(() => {
          if (!runningRef.current) return
          try {
            watchIdRef.current = navigator.geolocation.watchPosition(
              onPosition,
              onWatchError,
              { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
            )
          } catch {
            // ignore — next retry covers it
          }
        }, RETRY_WATCH_MS)
      }
    },
    [clearWatch, onPosition]
  )

  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState((prev) => ({
        ...prev,
        running: false,
        phase: 'error',
        error: { code: 'UNSUPPORTED', message: 'This browser does not support the Geolocation API.' },
      }))
      return
    }
    if (!secureContext) {
      setState((prev) => ({
        ...prev,
        running: false,
        phase: 'error',
        error: {
          code: 'INSECURE_CONTEXT',
          message:
            'GPS blocked by the browser: location requires HTTPS (localhost is exempt). Open SafeZone over https:// from your phone.',
        },
      }))
      return
    }

    runningRef.current = true
    clearWatch()
    setState((prev) => ({ ...prev, running: true, phase: 'acquiring', error: null, syncPending: prev.syncPending }))
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        onPosition,
        onWatchError,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      )
    } catch {
      runningRef.current = false
      setState((prev) => ({
        ...prev,
        running: false,
        phase: 'error',
        error: { code: 'UNKNOWN', message: 'Could not start GPS watch.' },
      }))
    }
  }, [clearWatch, onPosition, onWatchError, secureContext])

  const stop = useCallback(() => {
    runningRef.current = false
    clearWatch()
    setState((prev) => ({
      ...prev,
      running: false,
      phase: prev.fix ? 'idle' : 'idle',
      syncPending: false,
      error: null,
    }))
  }, [clearWatch])

  // Stop cleanly when the caller unmounts.
  useEffect(() => {
    return () => {
      runningRef.current = false
      clearWatch()
    }
  }, [clearWatch])

  // Back online: re-sync the latest local fix as soon as connectivity returns.
  useEffect(() => {
    if (!('addEventListener' in window)) return
    const onOnline = () => {
      if (fixRef.current && !postInFlightRef.current) {
        lastPostRef.current = 0
        void sendFix(fixRef.current)
      }
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [sendFix])

  return { tracker: state, start, stop }
}
