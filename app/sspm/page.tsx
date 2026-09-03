import type { ReactNode } from 'react'
import { Navigation } from '@/components/shared/Navigation'
import {
  AlertCircle,
  Ambulance,
  Building2,
  MapPin,
  Phone,
  Radio,
  Satellite,
  ShieldAlert,
  Smartphone,
} from 'lucide-react'

const GOOGLE_MAP_EMBED =
  'https://maps.google.com/maps?q=' +
  encodeURIComponent('SSPM College of Engineering, Harkul Budruk, Kankavli, Maharashtra 416602') +
  '&z=16&ie=UTF8&iwloc=B&output=embed'

const SSPM_ADDRESS = 'Sindhudurg Shikshan Prasarak Mandal\u2019s College of Engineering'
const SSPM_PLACE = 'A/P-Harkul Budruk, Tal-Kankavli, Dist-Sindhudurg, Maharashtra 416602'
const SSPM_PHONE = '+91 2367-299442'

export const metadata = {
  title: 'SSPM Kankavli — SafeZone Mockups',
}

export default function SspmMockupsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navigation />

      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-white">
              SAFEZONE · SSPM KANKAVLI — UI MOCKUPS
            </span>
          </div>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-400">
            Mockup preview — map is live, screens are static
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Live Google Map */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Satellite className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-300">
                    Simple Google Map — SSPM College of Engineering
                  </span>
                </div>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  LIVE MAP
                </span>
              </div>
              <iframe
                title="Google Map — SSPM College of Engineering Kankavli"
                src={GOOGLE_MAP_EMBED}
                className="h-[440px] w-full border-0 lg:h-[560px]"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="flex items-start gap-2 border-t border-gray-800 px-4 py-2.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                <p className="text-[11px] text-gray-500">
                  Real Google Maps embed (keyless) centered on the SSPM campus at Harkul Budruk.
                  The mockup screens below use the same location — pins there are illustrative only.
                </p>
              </div>
            </div>

            {/* Location details */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InfoCard icon={<Building2 className="h-4 w-4 text-blue-400" />} label="CAMPUS">
                {SSPM_ADDRESS}
              </InfoCard>
              <InfoCard icon={<MapPin className="h-4 w-4 text-red-400" />} label="PLACE">
                {SSPM_PLACE}
              </InfoCard>
              <InfoCard icon={<Phone className="h-4 w-4 text-green-400" />} label="CONTACT">
                {SSPM_PHONE} · Kankavli–Nardave Road, near NH-17
              </InfoCard>
            </div>
          </div>

          {/* Mockup screens */}
          <div className="space-y-5">
            <MockCard
              tag="MOCK · CITIZEN SOS"
              icon={<Smartphone className="h-4 w-4 text-red-400" />}
              tone="red"
              title="SOS from campus — pinned to SSPM Kankavli"
            >
              <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <AlertCircle className="h-3 w-3 text-red-500" /> Emergency type
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {['MEDICAL', 'ACCIDENT', 'FIRE', 'CRIME'].map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-gray-700 px-2.5 py-1 text-[10px] font-semibold text-gray-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mb-3 flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <MapPin className="h-3 w-3 text-red-400" /> SSPM Main Gate, Harkul Budruk
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">16.28°N 73.71°E</span>
                </div>
                <div className="rounded-lg bg-red-600 py-2.5 text-center text-sm font-black tracking-widest">
                  SOS
                </div>
              </div>
            </MockCard>

            <MockCard
              tag="MOCK · COMMAND CENTER"
              icon={<Radio className="h-4 w-4 text-blue-400" />}
              tone="blue"
              title="Incidents around the SSPM campus"
            >
              <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-950 p-3">
                {[
                  { spot: 'College Hostel', sev: 'HIGH', color: 'text-orange-400 border-orange-500/40' },
                  { spot: 'NH-17 Junction', sev: 'MEDIUM', color: 'text-blue-400 border-blue-500/40' },
                  { spot: 'Kankavli Bus Stand', sev: 'CRITICAL', color: 'text-red-400 border-red-500/40' },
                ].map((inc) => (
                  <div
                    key={inc.spot}
                    className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-3 py-2"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] text-gray-300">
                      <ShieldAlert className="h-3 w-3 text-gray-500" /> {inc.spot}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${inc.color}`}>
                      {inc.sev}
                    </span>
                  </div>
                ))}
                <p className="pt-1 text-center text-[10px] text-gray-600">
                  Static layout only — live incidents appear via the real incident store
                </p>
              </div>
            </MockCard>

            <MockCard
              tag="MOCK · LIVE TRACKING"
              icon={<Ambulance className="h-4 w-4 text-emerald-400" />}
              tone="green"
              title="Field unit sharing GPS near SSPM"
            >
              <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-300">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> GPS ACTIVE
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">±8 m accuracy</span>
                </div>
                <div className="mb-2 flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-3 py-2">
                  <span className="text-[11px] text-gray-400">Heading toward</span>
                  <span className="text-[11px] font-semibold text-white">SSPM Campus</span>
                </div>
                <div className="rounded-lg bg-emerald-600 py-2 text-center text-xs font-black tracking-widest">
                  SHARING LOCATION — MOCK
                </div>
              </div>
            </MockCard>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-1.5 flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
      </div>
      <p className="text-xs leading-relaxed text-gray-300">{children}</p>
    </div>
  )
}

function MockCard({
  tag,
  icon,
  tone,
  title,
  children,
}: {
  tag: string
  icon: React.ReactNode
  tone: 'red' | 'blue' | 'green'
  title: string
  children: ReactNode
}) {
  const toneClasses = {
    red: 'text-red-400',
    blue: 'text-blue-400',
    green: 'text-emerald-400',
  }
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${toneClasses[tone]}`}>
          {icon} {tag}
        </span>
        <span className="rounded border border-gray-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">
          Mockup
        </span>
      </div>
      <h3 className="mb-3 text-xs font-semibold text-white">{title}</h3>
      {children}
    </div>
  )
}
