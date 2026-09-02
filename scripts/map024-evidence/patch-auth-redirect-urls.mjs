// MAP-024: narrow Supabase Auth URL cutover.
//
// Patches ONLY `site_url` and `uri_allow_list` so emailed auth links and their
// callbacks resolve on the real k2jimzon.com hosts instead of the retired
// preview deployments. This is deliberately NOT `supabase config push`, which
// would apply the whole config file as one broad production mutation.
//
// The prior values are captured to a rollback file before the write, and the
// result is read back and verified after it.
import fs from 'node:fs'

const REF = 'pixplcjqivlfflickobf'
const ENDPOINT = `https://api.supabase.com/v1/projects/${REF}/config/auth`
const ROLLBACK_PATH = 'scripts/map024-evidence/auth-config-rollback.json'

// Production hosts only. localhost is intentionally NOT allow-listed on the
// production project: a redirect entry pointing at the operator's own machine is
// a loosening this cutover does not need, and local development runs against its
// own configuration. Add it deliberately if it is ever actually required.
const TARGET = {
  site_url: 'https://www.k2jimzon.com',
  uri_allow_list: [
    'https://www.k2jimzon.com/**',
    'https://k2jimzon.com/**',
    'https://admin.k2jimzon.com/**',
  ].join(','),
}

function readToken() {
  const env = {}
  for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim())
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  if (!env.SUPABASE_ACCESS_TOKEN) throw new Error('REFUSED: SUPABASE_ACCESS_TOKEN is not set')
  return env.SUPABASE_ACCESS_TOKEN
}

async function request(token, method, body) {
  const response = await fetch(ENDPOINT, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!response.ok) throw new Error(`REFUSED: ${method} returned HTTP ${response.status}`)
  return response.json()
}

const token = readToken()

const before = await request(token, 'GET')
fs.writeFileSync(
  ROLLBACK_PATH,
  `${JSON.stringify({ captured_at: new Date().toISOString(), site_url: before.site_url, uri_allow_list: before.uri_allow_list }, null, 2)}\n`,
  'utf8',
)
console.log(`rollback captured -> ${ROLLBACK_PATH}`)
console.log(`  before site_url       : ${before.site_url}`)
console.log(`  before uri_allow_list : ${before.uri_allow_list}`)

if (process.argv.includes('--apply')) {
  await request(token, 'PATCH', TARGET)
  const after = await request(token, 'GET')
  console.log('\napplied.')
  console.log(`  after site_url       : ${after.site_url}`)
  console.log(`  after uri_allow_list : ${after.uri_allow_list}`)
  const ok = after.site_url === TARGET.site_url && after.uri_allow_list === TARGET.uri_allow_list
  console.log(`\nverification: ${ok ? 'PASS' : 'FAIL — readback does not match target'}`)
  process.exitCode = ok ? 0 : 1
} else {
  console.log('\ndry run. Re-run with --apply to write these values:')
  console.log(`  site_url       : ${TARGET.site_url}`)
  console.log(`  uri_allow_list : ${TARGET.uri_allow_list}`)
}
