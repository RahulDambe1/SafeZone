// Client hospital service — real hospital data via the server proxy
// (authorized API or OpenStreetMap Overpass). Capacity is only shown when the
// actual data source provides it.

import type { Hospital } from '@/types'

export class HospitalService {
  static async findHospitals(lat: number, lng: number, radiusMeters = 15000): Promise<Hospital[]> {
    const qs = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radiusMeters) })
    const res = await fetch(`/api/hospitals?${qs.toString()}`, { cache: 'no-store' })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      throw new Error(body?.error ?? 'HOSPITAL DATA UNAVAILABLE')
    }
    const { hospitals } = (await res.json()) as { hospitals: Hospital[] }
    return hospitals
  }
}