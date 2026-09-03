'use client'

import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import { SeverityBadge } from '@/components/ui/Badge'
import { ArrowLeft, MapPin, AlertCircle, Users, FileText, CheckCircle } from 'lucide-react'
import { EmergencyState } from '@/types/emergency'
import { EMERGENCY_TYPES } from '@/types/emergency'
import { LocationService } from '@/lib/services/location'

interface FinalConfirmProps {
  state: EmergencyState
  onActivate: () => void
  onBack: () => void
}

export function FinalConfirm({ state, onActivate, onBack }: FinalConfirmProps) {
  const emergencyType = EMERGENCY_TYPES.find((t) => t.id === state.type)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Confirm Emergency</h1>
            <p className="text-sm text-gray-600">Review before activating</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Emergency Request Card */}
          <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden">
            <div className="bg-critical-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-white" />
                <h2 className="text-xl font-bold text-white">EMERGENCY REQUEST</h2>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Type */}
              <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                  {emergencyType?.icon}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Emergency Type
                  </p>
                  <p className="text-lg font-bold text-gray-900">{emergencyType?.label}</p>
                </div>
              </div>

              {/* Severity */}
              {state.severity && (
                <div className="pb-4 border-b border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Severity
                  </p>
                  <SeverityBadge severity={state.severity} />
                </div>
              )}

              {/* People Affected */}
              {state.peopleAffected && (
                <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
                  <Users className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      People Affected
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {state.peopleAffected} {state.peopleAffected === 1 ? 'person' : 'people'}
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              {state.description && (
                <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Description
                    </p>
                    <p className="text-sm text-gray-700">{state.description}</p>
                  </div>
                </div>
              )}

              {/* Location */}
              {state.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Location Status
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-safe-600" />
                      <span className="text-sm font-semibold text-safe-700">Location Shared</span>
                    </div>
                    {state.location.address && (
                      <p className="text-sm text-gray-700 mb-1">{state.location.address}</p>
                    )}
                    <p className="text-xs font-mono text-gray-500">
                      {LocationService.formatCoordinates(state.location)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Demo Notice */}
          {state.isDemo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-warning-50 rounded-xl border border-warning-200 p-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-warning-900 mb-1">Demo Mode Active</p>
                  <p className="text-sm text-warning-800">
                    This is a simulated emergency. No real emergency services will be contacted.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Important Notice */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-info-50 rounded-xl border border-info-200 p-4"
          >
            <p className="text-sm text-info-800">
              <strong>Important:</strong> Activating this emergency will {state.isDemo ? 'simulate' : 'initiate'} emergency response coordination. Please ensure all information is accurate.
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-critical-200 p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="emergency"
            size="xl"
            onClick={onActivate}
            className="w-full"
          >
            🚨 ACTIVATE EMERGENCY
          </Button>
        </div>
      </div>
    </div>
  )
}
