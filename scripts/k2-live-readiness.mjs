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
import { createHash } from 'node:crypto'

import { verifyK2SupabaseProject, K2_SUPABASE_REF } from './verify-k2-supabase-project.mjs'
import { EXPECTED_ANON_FUNCTIONS } from './security-surface-policy.mjs'
import {classifyInstalledReadiness,classifyInstalledPermissions,classifyBackupProof,selectBackupEvidence} from './k2-installed-readiness.mjs'
import { ADMIN_PREAUTH_PERMISSION, classifyAdminPreauthDependency } from './admin-preauth-readiness.mjs'

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
    signal: AbortSignal.timeout(30000),
  })
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`read-only query failed: HTTP ${response.status}`)
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

// 3. Classify exact applied receipt and canonical relations, or an empty
//    first-apply baseline. Neither classification permits replay or a write.
const absent = await query(
  `select
      (select count(*) from information_schema.tables
        where table_schema = 'public' and table_name = 'product_intake_sessions')::int as intake_sessions,
      (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname = 'public' and c.relname = 'k2_sku_seq' and c.relkind='S')::int as sku_seq,
      (select count(*) from information_schema.tables
        where table_schema = 'public' and table_name = 'channels')::int as channels,
      (select count(*) from information_schema.tables
        where table_schema = 'public' and table_name = 'channel_shops')::int as channel_shops`,
)
const controlledReceipts = await queryRows(
  `select version,name,idempotency_key as "idempotencyKey",
          cardinality(statements) as "statementCount",
          octet_length(convert_to(statements[1],'UTF8')) as "statementBytes",
          encode(extensions.digest(convert_to(statements[1],'UTF8'),'sha256'),'hex') as "statementSha256"
     from supabase_migrations.schema_migrations
    where version in ('20261012140000','20261013100000','20261013110000')
       or name like 'k2_category_operating_full%'
       or idempotency_key like 'k2-controlled-v1:%'
    order by version`,
)
const installation = classifyInstalledReadiness(controlledReceipts, absent)
gate('canonical-installation', 'none', installation.state, installation.detail)

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
  `select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature,
          pg_get_userbyid(p.proowner) as owner,p.prosecdef as definer,
          case when not p.proretset and rt.typtype='c'
               then quote_ident(rn.nspname)||'.'||quote_ident(rt.typname)
               else pg_get_function_result(p.oid) end as result,
          exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
                 where a.grantee=0 and a.privilege_type='EXECUTE') as "publicExecute"
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     join pg_type rt on rt.oid=p.prorettype join pg_namespace rn on rn.oid=rt.typnamespace
    where n.nspname = 'public'
      and has_function_privilege('anon', p.oid, 'EXECUTE')
    order by 1`,
)
// The policy list is written as `public.name(arg,arg)` while a live signature
// carries full argument types. Overload identity is not in question here, so
// both sides are reduced to `public.name` for legacy source-policy reporting
// only. Installed classification below compares complete qualified signatures.
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

// Enumerate actual PUBLIC ACLs in both application schemas. Installed mode
// admits only the exact two reviewed public invoker trigger signatures.
const publicFunctions = await queryRows(
  `select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signature,
          pg_get_userbyid(p.proowner) as owner,p.prosecdef as definer,
          case when not p.proretset and rt.typtype='c'
               then quote_ident(rn.nspname)||'.'||quote_ident(rt.typname)
               else pg_get_function_result(p.oid) end as result,true as "publicExecute"
     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     join pg_type rt on rt.oid=p.prorettype join pg_namespace rn on rn.oid=rt.typnamespace
    where n.nspname in ('public','k2_private')
      and exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
                 where a.grantee=0 and a.privilege_type='EXECUTE')
    order by 1`,
)
let installedPermissions = null
if (installation.mode === 'installed') {
  const profile=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/20261025-installed-readiness-permissions.json'),'utf8'))
  if (liveAnon.some(row => row.signature === ADMIN_PREAUTH_PERMISSION.signature)) profile.functions.push(ADMIN_PREAUTH_PERMISSION)
  installedPermissions=classifyInstalledPermissions(liveAnon,publicFunctions,profile.functions)
  gate('installed-permission-catalog','none',installedPermissions.state,installedPermissions.detail)
  gate('hosted-caller-acceptance','owner','owner','Installed signatures match only; authenticated staff/customer and legacy-route acceptance remain unverified')
} else {
  gate('public-has-no-execute','none',publicFunctions.length===0?'verified':'blocked',publicFunctions.length===0?'No PUBLIC execute in application schemas':publicFunctions.length+' application functions have PUBLIC execute')
  gate('anon-execute-classified','owner','owner',liveAndExpected.length+' expected and live, '+transitional.length+' transitional, '+notYetApplied.length+' source-policy names absent')
  for (const signature of transitional) console.log('           transitional: '+signature)
  for (const signature of notYetApplied) console.log('           pending classification: '+signature)
}

