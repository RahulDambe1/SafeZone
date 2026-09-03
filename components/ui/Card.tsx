import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  variant?: 'default' | 'critical' | 'warning' | 'safe'
  className?: string
}

export function MetricCard({
  label,
  value,
  icon,
  trend,
  trendValue,
  variant = 'default',
  className,
}: MetricCardProps) {
  const variantStyles = {
    default: 'bg-ops-panel border-ops-border',
    critical: 'bg-ops-panel border-critical-500/40',
    warning: 'bg-ops-panel border-warning-500/40',
    safe: 'bg-ops-panel border-safe-500/40',
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-5 transition-all hover:shadow-medium',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-ops-muted uppercase tracking-widest">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-ops-text font-mono">{value}</p>
          {trendValue && (
            <p
              className={cn('mt-2 text-xs font-medium', {
                'text-safe-400': trend === 'up',
                'text-critical-400': trend === 'down',
                'text-ops-muted': trend === 'neutral',
              })}
            >
              {trendValue}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-ops-panel2 border border-ops-border">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-ops-border bg-ops-panel p-6',
        hover && 'transition-all hover:border-ops-border2 hover:shadow-medium',
        className
      )}
    >
      {children}
    </div>
  )
}

interface PanelProps {
  children: ReactNode
  title?: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function Panel({ children, title, subtitle, action, className }: PanelProps) {
  return (
    <div className={cn('panel', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-bold text-ops-text">{title}</h3>}
            {subtitle && <p className="mt-1 text-xs text-ops-muted">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}