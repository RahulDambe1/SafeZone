'use client'

import { useState, useCallback } from 'react'
import { EmergencyState, LocationStatus } from '@/types/emergency'
import { LocationService, LocationFailure, LocationError } from '@/lib/services/location'

export function useEmergency() {
  const [state, setState] = useState<EmergencyState>({
    step: 'INITIAL',
    locationStatus: 'IDLE',
    isDemo: false,
  })
  const [locationError, setLocationError] = useState<LocationError | null>(null)

  const startSOS = useCallback(() => {
    setState((prev) => ({ ...prev, step: 'SOS_CONFIRM' }))
  }, [])

  const confirmSOS = useCallback(() => {
    setState((prev) => ({ ...prev, step: 'COUNTDOWN' }))
  }, [])

  const cancelEmergency = useCallback(() => {
    setState({
      step: 'INITIAL',
      locationStatus: 'IDLE',
      isDemo: false,
    })
    setLocationError(null)
  }, [])

  const completeCountdown = useCallback(() => {
    setState((prev) => ({ ...prev, step: 'LOCATION' }))
  }, [])

  const requestLocation = useCallback(async (isDemo: boolean) => {
    setState((prev) => ({ ...prev, locationStatus: 'REQUESTING', isDemo }))
    setLocationError(null)

    try {
      const location = await LocationService.requestLocation(isDemo)

      // Best-effort reverse geocode (Mapbox when configured) — non-blocking.
      if (!isDemo) {
        try {
          const geo = await LocationService.reverseGeocode(location.latitude, location.longitude)
          if (geo.address) location.address = geo.address
        } catch {
          // address stays undefined — coordinates are still real
        }
      }

      setState((prev) => ({
        ...prev,
        location,
        locationStatus: 'ACQUIRED',
        step: 'TYPE_SELECTION',
      }))
    } catch (error) {
      const failure = error as LocationFailure
      setLocationError(failure)

      let locationStatus: LocationStatus = 'ERROR'
      if (failure.code === 'PERMISSION_DENIED') locationStatus = 'DENIED'
      else if (failure.code === 'TIMEOUT') locationStatus = 'TIMEOUT'
      else if (failure.code === 'POSITION_UNAVAILABLE' || failure.code === 'UNSUPPORTED') {
        locationStatus = 'UNAVAILABLE'
      }

      setState((prev) => ({ ...prev, locationStatus }))
    }
  }, [])

  const selectType = useCallback((type: string) => {
    setState((prev) => ({
      ...prev,
      type,
      step: 'SEVERITY_SELECTION',
    }))
  }, [])

  const selectSeverity = useCallback((severity: 'CRITICAL' | 'HIGH' | 'MEDIUM') => {
    setState((prev) => ({
      ...prev,
      severity,
      step: 'OPTIONAL_INFO',
    }))
  }, [])

  const updateOptionalInfo = useCallback(
    (data: {
      peopleAffected?: number
      description?: string
      hasPhoto?: boolean
      hasVoice?: boolean
    }) => {
      setState((prev) => ({ ...prev, ...data }))
    },
    []
  )

  const continueToConfirmation = useCallback(() => {
    setState((prev) => ({ ...prev, step: 'FINAL_CONFIRM' }))
  }, [])

  const activateEmergency = useCallback(() => {
    setState((prev) => ({
      ...prev,
      emergencyId: `CLI-${Date.now().toString().slice(-6)}`,
      activatedAt: new Date(),
      step: 'ACTIVE',
    }))
  }, [])

  const setDemoMode = useCallback((isDemo: boolean) => {
    setState((prev) => ({ ...prev, isDemo }))
  }, [])

  return {
    state,
    locationError,
    startSOS,
    confirmSOS,
    cancelEmergency,
    completeCountdown,
    requestLocation,
    selectType,
    selectSeverity,
    updateOptionalInfo,
    continueToConfirmation,
    activateEmergency,
    setDemoMode,
  }
}