// Absence is a real login blocker. The narrowly named preparation mode only
// recognizes complete absence before the owner-approved additive repair; it
// never tolerates partial objects, altered bodies or wider grants.
const preauthSnapshot = await query(`select jsonb_build_object(
 'routine',(select jsonb_build_object('signature',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
   'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'result',pg_get_function_result(p.oid),
   'bodySha256',encode(extensions.digest(convert_to(replace(p.prosrc,chr(13),''),'UTF8'),'sha256'),'hex'),
   'emptySearchPath','search_path=""'=any(coalesce(p.proconfig,array[]::text[])),
   'anonExecute',has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticatedExecute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'publicExecute',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'))
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where p.oid=to_regprocedure('public.consume_admin_preauth_rate_v1(text,bigint,uuid,text,text,text)')),
 'nonces',(select jsonb_build_object('owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
   'anonAccess',exists(select 1 from aclexplode(acldefault('r',c.relowner)) a where has_table_privilege('anon',c.oid,a.privilege_type)),
   'authenticatedAccess',exists(select 1 from aclexplode(acldefault('r',c.relowner)) a where has_table_privilege('authenticated',c.oid,a.privilege_type)))
   from pg_class c where c.oid=to_regclass('k2_private.admin_preauth_rate_nonces')),
 'buckets',(select jsonb_build_object('owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
   'anonAccess',exists(select 1 from aclexplode(acldefault('r',c.relowner)) a where has_table_privilege('anon',c.oid,a.privilege_type)),
   'authenticatedAccess',exists(select 1 from aclexplode(acldefault('r',c.relowner)) a where has_table_privilege('authenticated',c.oid,a.privilege_type)))
   from pg_class c where c.oid=to_regclass('k2_private.admin_preauth_rate_buckets'))) as snapshot`)
const preauthSource = fs.readFileSync(path.join(root,'supabase/migrations/20260825_admin_preauth_rate_boundary.sql'),'utf8').replaceAll('\r','')
const preauthBody = /as \$\$([\s\S]*?)\$\$;/i.exec(preauthSource)?.[1] || ''
if (!preauthBody) throw new Error('ADMIN_PREAUTH_SOURCE_BODY_MISSING')
const preauthBodySha256 = createHash('sha256').update(preauthBody).digest('hex')
const preauthReadiness = classifyAdminPreauthDependency(preauthSnapshot.snapshot,preauthBodySha256,{preparedAbsent:process.argv.includes('--prepare-admin-preauth')})
gate('admin-preauth-dependency','owner',preauthReadiness.state,preauthReadiness.detail)

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
const backupCandidates=[]
if (fs.existsSync(backupDir)) {
  for (const file of fs.readdirSync(backupDir).filter(f=>f.endsWith('.k2backup'))) {
    const full=path.join(backupDir,file);let manifest=null,proof=null
    try {manifest=JSON.parse(fs.readFileSync(full+'.manifest.json','utf8'));proof=JSON.parse(fs.readFileSync(full+'.restore-verification.json','utf8'))} catch {}
    backupCandidates.push({file,full,manifest,proof,mtime:fs.statSync(full).mtime})
  }
}
const backupSelection=selectBackupEvidence(backupCandidates)
if(backupSelection.state==='verified')newestBackup=backupSelection.candidate
const backupProof=newestBackup?classifyBackupProof(newestBackup.manifest,newestBackup.proof,{latest,now:Date.now(),bytes:fs.statSync(newestBackup.full).size,sha256:createHash('sha256').update(fs.readFileSync(newestBackup.full)).digest('hex')}):backupSelection
gate('backup-freshness','none',backupProof.state,(newestBackup?.file??'none')+': '+backupProof.detail)
gate('backup-restore-proof','owner',backupProof.state,backupProof.detail)

// 7. Provider surfaces this harness cannot reach. Recorded as blocked rather
//    than assumed, so no report can imply a Preview or duration was seen.
gate('vercel-preview', 'connector', 'connector', 'no Vercel API token or CLI in this harness')
gate('vercel-edge-gate', 'connector', 'connector', 'Admin Vercel edge routing rule state not readable from this script')
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
  process.exitCode=1
  console.log('\nBlocked preconditions:')
  for (const g of blocked) console.log(`  - ${g.id}: ${g.detail}`)
}
console.log('\nThis receipt proves preconditions only. It applies nothing, changes no flag,')
console.log('creates no deployment and writes no row. Production writes still require the')
console.log('owner authorization named in MASTER_ACTION_PLAN.md.')

const outFile = process.argv.slice(2).find((arg) => !arg.startsWith('--')) || 'live-readiness.json'
fs.writeFileSync(path.join(root, '.tools', 'current-production-backups', outFile), `${JSON.stringify({
  projectRef: identity.projectRef,
  ledger,
  absent,
  installation,
  controlledReceipts,
  installedPermissions,
  grants,
  facts,
  backup: newestBackup ? { file: newestBackup.file, mtime: newestBackup.mtime.toISOString() } : null,
  backupProof,
  gates,
}, null, 2)}\n`)
console.log(`\nwrote .tools/current-production-backups/${outFile}`)
