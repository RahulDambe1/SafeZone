'use client'

import { useEffect, useState } from 'react'
import { incidentStore } from '@/lib/store/incident-store'
import type { Incident } from '@/types'

export function useIncidents(opts: { includeDemo?: boolean } = {}) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    incidentStore
      .init()
      .then(() => {
        if (mounted) setReady(true)
      })
      .catch((err: Error) => {
        if (mounted) {
          setError(err.message)
          setReady(true)
        }
      })

    const unsubscribe = incidentStore.subscribe((all) => {
      if (mounted) setIncidents(all.filter((i) => opts.includeDemo || !i.isDemo))
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [opts.includeDemo])

  return {
    incidents,
    ready,
    error,
    activeIncidents: incidents.filter(
      (i) => i.status !== 'RESOLVED' && i.status !== 'CANCELLED'
    ),
    criticalIncidents: incidents.filter(
      (i) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED' && i.status !== 'CANCELLED'
    ),
    resolvedIncidents: incidents.filter((i) => i.status === 'RESOLVED'),
  }
}

export function useIncident(id?: string) {
  const [incident, setIncident] = useState<Incident | undefined>(() =>
    id ? incidentStore.get(id) : undefined
  )
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    incidentStore
      .init()
      .then(() => {
        if (mounted) setReady(true)
      })
      .catch(() => {
        if (mounted) setReady(true)
      })

    if (!id) {
      setIncident(undefined)
      return
    }

    const unsubscribe = incidentStore.subscribe((incidents) => {
      if (mounted) setIncident(incidents.find((i) => i.id === id))
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [id])

  return { incident, ready }
}