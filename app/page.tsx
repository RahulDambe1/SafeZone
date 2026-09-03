'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertCircle, Map, Radio, Shield, Zap, Clock, Play, Activity } from 'lucide-react'
import { Navigation } from '@/components/shared/Navigation'
import Button from '@/components/ui/Button'
import { useIncidents } from '@/hooks/useIncidents'
import { formatDuration } from '@/lib/utils'

export default function HomePage() {
  const { activeIncidents, criticalIncidents, incidents } = useIncidents()

  const realResolved = incidents.filter((i) => i.status === 'RESOLVED' && i.resolvedAt && !i.isDemo)
  const avgResponseTime: number | null =
    realResolved.length >= 3
      ? Math.round(
          realResolved.reduce(
            (sum, i) =>
              sum + (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()) / 1000,
            0
          ) / realResolved.length
        )
      : null

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 border border-red-200">
              <Zap className="h-4 w-4 text-red-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-red-600">
                AI-Powered Real-Time Emergency Intelligence &amp; Response
              </span>
            </div>

            <h1 className="text-6xl sm:text-7xl font-bold text-gray-900 tracking-tight">
              SAFE<span className="text-red-600">ZONE</span>
            </h1>

            <p className="mt-4 text-2xl font-semibold text-red-500">Every Second Matters.</p>

            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Real SOS reporting · Real GPS · AI incident analysis · Real routing (OSRM) ·
              Live Command Center · Every service shows its true connection state.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/emergency/sos">
                <Button variant="emergency" size="xl" className="min-w-[240px]">
                  <AlertCircle className="mr-2 h-6 w-6" />
                  REPORT EMERGENCY
                </Button>
              </Link>

              <Link href="/command-center">
                <Button variant="outline" size="lg">
                  <Radio className="mr-2 h-5 w-5" />
                  Command Center
                </Button>
              </Link>

              <Link href="/demo">
                <Button variant="ghost" size="lg">
                  <Play className="mr-2 h-5 w-5" />
                  Demo Mode
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="py-10 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Live Platform State — from real incident store
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Active Incidents</p>
              </div>
              <p className="text-4xl font-bold text-gray-900 font-mono">
                {activeIncidents.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">from incident store</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-red-100 bg-white p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Critical</p>
              </div>
              <p className="text-4xl font-bold text-gray-900 font-mono">
                {criticalIncidents.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">require immediate response</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-sm font-semibold text-gray-600">Avg Response Time</p>
              </div>
              <p className="text-4xl font-bold text-gray-900 font-mono">
                {avgResponseTime != null ? formatDuration(avgResponseTime) : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {avgResponseTime != null
                  ? 'from real resolved incidents'
                  : 'insufficient data (need ≥3 resolved)'}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Complete Emergency Response Platform
            </h2>
            <p className="mt-3 text-base text-gray-600 max-w-2xl mx-auto">
              Citizen SOS → Real GPS → AI analysis → OSRM routing → Responder dispatch →
              Hospital destination → Live Command Center
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FeatureCard
              href="/map"
              icon={<Map className="h-6 w-6 text-blue-500" />}
              iconBg="bg-blue-50 border-blue-200"
              title="Live Emergency Map"
              description="Real roads via OpenStreetMap, incident markers, route geometry — no placeholder gray boxes."
            />
            <FeatureCard
              href="/command-center"
              icon={<Radio className="h-6 w-6 text-orange-500" />}
              iconBg="bg-orange-50 border-orange-200"
              title="Command Center"
              description="Real-time incident queue, per-service connection states, AI assessments, and real routing data."
            />
            <FeatureCard
              href="/intelligence"
              icon={<Shield className="h-6 w-6 text-green-500" />}
              iconBg="bg-green-50 border-green-200"
              title="Safety Intelligence"
              description="Patterns derived from real incident data. Shows 'insufficient data' honestly when the dataset is too small."
            />
          </div>
        </div>
      </section>

      {/* Honest-State CTA */}
      <section className="py-14 border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-5 text-3xl font-bold text-gray-900">
            Built to be honest. Built to work.
          </h2>
          <p className="mt-3 text-base text-gray-600 max-w-xl mx-auto">
            SafeZone never pretends a service is connected when it is not.
            Unavailable data is labeled unavailable. Real data is always real.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/emergency/sos">
              <Button variant="emergency" size="lg">
                REPORT EMERGENCY
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg">
                See Demo Flow
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({
  href,
  icon,
  iconBg,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
}) {
  return (
    <Link href={href} className="block group">
      <div className="rounded-xl border border-gray-200 bg-white p-6 h-full transition-all group-hover:shadow-md group-hover:border-gray-300">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-lg border ${iconBg} mb-4`}
        >
          {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
      </div>
    </Link>
  )
}