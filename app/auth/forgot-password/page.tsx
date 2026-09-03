'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Shield, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Navigation } from '@/components/shared/Navigation'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { resetPassword } from '../actions'

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    
    const formData = new FormData(e.currentTarget)
    
    const result = await resetPassword(formData)
    
    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setSuccess(result.success)
    }
    setIsLoading(false)
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
            <h1 className="text-2xl font-bold text-ops-text">Reset Clearance</h1>
            <p className="text-ops-muted mt-2 text-sm">Enter your email to receive a password reset link</p>
          </div>

          <div className="bg-ops-panel border border-ops-border rounded-2xl p-6 md:p-8 shadow-strong">
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                <p className="text-sm text-green-400">{success}</p>
              </div>
            )}

            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Authorized Email"
                  name="email"
                  type="email"
                  placeholder="agent@safezone.gov"
                  required
                />
                
                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isLoading ? 'SENDING...' : 'SEND RESET LINK'}
                </Button>
              </form>
            ) : (
              <div className="mt-2 text-center">
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">
                    RETURN TO SIGN IN
                  </Button>
                </Link>
              </div>
            )}

            <div className="mt-6 text-center border-t border-ops-border2 pt-6">
              <Link href="/auth/login" className="text-sm text-info-400 hover:text-info-300 font-semibold transition-colors">
                &larr; Back to login
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
