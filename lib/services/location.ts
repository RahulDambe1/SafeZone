// Location Service — real browser/device GPS with honest failure handling.
//
// Every failure mode is surfaced explicitly (permission denied, timeout,
// unavailable, unsupported, low accuracy) and the UI stays usable. Demo
// locations are used ONLY when the user explicitly enables demo mode.

import { EmergencyLocation, getLocationAccuracyQuality } from '@/types/emergency'
import { getDemoLocation as getQuarantinedDemoLocation } from '@/lib/dev/mock-locations'

export type LocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNSUPPORTED'
  | 'UNKNOWN'
  | 'OFFLINE'
  | 'INSECURE_CONTEXT'

export interface LocationFailure {
  code: LocationErrorCode
  message: string
}

/** Backward-compatible alias used by the emergency flow UI. */
export type LocationError = LocationFailure

const LOW_ACCURACY_THRESHOLD = 500 // meters

function toFailure(error: GeolocationPositionError | null, fallback: string): LocationFailure {
  switch (error?.code) {
    case error?.PERMISSION_DENIED:
      return { code: 'PERMISSION_DENIED', message: 'Location permission denied by the user or browser policy.' }
    case error?.POSITION_UNAVAILABLE:
      return { code: 'POSITION_UNAVAILABLE', message: 'GPS signal unavailable. Try moving to an open area.' }
    case error?.TIMEOUT:
      return { code: 'TIMEOUT', message: 'GPS fix timed out. Check that location services are enabled.' }
    default:
      return { code: 'UNKNOWN', message: fallback }
  }
}


export class LocationService {
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator
  }

  /**
   * One-shot high-accuracy fix. Resolves with the real position or rejects
   * with a LocationFailure. Demo mode uses an explicitly-labeled demo point.
   */
  static requestLocation(isDemo = false): Promise<EmergencyLocation> {
    if (isDemo) {
      return Promise.resolve(this.getDemoLocation())
    }

    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject({ code: 'UNSUPPORTED', message: 'Geolocation is not supported by this browser.' } satisfies LocationFailure)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const accuracy = position.coords.accuracy
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy,
            accuracyQuality: getLocationAccuracyQuality(accuracy),
            isReal: true,
            timestamp: new Date(position.timestamp),
          })
        },
        (error) => reject(toFailure(error, 'Failed to acquire GPS position.')),
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
      )
    })
  }

  /**
   * Continuous tracking. Returns an unsubscribe function. Failures are
   * reported through the error callback and tracking stops — the caller
   * decides how to recover.
   */
  static watchLocation(
    onUpdate: (location: EmergencyLocation) => void,
    onError: (failure: LocationFailure) => void
  ): () => void {
    if (!this.isSupported()) {
      onError({ code: 'UNSUPPORTED', message: 'Geolocation is not supported by this browser.' })
      return () => undefined
    }

    let stopped = false
    let watchId: number | null = null

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (stopped) return
        onUpdate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          accuracyQuality: getLocationAccuracyQuality(position.coords.accuracy),
          isReal: true,
          timestamp: new Date(position.timestamp),
        })
      },
      (error) => {
        if (stopped) return
        onError(toFailure(error, 'Live GPS tracking failed.'))
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 }
    )

    return () => {
      stopped = true
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    }
  }

  static async checkPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    if (!this.isSupported()) return 'unsupported'
    try {
      const permissions = navigator.permissions
      if (!permissions) return 'prompt'
      const result = await permissions.query({ name: 'geolocation' as PermissionName })
      return result.state as 'granted' | 'denied' | 'prompt'
    } catch {
      return 'prompt'
    }
  }

  static isLowAccuracy(accuracy: number | undefined): boolean {
    return typeof accuracy === 'number' && accuracy > LOW_ACCURACY_THRESHOLD
  }

  /** Reverse geocode through the server (Mapbox when configured). */
  static async reverseGeocode(lat: number, lng: number): Promise<{ address?: string; note?: string }> {
    try {
      const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`, { cache: 'no-store' })
      if (!res.ok) return {}
      const data = (await res.json()) as { address?: string; detail?: string }
      return { address: data.address, note: data.detail }
    } catch {
      return {}
    }
  }

  /** Demo locations come ONLY from the quarantined test fixture module. */
  static getDemoLocation(): EmergencyLocation {
    const demo = getQuarantinedDemoLocation()
    return {
      latitude: demo.latitude,
      longitude: demo.longitude,
      address: `${demo.address} (DEMO)`,
      accuracy: 10,
      accuracyQuality: 'GOOD',
      isReal: false,
      timestamp: new Date(),
    }
  }

  static formatCoordinates(location: EmergencyLocation): string {
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
  }
}