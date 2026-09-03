'use client'

import { motion } from 'framer-motion'
import { EMERGENCY_TYPES } from '@/types/emergency'
import { ArrowLeft } from 'lucide-react'

interface TypeSelectionProps {
  onSelect: (type: string) => void
  onBack: () => void
}

export function TypeSelection({ onSelect, onBack }: TypeSelectionProps) {
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
            <h1 className="text-xl font-bold text-gray-900">Emergency Type</h1>
            <p className="text-sm text-gray-600">Select the type of emergency</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EMERGENCY_TYPES.map((type, index) => (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => onSelect(type.id)}
              className="flex items-start gap-4 rounded-xl border-2 border-gray-200 bg-white p-5 text-left hover:border-gray-400 hover:shadow-md transition-all active:scale-95"
            >
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-3xl">
                {type.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 mb-1">{type.label}</h3>
                <p className="text-sm text-gray-600">{type.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
