// Exact loopback restore only. All installation, fixture and command writes roll back.
import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { signedRpcArguments } from '../server/storefront-bff/security.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const database = 'k2_current_restore_20260929'
const dataDirectory = path.join(root, '.tools/current-restore-20260929-pg-data').replaceAll('\\', '/')
const prior = JSON.parse(fs.readFileSync(path.join(root,
  'docs/evidence/20260930-guest-continuity-rehearsal/local-dependencies-receipt.json'), 'utf8'))
const sources = ['supabase/migrations/20260829_channel_vocabulary_and_shops.sql',
  'supabase/migrations/20260822_admin_channel_readiness_boundary.sql',
  ...prior.dependencyManifest.map(item => item.path)]
if (sources.length !== 20 || new Set(sources).size !== 20
    || sources.some(file => !/^supabase\/[a-zA-Z0-9_/-]+\.sql$/.test(file))) throw new Error('INSTALLATION_ORDER_INVALID')
const manifest = sources.map(file => {
  const sql = fs.readFileSync(path.join(root, file), 'utf8')
  return { path: file, sha256: createHash('sha256').update(sql).digest('hex'), sql }
})
const installation = manifest.map(({ sql }) => sql
  .replace(/^(begin(?: transaction read only)?|commit|rollback);\r?$/gmi, '')
  .replace(/^\\set ON_ERROR_STOP on\r?$/gm, '')).join('\n')
// These unapplied Admin migrations replace the verifier later. Rehearse their
// exact verifier bodies here; this does not claim their whole migrations pass.
const verifierReplacements = ['20260830_paid_ai_spend_controls.sql', '20260831_marketplace_snapshot_staging.sql']
  .map(name => {
    const file = `supabase/migrations/${name}`
    const sql = fs.readFileSync(path.join(root, file), 'utf8')
    const bodies = [...sql.matchAll(/create or replace function k2_private\.verify_admin_bff_request\([\s\S]*?\r?\n\$\$;/g)]
    if (bodies.length !== 1) throw new Error('VERIFIER_REPLACEMENT_SCOPE_INVALID')
    return { path: file, sha256: createHash('sha256').update(sql).digest('hex'), sql: bodies[0][0] }
  })
const guestSecret = randomBytes(32)
process.env.K2_GUEST_BFF_SECRET = guestSecret.toString('base64')
const literal = value => `'${String(value).replaceAll("'", "''")}'`
const order = { customerName: 'Isolated Website fixture', email: 'website-fixture@example.test',
  phone: '', address: 'Isolated loopback test address', fulfillmentMethod: 'Courier delivery',
  note: '', items: [{ sku: 'LOCAL-WEBSITE-OFFER', quantity: 1 }], idempotencyKey: randomUUID(), couponCode: '' }
const rpc = payload => {
  const args = signedRpcArguments({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }, 'order', payload)
  return `public.submit_guest_order_v1(${['p_timestamp', 'p_nonce', 'p_payload_text', 'p_ip_hash', 'p_signature']
    .map(key => literal(args[key])).join(',')},null)`
}
const assertions = fs.readFileSync(path.join(root, 'supabase/tests/website_listing_assertions.sql'), 'utf8')
  .replaceAll('__GUEST_DENIED_CALL__', rpc(order))
  .replaceAll('__GUEST_ALLOWED_CALL__', rpc({ ...order, idempotencyKey: randomUUID() }))
const sql = `\\set ON_ERROR_STOP on
do $target$ begin
 if current_database() <> '${database}' or replace(current_setting('data_directory'),chr(92),'/') <> ${literal(dataDirectory)}
 then raise exception 'WRONG_LOCAL_RESTORE'; end if;
 if to_regprocedure('public.execute_admin_website_listing_command_v1(text,bigint,uuid,uuid,text,text)') is not null
 or to_regclass('k2_private.website_listing_events') is not null
 or exists(select 1 from public.products where sku like 'LOCAL-WEBSITE-%')
 then raise exception 'LOCAL_RESTORE_NOT_AT_BASELINE'; end if;
end $target$;
create temp table website_fixture_baseline as select
 (select count(*) from public.products) products,
 (select count(*) from public.channel_listings) listings,
 (select count(*) from public.order_requests) orders;
begin;
${installation}
${verifierReplacements.map(item => item.sql).join('\n')}
insert into k2_private.guest_bff_secrets(singleton,request_secret,contact_secret)
values(true,decode('${guestSecret.toString('hex')}','hex'),decode('${randomBytes(32).toString('hex')}','hex'))
on conflict(singleton) do update set request_secret=excluded.request_secret,contact_secret=excluded.contact_secret;
${assertions}
rollback;
select case when not exists(select 1 from public.products where sku like 'LOCAL-WEBSITE-%')
 and to_regprocedure('public.execute_admin_website_listing_command_v1(text,bigint,uuid,uuid,text,text)') is null
 and to_regprocedure('k2_private.require_website_order_items(jsonb)') is null
 and to_regclass('k2_private.website_listing_events') is null
 and (select count(*) from public.products)=(select products from website_fixture_baseline)
 and (select count(*) from public.channel_listings)=(select listings from website_fixture_baseline)
 and (select count(*) from public.order_requests)=(select orders from website_fixture_baseline)
 then 'WEBSITE_LISTING_ROLLBACK_PASS' else 'WEBSITE_LISTING_ROLLBACK_FAILED' end;
`
const generated = path.join(root, '.tools', `website-listing-rehearsal-${randomUUID()}.sql`)
fs.writeFileSync(generated, sql, 'utf8')
let result
try {
  result = spawnSync(path.join(root, '.tools/postgresql-17.11/runtime/pgsql/bin/psql.exe'),
    ['-X', '--no-psqlrc', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', '54388', '-U', 'postgres',
      '-d', database, '-f', generated], { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 60000,
      env: { ...process.env, PGSSLMODE: 'disable', PGCLIENTENCODING: 'UTF8' }, maxBuffer: 2 * 1024 * 1024 })
} finally { fs.unlinkSync(generated) }
if (result.error || result.status !== 0) throw new Error(String(result.stderr || result.error?.message).slice(-1800))
if (!result.stdout.includes('WEBSITE_LISTING_BEHAVIOR_PASS') || !result.stdout.includes('WEBSITE_LISTING_ROLLBACK_PASS')) {
  throw new Error('WEBSITE_LISTING_WITNESS_INCOMPLETE')
}
console.log('Website listing assignment, permission, eligibility and rollback checks passed on the exact loopback restore.')
const receipt = { capturedAt: new Date().toISOString(), target: `127.0.0.1:54388/${database}`,
  scope: 'Isolated rollback-only full guest dependency chain plus Website assignment; not live acceptance',
  dependencyManifest: manifest.map(({ path: file, sha256 }) => ({ path: file, sha256 })),
  laterVerifierReplacements: verifierReplacements.map(({ path: file, sha256 }) => ({ path: file, sha256 })),
  adminAllow: true, staffAndAal1Deny: true, replayAndConflict: true, staleVersionDenied: true,
  missingAndPausedAssignmentDenied: true, unpublishedAndUnreviewedDenied: true,
  unlistedDirectLinkAllowed: true, signedOrderDeniedBeforeIdentity: true, signedOrderAllowed: true,
  browserDirectWriteDenied: true, rollback: true }
fs.mkdirSync(path.join(root, 'docs/evidence/20261001-website-listing-boundary'), { recursive: true })
fs.writeFileSync(path.join(root, 'docs/evidence/20261001-website-listing-boundary/local-receipt.json'),
  `${JSON.stringify(receipt, null, 2)}\n`)
