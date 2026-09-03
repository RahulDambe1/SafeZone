'use client'

import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import { AlertCircle, X } from 'lucide-react'

interface SOSConfirmProps {
  onConfirm: () => void
  onCancel: () => void
}

export function SOSConfirm({ onConfirm, onCancel }: SOSConfirmProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-2xl shadow-strong p-8 border-2 border-critical-200">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-critical-100 animate-pulse-slow">
              <AlertCircle className="h-10 w-10 text-critical-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-3">
            Emergency Assistance
          </h2>

          {/* Message */}
          <p className="text-center text-gray-600 mb-8">
            Are you sure you want to activate SOS?
            <br />
            <span className="text-sm text-gray-500 mt-2 block">
              This will request immediate emergency assistance
            </span>
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              variant="emergency"
              size="xl"
              onClick={onConfirm}
              className="w-full"
            >
              ACTIVATE SOS
            </Button>

            <button
              onClick={onCancel}
              className="w-full px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="inline-block mr-2 h-5 w-5" />
              CANCEL
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
