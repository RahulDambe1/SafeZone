import type { Metadata } from 'next'
import './globals.css'
import { RealtimeProvider } from '@/components/shared/RealtimeProvider'

export const metadata: Metadata = {
  title: 'SafeZone — AI-Powered Emergency Intelligence & Response',
  description:
    'Every Second Matters. AI-powered real-time emergency intelligence and response platform: SOS, GPS, AI analysis, real routing, responder dispatch, hospitals and a live command center.',
  keywords: ['emergency', 'public safety', 'AI', 'emergency response', 'incident reporting', 'command center'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-ops-bg text-ops-text" suppressHydrationWarning>
        <RealtimeProvider>{children}</RealtimeProvider>
      </body>
    </html>
  )
}