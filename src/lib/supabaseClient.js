import { createClient } from '@supabase/supabase-js'

// Reads the project keys from Vite env vars. When they are absent the app
// silently runs in local demo mode (localStorage-backed CMS) — see globeCms.js.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
