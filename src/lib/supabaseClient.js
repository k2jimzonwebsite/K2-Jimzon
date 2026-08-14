import { createClient } from '@supabase/supabase-js'

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (process.env || {})

const supabaseUrl = env.VITE_SUPABASE_URL
export const supabasePublicKey = env.VITE_SUPABASE_PUBLIC_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublicKey)

if (!isSupabaseConfigured) {
  const missingMsg = `[K2 Security Guard] Missing required production configuration: ` +
    `VITE_SUPABASE_URL (${supabaseUrl ? 'present' : 'MISSING'}), ` +
    `Supabase publishable key (${supabasePublicKey ? 'present' : 'MISSING'}).`

  if (env.PROD) {
    console.error(missingMsg)
    throw new Error(`${missingMsg} Production deployment cannot run without valid backend configuration.`)
  } else {
    console.warn(`${missingMsg} Development mode fallback active.`)
  }
}
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublicKey)
  : null
