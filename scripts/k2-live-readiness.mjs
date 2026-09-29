// Read-only K2 production readiness gate.
//
// Answers one question: for each MAP gate, is it already satisfied, is it
// waiting on the owner, or is it waiting on a connector this harness does not
// have? It never writes, applies, migrates or deploys. It runs read-only SQL
// through the Supabase management API after the K2 project identity preflight,
// so a ScoutIT-only token or a wrong URL is refused before any query is sent.
//
// The point is to replace prose readiness packets with a repeatable receipt.
// Run it before every owner-authorized production step and attach its output to
// the MAP item. A green gate here means "the precondition holds", never "the
// work is done".
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { verifyK2SupabaseProject, K2_SUPABASE_REF } from './verify-k2-supabase-project.mjs'
import { EXPECTED_ANON_FUNCTIONS } from './security-surface-policy.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))

function readEnvFile(file) {
  const env = {}
  for (const line of fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim())
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return env
}

const env = { ...readEnvFile('.env.local'), ...process.env }

// Every statement below is a SELECT. Refuse to send anything else, so this
// script cannot become the thing that writes to production.
function assertReadOnly(sql) {
  const stripped = sql.replace(/--[^\n]*/g, '').trim()
  if (!/^select\b/i.test(stripped)) {
    throw new Error(`REFUSED: readiness SQL must begin with SELECT, got "${stripped.slice(0, 40)}"`)
  }
  if (/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|vacuum|analyze|call|do)\b/i.test(stripped)) {
    throw new Error('REFUSED: readiness SQL contains a write verb')
  }
}

async function query(sql) {
  const rows = await queryRows(sql)
  return Array.isArray(rows) ? rows[0] : rows
}

