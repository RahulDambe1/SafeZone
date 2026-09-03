// Server-side AI analysis.
//
// Two engines, reported honestly:
//   - 'llm':   real LLM call (AI_API_KEY + AI_API_BASE_URL), output validated
//              deterministically before it is trusted.
//   - 'rules': deterministic rule-based classification computed from real
//              incident data. Confidence is a real calculation over data
//              completeness — never invented.
//
// When neither can produce output, status = 'unavailable' and the UI shows
// "AI ANALYSIS UNAVAILABLE" while the emergency workflow continues.

import type { AIAnalysis, IncidentType, SeverityLevel } from '@/types'
import { serverEnv } from '@/lib/server/env'
import { isValidSeverity, sanitizeString, tryParseJson } from '@/lib/server/validation'

export interface AnalysisInput {
  type?: string
  severity?: string
  description?: string
  peopleAffected?: number
  location?: { latitude: number; longitude: number; accuracy?: number } | null
  isDemo?: boolean
}

const TYPE_MAP: Record<string, IncidentType> = {
  accident: 'ACCIDENT',
  fire: 'FIRE',
  medical: 'MEDICAL',
  ambulance: 'MEDICAL',
  police: 'CRIME',
  crime: 'CRIME',
  hazard: 'ROAD_HAZARD',
  flood: 'FLOOD',
  unsafe: 'UNSAFE_LOCATION',
  other: 'OTHER',
}

export function normalizeIncidentType(type?: string): IncidentType {
  if (!type) return 'OTHER'
  const key = type.toLowerCase().trim()
  const mapped = TYPE_MAP[key]
  if (mapped) return mapped
  const upper = key.toUpperCase().replace(/[\s-]/g, '_')
  const known: IncidentType[] = ['ACCIDENT', 'FIRE', 'MEDICAL', 'ROAD_HAZARD', 'CRIME', 'FLOOD', 'UNSAFE_LOCATION', 'OTHER']
  return known.includes(upper as IncidentType) ? (upper as IncidentType) : 'OTHER'
}

const SEVERITY_BY_TYPE: Record<IncidentType, SeverityLevel> = {
  MEDICAL: 'CRITICAL',
  FIRE: 'CRITICAL',
  ACCIDENT: 'HIGH',
  CRIME: 'HIGH',
  ROAD_HAZARD: 'MEDIUM',
  FLOOD: 'HIGH',
  UNSAFE_LOCATION: 'MEDIUM',
  OTHER: 'MEDIUM',
}

// ---------------------------------------------------------------------------
// Deterministic validation of (possibly untrusted) model output
// ---------------------------------------------------------------------------

function validateModelOutput(raw: unknown): Partial<AIAnalysis> | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>

  const severity = isValidSeverity(r.severity) ? r.severity : undefined
  const incidentType = normalizeIncidentType(
    typeof r.incidentType === 'string' ? r.incidentType : undefined
  )

  let confidence: number | undefined
  if (typeof r.confidence === 'number' && Number.isFinite(r.confidence)) {
    confidence = Math.min(1, Math.max(0, r.confidence))
  }

  let peopleAffected: number | undefined
  if (typeof r.peopleAffected === 'number' && Number.isFinite(r.peopleAffected)) {
    peopleAffected = Math.min(1000, Math.max(0, Math.round(r.peopleAffected)))
  }

  const riskFactors = Array.isArray(r.riskFactors)
    ? r.riskFactors.filter((f): f is string => typeof f === 'string').map((f) => sanitizeString(f, 200)).slice(0, 10)
    : []

  const priority = ['IMMEDIATE', 'HIGH', 'MEDIUM', 'LOW'].includes(String(r.priority))
    ? (r.priority as AIAnalysis['priority'])
    : undefined

  if (!severity && !incidentType && riskFactors.length === 0 && !recommendedResponse(r)) return null

  return {
    severity,
    incidentType,
    confidence,
    peopleAffected,
    riskFactors,
    priority,
    recommendedResponse: recommendedResponse(r),
    reasoningSummary: sanitizeString(r.reasoningSummary, 1000) || undefined,
  }
}

