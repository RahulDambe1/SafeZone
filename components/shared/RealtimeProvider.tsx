'use client'

import { useEffect } from 'react'
import { incidentStore } from '@/lib/store/incident-store'

/**
 * Connects the incident store to the SSE realtime channel once, globally.
 * The server pushes INCIDENT, REPORT and RESPONDER events; the store applies
 * them so every page updates without a refresh.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    incidentStore.connectRealtime()
  }, [])

  return <>{children}</>
}