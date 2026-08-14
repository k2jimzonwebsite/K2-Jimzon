import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabasePublicKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublicKey)

if (!isSupabaseConfigured) {
  const missingMsg = `[K2 Security Guard] Missing required production configuration: ` +
    `VITE_SUPABASE_URL (${supabaseUrl ? 'present' : 'MISSING'}), ` +
    `Supabase publishable key (${supabasePublicKey ? 'present' : 'MISSING'}).`

  if (import.meta.env.PROD) {
    console.error(missingMsg)
    throw new Error(`${missingMsg} Production deployment cannot run without valid backend configuration.`)
  } else {
    console.warn(`${missingMsg} Development mode fallback active.`)
  }
}
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublicKey, {
      auth: {
        // PKCE returns a one-time code instead of exposing access and refresh
        // tokens in the browser address bar during Google OAuth callbacks.
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
