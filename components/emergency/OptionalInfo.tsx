'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import { ArrowLeft, Users, Mic, Camera, ChevronRight } from 'lucide-react'

interface OptionalInfoProps {
  onContinue: (data: {
    peopleAffected?: number
    description?: string
    hasPhoto?: boolean
    hasVoice?: boolean
  }) => void
  onBack: () => void
}

export function OptionalInfo({ onContinue, onBack }: OptionalInfoProps) {
  const [peopleAffected, setPeopleAffected] = useState<string>('')
  const [description, setDescription] = useState('')

  const handleContinue = () => {
    onContinue({
      peopleAffected: peopleAffected ? parseInt(peopleAffected) : undefined,
      description: description.trim() || undefined,
      hasPhoto: false,
      hasVoice: false,
    })
  }

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
            <h1 className="text-xl font-bold text-gray-900">Additional Information</h1>
            <p className="text-sm text-gray-600">Optional — helps responders prepare</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* People Affected */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="flex items-center gap-3 mb-3">
              <Users className="h-5 w-5 text-gray-500" />
              <span className="font-semibold text-gray-900">Number of people affected</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={peopleAffected}
              onChange={(e) => setPeopleAffected(e.target.value)}
              placeholder="e.g., 2"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-info-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block font-semibold text-gray-900 mb-3">
              Tell us what happened
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the emergency..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-info-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              {description.length}/500 characters
            </p>
          </div>

          {/* Voice & Photo (Coming Soon) */}
          <div className="bg-gray-100 rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">Media Attachments</p>
            <div className="space-y-2">
              <button
                disabled
                className="flex items-center justify-between w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-left opacity-50 cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <Mic className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Hold to speak</span>
                </div>
                <span className="text-xs text-gray-400">Coming Soon</span>
              </button>
              <button
                disabled
                className="flex items-center justify-between w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-left opacity-50 cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <Camera className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Add photo</span>
                </div>
                <span className="text-xs text-gray-400">Coming Soon</span>
              </button>
            </div>
          </div>

          {/* Skip Notice */}
          <div className="bg-info-50 rounded-lg border border-info-200 p-4">
            <p className="text-sm text-info-800">
              <strong>Optional:</strong> You can skip this step and proceed directly to activate the emergency.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="primary"
            size="xl"
            onClick={handleContinue}
            className="w-full"
          >
            CONTINUE
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
