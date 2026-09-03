'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import { MapPin, CheckCircle, X, AlertCircle, Wifi } from 'lucide-react'
import { LocationStatus, EmergencyLocation, getLocationAccuracyLabel } from '@/types/emergency'
import { LocationService } from '@/lib/services/location'
import { LocationError } from '@/lib/services/location'

interface LocationScreenProps {
  status: LocationStatus
  location?: EmergencyLocation
  isDemo: boolean
  locationError?: LocationError | null
  onRequestLocation: (isDemo: boolean) => void
  onCancel: () => void
}

export function LocationScreen({
  status,
  location,
  isDemo,
  locationError,
  onRequestLocation,
  onCancel,
}: LocationScreenProps) {
  useEffect(() => {
    if (status === 'IDLE') {
      onRequestLocation(isDemo)
    }
  }, [status, isDemo, onRequestLocation])

  if (status === 'REQUESTING') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md w-full text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30 mb-6"
          >
            <MapPin className="h-12 w-12 text-blue-400" />
          </motion.div>

          <h2 className="text-2xl font-bold text-white mb-2">
            {isDemo ? '📍 USING DEMO LOCATION' : '📍 ACQUIRING GPS...'}
          </h2>

          <p className="text-gray-400 mb-2">
            {isDemo
              ? 'Loading simulated location for demo mode'
              : 'Requesting your precise GPS coordinates'}
          </p>

          {!isDemo && (
            <p className="text-xs text-gray-600 mb-8">
              Please allow location access when prompted by your browser
            </p>
          )}

          <Button variant="outline" size="md" onClick={onCancel} className="border-gray-700 text-gray-400">
            CANCEL
          </Button>
        </motion.div>
      </div>
    )
  }

  if (status === 'ACQUIRED' && location) {
    const accuracyLabel = location.accuracyQuality
      ? getLocationAccuracyLabel(location.accuracyQuality)
      : null
    const accuracyColor =
      location.accuracyQuality === 'EXCELLENT' || location.accuracyQuality === 'GOOD'
        ? 'text-green-400'
        : location.accuracyQuality === 'ACCEPTABLE'
        ? 'text-yellow-400'
        : 'text-red-400'

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="flex justify-center mb-6"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 border border-green-500/30">
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
            </motion.div>

            <h2 className="text-2xl font-bold text-center text-white mb-6">
              ✓ LOCATION ACQUIRED
            </h2>

            <div className="bg-gray-800/60 rounded-xl p-4 mb-6 space-y-3">
              {/* Real vs Demo indicator */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-700">
                <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  Source
                </span>
                <span
                  className={`text-xs font-bold uppercase tracking-wide ${
                    location.isReal ? 'text-green-400' : 'text-yellow-400'
                  }`}
                >
                  {location.isReal ? '● REAL GPS' : '○ DEMO LOCATION'}
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Coordinates
                </p>
                <p className="text-sm font-mono text-white">
                  {LocationService.formatCoordinates(location)}
                </p>
              </div>

              {location.address && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Address
                  </p>
                  <p className="text-sm text-gray-200">{location.address}</p>
                </div>
              )}

              {location.accuracy != null && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Accuracy
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono text-white">
                      ±{location.accuracy.toFixed(0)}m
                    </p>
                    {accuracyLabel && (
                      <span className={`text-xs font-medium ${accuracyColor}`}>
                        — {accuracyLabel}
                      </span>
                    )}
                  </div>
                  {location.accuracyQuality === 'POOR' && (
                    <p className="text-xs text-yellow-500 mt-1">
                      ⚠ Low accuracy — responders will see a large search area
                    </p>
                  )}
                </div>
              )}
            </div>

            <p className="text-center text-sm text-gray-500">
              Proceeding to emergency details...
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  // Error states
  const isDenied = status === 'DENIED'
  const isTimeout = status === 'TIMEOUT'
  const isUnavailable = status === 'UNAVAILABLE'

  if (isDenied || isTimeout || isUnavailable || status === 'ERROR') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md w-full"
        >
          <div className="bg-gray-900 rounded-2xl border border-yellow-500/30 p-8">
            <div className="flex justify-center mb-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/10 border border-yellow-500/30">
                <AlertCircle className="h-10 w-10 text-yellow-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center text-white mb-3">
              {isDenied
                ? 'Location Permission Denied'
                : isTimeout
                ? 'Location Timed Out'
                : 'Location Unavailable'}
            </h2>

            <p className="text-center text-gray-400 mb-2">
              {locationError?.message ||
                (isDenied
                  ? 'Location access was denied. Please enable location permissions in your browser settings.'
                  : isTimeout
                  ? 'GPS signal timed out. Please ensure you have a clear signal.'
                  : 'Location information is currently unavailable.')}
            </p>

            <p className="text-center text-sm text-gray-600 mb-8">
              Emergency services can still be dispatched, but response may be slower without precise location.
            </p>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                onClick={() => onRequestLocation(false)}
                className="w-full"
              >
                <Wifi className="mr-2 h-4 w-4" />
                TRY AGAIN
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => onRequestLocation(true)}
                className="w-full"
              >
                USE DEMO LOCATION
                <span className="ml-2 text-xs opacity-70">(not your real location)</span>
              </Button>

              <button
                onClick={onCancel}
                className="w-full px-6 py-3 text-gray-500 font-semibold hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
              >
                CANCEL EMERGENCY
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return null
}
