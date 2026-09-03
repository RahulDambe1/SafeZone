'use client'

import { cn } from '@/lib/utils'
import { EmergencyMap } from '@/components/shared/EmergencyMap'
import type { EmergencyMapProps } from '@/components/map/EmergencyMapInner'

interface MapContainerProps extends Partial<EmergencyMapProps> {
  className?: string
  showControls?: boolean
  children?: React.ReactNode
}

/**
 * Legacy container kept for compatibility — delegates to the real
 * EmergencyMap and renders overlay children above it.
 */
export function MapContainer({ className, children, ...mapProps }: MapContainerProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      <EmergencyMap {...mapProps} className="absolute inset-0" />
      {children && (
        <div className="pointer-events-none absolute inset-0 z-[500]">
          <div className="pointer-events-auto">{children}</div>
        </div>
      )}
    </div>
  )
}