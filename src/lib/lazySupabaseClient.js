const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublicKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublicKey)

if (!isSupabaseConfigured && import.meta.env.PROD) {
  const missingMsg = `[K2 Security Guard] Missing required production configuration: `
    + `VITE_SUPABASE_URL (${supabaseUrl ? 'present' : 'MISSING'}), `
    + `Supabase publishable key (${supabasePublicKey ? 'present' : 'MISSING'}).`
  console.error(missingMsg)
  throw new Error(`${missingMsg} Production deployment cannot run without valid backend configuration.`)
}

let clientPromise = null

/**
 * Load the full Supabase SDK only when a remote Storefront operation needs it.
 * The imported module owns the singleton, PKCE settings, and key validation, so
 * this boundary cannot create a second auth client or weaken its configuration.
 */
export function getSupabaseClient() {
  if (!isSupabaseConfigured) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@k2-lazy-supabase-client').then(({ supabase }) => supabase)
  }
  return clientPromise
}
