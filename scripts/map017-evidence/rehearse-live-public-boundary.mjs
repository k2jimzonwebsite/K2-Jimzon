// MAP-017: execute the exact public-write-boundary migration against production
// inside one explicit transaction, run its postflight, and always roll it back.
// A separate read-only query then proves sampled vulnerable baseline state was
// restored. No credential values or row data are printed.
import fs from 'node:fs'

if (!process.argv.includes('--confirm-rollback-only')) {
  console.error('REFUSED: pass --confirm-rollback-only to run the production rollback rehearsal')
  process.exit(2)
}

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line.trim())
  if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
}

const accessToken = env.SUPABASE_ACCESS_TOKEN
if (!accessToken) {
  console.error('REFUSED: SUPABASE_ACCESS_TOKEN is missing from .env.local')
  process.exit(2)
}

const projectRef = 'pixplcjqivlfflickobf'
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`
const read = (path) => fs.readFileSync(path, 'utf8').trim()
const preflight = read('supabase/map017_public_write_boundary_preflight.sql')
const migration = read('supabase/migrations/20260812_map017_public_write_boundary_hardening.sql')
const postflight = read('supabase/map017_public_write_boundary_postflight.sql')

const transactionMarkers = migration.match(/\b(begin|commit)\s*;/gi) ?? []
const migrationSql = migration.replace(/^(?:\s*--[^\n]*(?:\r?\n|$))+/, '').trim()
if (
  transactionMarkers.length !== 2 ||
  !/^begin\s*;/i.test(migrationSql) ||
  !/commit\s*;\s*$/i.test(migrationSql)
) {
  console.error('REFUSED: migration must contain exactly one outer BEGIN/COMMIT pair')
  process.exit(2)
}

const migrationBody = migrationSql
  .replace(/^begin\s*;/i, '')
  .replace(/commit\s*;\s*$/i, '')

const query = [
  'begin;',
  preflight,
  migrationBody,
  postflight,
  'set local role anon;',
  'select count(*) from public.v_product_stock_from_batches;',
  'reset role;',
  'rollback;',
].join('\n\n')

const runQuery = async (sql, readOnly) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql, read_only: readOnly }),
  })
  const body = await response.json().catch(() => null)
  if (response.status !== 200 && response.status !== 201) {
    const safeMessage = typeof body?.message === 'string'
      ? body.message.replace(/(?:eyJ|sb_(?:secret|publishable)_)[A-Za-z0-9._-]+/g, '[REDACTED]')
      : 'Provider query failed'
    throw new Error(`HTTP ${response.status}: ${safeMessage.slice(0, 500)}`)
  }
  return body
}

await runQuery(query, false)
console.log('Migration preflight, exact migration, postflight, and anonymous stock read passed inside an explicit rollback transaction.')

const restorationSql = `
select jsonb_build_object(
  'legacy_storage_upload_policy', exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Anyone can upload'
  ),
  'products_old_anon_select', has_table_privilege('anon', 'public.products_old', 'select'),
  'products_old_realtime', exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'products_old'
  ),
  'brands_public_policy', exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brands'
      and policyname = 'Admin Full Access'
  ),
  'storage_size_limit_restored', exists (
    select 1 from storage.buckets
    where id = 'product-images' and file_size_limit is null
  ),
  'storage_mime_limit_restored', exists (
    select 1 from storage.buckets
    where id = 'product-images' and allowed_mime_types is null
  ),
  'public_stock_grant_absent', not has_table_privilege(
    'anon', 'public.v_product_stock_from_batches', 'select'
  ),
  'public_stock_function_absent', to_regprocedure('public.get_public_product_stock()') is null,
  'postgres_anon_table_default_restored', exists (
    select 1
    from pg_default_acl d
    join pg_roles owner_role on owner_role.oid = d.defaclrole
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) a
    left join pg_roles grantee_role on grantee_role.oid = a.grantee
    where n.nspname = 'public'
      and owner_role.rolname = 'postgres'
      and coalesce(grantee_role.rolname, 'public') = 'anon'
      and d.defaclobjtype = 'r'
      and a.privilege_type = 'INSERT'
  )
) as restoration;
`

const restorationResult = await runQuery(restorationSql, true)
const row = Array.isArray(restorationResult) ? restorationResult[0] : restorationResult
const restoration = row?.restoration ?? row?.jsonb_build_object ?? row
const failed = Object.entries(restoration ?? {}).filter(([, value]) => value !== true)
if (failed.length > 0 || Object.keys(restoration ?? {}).length !== 9) {
  console.error(`ROLLBACK RESTORATION FAILED: ${failed.map(([key]) => key).join(', ') || 'incomplete result'}`)
  process.exit(1)
}

console.log('Rollback restoration passed (9/9 sampled baseline checks).')
