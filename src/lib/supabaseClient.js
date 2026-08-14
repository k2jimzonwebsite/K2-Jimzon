import { createClient } from '@supabase/supabase-js'

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (process.env || {})

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  const missingMsg = `[K2 Security Guard] Missing required production configuration: ` +
    `VITE_SUPABASE_URL (${supabaseUrl ? 'present' : 'MISSING'}), ` +
    `VITE_SUPABASE_ANON_KEY (${supabaseAnonKey ? 'present' : 'MISSING'}).`

  if (env.PROD) {
    console.error(missingMsg)
    throw new Error(`${missingMsg} Production deployment cannot run without valid backend configuration.`)
  } else {
    console.warn(`${missingMsg} Development mode fallback active.`)
  }
}
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
