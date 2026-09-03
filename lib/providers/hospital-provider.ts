// lib/providers/hospital-provider.ts
// Hospital intelligence provider (server-only). Delegates to the SafeZone
// server: an authorized hospital API when HOSPITAL_API_URL is configured,
// otherwise OpenStreetMap Overpass (real locations, capacity marked
// DATA UNAVAILABLE — never fabricated).

import type { Hospital } from '@/types'
import { findHospitals } from '@/lib/server/hospitals'

export interface HospitalSearchResult {
  available: boolean
  hospitals: Hospital[]
  error?: string
}

export async function findNearbyHospitals(
  latitude: number,
  longitude: number,
  radiusMeters = 10000,
  maxResults = 5
): Promise<HospitalSearchResult> {
  try {
    const hospitals = await findHospitals(latitude, longitude, radiusMeters)
    return { available: true, hospitals: hospitals.slice(0, maxResults) }
  } catch (err) {
    return {
      available: false,
      hospitals: [],
      error: err instanceof Error ? err.message : 'Hospital lookup failed',
    }
  }
}