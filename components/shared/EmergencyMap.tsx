'use client'

import dynamic from 'next/dynamic'
import type { EmergencyMapProps } from '@/components/map/EmergencyMapInner'

const EmergencyMapInner = dynamic(() => import('@/components/map/EmergencyMapInner'), {
  ssr: false,
  loading: () => (
    <div className="sz-map-loading">
      <div className="sz-map-loading-inner">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-gray-300" />
        <p className="text-xs uppercase tracking-widest text-gray-500">Initializing map…</p>
      </div>
    </div>
  ),
})

export function EmergencyMap(props: EmergencyMapProps) {
  return <EmergencyMapInner {...props} />
}

export type { EmergencyMapProps }