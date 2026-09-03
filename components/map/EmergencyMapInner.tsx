'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Hospital, Incident, Responder, Route, SeverityLevel } from '@/types'
import {
  getMapLayerConfig,
  type MapLayerStyle,
} from '@/lib/maps/provider'
import { cellSizeForZoom, clusterByGrid } from '@/lib/maps/cluster'
import { LocateControl } from '@/components/map/LocateControl'
import { MapLayerSwitcher } from '@/components/map/MapLayerSwitcher'
import type { TrackerState } from '@/hooks/useLocationTracker'

export interface EmergencyMapProps {
  className?: string
  incidents?: Incident[]
  selectedIncidentId?: string | null
  onSelectIncident?: (id: string | null) => void
  hospitals?: Hospital[]
  responders?: Responder[]
  routes?: Route[]
  showUserLocation?: boolean
  userLocation?: { latitude: number; longitude: number; accuracy?: number } | null
  focusOn?: { latitude: number; longitude: number } | null
  fitTo?: Array<{ latitude: number; longitude: number }> | null
  onClick?: (lat: number, lng: number) => void
  showIncidentLabels?: boolean
  showLocateMe?: boolean
  showLayerSwitcher?: boolean
  initialLayerStyle?: MapLayerStyle
  externalTracker?: {
    tracker: TrackerState
    start: () => void
    stop: () => void
  }
  onLocationChange?: (loc: { latitude: number; longitude: number; accuracy?: number }) => void
}

const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946] // Bangalore
const DEFAULT_ZOOM = 11

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#3b82f6',
  LOW: '#94a3b8',
}

