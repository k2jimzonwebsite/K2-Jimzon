import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.describe('MAP-017 stock PUBLIC-grant revocation contract', () => {
  let migration
  let rollback
  let setup
  let assertions
  let readOnlyCheck

  test.beforeAll(async () => {
    migration = await readFile(
      new URL('../supabase/migrations/20260925_map017_stock_public_grant_revocation.sql', import.meta.url),
      'utf8',
    )
    rollback = await readFile(
      new URL('../supabase/migrations/20260925_map017_stock_public_grant_revocation_rollback.sql', import.meta.url),
      'utf8',
    )
    setup = await readFile(
      new URL('../supabase/tests/map017_stock_grant_revocation_setup.sql', import.meta.url),
      'utf8',
    )
    assertions = await readFile(
      new URL('../supabase/tests/map017_stock_grant_revocation_assertions.sql', import.meta.url),
      'utf8',
    )
    readOnlyCheck = await readFile(
      new URL('../supabase/map017_stock_public_grant_verification.sql', import.meta.url),
      'utf8',
    )
  })

  test('correction revokes only the PUBLIC grant and keeps named access', async () => {
    expect(migration).toMatch(/revoke execute on function public\.get_public_product_stock\(\) from public/i)
    expect(migration).toContain('PREFLIGHT_FAILED')
    expect(migration).toContain('POSTFLIGHT_FAILED')
    // Preflight refuses to revoke while a named grant is missing.
    expect(migration).toMatch(/has_function_privilege\('anon'[\s\S]+PREFLIGHT_FAILED/)
    expect(migration).toMatch(/has_function_privilege\('authenticated'[\s\S]+PREFLIGHT_FAILED/)
    // Postflight proves PUBLIC is gone and named grants survived.
    expect(migration).toMatch(/has_function_privilege\('public'[\s\S]+POSTFLIGHT_FAILED/)
    // The correction never grants, revokes from, or recreates the function.
    expect(migration).not.toMatch(/grant execute on function public\.get_public_product_stock\(\) to/i)
    expect(migration).not.toContain('create or replace function public.get_public_product_stock()')
    expect(migration).toMatch(/^begin;/im)
    expect(migration).toMatch(/commit;\s*$/i)
  })

  test('rollback restores only the prior PUBLIC grant state', async () => {
    expect(rollback).toMatch(/grant execute on function public\.get_public_product_stock\(\) to public/i)
    expect(rollback).not.toMatch(/ to anon| to authenticated/i)
    expect(rollback).not.toContain('revoke')
  })

  test('rehearsal fixture mimics the live finding and asserts the envelope', async () => {
    expect(setup).toMatch(/grant execute on function public\.get_public_product_stock\(\) to public, anon, authenticated/i)
    expect(assertions).toMatch(/has_function_privilege\('public'[\s\S]+REHEARSAL_FAILED/)
    expect(assertions).toMatch(/has_function_privilege\('anon'[\s\S]+REHEARSAL_FAILED/)
    expect(assertions).toMatch(/has_function_privilege\('authenticated'[\s\S]+REHEARSAL_FAILED/)
    expect(assertions).toContain('select * from public.get_public_product_stock()')
  })

  test('read-only repository check detects the broader grant without writes', async () => {
    expect(readOnlyCheck).toContain('stock_public_execute_absent')
    expect(readOnlyCheck).not.toMatch(/\b(revoke|grant|insert|update|delete|create|drop|alter)\b/i)
  })
})
