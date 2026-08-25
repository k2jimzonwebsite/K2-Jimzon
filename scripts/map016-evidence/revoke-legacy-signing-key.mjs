// MAP-016 blocker 3: revoke the legacy HS256 JWT signing key.
// Owner-authorised, gated on the AAL2 invitation test passing first.
// Prints key ids, algorithms and statuses only. No key material is emitted.
import fs from 'node:fs'

const env = {}
for (const line of fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/)) {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim())
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const REF = 'pixplcjqivlfflickobf'
const TOK = env.SUPABASE_ACCESS_TOKEN
const BASE = `https://api.supabase.com/v1/projects/${REF}/config/auth/signing-keys`

const mgmt = async (path = '', init = {}) => {
  const r = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${TOK}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  let b
  try { b = await r.json() } catch { b = null }
  return { status: r.status, body: b }
}

const summarise = (keys) =>
  (keys ?? []).map((k) => `  ${k.id}  alg=${k.algorithm.padEnd(6)} status=${k.status}`).join('\n')

const before = await mgmt()
console.log(`--- signing keys BEFORE (HTTP ${before.status}) ---`)
console.log(summarise(before.body?.keys))

const target = (before.body?.keys ?? []).find((k) => k.algorithm === 'HS256' && k.status !== 'revoked')
if (!target) {
  console.log('\nNo non-revoked HS256 key found. Nothing to do.')
  process.exit(0)
}

const inUse = (before.body?.keys ?? []).find((k) => k.status === 'in_use')
if (!inUse || inUse.algorithm === 'HS256') {
  console.log(`\nABORT: the in_use key is ${inUse ? inUse.algorithm : 'missing'}. Refusing to revoke the active signing path.`)
  process.exit(1)
}
console.log(`\nActive signing key is ${inUse.id} (${inUse.algorithm}) — safe to revoke the legacy HS256 key.`)
console.log(`Revoking ${target.id} (HS256, currently ${target.status})...`)

const res = await mgmt(`/${target.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'revoked' }) })
console.log(`PATCH -> HTTP ${res.status}`)
if (res.status >= 300) console.log(JSON.stringify(res.body, null, 2).slice(0, 800))

const after = await mgmt()
console.log(`\n--- signing keys AFTER (HTTP ${after.status}) ---`)
console.log(summarise(after.body?.keys))

const now = (after.body?.keys ?? []).find((k) => k.id === target.id)
const ok = !now || now.status === 'revoked'
console.log(`\nHS256 key revoked: ${ok ? 'YES' : `NO (status=${now?.status})`}`)
process.exit(ok ? 0 : 1)