function recommendedResponse(r: Record<string, unknown>): string | undefined {
  const v = r.recommendedResponse ?? r.recommendations ?? r.response
  if (typeof v === 'string') return sanitizeString(v, 500) || undefined
  if (Array.isArray(v) && typeof v[0] === 'string') return sanitizeString(v[0], 500) || undefined
  return undefined
}

// ---------------------------------------------------------------------------
// Rule-based engine (deterministic, computed from real data)
// ---------------------------------------------------------------------------

function ruleBasedAnalysis(input: AnalysisInput): AIAnalysis {
  const type = normalizeIncidentType(input.type)
  const severity = isValidSeverity(input.severity) ? input.severity : SEVERITY_BY_TYPE[type]

  // Confidence is a real calculation over how much validated information we have.
  let confidence = 0.35
  confidence += input.type ? 0.15 : 0
  confidence += input.location ? 0.2 : 0
  confidence += (input.description ?? '').trim().length >= 20 ? 0.15 : 0
  confidence += (input.peopleAffected ?? 0) > 0 ? 0.1 : 0
  confidence = Math.min(0.9, Math.round(confidence * 100) / 100)

  const text = `${input.type ?? ''} ${input.description ?? ''}`.toLowerCase()
  const riskFactors: string[] = []

  if (/unconscious|bleeding|not breathing|cardiac|stroke|seizure|breathing/.test(text)) {
    riskFactors.push('Life-threatening medical signs reported')
  }
  if (/fire|flame|smoke|burn/.test(text)) {
    riskFactors.push('Fire hazard — evacuation may be required')
  }
  if (/trapped|collision|crash|multiple vehicles|overturned/.test(text)) {
    riskFactors.push('Possible trapped casualties / multi-vehicle collision')
  }
  if ((input.peopleAffected ?? 0) >= 3) {
    riskFactors.push('Multiple people affected')
  }
  if ((input.location?.accuracy ?? Infinity) > 500) {
    riskFactors.push('Low location accuracy — verify position with caller')
  }
  if (riskFactors.length === 0) {
    riskFactors.push('No additional risk factors identified from available data')
  }

  const priority = severity === 'CRITICAL' ? 'IMMEDIATE' : severity === 'HIGH' ? 'HIGH' : severity === 'MEDIUM' ? 'MEDIUM' : 'LOW'

  const responseMap: Record<SeverityLevel, string> = {
    CRITICAL: 'Immediate dispatch of emergency medical response. Notify nearest trauma-capable hospital.',
    HIGH: 'Priority dispatch. Confirm scene safety and gather casualty count.',
    MEDIUM: 'Standard response. Monitor for escalation while responding.',
    LOW: 'Routine response. Log and monitor.',
  }

  return {
    status: 'available',
    engine: 'rules',
    incidentType: type,
    severity,
    confidence,
    peopleAffected: input.peopleAffected,
    riskFactors,
    recommendedResponse: responseMap[severity],
    priority,
    reasoningSummary: 'Deterministic classification from incident type, severity, location, description length and reported people affected.',
    model: 'safezone-rules-v1',
    analyzedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// LLM engine
// ---------------------------------------------------------------------------

async function llmAnalysis(input: AnalysisInput): Promise<AIAnalysis> {
  const system = [
    'You are an emergency incident analyst for a public-safety command center.',
    'Analyze the incident data and reply with STRICT JSON only, no markdown, using exactly this shape:',
    '{"incidentType":"ACCIDENT|FIRE|MEDICAL|ROAD_HAZARD|CRIME|FLOOD|UNSAFE_LOCATION|OTHER",',
    '"severity":"CRITICAL|HIGH|MEDIUM|LOW","confidence":0.0-1.0,"peopleAffected":int,',
    '"riskFactors":["..."],"recommendedResponse":"...","priority":"IMMEDIATE|HIGH|MEDIUM|LOW",',
    '"reasoningSummary":"..."}',
    'Never invent facts that are not present in the input. Confidence must reflect the certainty',
    'supported by the input data. Do not recommend actions requiring legal authority.',
  ].join(' ')

  const payload = {
    model: serverEnv.aiModel,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Incident input: ${JSON.stringify(input)}` },
    ],
  }

  const res = await fetch(`${serverEnv.aiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serverEnv.aiApiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  })

  if (!res.ok) {
    throw new Error(`AI provider returned ${res.status}`)
  }

  const body = (await res.json()) as {
    model?: string
    choices?: { message?: { content?: string } }[]
  }

  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('AI provider returned empty content')

  const parsed = tryParseJson(content)
  const validated = validateModelOutput(parsed)

  const base = ruleBasedAnalysis(input)
  return {
    status: 'available',
    engine: 'llm',
    incidentType: validated?.incidentType ?? base.incidentType,
    severity: validated?.severity ?? base.severity,
    confidence: validated?.confidence ?? base.confidence,
    peopleAffected: validated?.peopleAffected ?? base.peopleAffected,
    riskFactors: validated?.riskFactors?.length ? validated.riskFactors : base.riskFactors,
    recommendedResponse: validated?.recommendedResponse ?? base.recommendedResponse,
    priority: validated?.priority ?? base.priority,
    reasoningSummary: validated?.reasoningSummary ?? base.reasoningSummary,
    model: body.model ?? serverEnv.aiModel,
    analyzedAt: new Date().toISOString(),
  }
}

async function llmAnalysisGemini(input: AnalysisInput): Promise<AIAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

  const system = [
    'You are an emergency incident analyst for a public-safety command center.',
    'Analyze the incident data and reply with STRICT JSON only, no markdown, using exactly this shape:',
    '{"incidentType":"ACCIDENT|FIRE|MEDICAL|ROAD_HAZARD|CRIME|FLOOD|UNSAFE_LOCATION|OTHER",',
    '"severity":"CRITICAL|HIGH|MEDIUM|LOW","confidence":0.0-1.0,"peopleAffected":int,',
    '"riskFactors":["..."],"recommendedResponse":"...","priority":"IMMEDIATE|HIGH|MEDIUM|LOW",',
    '"reasoningSummary":"..."}',
    'Never invent facts not present in the input. Confidence must reflect the certainty supported by the input data.',
  ].join(' ')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\nIncident input: ${JSON.stringify(input)}` }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
      }),
      signal: AbortSignal.timeout(20_000),
    }
  )

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty response from Gemini')

  const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const validated = validateModelOutput(tryParseJson(jsonStr))
  const base = ruleBasedAnalysis(input)

  return {
    status: 'available',
    engine: 'llm',
    incidentType: validated?.incidentType ?? base.incidentType,
    severity: validated?.severity ?? base.severity,
    confidence: validated?.confidence ?? base.confidence,
    peopleAffected: validated?.peopleAffected ?? base.peopleAffected,
    riskFactors: validated?.riskFactors?.length ? validated.riskFactors : base.riskFactors,
    recommendedResponse: validated?.recommendedResponse ?? base.recommendedResponse,
    priority: validated?.priority ?? base.priority,
    reasoningSummary: validated?.reasoningSummary ?? base.reasoningSummary,
    model,
    analyzedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------

export async function analyzeIncident(input: AnalysisInput): Promise<AIAnalysis> {
  if (serverEnv.hasAi || process.env.GEMINI_API_KEY) {
    try {
      // Prefer OpenAI-compatible endpoint; fall back to Gemini; then rules.
      if (serverEnv.hasAi) {
        try {
          return await llmAnalysis(input)
        } catch {
          // fall through to Gemini below
        }
      }
      if (process.env.GEMINI_API_KEY) {
        return await llmAnalysisGemini(input)
      }
      throw new Error('no LLM provider available')
    } catch (err) {
      // Fall back to the deterministic engine, and say so.
      const fallback = ruleBasedAnalysis(input)
      return {
        ...fallback,
        reasoningSummary: `AI model unavailable (${err instanceof Error ? err.message : 'error'}). Rule-based analysis used instead.`,
      }
    }
  }

  if (!input.type && !input.description && !input.severity && !input.location) {
    return {
      status: 'unavailable',
      engine: 'rules',
      riskFactors: ['Insufficient incident data to analyze'],
      analyzedAt: new Date().toISOString(),
      error: 'AI ANALYSIS UNAVAILABLE — insufficient input data',
    }
  }

  return ruleBasedAnalysis(input)
}