function incidentIcon(severity: SeverityLevel, selected: boolean, demo: boolean): L.DivIcon {
  const color = SEVERITY_COLORS[severity]
  const demoTag = demo ? '<span class="sz-marker-demo">DEMO</span>' : ''
  return L.divIcon({
    className: 'sz-marker-wrap',
    html: `
      <div class="sz-marker ${selected ? 'sz-marker-selected' : ''}" style="--sz-marker-color:${color}">
        <span class="sz-marker-core"></span>
        ${demoTag}
      </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

function clusterIcon(count: number, criticalCount: number): L.DivIcon {
  const color = criticalCount > 0 ? '#ef4444' : '#f59e0b'
  return L.divIcon({
    className: 'sz-marker-wrap',
    html: `
      <div class="sz-cluster" style="--sz-marker-color:${color}">
        <span>${count}</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

function hospitalIcon(): L.DivIcon {
  return L.divIcon({
    className: 'sz-marker-wrap',
    html: `<div class="sz-hospital-marker">H</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function responderIcon(type: Responder['type'], demo: boolean): L.DivIcon {
  const letter = type === 'AMBULANCE' ? 'A' : type === 'FIRE' ? 'F' : 'P'
  const color = type === 'AMBULANCE' ? '#22c55e' : type === 'FIRE' ? '#f59e0b' : '#3b82f6'
  return L.divIcon({
    className: 'sz-marker-wrap',
    html: `
      <div class="sz-responder-marker" style="--sz-marker-color:${color}">
        <span>${demo ? 'D' : letter}</span>
      </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

function CameraController({
  focusOn,
  fitTo,
}: {
  focusOn?: { latitude: number; longitude: number } | null
  fitTo?: Array<{ latitude: number; longitude: number }> | null
}) {
  const map = useMap()

  useEffect(() => {
    if (focusOn) {
      map.flyTo([focusOn.latitude, focusOn.longitude], 14, { duration: 1.2 })
    } else if (fitTo && fitTo.length > 0) {
      const bounds = L.latLngBounds(fitTo.map((p) => [p.latitude, p.longitude] as [number, number]))
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOn?.latitude, focusOn?.longitude, fitTo?.length])

  return null
}

function ClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function IncidentLayer({
  incidents,
  selectedId,
  zoom,
  onSelect,
  showLabels,
}: {
  incidents: Incident[]
  selectedId?: string | null
  zoom: number
  onSelect?: (id: string | null) => void
  showLabels?: boolean
}) {
  const map = useMap()

  const clusters = useMemo(() => {
    type Positioned = Incident & { latitude: number; longitude: number }
    const positioned: Positioned[] = incidents.map((i) => ({
      ...i,
      latitude: i.location.latitude,
      longitude: i.location.longitude,
    }))
    if (zoom >= 14) {
      return positioned.map((p) => ({ latitude: p.latitude, longitude: p.longitude, items: [p] }))
    }
    return clusterByGrid(positioned, cellSizeForZoom(zoom))
  }, [incidents, zoom])

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.items.length === 1) {
          const incident = cluster.items[0]
          const selected = incident.id === selectedId
          return (
            <Marker
              key={incident.id}
              position={[incident.location.latitude, incident.location.longitude]}
              icon={incidentIcon(incident.severity, selected, incident.isDemo)}
              eventHandlers={{ click: () => onSelect?.(incident.id) }}
              zIndexOffset={selected ? 1000 : 0}
            >
              {showLabels !== false && (
                <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                  <div className="sz-tooltip">
                    <strong>{incident.id}</strong> · {incident.severity}
                    {incident.isDemo && ' · DEMO'}
                  </div>
                </Tooltip>
              )}
            </Marker>
          )
        }

        const criticalCount = cluster.items.filter((i) => i.severity === 'CRITICAL').length
        return (
          <Marker
            key={`cluster-${cluster.latitude.toFixed(3)}-${cluster.longitude.toFixed(3)}`}
            position={[cluster.latitude, cluster.longitude]}
            icon={clusterIcon(cluster.items.length, criticalCount)}
            eventHandlers={{
              click: () => {
                const bounds = L.latLngBounds(
                  cluster.items.map((i) => [i.location.latitude, i.location.longitude] as [number, number])
                )
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
                onSelect?.(null)
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -18]} opacity={0.95}>
              <div className="sz-tooltip">{cluster.items.length} incidents in this area</div>
            </Tooltip>
          </Marker>
        )
      })}
    </>
  )
}

export default function EmergencyMapInner({
  className,
  incidents = [],
  selectedIncidentId,
  onSelectIncident,
  hospitals = [],
  responders = [],
  routes = [],
  showUserLocation = false,
  userLocation,
  focusOn,
  fitTo,
  onClick,
  showIncidentLabels,
  showLocateMe = true,
  showLayerSwitcher = true,
  initialLayerStyle = 'satellite',
  externalTracker,
  onLocationChange,
}: EmergencyMapProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

  // Map layer style: satellite | streets
  const [activeLayer, setActiveLayer] = useState<MapLayerStyle>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('safezone.map.style') as MapLayerStyle | null
        if (saved === 'satellite' || saved === 'streets') return saved
      } catch {
        // ignore
      }
    }
    return initialLayerStyle
  })

  const handleSelectLayer = useCallback((style: MapLayerStyle) => {
    setActiveLayer(style)
    try {
      window.localStorage.setItem('safezone.map.style', style)
    } catch {
      // ignore
    }
  }, [])

  const layerConfig = useMemo(() => getMapLayerConfig(activeLayer), [activeLayer])

  const responderMarkers = useMemo(
    () => responders.filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number'),
    [responders]
  )

  const selectedIncident = selectedIncidentId
    ? incidents.find((i) => i.id === selectedIncidentId)
    : undefined

  return (
    <div className={`sz-map-root ${className ?? ''}`}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        attributionControl={true}
        className="h-full w-full"
      >
        {/* Base Tile Layer (Dark Ops / Satellite Imagery / Streets) */}
        <TileLayer
          key={`${activeLayer}-${layerConfig.tileUrl}`}
          url={layerConfig.tileUrl}
          attribution={layerConfig.attribution}
          maxZoom={layerConfig.maxZoom}
        />

        {/* Satellite Street & Boundary Labels Overlay */}
        {activeLayer === 'satellite' && layerConfig.overlayUrl && (
          <TileLayer
            key="satellite-overlay-labels"
            url={layerConfig.overlayUrl}
            maxZoom={layerConfig.maxZoom}
            opacity={0.85}
            zIndex={2}
          />
        )}

        {/* Map Layer Switcher (Top-Left) */}
        {showLayerSwitcher && (
          <MapLayerSwitcher
            activeLayer={activeLayer}
            onSelectLayer={handleSelectLayer}
            position="top-left"
          />
        )}

        <CameraController focusOn={focusOn ?? (selectedIncident ? { latitude: selectedIncident.location.latitude, longitude: selectedIncident.location.longitude } : undefined)} fitTo={fitTo} />

        <ZoomTracker onZoom={setZoom} />
        <ClickHandler onMapClick={onClick} />

        <IncidentLayer
          incidents={incidents}
          selectedId={selectedIncidentId}
          zoom={zoom}
          onSelect={onSelectIncident}
          showLabels={showIncidentLabels}
        />

        {responderMarkers.map((responder) => (
          <Marker
            key={`${responder.id}-${responder.lastUpdated ?? 'static'}`}
            position={[responder.latitude as number, responder.longitude as number]}
            icon={responderIcon(responder.type, responder.id.startsWith('DEMO') || responder.source !== 'feed')}
            zIndexOffset={500}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <div className="sz-tooltip">
                <strong>{responder.vehicleId}</strong> · {responder.status.replace(/_/g, ' ')}
                {(responder.id.startsWith('DEMO') || responder.source !== 'feed') && ' · DEMO'}
              </div>
            </Tooltip>
          </Marker>
        ))}

        {hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            position={[hospital.latitude, hospital.longitude]}
            icon={hospitalIcon()}
            zIndexOffset={300}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <div className="sz-tooltip">
                <strong>{hospital.name}</strong>
                {typeof hospital.distanceMeters === 'number' && (
                  <span> · {(hospital.distanceMeters / 1000).toFixed(1)} km</span>
                )}
              </div>
            </Tooltip>
          </Marker>
        ))}

        {routes.map((route, index) => (
          <Polyline
            key={route.id}
            positions={route.geometry}
            pathOptions={{
              color: index === 0 ? '#f59e0b' : '#475569',
              weight: index === 0 ? 4 : 2.5,
              opacity: index === 0 ? 0.95 : 0.6,
              dashArray: index === 0 ? undefined : '8 8',
            }}
          >
            <Tooltip sticky opacity={0.95}>
              <div className="sz-tooltip">
                <strong>{route.label}</strong> · {Math.round(route.durationSeconds / 60)} min ·{' '}
                {(route.distanceMeters / 1000).toFixed(1)} km
                {route.trafficLevel ? ` · TRAFFIC ${route.trafficLevel}` : ''}
              </div>
            </Tooltip>
          </Polyline>
        ))}

        {showLocateMe && (
          <LocateControl
            externalTracker={externalTracker}
            externalLocation={userLocation}
            onLocationChange={onLocationChange}
            position="top-right"
          />
        )}

        {!showLocateMe && showUserLocation && userLocation && (
          <>
            {typeof userLocation.accuracy === 'number' && (
              <Circle
                center={[userLocation.latitude, userLocation.longitude]}
                radius={userLocation.accuracy}
                pathOptions={{ color: '#3b82f6', weight: 1, opacity: 0.4, fillOpacity: 0.08 }}
              />
            )}
            <CircleMarker
              center={[userLocation.latitude, userLocation.longitude]}
              radius={6}
              pathOptions={{ color: '#3b82f6', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.9 }}
            />
          </>
        )}
      </MapContainer>
    </div>
  )
}

function ZoomTracker({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMap()
  useEffect(() => {
    onZoom(map.getZoom())
    const handler = () => onZoom(map.getZoom())
    map.on('zoomend', handler)
    return () => {
      map.off('zoomend', handler)
    }
  }, [map, onZoom])
  return null
}