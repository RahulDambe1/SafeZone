// Client AI analysis service — proxies to the server endpoint where the
// actual analysis (LLM or rule-based) runs. Never fabricates confidence;
// returns an honest 'unavailable' state when the server cannot analyze.

import type { AIAnalysis } from '@/types'

export interface AnalyzeRequest {
  type?: string
  severity?: string
  description?: string
  peopleAffected?: number
  location?: { latitude: number; longitude: number; accuracy?: number } | null
  isDemo?: boolean
}

export class AIAnalysisService {
  static async analyzeIncident(input: AnalyzeRequest): Promise<AIAnalysis> {
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        return {
          status: 'unavailable',
          engine: 'rules',
          riskFactors: [],
          analyzedAt: new Date().toISOString(),
          error: 'AI ANALYSIS UNAVAILABLE — server analysis endpoint failed',
        }
      }
      const { analysis } = (await res.json()) as { analysis: AIAnalysis }
      return analysis
    } catch (err) {
      return {
        status: 'unavailable',
        engine: 'rules',
        riskFactors: [],
        analyzedAt: new Date().toISOString(),
        error: `AI ANALYSIS UNAVAILABLE — ${(err as Error).message}`,
      }
    }
  }
}