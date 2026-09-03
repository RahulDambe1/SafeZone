'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Circle, Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { AlertTriangle, Crosshair, Loader2, Locate, LocateFixed, X } from 'lucide-react'
import { useLocationTracker, type TrackerState } from '@/hooks/useLocationTracker'
import { cn } from '@/lib/utils'

export interface LocateControlProps {
  /** Optional tracker instance if managed externally (e.g. MapPage) */
  externalTracker?: {
    tracker: TrackerState
    start: () => void
    stop: () => void
  }
  /** Static/fallback user location if available */
  externalLocation?: { latitude: number; longitude: number; accuracy?: number } | null
  /** Callback when real-time location changes */
  onLocationChange?: (location: { latitude: number; longitude: number; accuracy?: number }) => void
  /** Position on map overlay */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

function userBeaconIcon(following: boolean): L.DivIcon {
  return L.divIcon({
    className: 'sz-marker-wrap',
    html: `
      <div class="sz-user-beacon ${following ? 'sz-user-beacon-following' : ''}">
        <span class="sz-user-beacon-pulse"></span>
        <span class="sz-user-beacon-dot"></span>
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

interface InternalControlProps extends LocateControlProps {
  trackerApi: {
    tracker: TrackerState
    start: () => void
    stop: () => void
  }
}

function LocateControlInner({
  trackerApi,
  externalLocation,
  onLocationChange,
  position = 'top-right',
}: InternalControlProps) {
  const map = useMap()
  const { tracker, start, stop } = trackerApi

  const [followMode, setFollowMode] = useState(false)
  const [showErrorToast, setShowErrorToast] = useState(false)
  const hasInitialCenteredRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Prevent Leaflet map dragging/zooming when clicking the control overlay
  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current)
      L.DomEvent.disableScrollPropagation(containerRef.current)
    }
  }, [])

  // Active fix priority: real device tracker fix > external location
  const currentFix =
    tracker.fix ??
    (externalLocation
      ? {
          latitude: externalLocation.latitude,
          longitude: externalLocation.longitude,
          accuracy: externalLocation.accuracy,
          timestamp: new Date().toISOString(),
          deviceId: '',
        }
      : null)

  // Notify parent on new location
  useEffect(() => {
    if (currentFix && onLocationChange) {
      onLocationChange({
        latitude: currentFix.latitude,
        longitude: currentFix.longitude,
        accuracy: currentFix.accuracy,
      })
    }
  }, [currentFix?.latitude, currentFix?.longitude, currentFix?.accuracy, onLocationChange])

  // If tracking was started and a new fix arrives, center map or smoothly follow
  useEffect(() => {
    if (!currentFix) return

    if (followMode) {
      if (!hasInitialCenteredRef.current) {
        // First acquisition: fly smoothly and zoom in
        hasInitialCenteredRef.current = true
        map.flyTo([currentFix.latitude, currentFix.longitude], Math.max(map.getZoom(), 15), {
          duration: 1.2,
        })
      } else {
        // Subsequent fixes while following: smooth pan without forcing zoom change
        map.panTo([currentFix.latitude, currentFix.longitude], {
          animate: true,
          duration: 0.6,
        })
      }
    }
  }, [currentFix, followMode, map])

  // When user manually drags/pans the map, pause follow-mode (Google Maps/Apple Maps behavior)
  useEffect(() => {
    const handleDragStart = () => {
      if (followMode) {
        setFollowMode(false)
      }
    }

    map.on('dragstart', handleDragStart)
    return () => {
      map.off('dragstart', handleDragStart)
    }
  }, [map, followMode])

  // Surface errors
  useEffect(() => {
    if (tracker.error) {
      setShowErrorToast(true)
      setFollowMode(false)
    } else {
      setShowErrorToast(false)
    }
  }, [tracker.error])

  // Handle Locate / Follow Me Button Click
  const handleToggleLocate = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!tracker.running) {
        // State 1: Idle -> Start Tracking & Follow
        setShowErrorToast(false)
        hasInitialCenteredRef.current = false
        setFollowMode(true)
        start()
      } else if (tracker.running && !followMode) {
        // State 2: Located but follow paused (user panned map) -> Re-center & re-lock follow
        setFollowMode(true)
        if (currentFix) {
          map.flyTo([currentFix.latitude, currentFix.longitude], Math.max(map.getZoom(), 15), {
            duration: 1.0,
          })
        }
      } else if (tracker.running && followMode) {
        // State 3: Already following -> Disengage / Stop
        setFollowMode(false)
        stop()
        hasInitialCenteredRef.current = false
      }
    },
    [tracker.running, followMode, currentFix, map, start, stop]
  )

  const isAcquiring = tracker.running && tracker.phase === 'acquiring'
  const isFollowing = tracker.running && followMode && tracker.phase === 'live'
  const isLocated = tracker.running && !followMode && tracker.phase === 'live'
  const isError = tracker.phase === 'error' && !!tracker.error

  const positionClasses = {
    'top-right': 'top-3 right-3',
    'top-left': 'top-3 left-3',
    'bottom-right': 'bottom-6 right-3',
    'bottom-left': 'bottom-6 left-3',
  }[position]

  const buttonTooltip = isAcquiring
    ? 'Acquiring real-time GPS location…'
    : isFollowing
      ? 'Following your location (Click to stop tracking)'
      : isLocated
        ? 'Re-center & Follow Me'
        : isError
          ? `GPS Error: ${tracker.error?.message ?? 'Failed to locate'}`
          : 'Locate Me / Follow Me'

  return (
    <>
      {/* 1. Real-Time User Beacon & Accuracy Ring */}
      {currentFix && (
        <>
          {typeof currentFix.accuracy === 'number' && (
            <Circle
              center={[currentFix.latitude, currentFix.longitude]}
              radius={currentFix.accuracy}
              pathOptions={{
                color: '#3b82f6',
                weight: 1.5,
                opacity: 0.5,
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
              }}
            />
          )}

          <Marker
            position={[currentFix.latitude, currentFix.longitude]}
            icon={userBeaconIcon(followMode)}
            zIndexOffset={2000}
          >
            <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
              <div className="sz-tooltip">
                <strong>Your Real-Time Location</strong>
                {typeof currentFix.accuracy === 'number' && (
                  <span> · ±{Math.round(currentFix.accuracy)}m</span>
                )}
                {followMode && (
                  <div className="mt-0.5 text-[10px] font-bold text-blue-400">● FOLLOW ME ACTIVE</div>
                )}
              </div>
            </Tooltip>
          </Marker>
        </>
      )}

      {/* 2. Floating Action Button Overlay */}
      <div
        ref={containerRef}
        className={cn('absolute z-[1000] flex flex-col items-end gap-2', positionClasses)}
      >
        {/* Error Toast if Permission Denied or Timeout */}
        {showErrorToast && tracker.error && (
          <div className="flex max-w-[280px] items-start gap-2 rounded-xl border border-red-500/40 bg-gray-900/95 p-3 text-left shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-red-400">GPS UNAVAILABLE</p>
              <p className="mt-0.5 text-[11px] text-gray-300">{tracker.error.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowErrorToast(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Active Status Pill */}
          {tracker.running && currentFix && (
            <div
              className={cn(
                'hidden sm:flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md shadow-md transition-all',
                followMode
                  ? 'border-blue-500/50 bg-blue-950/80 text-blue-300'
                  : 'border-gray-700 bg-gray-900/90 text-gray-300'
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  followMode ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'
                )}
              />
              <span>
                {followMode ? 'Following' : 'Located'}
                {typeof currentFix.accuracy === 'number'
                  ? ` (±${Math.round(currentFix.accuracy)}m)`
                  : ''}
              </span>
            </div>
          )}

          {/* Floating Locate Button */}
          <button
            type="button"
            onClick={handleToggleLocate}
            title={buttonTooltip}
            aria-label={buttonTooltip}
            className={cn(
              'group relative flex h-10 w-10 items-center justify-center rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 focus:outline-none',
              isFollowing
                ? 'border-blue-500 bg-blue-600/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.4)] ring-2 ring-blue-500/40 hover:bg-blue-600/40'
                : isLocated
                  ? 'border-blue-500/50 bg-gray-900/90 text-blue-400 hover:bg-gray-800 hover:text-blue-300'
                  : isAcquiring
                    ? 'border-amber-500/50 bg-gray-900/90 text-amber-400 animate-pulse'
                    : isError
                      ? 'border-red-500/50 bg-gray-900/90 text-red-400 hover:bg-gray-800'
                      : 'border-gray-700/80 bg-gray-900/90 text-gray-300 hover:border-gray-500 hover:bg-gray-800 hover:text-white'
            )}
          >
            {isAcquiring ? (
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            ) : isFollowing ? (
              <LocateFixed className="h-5 w-5 text-blue-400 animate-pulse" />
            ) : isLocated ? (
              <Locate className="h-5 w-5 text-blue-400" />
            ) : isError ? (
              <AlertTriangle className="h-5 w-5 text-red-400" />
            ) : (
              <Crosshair className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors" />
            )}
          </button>
        </div>
      </div>
    </>
  )
}

function StandaloneLocateControl(props: LocateControlProps) {
  const internalTracker = useLocationTracker()
  return <LocateControlInner {...props} trackerApi={internalTracker} />
}

export function LocateControl(props: LocateControlProps) {
  if (props.externalTracker) {
    return <LocateControlInner {...props} trackerApi={props.externalTracker} />
  }
  return <StandaloneLocateControl {...props} />
}
