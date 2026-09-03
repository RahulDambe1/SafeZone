'use client'

import { useEffect, useRef, useState } from 'react'
import { useEmergency } from '@/hooks/useEmergency'
import { incidentStore } from '@/lib/store/incident-store'
import { Navigation } from '@/components/shared/Navigation'
import { InitialScreen } from '@/components/emergency/InitialScreen'
import { SOSConfirm } from '@/components/emergency/SOSConfirm'
import { Countdown } from '@/components/emergency/Countdown'
import { LocationScreen } from '@/components/emergency/LocationScreen'
import { TypeSelection } from '@/components/emergency/TypeSelection'
import { SeveritySelection } from '@/components/emergency/SeveritySelection'
import { OptionalInfo } from '@/components/emergency/OptionalInfo'
import { FinalConfirm } from '@/components/emergency/FinalConfirm'
import { ActiveEmergency } from '@/components/emergency/ActiveEmergency'
import type { Incident } from '@/types'

export default function EmergencySOS() {
  const {
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
  } = useEmergency()

  const [registeredIncident, setRegisteredIncident] = useState<Incident | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const registeredRef = useRef<Set<string>>(new Set())

  // Create the incident on the server when ACTIVE step is reached
  useEffect(() => {
    if (state.step !== 'ACTIVE') return
    if (!state.emergencyId) return
    if (registeredRef.current.has(state.emergencyId)) return

    registeredRef.current.add(state.emergencyId)
    let cancelled = false

    const run = async () => {
      try {
        const incident = await incidentStore.create({
          type: state.type,
          severity: state.severity,
          description: state.description,
          peopleAffected: state.peopleAffected,
          location: state.location
            ? {
                latitude: state.location.latitude,
                longitude: state.location.longitude,
                accuracy: state.location.accuracy,
              }
            : undefined,
          isDemo: state.isDemo,
        })

        if (cancelled) return
        setRegisteredIncident(incident)

        // Full automated pipeline: AI → hospital → route
        const processed = await incidentStore.process(incident.id).catch((err: Error) => {
          if (!cancelled) setProcessingError(err.message)
          return incident
        })
        if (!cancelled && processed) setRegisteredIncident(processed)
      } catch (err) {
        if (!cancelled) setProcessingError((err as Error).message)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [state.step, state.emergencyId, state])

  const handleQuickAction = (actionType: string) => {
    setDemoMode(state.isDemo)
    selectType(actionType)
  }

  const handleOptionalInfoContinue = (data: {
    peopleAffected?: number
    description?: string
    hasPhoto?: boolean
    hasVoice?: boolean
  }) => {
    updateOptionalInfo(data)
    continueToConfirmation()
  }

  const handleCancel = () => {
    if (registeredIncident) {
      incidentStore.cancel(registeredIncident.id).catch(() => undefined)
    }
    setRegisteredIncident(null)
    cancelEmergency()
  }

  const renderStep = () => {
    switch (state.step) {
      case 'INITIAL':
        return (
          <InitialScreen
            onSOSPress={startSOS}
            onQuickAction={handleQuickAction}
            onDemoToggle={setDemoMode}
            isDemo={state.isDemo}
          />
        )

      case 'SOS_CONFIRM':
        return <SOSConfirm onConfirm={confirmSOS} onCancel={cancelEmergency} />

      case 'COUNTDOWN':
        return <Countdown onComplete={completeCountdown} onCancel={cancelEmergency} />

      case 'LOCATION':
        return (
          <LocationScreen
            status={state.locationStatus}
            location={state.location}
            isDemo={state.isDemo}
            locationError={locationError}
            onRequestLocation={requestLocation}
            onCancel={cancelEmergency}
          />
        )

      case 'TYPE_SELECTION':
        return <TypeSelection onSelect={selectType} onBack={cancelEmergency} />

      case 'SEVERITY_SELECTION':
        return (
          <SeveritySelection
            onSelect={selectSeverity}
            onBack={() => selectType(state.type || '')}
          />
        )

      case 'OPTIONAL_INFO':
        return (
          <OptionalInfo
            onContinue={handleOptionalInfoContinue}
            onBack={() => selectSeverity(state.severity || 'MEDIUM')}
          />
        )

      case 'FINAL_CONFIRM':
        return (
          <FinalConfirm
            state={state}
            onActivate={activateEmergency}
            onBack={() => updateOptionalInfo({})}
          />
        )

      case 'ACTIVE':
        return (
          <ActiveEmergency
            state={state}
            incident={registeredIncident}
            processingError={processingError ?? undefined}
            onCancel={handleCancel}
          />
        )

      default:
        return null
    }
  }

  const showNavigation = state.step === 'INITIAL' || state.step === 'ACTIVE'

  return (
    <div className="min-h-screen">
      {showNavigation && <Navigation />}
      {renderStep()}
    </div>
  )
}