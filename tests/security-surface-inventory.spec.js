import { expect, test } from '@playwright/test'
import {
  deriveSqlEffectiveFunctionAccess,
  evaluateSqlFunctionAccessPolicy,
  scanSecuritySurfaceText, scanSqlSecuritySurfaceText,
  summarizeSecuritySurfaces, summarizeSqlSecuritySurfaces,
} from '../scripts/security-surface-inventory-core.mjs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

test('security-surface inventory finds literal and dynamic Supabase/API operations with locations', () => {
  const source = [
    "await client.from('orders').select('id')",
    "await client.rpc(\n  'confirm_order',\n  payload\n)",
    "await authorized.client.storage.from('private-evidence').remove([path])",
    "supabase.auth.getUser()",
    "supabase.channel(`orders:${accountId}`)",
    "await client.from(dynamicTable).select('*')",
    "fetch('/api/storefront/order')",
  ].join('\n')
  const operations = scanSecuritySurfaceText(source, 'fixture.js')
  expect(operations).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: 'table', target: 'orders', line: 1, dynamic: false }),
    expect.objectContaining({ kind: 'rpc', target: 'confirm_order', line: 2, dynamic: false }),
    expect.objectContaining({ kind: 'storage', target: 'private-evidence', dynamic: false }),
    expect.objectContaining({ kind: 'auth', target: 'getUser', dynamic: false }),
    expect.objectContaining({ kind: 'realtime', target: 'orders:${accountId}', dynamic: true }),
    expect.objectContaining({ kind: 'table', target: '[dynamic]', dynamic: true }),
    expect.objectContaining({ kind: 'api_request', target: '/api/storefront/order', dynamic: false }),
  ]))
  expect(summarizeSecuritySurfaces(operations)).toMatchObject({
    api_request: 1, auth: 1, realtime: 1, rpc: 1, storage: 1, table: 2,
  })
})

test('security-surface inventory classifies SQL functions, grants, jobs, publications, and Storage policies', () => {
  const sql = `
    create or replace function public.safe_rpc(p_id uuid)
    returns boolean language plpgsql security definer set search_path = public, pg_temp
    as $$ begin return true; end; $$;
    create function unsafe_trigger() returns trigger language plpgsql security definer
    as $$ begin return new; end; $$;
    revoke all on function public.safe_rpc(uuid) from public, anon;
    grant execute on function public.safe_rpc(uuid) to authenticated;
    create or replace function public.alias_rpc(p_count int)
    returns integer language sql as $$ select p_count $$;
    revoke all on function public.alias_rpc(integer) from public;
    alter function public.unsafe_trigger() set search_path = public, pg_temp;
    select cron.schedule('nightly-reconcile', '0 2 * * *', 'select 1');
    alter publication supabase_realtime add table public.orders;
    create policy evidence_read on storage.objects for select using (true);
  `
  const inventory = scanSqlSecuritySurfaceText(sql, 'fixture.sql')
  expect(inventory.definitions).toHaveLength(3)
  expect(inventory.definitions[0]).toMatchObject({
    signature: 'public.safe_rpc(uuid)', securityDefiner: true, fixedSearchPath: true,
  })
  expect(inventory.grants).toHaveLength(3)
  expect(inventory.jobs[0].name).toBe('nightly-reconcile')
  expect(inventory.publications[0]).toMatchObject({ action: 'add', table: 'public.orders' })
  expect(inventory.policies[0]).toMatchObject({ table: 'storage.objects' })
  expect(summarizeSqlSecuritySurfaces(inventory)).toMatchObject({
    uniqueFunctionSignatures: 3,
    functionSearchPathHardeningEvents: 1,
    effectiveSecurityDefinerWithoutFixedSearchPath: 0,
    effectiveFunctionsWithPublicExecute: 1,
    effectiveFunctionsWithAnonExecute: 0,
    effectiveFunctionsWithAuthenticatedExecute: 1,
    scheduledJobs: 1,
    publicationChanges: 1,
    storagePolicyDefinitions: 1,
  })
  expect(deriveSqlEffectiveFunctionAccess(inventory)).toEqual(expect.arrayContaining([
    { signature: 'public.alias_rpc(integer)', roles: [] },
    { signature: 'public.safe_rpc(uuid)', roles: ['authenticated'] },
    { signature: 'public.unsafe_trigger()', roles: ['public'] },
  ]))
  expect(evaluateSqlFunctionAccessPolicy(deriveSqlEffectiveFunctionAccess(inventory), [])).toEqual({
    publicFunctions: ['public.unsafe_trigger()'],
    anonFunctions: [],
    unexpectedAnonFunctions: [],
    missingExpectedAnonFunctions: [],
  })
})

test('production security audit rejects wildcard CORS templates', () => {
  const output = execFileSync(process.execPath, [
    fileURLToPath(new URL('../scripts/audit-security-surfaces.mjs', import.meta.url)),
    '--json',
  ], { encoding: 'utf8' })
  const report = JSON.parse(output)
  expect(report.wildcardCors).toEqual([])
})
