// Emergency State Management Types — v2.0

export type EmergencyStep =
  | 'INITIAL'
  | 'SOS_CONFIRM'
  | 'COUNTDOWN'
  | 'LOCATION'
  | 'TYPE_SELECTION'
  | 'SEVERITY_SELECTION'
  | 'OPTIONAL_INFO'
  | 'FINAL_CONFIRM'
  | 'ACTIVE'

export type LocationStatus =
  | 'IDLE'
  | 'REQUESTING'
  | 'ACQUIRED'
  | 'DENIED'
  | 'UNAVAILABLE'
  | 'TIMEOUT'
  | 'LOW_ACCURACY'
  | 'ERROR'

export type LocationAccuracyQuality = 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR'

export interface EmergencyLocation {
  latitude: number
  longitude: number
  accuracy?: number
  address?: string
  timestamp: Date
  accuracyQuality?: LocationAccuracyQuality
  isReal: boolean // always set explicitly — false only in demo mode
}

export interface EmergencyState {
  step: EmergencyStep
  emergencyId?: string
  type?: string
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  location?: EmergencyLocation
  locationStatus: LocationStatus
  peopleAffected?: number
  description?: string
  hasPhoto?: boolean
  hasVoice?: boolean
  isDemo: boolean
  activatedAt?: Date
}

export const EMERGENCY_TYPES = [
  { id: 'medical', label: 'Medical Emergency', icon: '🚑', description: 'Injuries or medical attention needed' },
  { id: 'accident', label: 'Road Accident', icon: '🚗', description: 'Vehicle collision or crash' },
  { id: 'fire', label: 'Fire', icon: '🔥', description: 'Fire emergency or smoke' },
  { id: 'crime', label: 'Crime / Security', icon: '🚓', description: 'Crime in progress or security threat' },
  { id: 'hazard', label: 'Hazard', icon: '⚠️', description: 'Dangerous road or location condition' },
  { id: 'flood', label: 'Flood / Natural Hazard', icon: '🌊', description: 'Flooding or natural disaster' },
  { id: 'other', label: 'Other', icon: '❓', description: 'Other emergency situation' },
]

export function getLocationAccuracyQuality(accuracyMeters: number): LocationAccuracyQuality {
  if (accuracyMeters <= 15) return 'EXCELLENT'
  if (accuracyMeters <= 50) return 'GOOD'
  if (accuracyMeters <= 200) return 'ACCEPTABLE'
  return 'POOR'
}

export function getLocationAccuracyLabel(quality: LocationAccuracyQuality): string {
  switch (quality) {
    case 'EXCELLENT': return 'High accuracy (±15m)'
    case 'GOOD': return 'Good accuracy (±50m)'
    case 'ACCEPTABLE': return 'Acceptable accuracy (±200m)'
    case 'POOR': return 'Low accuracy — location may be imprecise'
  }
}
