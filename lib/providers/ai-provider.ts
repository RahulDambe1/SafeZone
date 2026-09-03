// lib/providers/ai-provider.ts
// AI analysis provider (server-only). Delegates to the SafeZone server AI
// engine, which supports Gemini (GEMINI_API_KEY), any OpenAI-compatible
// endpoint (AI_API_KEY + AI_API_BASE_URL), and a deterministic rule-based
// fallback. The engine used ('llm' vs 'rules') is always reported honestly,
// and confidence is never fabricated.

import { AIAnalysis } from '@/types'
import { EmergencyState } from '@/types/emergency'
import { analyzeIncident as serverAnalyze, AnalysisInput } from '@/lib/server/ai'

export interface AIAnalysisRequest {
  incidentType?: string
  severity?: string
  description?: string
  peopleAffected?: number
  latitude?: number
  longitude?: number
  timestamp: string
}

export async function analyzeIncident(state: EmergencyState): Promise<AIAnalysis> {
  const input: AnalysisInput = {
    type: state.type,
    severity: state.severity,
    description: state.description,
    peopleAffected: state.peopleAffected,
    location: state.location
      ? { latitude: state.location.latitude, longitude: state.location.longitude, accuracy: state.location.accuracy }
      : null,
    isDemo: state.isDemo,
  }
  return serverAnalyze(input)
}

export async function checkAIAvailability(): Promise<boolean> {
  return Boolean(process.env.AI_API_KEY || process.env.GEMINI_API_KEY)
}