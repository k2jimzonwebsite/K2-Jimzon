// ============================================================================
// K2 Jimzon — Invite staff (Supabase Edge Function, admin-only)
// ============================================================================
// The super admin calls this from the dashboard to add a staff login. It:
//   1. Confirms the CALLER is signed in AND has the 'Admin' role (never trust
//      the browser — we re-check the role server-side here).
//   2. Sends an invite email so the new staff member sets THEIR OWN password.
//   3. Sets their role (default 'Staff') in user_profiles.
//
// The admin never sees or handles the password. Secrets never touch the browser.
//
// Deploy:  supabase functions deploy invite-staff
// Needs:   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (auto-injected).
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  // 1) Who is calling? Verify their session and that they are an Admin.
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) return json({ error: 'not signed in' }, 401)

  const caller = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: userData, error: userErr } = await caller.auth.getUser()
  if (userErr || !userData?.user) return json({ error: 'invalid session' }, 401)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  const { data: prof } = await admin.from('user_profiles')
    .select('role').eq('id', userData.user.id).single()
  if (!prof || !/admin/i.test(prof.role ?? '')) {
    return json({ error: 'only an admin can invite staff' }, 403)
  }

  // 2) Validate input
  let body: any
  try { body = await req.json() } catch { return json({ error: 'bad json' }, 400) }
  const email = String(body?.email ?? '').trim().toLowerCase()
  const role = ['Admin', 'Staff', 'Customer'].includes(body?.role) ? body.role : 'Staff'
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'valid email required' }, 400)

  // 3) Send the invite (Supabase emails a set-password link)
  const redirectTo = body?.redirectTo || undefined
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })
  if (inviteErr) {
    // If they already exist, still (re)assign the role below.
    if (!/already/i.test(inviteErr.message)) return json({ error: inviteErr.message }, 400)
  }

  // 4) Set their role. Find the user id (from the invite, or by listing).
  let uid = invited?.user?.id as string | undefined
  if (!uid) {
    const { data: list } = await admin.auth.admin.listUsers()
    uid = list?.users?.find((u) => u.email?.toLowerCase() === email)?.id
  }
  if (uid) {
    await admin.from('user_profiles')
      .upsert({ id: uid, email, role }, { onConflict: 'id' })
  }

  return json({ ok: true, email, role, invited: !inviteErr })
})
