// MAP-016 blocker 1: real Admin AAL2 staff-invitation evidence.
//
// Provisions a clearly-labelled throwaway Admin identity, enrols a real TOTP
// factor, reaches AAL2, exercises the deployed invite-staff Edge Function, and
// then removes every identity and row it created.
//
// Prints only statuses, codes and non-secret identifiers. No key, password,
// TOTP secret or JWT value is ever emitted.
import crypto from 'node:crypto'
import fs from 'node:fs'

const env = {}
for (const line of fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/)) {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim())
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const REF = 'pixplcjqivlfflickobf'
const BASE = `https://${REF}.supabase.co`
const FN = `${BASE}/functions/v1/invite-staff`
// Current canonical Admin origin. Historical MAP-016 evidence retains the
// preview host that was used when that proof was captured.
const ORIGIN = 'https://admin.k2jimzon.com'
const SECRET = env.SUPABASE_SECRET_KEY
const PUBLISHABLE = env.VITE_SUPABASE_PUBLISHABLE_KEY

const stamp = Date.now()
const ADMIN_EMAIL = `map016-test-admin-${stamp}@k2jimzon-test.invalid`
const INVITEE_EMAIL = `map016-test-invitee-${stamp}@k2jimzon-test.invalid`
const PASSWORD = `Tst-${crypto.randomBytes(18).toString('base64url')}!aA1`

const created = { adminId: null, inviteeId: null }
const results = []
function record(name, pass, detail) {
  results.push({ name, pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const admin = (path, init = {}) =>
  fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      apikey: SECRET,
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

// ---- RFC 6238 TOTP -------------------------------------------------------
function base32Decode(s) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of s.replace(/=+$/, '').toUpperCase()) {
    const i = A.indexOf(c)
    if (i < 0) continue
    bits += i.toString(2).padStart(5, '0')
  }
  const out = Buffer.alloc(Math.floor(bits.length / 8))
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2)
  return out
}
function totp(secret, at = Date.now(), step = 30, digits = 6) {
  const counter = Buffer.alloc(8)
  counter.writeBigInt64BE(BigInt(Math.floor(at / 1000 / step)))
  const h = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest()
  const o = h[h.length - 1] & 0xf
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]
  return String(n % 10 ** digits).padStart(digits, '0')
}

