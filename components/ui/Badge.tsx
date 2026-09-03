import { cn } from '@/lib/utils'
import { SeverityLevel } from '@/types'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'dot'
  className?: string
}

export function StatusBadge({ status, variant = 'default', className }: StatusBadgeProps) {
  const statusColors: Record<string, string> = {
    OPERATIONAL: 'bg-safe-500/15 text-safe-400 border-safe-500/40',
    REPORTED: 'bg-red-500/15 text-red-400 border-red-500/40',
    ANALYZING: 'bg-warning-500/15 text-warning-400 border-warning-500/40',
    VERIFIED: 'bg-info-500/15 text-info-400 border-info-500/40',
    DISPATCHING: 'bg-warning-500/15 text-warning-400 border-warning-500/40',
    RESPONDER_ASSIGNED: 'bg-warning-500/15 text-warning-400 border-warning-500/40',
    EN_ROUTE: 'bg-warning-500/15 text-warning-400 border-warning-500/40',
    ARRIVED: 'bg-safe-500/15 text-safe-400 border-safe-500/40',
    RESOLVED: 'bg-safe-500/15 text-safe-400 border-safe-500/40',
    CANCELLED: 'bg-gray-500/15 text-gray-400 border-gray-500/40',
    ON_SCENE: 'bg-info-500/15 text-info-400 border-info-500/40',
    AVAILABLE: 'bg-safe-500/15 text-safe-400 border-safe-500/40',
    DISPATCHED: 'bg-warning-500/15 text-warning-400 border-warning-500/40',
    RETURNING: 'bg-gray-500/15 text-gray-400 border-gray-500/40',
    OFFLINE: 'bg-gray-500/15 text-gray-400 border-gray-500/40',
  }

  if (variant === 'dot') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span
          className={cn('status-dot', {
            'status-operational': status === 'OPERATIONAL' || status === 'AVAILABLE',
            'status-warning': status === 'DISPATCHED' || status === 'EN_ROUTE' || status === 'DISPATCHING' || status === 'RESPONDER_ASSIGNED' || status === 'ANALYZING',
            'status-critical': status === 'REPORTED',
          })}
        />
        <span className="text-sm font-medium text-ops-text">
          {status.replace(/_/g, ' ')}
        </span>
      </div>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        statusColors[status] || 'bg-gray-500/15 text-gray-400 border-gray-500/40',
        className
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

interface SeverityBadgeProps {
  severity: SeverityLevel
  className?: string
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const severityConfig = {
    CRITICAL: {
      color: 'bg-red-500/15 text-red-400 border-red-500/40',
      icon: '🚨',
    },
    HIGH: {
      color: 'bg-warning-500/15 text-warning-400 border-warning-500/40',
      icon: '⚠️',
    },
    MEDIUM: {
      color: 'bg-info-500/15 text-info-400 border-info-500/40',
      icon: 'ℹ️',
    },
    LOW: {
      color: 'bg-gray-500/15 text-gray-400 border-gray-500/40',
      icon: '📋',
    },
  }

  const config = severityConfig[severity]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-wide',
        config.color,
        className
      )}
    >
      <span>{config.icon}</span>
      {severity}
    </span>
  )
}