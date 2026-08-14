import { createClient } from '@supabase/supabase-js'

const STAFF_ROLES = new Set(['Admin', 'Staff'])

export function createServerSupabase() {
  const url = process.env.SUPABASE_URL || ''
  const anonKey = process.env.SUPABASE_ANON_KEY || ''
  if (!url || !anonKey) throw new Error('SUPABASE_SERVER_CONFIG_MISSING')
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export async function restoreAuthSession(client, encryptedSession) {
  const { data, error } = await client.auth.setSession({
    access_token: encryptedSession.accessToken,
    refresh_token: encryptedSession.refreshToken,
  })
  if (error || !data?.session || !data?.user) return null
  return data
}

export async function requireStaffIdentity(client, user) {
  const { data, error } = await client
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (error || !STAFF_ROLES.has(data?.role)) return null
  return { userId: user.id, email: user.email || null, role: data.role }
}