async function main() {
  // Phase 0 — key sanity
  const ping = await admin('/rest/v1/user_profiles?select=id&limit=1')
  record('phase0 secret key reaches user_profiles', ping.status === 200, `HTTP ${ping.status}`)
  if (ping.status !== 200) throw new Error('secret key unusable; aborting before any write')

  // Phase 1 — create throwaway admin identity
  const mk = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD, email_confirm: true }),
  })
  const mkBody = await mk.json()
  created.adminId = mkBody?.id ?? null
  record('phase1 throwaway admin identity created', Boolean(created.adminId), `HTTP ${mk.status} id=${created.adminId}`)
  if (!created.adminId) throw new Error(`could not create test admin: ${JSON.stringify(mkBody).slice(0, 200)}`)

  // Phase 2 — grant Admin role in user_profiles
  const prof = await admin('/rest/v1/user_profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ id: created.adminId, email: ADMIN_EMAIL, role: 'Admin' }),
  })
  const profBody = await prof.json().catch(() => null)
  const roleOk = prof.status < 300 && profBody?.[0]?.role === 'Admin'
  record('phase2 actor granted Admin role', roleOk, `HTTP ${prof.status}`)
  if (!roleOk) throw new Error(`role grant failed: ${JSON.stringify(profBody).slice(0, 300)}`)

  // Phase 3 — password sign-in (AAL1)
  const si = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: PASSWORD }),
  })
  const siBody = await si.json()
  const aal1 = siBody?.access_token
  record('phase3 password sign-in returns AAL1 session', Boolean(aal1), `HTTP ${si.status}`)
  if (!aal1) throw new Error('sign-in failed')

  const authed = (token) => ({ apikey: PUBLISHABLE, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' })

  // Phase 4 — enrol TOTP factor
  const en = await fetch(`${BASE}/auth/v1/factors`, {
    method: 'POST',
    headers: authed(aal1),
    body: JSON.stringify({ factor_type: 'totp', friendly_name: `map016-test-${stamp}` }),
  })
  const enBody = await en.json()
  const factorId = enBody?.id
  const totpSecret = enBody?.totp?.secret
  record('phase4 TOTP factor enrolled', Boolean(factorId && totpSecret), `HTTP ${en.status} factor=${factorId}`)
  if (!factorId || !totpSecret) throw new Error('TOTP enrolment failed')

  // Phase 5 — challenge + verify -> AAL2
  const ch = await fetch(`${BASE}/auth/v1/factors/${factorId}/challenge`, { method: 'POST', headers: authed(aal1) })
  const chBody = await ch.json()
  const vf = await fetch(`${BASE}/auth/v1/factors/${factorId}/verify`, {
    method: 'POST',
    headers: authed(aal1),
    body: JSON.stringify({ challenge_id: chBody?.id, code: totp(totpSecret) }),
  })
  const vfBody = await vf.json()
  const aal2 = vfBody?.access_token
  const claimedAal = aal2 ? JSON.parse(Buffer.from(aal2.split('.')[1], 'base64url')).aal : null
  record('phase5 TOTP verified, session elevated to AAL2', claimedAal === 'aal2', `HTTP ${vf.status} aal=${claimedAal}`)
  if (claimedAal !== 'aal2') throw new Error('AAL2 elevation failed')

  const callInvite = (token, key, body) =>
    fetch(FN, {
      method: 'POST',
      headers: { Origin: ORIGIN, Authorization: `Bearer ${token}`, 'X-Idempotency-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  const payload = { email: INVITEE_EMAIL, role: 'Staff' }
  const key = crypto.randomUUID()

  // Phase 6 — negative: AAL1 token must be refused
  const neg = await callInvite(aal1, crypto.randomUUID(), payload)
  const negBody = await neg.json().catch(() => ({}))
  record('phase6 AAL1 session refused with AAL2_REQUIRED', neg.status === 403 && negBody?.error === 'AAL2_REQUIRED', `HTTP ${neg.status} error=${negBody?.error}`)

  // Phase 7 — real invitation with AAL2
  const inv = await callInvite(aal2, key, payload)
  const invBody = await inv.json().catch(() => ({}))
  const invOk = inv.status === 200 && invBody?.ok === true && invBody?.roleAssigned === true
  record('phase7 AAL2 invitation succeeds', invOk, `HTTP ${inv.status} ${JSON.stringify(invBody)}`)

  // Phase 8 — replay same key + same payload -> identical result
  const rep = await callInvite(aal2, key, payload)
  const repBody = await rep.json().catch(() => ({}))
  // The replay is served from the stored jsonb receipt, and Postgres does not
  // preserve jsonb key order, so compare semantically rather than by string.
  const canon = (o) => JSON.stringify(Object.fromEntries(Object.entries(o ?? {}).sort(([a], [b]) => a.localeCompare(b))))
  record('phase8 replay is idempotent', rep.status === 200 && canon(repBody) === canon(invBody), `HTTP ${rep.status} body=${canon(repBody)}`)

  // Phase 9 — same key, different payload -> conflict
  const con = await callInvite(aal2, key, { email: `other-${stamp}@k2jimzon-test.invalid`, role: 'Staff' })
  const conBody = await con.json().catch(() => ({}))
  record('phase9 changed payload on same key -> 409 conflict', con.status === 409 && conBody?.error === 'IDEMPOTENCY_CONFLICT', `HTTP ${con.status} error=${conBody?.error}`)

  // Phase 10 — durable receipt.
  // k2_private is intentionally not PostgREST-exposed, so a direct read is
  // expected to fail. That failure is itself a boundary check; the authoritative
  // durability proof is phase 8, because the handler only replays a stored
  // result when it reads back a receipt in state 'completed'.
  const rec = await admin(`/rest/v1/staff_invitation_operations?select=state&idempotency_key=eq.${key}`, {
    headers: { 'Accept-Profile': 'k2_private' },
  })
  const recBody = await rec.json().catch(() => null)
  const exposed = rec.status === 200 && Array.isArray(recBody)
  record(
    'phase10 receipt table stays private to PostgREST',
    !exposed,
    exposed ? 'UNEXPECTEDLY READABLE via REST' : `HTTP ${rec.status} (not exposed, as designed)`,
  )

  const who = await admin(`/rest/v1/user_profiles?select=id,role&email=eq.${encodeURIComponent(INVITEE_EMAIL)}`)
  const whoBody = await who.json().catch(() => null)
  created.inviteeId = whoBody?.[0]?.id ?? null
  record('phase10 invitee provisioned with Staff role', whoBody?.[0]?.role === 'Staff', `role=${whoBody?.[0]?.role} id=${created.inviteeId}`)
}

async function cleanup() {
  console.log('\n--- cleanup ---')
  for (const [label, id] of [['test admin', created.adminId], ['test invitee', created.inviteeId]]) {
    if (!id) continue
    const p = await admin(`/rest/v1/user_profiles?id=eq.${id}`, { method: 'DELETE' })
    const u = await admin(`/auth/v1/admin/users/${id}`, { method: 'DELETE' })
    console.log(`removed ${label}: profile HTTP ${p.status}, identity HTTP ${u.status}`)
  }
  const leftovers = await admin('/rest/v1/user_profiles?select=id,email&email=like.*k2jimzon-test.invalid')
  const lb = await leftovers.json().catch(() => null)
  console.log(`residual test profiles remaining: ${Array.isArray(lb) ? lb.length : 'unknown'}`)
}

let failed = false
try {
  await main()
} catch (e) {
  failed = true
  console.log(`\nABORTED: ${e.message}`)
} finally {
  await cleanup().catch((e) => console.log(`cleanup error: ${e.message}`))
}

const passed = results.filter((r) => r.pass).length
console.log(`\n===== ${passed}/${results.length} checks passed =====`)
process.exit(failed || passed !== results.length ? 1 : 0)
