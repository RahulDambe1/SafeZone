// Map provider & layer abstraction.
//
// Supports switching between:
// - Dark Ops: High-contrast dark tactical theme (Mapbox Dark, MapTiler, or CARTO Dark)
// - Satellite: High-resolution aerial imagery with street & place labels (Esri World Imagery or Mapbox Satellite)
// - Streets: Clear OpenStreetMap or Mapbox road network
//
// NOTE: this module is imported by client components, so it only reads NEXT_PUBLIC_* env vars.

export type MapLayerStyle = 'dark' | 'satellite' | 'streets'
export type MapProviderKind = 'mapbox' | 'maptiler' | 'leaflet'

export interface MapLayerConfig {
  id: MapLayerStyle
  label: string
  tileUrl: string
  attribution: string
  maxZoom: number
  overlayUrl?: string
  overlayAttribution?: string
}

export interface MapProviderConfig {
  kind: MapProviderKind
  tileUrl: string
  attribution: string
  maxZoom: number
  label: string
}

/** Keyless fallbacks — always work worldwide without API keys. */
export const KEYLESS_FALLBACK_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const KEYLESS_FALLBACK_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export const CARTO_DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
export const CARTO_DARK_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'

export const ESRI_SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
export const ESRI_SATELLITE_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'

export const ESRI_LABELS_OVERLAY_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'

export function getMapLayerConfig(style: MapLayerStyle = 'dark'): MapLayerConfig {
  const mapbox = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim()

  if (style === 'satellite') {
    if (mapbox) {
      return {
        id: 'satellite',
        label: 'Satellite Hybrid (Mapbox)',
        tileUrl: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}@2x?access_token=${mapbox}`,
        attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap',
        maxZoom: 20,
      }
    }

    return {
      id: 'satellite',
      label: 'Satellite Hybrid (Esri)',
      tileUrl: ESRI_SATELLITE_URL,
      attribution: ESRI_SATELLITE_ATTRIBUTION,
      maxZoom: 19,
      overlayUrl: ESRI_LABELS_OVERLAY_URL,
    }
  }

  if (style === 'streets') {
    if (mapbox) {
      return {
        id: 'streets',
        label: 'Streets (Mapbox)',
        tileUrl: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}@2x?access_token=${mapbox}`,
        attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap',
        maxZoom: 20,
      }
    }

    return {
      id: 'streets',
      label: 'Streets (OpenStreetMap)',
      tileUrl: KEYLESS_FALLBACK_URL,
      attribution: KEYLESS_FALLBACK_ATTRIBUTION,
      maxZoom: 19,
    }
  }

  // Default: Dark Ops
  if (mapbox) {
    return {
      id: 'dark',
      label: 'Dark Ops (Mapbox)',
      tileUrl: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}@2x?access_token=${mapbox}`,
      attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; OpenStreetMap',
      maxZoom: 20,
    }
  }

  const maptiler = process.env.NEXT_PUBLIC_MAPTILER_API_KEY?.trim()
  if (maptiler) {
    return {
      id: 'dark',
      label: 'Dark Ops (MapTiler)',
      tileUrl: `https://api.maptiler.com/maps/dark-v2/{z}/{x}/{y}.png?key=${maptiler}`,
      attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; OpenStreetMap',
      maxZoom: 21,
    }
  }

  return {
    id: 'dark',
    label: 'Dark Ops (CARTO)',
    tileUrl: CARTO_DARK_URL,
    attribution: CARTO_DARK_ATTRIBUTION,
    maxZoom: 19,
  }
}

/** Legacy provider method kept for backward compatibility. */
export function getMapProviderConfig(): MapProviderConfig {
  const mapbox = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (mapbox && mapbox.trim().length > 0) {
    return {
      kind: 'mapbox',
      tileUrl: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}@2x?access_token=${mapbox.trim()}`,
      attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 20,
      label: 'MAPBOX DARK',
    }
  }

  const maptiler = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
  if (maptiler && maptiler.trim().length > 0) {
    return {
      kind: 'maptiler',
      tileUrl: `https://api.maptiler.com/maps/dark-v2/{z}/{x}/{y}.png?key=${maptiler.trim()}`,
      attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 21,
      label: 'MAPTILER DARK',
    }
  }

  return {
    kind: 'leaflet',
    tileUrl: CARTO_DARK_URL,
    attribution: CARTO_DARK_ATTRIBUTION,
    maxZoom: 19,
    label: 'CARTO DARK',
  }
}
