import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('production security boundary exposes only reviewed anonymous RPCs', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260810_security_boundary_hardening.sql', import.meta.url), 'utf8')

  for (const publicRpc of [
    'submit_order_request',
    'submit_order_request_v2',
    'submit_pasabuy_request',
    'validate_coupon',
  ]) {
    expect(sql).toContain(`'${publicRpc}'`)
  }

  expect(sql).toContain("p.prosecdef")
  expect(sql).toContain("revoke execute on function %s from public, anon")
  expect(sql).toContain('alter view public.products_with_margins set (security_invoker = true)')
  expect(sql).toContain('revoke all on public.products_with_margins from anon, authenticated')
  expect(sql).toContain('alter function public.process_audit_log() set search_path = public, pg_temp')
})

test('deprecated mutation RPCs cannot bypass canonical inventory workflows', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260810_deprecated_rpc_lockdown.sql', import.meta.url), 'utf8')

  expect(sql).toContain('Direct product stock deduction is disabled. Use order reservations and fulfillment.')
  for (const signature of [
    'decrement_stock(text,integer)',
    'deduct_stock_fefo(text,integer)',
    'mark_order_line_packed(uuid)',
    'replace_product_batches(text,jsonb,text)',
    'add_consignment_item(uuid,text,text,date,integer)',
    'record_consignment_scan(uuid,text,text)',
  ]) {
    expect(sql).toContain(`revoke all on function public.${signature} from public, anon, authenticated`)
  }

  expect(sql).toContain('revoke all on function public.process_audit_log() from public, anon, authenticated')
})
