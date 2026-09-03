'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { Map, Satellite } from 'lucide-react'
import type { MapLayerStyle } from '@/lib/maps/provider'
import { cn } from '@/lib/utils'

export interface MapLayerSwitcherProps {
  activeLayer: MapLayerStyle
  onSelectLayer: (layer: MapLayerStyle) => void
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export function MapLayerSwitcher({
  activeLayer,
  onSelectLayer,
  position = 'top-left',
}: MapLayerSwitcherProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Prevent Leaflet map dragging and clicks from being captured through the control
  useEffect(() => {
    if (containerRef.current) {
      L.DomEvent.disableClickPropagation(containerRef.current)
      L.DomEvent.disableScrollPropagation(containerRef.current)
    }
  }, [])

  const positionClasses = {
    'top-left': 'top-3 left-3',
    'top-right': 'top-3 right-3',
    'bottom-left': 'bottom-6 left-3',
    'bottom-right': 'bottom-6 right-3',
  }[position]

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute z-[1000] flex items-center gap-1 rounded-xl border border-gray-700/80 bg-gray-900/90 p-1 shadow-xl backdrop-blur-md transition-all',
        positionClasses
      )}
    >
      {/* 1. Satellite Layer */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onSelectLayer('satellite')
        }}
        title="High-Resolution Satellite Aerial View"
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none',
          activeLayer === 'satellite'
            ? 'border border-emerald-500/50 bg-emerald-950/70 text-emerald-300 shadow-sm ring-1 ring-emerald-500/40'
            : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
        )}
      >
        <Satellite className="h-3.5 w-3.5 text-emerald-400" />
        <span>Satellite</span>
      </button>

      {/* 2. Streets Layer */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onSelectLayer('streets')
        }}
        title="Standard Street Map"
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none',
          activeLayer === 'streets'
            ? 'border border-gray-600 bg-gray-800 text-white shadow-sm'
            : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
        )}
      >
        <Map className="h-3.5 w-3.5 text-amber-400" />
        <span>Streets</span>
      </button>
    </div>
  )
}
