'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Shield, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Navigation } from '@/components/shared/Navigation'
import { Input } from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { login } from '../actions'

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') || '/command-center'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    formData.append('next', nextPath)
    
    const result = await login(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="mx-auto h-12 w-12 bg-ops-panel2 border border-ops-border rounded-xl flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-info-400" />
        </div>
        <h1 className="text-2xl font-bold text-ops-text">Command Center Access</h1>
        <p className="text-ops-muted mt-2 text-sm">Sign in to access secure intelligence and dispatch systems</p>
      </div>

      <div className="bg-ops-panel border border-ops-border rounded-2xl p-6 md:p-8 shadow-strong">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Authorized Email"
            name="email"
            type="email"
            placeholder="agent@safezone.gov"
            required
            autoComplete="email"
          />
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-ops-muted">
                Clearance Password
              </label>
              <Link href="/auth/forgot-password" className="text-[11px] text-info-400 hover:text-info-300 transition-colors">
                FORGOT PASSWORD?
              </Link>
            </div>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                autoComplete="current-password"
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

          <Button
            type="submit"
            className="w-full mt-2"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isLoading ? 'AUTHENTICATING...' : 'AUTHORIZE ACCESS'}
          </Button>
        </form>

        <div className="mt-6 text-center border-t border-ops-border2 pt-6">
          <p className="text-sm text-ops-muted">
            No clearance?{' '}
            <Link href="/auth/register" className="text-info-400 hover:text-info-300 font-semibold transition-colors">
              Request access
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-ops-bg flex flex-col">
      <Navigation />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Suspense fallback={<div className="h-96 w-full animate-pulse bg-ops-panel rounded-2xl" />}>
            <LoginForm />
          </Suspense>
        </motion.div>
      </div>
    </div>
  )
}
