'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AlertCircle, Home, Map, MapPin, Radio, Shield, Zap, ClipboardList } from 'lucide-react'
import { useSystemStatus } from '@/hooks/useSystemStatus'
import { realtimeClient } from '@/lib/store/realtime-client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { logout } from '@/app/auth/actions'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Emergency', href: '/emergency/sos', icon: AlertCircle },
  { name: 'Live Map', href: '/map', icon: Map },
  { name: 'Command Center', href: '/command-center', icon: Radio },
  { name: 'Intelligence', href: '/intelligence', icon: Shield },
  { name: 'Report', href: '/report', icon: ClipboardList },
  { name: 'Demo', href: '/demo', icon: Zap },
  { name: 'SSPM Map', href: '/sspm', icon: MapPin },
]

function SystemStatusPill() {
  const { status } = useSystemStatus()
  const [realtimeState, setRealtimeState] = useState(realtimeClient.getState())

  useEffect(() => {
    return realtimeClient.onStateChange(setRealtimeState)
  }, [])

  const degraded = realtimeState !== 'connected' || status?.services.some((s) => s.state === 'NOT_CONNECTED' || s.state === 'UNAVAILABLE')

  return (
    <div
      className={cn(
        'hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 border',
        degraded
          ? 'bg-warning-500/10 border-warning-500/40'
          : 'bg-safe-500/10 border-safe-500/40'
      )}
      title={degraded ? 'One or more services unavailable — see Command Center' : 'All services operational'}
    >
      <span className={cn('status-dot', degraded ? 'status-warning' : 'status-operational')}></span>
      <span
        className={cn(
          'text-[10px] font-bold uppercase tracking-widest',
          degraded ? 'text-warning-400' : 'text-safe-400'
        )}
      >
        {realtimeState === 'connected' ? (degraded ? 'Degraded' : 'Operational') : realtimeState === 'connecting' ? 'Connecting' : 'Offline'}
      </span>
    </div>
  )
}

export function Navigation() {
  const pathname = usePathname()
  const { user, isLoading } = useAuth()

  return (
    <nav className="border-b border-ops-border bg-ops-panel/80 backdrop-blur">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-critical-600">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-ops-text tracking-tight">SAFEZONE</span>
            </Link>

            <div className="hidden md:flex md:items-center md:gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-ops-panel2 text-ops-text border border-ops-border'
                        : 'text-ops-muted hover:bg-ops-panel2 hover:text-ops-text'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <SystemStatusPill />
            <div className="hidden sm:flex items-center gap-3 border-l border-ops-border pl-4">
              {isLoading ? (
                <div className="h-8 w-20 animate-pulse bg-ops-panel2 rounded-md" />
              ) : user ? (
                <>
                  <span className="text-xs text-ops-muted hidden lg:block">
                    {user.email}
                  </span>
                  <form action={logout}>
                    <button type="submit" className="text-xs font-semibold text-ops-text hover:text-red-400 transition-colors">
                      LOGOUT
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/auth/login" className="text-xs font-semibold text-info-400 hover:text-info-300 transition-colors">
                  SECURE LOGIN
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="border-t border-ops-border md:hidden">
        <div className="flex items-center justify-around py-2 px-2 overflow-x-auto">
          {navigation.slice(0, 6).map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors flex-shrink-0',
                  isActive ? 'text-ops-text' : 'text-ops-muted'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'text-critical-500')} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}