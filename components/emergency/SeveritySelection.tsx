'use client'

import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import { ArrowLeft, AlertCircle } from 'lucide-react'

interface SeveritySelectionProps {
  onSelect: (severity: 'CRITICAL' | 'HIGH' | 'MEDIUM') => void
  onBack: () => void
}

const severityOptions = [
  {
    level: 'CRITICAL' as const,
    label: 'CRITICAL',
    description: 'Immediate danger / serious injuries',
    color: 'critical',
    bgColor: 'bg-critical-50',
    borderColor: 'border-critical-300',
    textColor: 'text-critical-900',
  },
  {
    level: 'HIGH' as const,
    label: 'HIGH',
    description: 'Urgent assistance required',
    color: 'warning',
    bgColor: 'bg-warning-50',
    borderColor: 'border-warning-300',
    textColor: 'text-warning-900',
  },
  {
    level: 'MEDIUM' as const,
    label: 'MEDIUM',
    description: 'Safety issue requiring attention',
    color: 'info',
    bgColor: 'bg-info-50',
    borderColor: 'border-info-300',
    textColor: 'text-info-900',
  },
]

export function SeveritySelection({ onSelect, onBack }: SeveritySelectionProps) {
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
            <h1 className="text-xl font-bold text-gray-900">Emergency Severity</h1>
            <p className="text-sm text-gray-600">How serious is the situation?</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {severityOptions.map((option, index) => (
            <motion.button
              key={option.level}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={() => onSelect(option.level)}
              className={`w-full flex items-start gap-4 rounded-xl border-2 ${option.borderColor} ${option.bgColor} p-6 text-left hover:shadow-md transition-all active:scale-95`}
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/50">
                <AlertCircle className={`h-6 w-6 text-${option.color}-600`} />
              </div>
              <div className="flex-1">
                <h3 className={`text-xl font-bold ${option.textColor} mb-1`}>
                  {option.label}
                </h3>
                <p className="text-sm text-gray-700">{option.description}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 rounded-lg bg-gray-100 border border-gray-200 p-4"
        >
          <p className="text-xs text-gray-600">
            <strong>Not sure?</strong> Choose the level that best matches the urgency.
            Emergency responders will assess the situation upon arrival.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
