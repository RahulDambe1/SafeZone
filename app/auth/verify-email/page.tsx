import Link from 'next/link'
import { Mail, ArrowRight } from 'lucide-react'
import { Navigation } from '@/components/shared/Navigation'
import Button from '@/components/ui/Button'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-ops-bg flex flex-col">
      <Navigation />
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-ops-panel border border-ops-border rounded-2xl p-8 text-center shadow-strong">
          <div className="mx-auto h-16 w-16 bg-info-500/10 border border-info-500/20 rounded-full flex items-center justify-center mb-6">
            <Mail className="h-8 w-8 text-info-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-ops-text mb-3">Check your email</h1>
          <p className="text-ops-muted text-sm leading-relaxed mb-8">
            We have sent a verification link to your email address. 
            Please click the link to verify your clearance and activate your account.
          </p>
          
          <div className="space-y-4">
            <Link href="/auth/login" className="block">
              <Button variant="outline" className="w-full">
                Return to Login <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
