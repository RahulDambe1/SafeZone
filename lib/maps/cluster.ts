// Lightweight grid clustering for map markers.
// Markers within the same lat/lng cell (size chosen by zoom level) are
// grouped into a cluster with a count. This keeps the command-center map
// fast with many markers — no third-party clustering dependency needed.

export interface Clusterable {
  latitude: number
  longitude: number
}

export interface Cluster<T extends Clusterable> {
  latitude: number
  longitude: number
  items: T[]
}

export function cellSizeForZoom(zoom: number): number {
  if (zoom < 6) return 1.5
  if (zoom < 8) return 0.75
  if (zoom < 10) return 0.375
  if (zoom < 12) return 0.1875
  if (zoom < 14) return 0.09375
  return 0.046875 // ~5 km at zoom 14+, markers spread out
}

export function clusterByGrid<T extends Clusterable>(points: T[], cellDegrees: number): Cluster<T>[] {
  const buckets = new Map<string, T[]>()

  for (const point of points) {
    const cellLat = Math.round(point.latitude / cellDegrees)
    const cellLng = Math.round(point.longitude / cellDegrees)
    const key = `${cellLat}:${cellLng}`
    const bucket = buckets.get(key)
    if (bucket) bucket.push(point)
    else buckets.set(key, [point])
  }

  return Array.from(buckets.values()).map((items) => {
    const center = items.reduce(
      (acc, item) => {
        acc.latitude += item.latitude
        acc.longitude += item.longitude
        return acc
      },
      { latitude: 0, longitude: 0 }
    )
    return {
      latitude: center.latitude / items.length,
      longitude: center.longitude / items.length,
      items,
    }
  })
}