'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/shared/Navigation'
import { Panel } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import {
  Play,
  Pause,
  RotateCcw,
  AlertCircle,
  MapPin,
  Brain,
  Ambulance as AmbulanceIcon,
  Clock,
  CheckCircle,
  Shield,
  WifiOff,
  Info,
} from 'lucide-react'

// ============================================================
// DEMO MODE — All data on this page is SIMULATED.
// This is an interactive walkthrough of the SafeZone flow.
// It uses fake coordinates and a scripted timeline.
// No real emergency services are contacted.
// Real emergencies: use the SOS button on the Emergency page.
// ============================================================

type DemoStep =
  | 'intro'
  | 'emergency-reported'
  | 'ai-analyzing'
  | 'ai-complete'
  | 'route-calculated'
  | 'dispatching'
  | 'responder-note'
  | 'en-route'
  | 'arrived'
  | 'resolved'

interface StepConfig {
  id: DemoStep
  label: string
  description: string
  duration: number
  icon: React.ElementType
  color: string
}

const DEMO_STEPS: StepConfig[] = [
  {
    id: 'intro',
    label: 'SafeZone Demo',
    description: 'Starting interactive demo walkthrough. All data is simulated.',
    duration: 1800,
    icon: Shield,
    color: 'text-gray-400',
  },
  {
    id: 'emergency-reported',
    label: 'Emergency Reported',
    description: 'SOS activated — Major road accident at demo location (DEMO GPS, not real).',
    duration: 2500,
    icon: AlertCircle,
    color: 'text-red-400',
  },
  {
    id: 'ai-analyzing',
    label: 'AI Analyzing Incident',
    description: 'In production: Gemini API processes incident details. In demo: rule-based estimate.',
    duration: 2500,
    icon: Brain,
    color: 'text-blue-400',
  },
  {
    id: 'ai-complete',
    label: 'AI Analysis Complete',
    description: 'Severity: HIGH. Priority: IMMEDIATE. Confidence: 72% (rule-based estimate, labeled as such).',
    duration: 2200,
    icon: Brain,
    color: 'text-green-400',
  },
  {
    id: 'route-calculated',
    label: 'Route Calculated',
    description: 'In production: OSRM real routing API. In demo: simulated route geometry shown.',
    duration: 2200,
    icon: MapPin,
    color: 'text-blue-400',
  },
  {
    id: 'dispatching',
    label: 'Checking Responder Feed',
    description: 'System queries authorized responder feed.',
    duration: 1800,
    icon: AmbulanceIcon,
    color: 'text-orange-400',
  },
  {
    id: 'responder-note',
    label: 'Responder Feed Not Connected',
    description: '○ No authorized GPS feed configured. In production, this would show a real responder unit. Demo shows honest state.',
    duration: 2500,
    icon: WifiOff,
    color: 'text-gray-400',
  },
  {
    id: 'en-route',
    label: 'En Route (Demo Simulation)',
    description: 'DEMO ONLY: Simulating responder movement. This is not real ambulance tracking.',
    duration: 2800,
    icon: Clock,
    color: 'text-yellow-400',
  },
  {
    id: 'arrived',
    label: 'Responder Arrived (Demo)',
    description: 'DEMO ONLY: Simulated arrival. Real system requires live GPS feed.',
    duration: 2200,
    icon: CheckCircle,
    color: 'text-green-400',
  },
  {
    id: 'resolved',
    label: 'Incident Resolved (Demo)',
    description: 'End-to-end demo complete. Try the real SOS flow for an actual emergency.',
    duration: 2000,
    icon: CheckCircle,
    color: 'text-green-400',
  },
]

