'use client'

import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import { AlertCircle, Ambulance, Flame, Shield, Phone, AlertTriangle, MapPin } from 'lucide-react'

interface InitialScreenProps {
  onSOSPress: () => void
  onQuickAction: (type: string) => void
  onDemoToggle: (enabled: boolean) => void
  isDemo: boolean
}

const quickActions = [
  { id: 'ambulance', label: 'AMBULANCE', icon: Ambulance, color: 'text-critical-400' },
  { id: 'fire', label: 'FIRE', icon: Flame, color: 'text-critical-400' },
  { id: 'police', label: 'POLICE', icon: Shield, color: 'text-info-400' },
  { id: 'hazard', label: 'REPORT HAZARD', icon: AlertTriangle, color: 'text-warning-400' },
]

export function InitialScreen({ onSOSPress, onQuickAction, onDemoToggle, isDemo }: InitialScreenProps) {
  return (
    <div className="min-h-screen bg-ops-bg flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md w-full"
        >
          {/* Logo/Brand */}
          <div className="mb-8">              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-critical-600">
                  <AlertCircle className="h-7 w-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-ops-text">SAFEZONE</h1>
              </div>
              <p className="text-lg text-ops-muted font-medium">Are you in an emergency?</p>
          </div>

          {/* SOS Button */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mb-8"
          >
            <button
              onClick={onSOSPress}
              className="w-full btn-emergency shadow-emergency hover:shadow-2xl active:scale-95 transition-all py-8 text-2xl font-bold"
            >
              <Phone className="mr-3 h-8 w-8" />
              🚨 SOS EMERGENCY
            </button>
          </motion.div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                  onClick={() => onQuickAction(action.id)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-ops-border bg-ops-panel p-4 hover:border-ops-border2 hover:shadow-md transition-all active:scale-95"
                >
                  <Icon className={`h-6 w-6 ${action.color}`} />
                  <span className="text-xs font-semibold text-ops-text">{action.label}</span>
                </motion.button>
              )
            })}
          </div>

          {/* Share Location */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="rounded-xl bg-info-500/10 border border-info-500/40 p-4"
          >
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-info-600 flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-ops-text">Location Sharing</p>
                <p className="text-xs text-ops-muted mt-0.5">
                  Enable for faster response times
                </p>
              </div>
            </div>
          </motion.div>

          {/* Demo Mode Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-6"
          >
            <label className="flex items-center justify-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDemo}
                onChange={(e) => onDemoToggle(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-info-600 focus:ring-info-500"
              />
              <span className="text-sm text-ops-muted">Demo Mode (Simulated Emergency)</span>
            </label>
          </motion.div>
        </motion.div>
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-ops-panel border-t border-ops-border">
        <p className="text-xs text-center text-ops-muted">
          For life-threatening emergencies, always call 108 immediately
        </p>
      </div>
    </div>
  )
}
