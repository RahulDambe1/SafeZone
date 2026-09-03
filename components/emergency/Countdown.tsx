'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'

interface CountdownProps {
  onComplete: () => void
  onCancel: () => void
}

export function Countdown({ onComplete, onCancel }: CountdownProps) {
  const [count, setCount] = useState(3)

  useEffect(() => {
    if (count === 0) {
      onComplete()
      return
    }

    const timer = setTimeout(() => {
      setCount((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [count, onComplete])

  return (
    <div className="min-h-screen bg-critical-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={count}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <div className="inline-flex h-32 w-32 items-center justify-center rounded-full bg-critical-600 text-white text-6xl font-bold shadow-emergency">
              {count}
            </div>
          </motion.div>
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl font-semibold text-gray-900 mb-8"
        >
          Preparing emergency request...
        </motion.p>

        <Button
          variant="outline"
          size="lg"
          onClick={onCancel}
          className="border-2 border-gray-300"
        >
          CANCEL
        </Button>
      </div>
    </div>
  )
}
