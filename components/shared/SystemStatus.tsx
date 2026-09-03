'use client'

import { useEffect, useState } from 'react'
import type { ServiceStatus, SystemStatus as SystemStatusPayload } from '@/types'
import { cn } from '@/lib/utils'

interface SystemStatusProps {
  className?: string
  compact?: boolean
}

function stateClass(state: ServiceStatus['state']): string {
  switch (state) {
    case 'CONNECTED':
    case 'CONFIGURED':
    case 'ACTIVE':
      return 'bg-emerald-400'
    case 'DEGRADED':
    case 'STANDBY':
      return 'bg-amber-400 animate-pulse'
    case 'NOT_CONNECTED':
      return 'bg-gray-500'
    case 'UNAVAILABLE':
      return 'bg-red-400'
    default:
      return 'bg-gray-500'
  }
}

export function SystemStatus({ className, compact = false }: SystemStatusProps) {
  const [status, setStatus] = useState<SystemStatusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/system/status', { signal: AbortSignal.timeout(10_000) })
      if (res.ok) {
        const data = (await res.json()) as SystemStatusPayload
        setStatus(data)
        setLastChecked(new Date())
      }
    } catch {
      // Status check failed — don't crash the UI
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-ops-muted', className)}>
        <div className="h-2 w-2 rounded-full bg-gray-500 animate-pulse" />
        <span className="font-mono uppercase">Checking system...</span>
      </div>
    )
  }

  if (!status) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-ops-muted', className)}>
        <span className="h-2 w-2 rounded-full bg-gray-500" />
        <span className="font-mono uppercase">Status unavailable</span>
      </div>
    )
  }

  const serviceList = status.services

  if (compact) {
    const connectedCount = serviceList.filter(
      (s) => s.state === 'CONNECTED' || s.state === 'CONFIGURED' || s.state === 'ACTIVE'
    ).length
    const total = serviceList.length
    const allOk = connectedCount === total
    return (
      <div className={cn('flex items-center gap-2 text-xs', className)}>
        <span className={cn('h-2 w-2 rounded-full', allOk ? 'bg-emerald-400' : 'bg-amber-400')} />
        <span className="font-mono uppercase text-ops-muted">
          {connectedCount}/{total} Services
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {serviceList.map((service) => (
        <div key={service.id} className="flex items-center gap-1.5 text-xs" title={service.detail}>
          <span className={cn('h-2 w-2 rounded-full', stateClass(service.state))} />
          <span
            className={cn(
              'font-mono uppercase tracking-wide',
              service.state === 'CONNECTED' || service.state === 'CONFIGURED' || service.state === 'ACTIVE'
                ? 'text-ops-text'
                : 'text-ops-muted'
            )}
          >
            {service.label}
          </span>
        </div>
      ))}
      {lastChecked && (
        <span className="font-mono text-[10px] text-ops-faint">
          checked {lastChecked.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}