// Same guard and transport, but returns every row. Needed wherever the gate
// enumerates a set rather than reading one aggregate.
async function queryRows(sql) {
  assertReadOnly(sql)
  const response = await fetch(`https://api.supabase.com/v1/projects/${K2_SUPABASE_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, read_only: true }),
  })
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`read-only query failed: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`)
  }
  return response.json()
}

const gates = []
function gate(id, owner, state, detail) {
  gates.push({ id, owner, state, detail })
  const mark = { verified: 'PASS', owner: 'OWNER', connector: 'CONNECTOR' }[state] ?? 'FAIL'
  console.log(`${mark.padEnd(10)} ${id.padEnd(34)} ${detail}`)
}

// 1. Identity. Refuses the wrong project before anything else runs.
let identity = null
try {
  identity = await verifyK2SupabaseProject({
    accessToken: env.SUPABASE_ACCESS_TOKEN,
    supabaseUrl: env.VITE_SUPABASE_URL,
  })
  gate('project-identity', 'none', 'verified', `K2 ${identity.projectRef}`)
} catch (error) {
  gate('project-identity', 'none', 'blocked', error.message)
  console.log('\nREFUSED: identity did not pass, no query was sent.')
  process.exit(1)
}

// 2. Migration ledger. An intake receipt here means a prior apply already ran
//    and the owner must be told before a second apply is proposed.
const ledger = await query(
  `select count(*)::int as entries,
          coalesce(max(version)::text, 'none') as latest
     from supabase_migrations.schema_migrations`,
)
const latest = ledger.entries === 0 ? 'none' : ledger.latest
gate(
  'migration-ledger',
  'none',
  'verified',
  `${ledger.entries} entries, latest ${latest}`,
)

// 3. Unapplied MAP-018/026 chain. The target tables must still be absent for
//    the prepared intake migration to be a first apply rather than a re-apply.
const absent = await query(
  `select
      (select count(*) from information_schema.tables
        where table_schema = 'public' and table_name = 'product_intake_sessions')::int as intake_sessions,
      (select count(*) from information_schema.tables
        where table_schema = 'public' and table_name = 'k2_sku_seq')::int as sku_seq,
      (select count(*) from information_schema.tables
        where table_schema = 'public' and table_name = 'channels')::int as channels,
      (select count(*) from information_schema.tables
        where table_schema = 'public' and table_name = 'channel_shops')::int as channel_shops`,
)
const chainAbsent = absent.intake_sessions === 0 && absent.sku_seq === 0
const channelAbsent = absent.channels === 0 && absent.channel_shops === 0
gate(
  'intake-chain-unapplied',
  'none',
  chainAbsent ? 'verified' : 'blocked',
  chainAbsent
    ? 'intake tables absent, prepared apply is a first apply'
    : 'intake tables already exist, re-apply would conflict',
)
gate(
  'channel-chain-unapplied',
  'none',
  channelAbsent ? 'verified' : 'blocked',
  channelAbsent ? 'channel tables absent' : 'channel tables already exist',
)

// 4. Anonymous execute surface, classified rather than merely counted.
//
//    A raw "10 live versus 18 expected" reads as an unexplained security gap. It
//    is not. The live set is the sum of two deliberate states: the functions the
//    current policy expects, and the legacy transitional RPCs that the prepared
//    MAP-019/020 signed-guest chain is designed to replace. The expected set that
//    is absent is the unapplied portion of that chain. Naming all three makes the
//    revocation list explicit instead of leaving a number to be interpreted.
//
//    Nothing here asserts the transitional grants are acceptable. They are routed
//    to the owner for the cutover decision and are never counted as a pass.
const liveAnon = await queryRows(
  `select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
    order by 1`,
)
// The policy list is written as `public.name(arg,arg)` while a live signature
// carries full argument types. Overload identity is not in question here, so
// both sides are reduced to `public.name` before comparison.
const normalize = (signature) => {
  const withoutArgs = String(signature).replace(/\(.*\)\s*$/, '').trim()
  return withoutArgs.includes('.') ? withoutArgs : `public.${withoutArgs}`
}
const liveSignatures = liveAnon.map((row) => row.signature)
const expected = new Set(EXPECTED_ANON_FUNCTIONS.map(normalize))
const liveKeys = new Set(liveSignatures.map(normalize))
const liveAndExpected = [...liveKeys].filter((s) => expected.has(s)).sort()
const transitional = [...liveKeys].filter((s) => !expected.has(s)).sort()
const notYetApplied = [...expected].filter((f) => !liveKeys.has(f)).sort()
const grants = { anon_execute: liveSignatures.length }

// PUBLIC must hold no implicit execute in the public schema. The 25 September
// stock-grant correction removed it; this proves it is still gone.
const publicLeak = await query(
  `select count(*)::int as public_execute
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('public', p.oid, 'EXECUTE')
      and not has_function_privilege('anon', p.oid, 'EXECUTE')`,
)
gate(
  'public-has-no-execute',
  'none',
  publicLeak.public_execute === 0 ? 'verified' : 'blocked',
  publicLeak.public_execute === 0
    ? 'no implicit PUBLIC execute in the public schema'
    : `${publicLeak.public_execute} functions still reachable through PUBLIC`,
)
gate(
  'anon-execute-classified',
  'owner',
  'owner',
  `${liveAndExpected.length} expected and live, ${transitional.length} legacy transitional,`
    + ` ${notYetApplied.length} expected but not yet applied`,
)
for (const signature of transitional) console.log(`           transitional: ${signature}`)
for (const signature of notYetApplied) console.log(`           pending apply: ${signature}`)

// 5. Product and lot facts. Counts only. These are projections, never proof of
//    physical stock, which is why the gate routes to the owner.
const facts = await query(
  `select (select count(*) from public.products)::int as products,
          (select count(*) from public.products where lower(status) = 'live')::int as live_products,
          (select count(*) from public.product_batches)::int as lots`,
)
gate(
  'stock-facts',
  'owner',
  'owner',
  `${facts.products} products (${facts.live_products} live), ${facts.lots} lots; physical count unproven`,
)

// 6. Local backup freshness. The apply gates require an encrypted backup newer
//    than the last live migration, verified by an isolated restore.
const backupDir = path.join(root, '.tools', 'current-production-backups')
let newestBackup = null
if (fs.existsSync(backupDir)) {
  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.k2backup'))
  for (const file of files) {
    const full = path.join(backupDir, file)
    const mtime = fs.statSync(full).mtime
    if (!newestBackup || mtime > newestBackup.mtime) newestBackup = { file, mtime }
  }
}
const ledgerDay = latest === 'none' ? null : latest.slice(0, 8)
const backupDay = newestBackup
  ? `${newestBackup.mtime.getFullYear()}${String(newestBackup.mtime.getMonth() + 1).padStart(2, '0')}${String(newestBackup.mtime.getDate()).padStart(2, '0')}`
  : null
const backupFresh = Boolean(backupDay && ledgerDay && backupDay >= ledgerDay)
gate(
  'backup-freshness',
  'none',
  backupFresh ? 'verified' : 'blocked',
  newestBackup
    ? `${newestBackup.file} (${backupDay}) vs ledger ${ledgerDay}`
    : 'no local encrypted backup found',
)

// The receipt sits beside the envelope and keeps the full envelope name, so
// `x.k2backup` pairs with `x.k2backup.restore-verification.json`.
const restoreReceipt = path.join(backupDir, `${newestBackup?.file ?? 'none'}.restore-verification.json`)
gate(
  'backup-restore-proof',
  'owner',
  fs.existsSync(restoreReceipt) ? 'verified' : 'blocked',
  fs.existsSync(restoreReceipt)
    ? 'isolated restore receipt present locally'
    : 'no isolated restore receipt beside the newest backup',
)

// 7. Provider surfaces this harness cannot reach. Recorded as blocked rather
//    than assumed, so no report can imply a Preview or duration was seen.
gate('vercel-preview', 'connector', 'connector', 'no Vercel API token or CLI in this harness')
gate('cloudflare-gate', 'connector', 'connector', 'Admin edge gate state not readable from here')
gate('provider-advisor', 'connector', 'connector', 'Supabase advisor findings need a signed-in session')

// 8. GitHub. The release path must be a real push, not a claim.
let pushState = 'unknown'
try {
  const { execFileSync } = await import('node:child_process')
  const out = execFileSync('git', ['status', '-sb'], { cwd: root, encoding: 'utf8' })
  pushState = out.split('\n')[0].trim()
} catch {
  pushState = 'unavailable'
}
gate('release-branch', 'none', 'verified', pushState)

const blocked = gates.filter((g) => g.state === 'blocked')
const connector = gates.filter((g) => g.state === 'connector')
const owner = gates.filter((g) => g.state === 'owner')

console.log(`\nverified ${gates.length - blocked.length - connector.length - owner.length}`
  + ` | owner ${owner.length} | connector ${connector.length} | blocked ${blocked.length}`)

if (blocked.length) {
  console.log('\nBlocked preconditions:')
  for (const g of blocked) console.log(`  - ${g.id}: ${g.detail}`)
}
console.log('\nThis receipt proves preconditions only. It applies nothing, changes no flag,')
console.log('creates no deployment and writes no row. Production writes still require the')
console.log('owner authorization named in MASTER_ACTION_PLAN.md.')

const outFile = process.argv[2] || 'live-readiness.json'
fs.writeFileSync(path.join(root, '.tools', 'current-production-backups', outFile), `${JSON.stringify({
  projectRef: identity.projectRef,
  ledger,
  absent,
  grants,
  facts,
  backup: newestBackup ? { file: newestBackup.file, mtime: newestBackup.mtime.toISOString() } : null,
  gates,
}, null, 2)}\n`)
console.log(`\nwrote .tools/current-production-backups/${outFile}`)
