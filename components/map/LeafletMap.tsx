'use client'

import { useEffect, useRef } from 'react'
import type { Incident, Route } from '@/types'

interface LeafletMapProps {
  incidents?: Incident[]
  selectedIncidentId?: string
  userLocation?: { latitude: number; longitude: number; accuracy?: number } | null
  route?: Route | null
  className?: string
  onIncidentClick?: (incident: Incident) => void
  defaultCenter?: [number, number]
  defaultZoom?: number
}

export function LeafletMap({
  incidents = [],
  selectedIncidentId,
  userLocation,
  route,
  className = 'h-full w-full',
  onIncidentClick,
  defaultCenter = [12.9716, 77.5946],
  defaultZoom = 11,
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<import('leaflet').LayerGroup | null>(null)
  const routeLayerRef = useRef<import('leaflet').Polyline | null>(null)
  const userMarkerRef = useRef<import('leaflet').CircleMarker | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('leaflet').then((L) => {
      const map = L.map(mapRef.current!, {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      markersRef.current = L.layerGroup().addTo(map)
      mapInstanceRef.current = map
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !markersRef.current) return

    import('leaflet').then((L) => {
      markersRef.current!.clearLayers()

      incidents.forEach((incident) => {
        const { latitude, longitude } = incident.location
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return

        const isSelected = incident.id === selectedIncidentId
        const isActive = incident.status !== 'RESOLVED' && incident.status !== 'CANCELLED'

        const color =
          incident.severity === 'CRITICAL'
            ? '#ef4444'
            : incident.severity === 'HIGH'
            ? '#f59e0b'
            : incident.severity === 'MEDIUM'
            ? '#3b82f6'
            : '#6b7280'

        const svgSize = isSelected ? 36 : 28

        const icon = L.divIcon({
          className: '',
          iconSize: [svgSize, svgSize],
          iconAnchor: [svgSize / 2, svgSize / 2],
          html: `<div style="
            width: ${svgSize}px;
            height: ${svgSize}px;
            background: ${color};
            border: ${isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.6)'};
            border-radius: 50%;
            box-shadow: 0 0 ${isSelected ? '16px' : '8px'} ${color}88;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: ${isSelected ? '16px' : '12px'};
            cursor: pointer;
          ">⚠️</div>`,
        })

        const marker = L.marker([latitude, longitude], { icon })
          .bindPopup(
            `<div style="font-family: monospace; min-width: 160px;">
              <strong>${incident.id}</strong><br/>
              <span style="color: ${color}">${incident.severity}</span> — ${incident.type?.replace(/_/g, ' ')}<br/>
              <span style="color: #888; font-size: 0.85em;">${incident.location.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}</span><br/>
              <span style="font-size: 0.85em;">${incident.status.replace(/_/g, ' ')}${incident.isDemo ? ' — DEMO' : ''}</span>
            </div>`
          )
          .addTo(markersRef.current!)

        if (onIncidentClick) {
          marker.on('click', () => onIncidentClick(incident))
        }
      })
    })
  }, [incidents, selectedIncidentId, onIncidentClick])

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedIncidentId) return

    const incident = incidents.find((i) => i.id === selectedIncidentId)
    if (!incident?.location) return

    mapInstanceRef.current.flyTo(
      [incident.location.latitude, incident.location.longitude],
      15,
      { duration: 1.2 }
    )
  }, [selectedIncidentId, incidents])

  useEffect(() => {
    if (!mapInstanceRef.current) return

    import('leaflet').then((L) => {
      if (routeLayerRef.current) {
        routeLayerRef.current.removeFrom(mapInstanceRef.current!)
        routeLayerRef.current = null
      }

      if (route?.geometry && route.geometry.length > 1) {
        const latLngs = route.geometry.map((p) => [p[0], p[1]] as [number, number])

        const polyline = L.polyline(latLngs, {
          color: '#f59e0b',
          weight: 4,
          opacity: 0.85,
        }).addTo(mapInstanceRef.current!)

        routeLayerRef.current = polyline
        mapInstanceRef.current!.fitBounds(polyline.getBounds(), { padding: [40, 40] })
      }
    })
  }, [route])

  useEffect(() => {
    if (!mapInstanceRef.current) return

    import('leaflet').then((L) => {
      if (userMarkerRef.current) {
        userMarkerRef.current.removeFrom(mapInstanceRef.current!)
        userMarkerRef.current = null
      }

      if (userLocation) {
        const { latitude, longitude, accuracy } = userLocation
        const marker = L.circleMarker([latitude, longitude], {
          radius: 8,
          fillColor: '#22c55e',
          color: 'white',
          weight: 2,
          fillOpacity: 1,
        })
          .bindPopup(
            `<strong>Your Location</strong><br/>Accuracy: ±${Math.round(accuracy || 0)}m<br/>${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          )
          .addTo(mapInstanceRef.current!)

        if (accuracy && accuracy > 0) {
          L.circle([latitude, longitude], {
            radius: accuracy,
            fillColor: '#22c55e',
            fillOpacity: 0.1,
            color: '#22c55e',
            weight: 1,
            opacity: 0.4,
          }).addTo(mapInstanceRef.current!)
        }

        userMarkerRef.current = marker
      }
    })
  }, [userLocation])

  return (
    <div className={`relative ${className}`}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div ref={mapRef} className="h-full w-full rounded-xl" />
    </div>
  )
}