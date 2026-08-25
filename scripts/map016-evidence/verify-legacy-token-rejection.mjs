// MAP-016 blocker 4: legacy HS256 token acceptance/rejection evidence.
// Prints only HTTP status codes and row counts. Never prints a credential value.
import fs from 'node:fs'

const env = {}
for (const line of fs.readFileSync(process.argv[2], 'utf8').split(/\r?\n/)) {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim())
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const REF = 'pixplcjqivlfflickobf'
const URL_BASE = `https://${REF}.supabase.co`
const TOK = env.SUPABASE_ACCESS_TOKEN

const keys = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys`, {
  headers: { Authorization: `Bearer ${TOK}` },
})).json()

const legacyServiceRole = keys.find((k) => k.type === 'legacy' && k.name === 'service_role')?.api_key
const publishable = keys.find((k) => k.type === 'publishable')?.api_key
const modernSecret = keys.find((k) => k.type === 'secret')?.api_key

const alg = legacyServiceRole
  ? JSON.parse(Buffer.from(legacyServiceRole.split('.')[0], 'base64url')).alg
  : null

console.log(`legacy service_role JWT retrievable : ${Boolean(legacyServiceRole)} (alg=${alg})`)
console.log(`publishable key present             : ${Boolean(publishable)}`)
console.log(`modern secret key present           : ${Boolean(modernSecret)}`)

const TABLE = process.argv[3] || 'products'

async function probe(label, headers) {
  const r = await fetch(`${URL_BASE}/rest/v1/${TABLE}?select=*`, {
    headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
  })
  const cr = r.headers.get('content-range')
  const count = cr ? cr.split('/')[1] : null
  console.log(`${label.padEnd(46)} HTTP ${r.status}  count=${count ?? 'n/a'}`)
  return { status: r.status, count }
}

console.log(`\n--- table: ${TABLE} ---`)
const anon = await probe('publishable only (anon)', { apikey: publishable })
const oldBearer = await probe('publishable + OLD HS256 service_role Bearer', {
  apikey: publishable,
  Authorization: `Bearer ${legacyServiceRole}`,
})
const elevated = await probe('modern secret key (elevated baseline)', {
  apikey: modernSecret,
  Authorization: `Bearer ${modernSecret}`,
})
const oldAsApikey = await probe('OLD HS256 token used as apikey', { apikey: legacyServiceRole })

console.log('\n--- VERDICT ---')
if (oldBearer.status === 401 || oldBearer.status === 403) {
  console.log(`OLD TOKEN REJECTED (HTTP ${oldBearer.status}) -> HS256 revocation is effective`)
} else if (anon.count && oldBearer.count && oldBearer.count !== anon.count) {
  console.log(
    `OLD TOKEN STILL ELEVATES: anon=${anon.count} vs old-bearer=${oldBearer.count} ` +
      `(modern elevated=${elevated.count}) -> HS256 signing key NOT revoked`,
  )
} else {
  console.log(`old-bearer count == anon count (${oldBearer.count}) -> no elevation observed on this table`)
}
console.log(`old-token-as-apikey status: ${oldAsApikey.status} (expect 401 once legacy keys disabled)`)
