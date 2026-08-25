// MAP-017: behavioural anonymous read-boundary test against the live database.
//
// Strictly read-only. It issues SELECT requests only, never writes, and never
// prints a row value — only table names, HTTP statuses and row counts.
//
// Method: for each table/view it compares what the anonymous (publishable) key
// can actually read against the true row count read with the server secret key.
// A private table is contained only if anon sees zero rows. HTTP 200 with rows
// is an exposure even though the request "succeeded".
//
// Usage: node scripts/map017-evidence/verify-anon-read-boundary.mjs [.env.local]
import fs from 'node:fs'

const env = {}
for (const line of fs.readFileSync(process.argv[2] || '.env.local', 'utf8').split(/\r?\n/)) {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim())
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const BASE = `${env.VITE_SUPABASE_URL}/rest/v1`
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY
const SECRET = env.SUPABASE_SECRET_KEY

// Derived from AUTHORIZATION_MATRIX.md and the reviewed schema contract in
// scripts/schema-truth-core.mjs.
const EXPECT_READABLE = ['products', 'brands', 'categories', 'v_product_stock_from_batches']
const EXPECT_PRIVATE = [
  'user_profiles', 'orders', 'messages', 'conversations',
  'channel_credentials', 'staff_allocations', 'product_drafts',
  'product_batches', 'products_old', 'warehouses',
]

async function count(table, key, bearer = key) {
  const r = await fetch(`${BASE}/${table}?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${bearer}`, Prefer: 'count=exact', Range: '0-0' },
  })
  const cr = r.headers.get('content-range')
  return { status: r.status, count: cr ? Number(cr.split('/')[1]) : null }
}

const results = []
function record(name, pass, detail) {
  results.push({ name, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${detail}`)
}

console.log('--- anonymous read boundary (live, read-only) ---\n')

console.log('Public catalog — anon SHOULD be able to read:')
for (const table of EXPECT_READABLE) {
  const anon = await count(table, ANON)
  const truth = await count(table, SECRET)
  // Access is proven by the request being permitted, not by rows coming back.
  // An empty table legitimately returns zero rows, so requiring count > 0 would
  // fail a correctly-granted table that simply has no data yet.
  const ok = anon.status < 300
  const empty = (truth.count ?? 0) === 0 ? '  (table empty — grant proven, visibility not)' : ''
  record(`anon can read ${table}`, ok, `anon=${anon.status}/${anon.count ?? '-'} actual=${truth.count ?? '-'}${empty}`)
}

console.log('\nPrivate data — anon MUST NOT be able to read any row:')
for (const table of EXPECT_PRIVATE) {
  const anon = await count(table, ANON)
  const truth = await count(table, SECRET)
  const exposed = anon.status < 300 && (anon.count ?? 0) > 0
  const detail = `anon=${anon.status}/${anon.count ?? '-'} actual=${truth.count ?? '-'}` +
    (exposed ? '  <-- EXPOSED' : '')
  record(`anon cannot read ${table}`, !exposed, detail)
}

const passed = results.filter((r) => r.pass).length
console.log(`\n===== ${passed}/${results.length} boundary checks passed =====`)
if (passed !== results.length) {
  console.log('At least one boundary check failed. See MAP-017 in MASTER_ACTION_PLAN.md.')
}
process.exit(passed === results.length ? 0 : 1)
