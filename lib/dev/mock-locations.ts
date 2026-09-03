// lib/dev/mock-locations.ts
// ALL fake/demo location data lives here — isolated from production paths.
// This file must NEVER be imported in production code paths.
// It is only used by the /demo page and development utilities.

export const DEMO_LOCATIONS = [
  { lat: 12.9716, lng: 77.5946, address: 'MG Road, Bangalore' },
  { lat: 12.9352, lng: 77.6245, address: 'Koramangala, Bangalore' },
  { lat: 13.0358, lng: 77.5970, address: 'Hebbal, Bangalore' },
]

export const DEMO_HOSPITALS = [
  {
    id: 'demo-hosp-001',
    name: 'Manipal Hospital',
    location: { latitude: 12.9691, longitude: 77.5996, address: 'Manipal Hospital, Old Airport Road, Bangalore' },
    distance: 2100,
  },
  {
    id: 'demo-hosp-002',
    name: 'Apollo Hospital',
    location: { latitude: 12.9552, longitude: 77.6440, address: 'Apollo Hospital, Bannerghatta Road, Bangalore' },
    distance: 3800,
  },
]

export const DEMO_RESPONDERS = [
  {
    id: 'DEMO-AMB-001',
    vehicleId: 'AMB-007',
    type: 'AMBULANCE' as const,
    status: 'AVAILABLE' as const,
    location: { latitude: 12.9716, longitude: 77.5946, address: 'Central Command' },
    paramedics: 2,
    medicalEquipment: ['Defibrillator', 'Oxygen', 'Stretcher'],
  },
]

export function getDemoLocation() {
  const demo = DEMO_LOCATIONS[Math.floor(Math.random() * DEMO_LOCATIONS.length)]
  return {
    latitude: demo.lat,
    longitude: demo.lng,
    address: demo.address,
    accuracy: 10,
    timestamp: new Date(),
    isReal: false, // explicitly marked as not real
  }
}
