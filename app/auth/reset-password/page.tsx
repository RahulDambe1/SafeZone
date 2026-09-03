'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Navigation } from '@/components/shared/Navigation'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { updatePassword } from '../actions'

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    
    const result = await updatePassword(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ops-bg flex flex-col">
      <Navigation />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 bg-ops-panel2 border border-ops-border rounded-xl flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-info-400" />
            </div>
            <h1 className="text-2xl font-bold text-ops-text">Set New Password</h1>
            <p className="text-ops-muted mt-2 text-sm">Secure your account with a new clearance password</p>
          </div>

          <div className="bg-ops-panel border border-ops-border rounded-2xl p-6 md:p-8 shadow-strong">
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-ops-muted">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ops-muted hover:text-ops-text transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-widest text-ops-muted">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Input
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Must match new password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isLoading ? 'UPDATING...' : 'UPDATE PASSWORD'}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