export default function DemoPage() {
  const router = useRouter()
  const [currentStepIdx, setCurrentStepIdx] = useState(-1)
  const [isRunning, setIsRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentStep = currentStepIdx >= 0 ? DEMO_STEPS[currentStepIdx] : null
  const progress =
    currentStepIdx >= 0 ? Math.round(((currentStepIdx + 1) / DEMO_STEPS.length) * 100) : 0

  const advance = useCallback(() => {
    setCurrentStepIdx((prev) => {
      const next = prev + 1
      if (next >= DEMO_STEPS.length) {
        setIsRunning(false)
        setCompleted(true)
        return prev
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearTimeout(timerRef.current)
      return
    }

    const step = DEMO_STEPS[currentStepIdx]
    if (!step) return

    timerRef.current = setTimeout(() => {
      advance()
    }, step.duration)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isRunning, currentStepIdx, advance])

  const handleStart = () => {
    setCurrentStepIdx(0)
    setIsRunning(true)
    setCompleted(false)
  }

  const handlePause = () => {
    setIsRunning((prev) => !prev)
  }

  const handleReset = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setCurrentStepIdx(-1)
    setIsRunning(false)
    setCompleted(false)
  }

  const completedSteps = DEMO_STEPS.slice(0, currentStepIdx + 1)

  return (
    <div className="min-h-screen bg-gray-950">
      <Navigation />

      {/* DEMO MODE Banner — persistent, cannot be missed */}
      <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2.5">
        <div className="mx-auto max-w-7xl flex items-center justify-center gap-3">
          <Info className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-yellow-300">
            <strong>DEMO MODE</strong> — All data on this page is simulated.
            No real emergency services are contacted.
            <span className="ml-2 text-yellow-400/70">
              Real emergencies: use the SOS button.
            </span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">SafeZone Demo Walkthrough</h1>
          <p className="text-gray-400 text-sm">
            Interactive step-by-step walkthrough of the emergency response pipeline.
            Honest about what is real vs. simulated at each stage.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">
                Demo Controls
              </h2>

              {currentStepIdx === -1 ? (
                <Button
                  variant="emergency"
                  size="lg"
                  onClick={handleStart}
                  className="w-full"
                >
                  <Play className="mr-2 h-4 w-4" />
                  START DEMO
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button
                    variant={isRunning ? 'secondary' : 'primary'}
                    size="md"
                    onClick={handlePause}
                    className="w-full"
                    disabled={completed}
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    {isRunning ? 'PAUSE' : 'RESUME'}
                  </Button>
                  <Button variant="outline" size="md" onClick={handleReset} className="w-full border-gray-700 text-gray-400">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    RESET
                  </Button>
                </div>
              )}

              {/* Progress */}
              {currentStepIdx >= 0 && (
                <div className="mt-5">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full">
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Step {currentStepIdx + 1} of {DEMO_STEPS.length}
                  </p>
                </div>
              )}
            </div>

            {/* Demo incident data panel */}
            {currentStepIdx >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900 rounded-xl border border-yellow-500/20 p-5"
              >
                <p className="text-xs font-bold text-yellow-500 uppercase tracking-wide mb-3">
                  DEMO Incident Data
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">ID</span>
                    <span className="font-mono text-white">SZ-DEMO-001</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="text-white">Road Accident</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Severity</span>
                    <span className="text-orange-400 font-bold">HIGH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">GPS</span>
                    <span className="text-yellow-400 font-semibold">DEMO — not real</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Coords</span>
                    <span className="font-mono text-gray-400">12.9716, 77.5946</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Step Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Current step */}
            <AnimatePresence mode="wait">
              {currentStep && (
                <motion.div
                  key={currentStep.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-gray-900 rounded-xl border border-blue-500/30 p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                      <currentStep.icon className={`h-6 w-6 ${currentStep.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {isRunning && (
                          <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                        )}
                        <h3 className="text-lg font-bold text-white">{currentStep.label}</h3>
                      </div>
                      <p className="text-sm text-gray-400">{currentStep.description}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {currentStepIdx === -1 && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
                <Shield className="h-12 w-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400">Click START DEMO to begin the walkthrough</p>
              </div>
            )}

            {/* Completed steps log */}
            {completedSteps.length > 1 && (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Event Log
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[...completedSteps].reverse().slice(1).map((step) => {
                    const Icon = step.icon
                    return (
                      <div key={step.id} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400/60 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-300">{step.label}</p>
                          <p className="text-xs text-gray-600">{step.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Completion */}
            {completed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-500/10 rounded-xl border border-green-500/30 p-6 text-center"
              >
                <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">Demo Complete</h3>
                <p className="text-sm text-gray-400 mb-4">
                  That was a walkthrough of the full SafeZone emergency pipeline.
                  For a real emergency, use the SOS button.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="emergency" size="md" onClick={() => router.push('/emergency/sos')}>
                    REAL SOS
                  </Button>
                  <Button variant="outline" size="md" onClick={handleReset} className="border-gray-700 text-gray-400">
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Replay
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer disclaimer */}
        <div className="mt-10 bg-yellow-500/5 rounded-lg border border-yellow-500/20 p-4 text-center">
          <p className="text-xs text-yellow-600">
            <strong>DEMO MODE:</strong> This walkthrough uses simulated incident data, demo GPS coordinates, and scripted steps.
            It does not contact real emergency services, does not use real GPS, and does not represent live ambulance movement.
            Real emergency services: call <strong>108</strong> (India) or your local emergency number.
          </p>
        </div>
      </div>
    </div>
  )
}