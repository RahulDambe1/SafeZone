// Server-side environment access. These values are ONLY read on the server
// (Route Handlers). Never import this module from client components.

function has(name: string): boolean {
  const v = process.env[name]
  return typeof v === 'string' && v.trim().length > 0
}

function get(name: string): string | undefined {
  const v = process.env[name]
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined
}

export const serverEnv = {
  /** Mapbox access token used server-side for routing / geocoding. */
  get mapboxToken(): string | undefined {
    return get('MAPBOX_ACCESS_TOKEN') ?? get('NEXT_PUBLIC_MAPBOX_TOKEN')
  },

  /** MapTiler key used server-side for routing / geocoding. */
  get maptilerKey(): string | undefined {
    return get('MAPTILER_API_KEY') ?? get('NEXT_PUBLIC_MAPTILER_API_KEY')
  },

  get hasMaptiler(): boolean {
    return has('MAPTILER_API_KEY') || has('NEXT_PUBLIC_MAPTILER_API_KEY')
  },

  /** OpenRouter/OpenAI-compatible base URL for AI analysis. */
  get aiBaseUrl(): string | undefined {
    return get('AI_API_BASE_URL') ?? 'https://api.openai.com/v1'
  },

  get aiApiKey(): string | undefined {
    return get('AI_API_KEY')
  },

  get aiModel(): string {
    return get('AI_MODEL') ?? 'gpt-4o-mini'
  },

  get hasAi(): boolean {
    return has('AI_API_KEY') || has('GEMINI_API_KEY')
  },

  get hasGemini(): boolean {
    return has('GEMINI_API_KEY')
  },

  /** Authorized responder GPS/status feed. */
  get responderApiUrl(): string | undefined {
    return get('RESPONDER_API_URL')
  },

  get responderApiKey(): string | undefined {
    return get('RESPONDER_API_KEY')
  },

  get hasResponderFeed(): boolean {
    return has('RESPONDER_API_URL')
  },

  /** Authorized hospital API. */
  get hospitalApiUrl(): string | undefined {
    return get('HOSPITAL_API_URL')
  },

  get hospitalApiKey(): string | undefined {
    return get('HOSPITAL_API_KEY')
  },

  get hasHospitalApi(): boolean {
    return has('HOSPITAL_API_URL')
  },

  /** Optional: 'supabase' switches persistence to Supabase (requires URL + keys). */
  get dbDriver(): 'file' | 'supabase' {
    return get('SAFEZONE_DB_DRIVER') === 'supabase' ? 'supabase' : 'file'
  },

  get supabaseUrl(): string | undefined {
    return get('SAFEZONE_SUPABASE_URL')
  },

  get supabaseServiceKey(): string | undefined {
    return get('SAFEZONE_SUPABASE_SERVICE_KEY')
  },

  get hasSupabase(): boolean {
    return has('SAFEZONE_SUPABASE_URL') && has('SAFEZONE_SUPABASE_SERVICE_KEY')
  },
}