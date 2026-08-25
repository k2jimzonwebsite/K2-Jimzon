import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  parseSchemaExport,
  buildExpectedRepositorySchema,
  compareSchemaTruth,
} from '../scripts/schema-truth-core.mjs'

test.describe('MAP-017 Authorization and Boundary Invariant Suite', () => {
  let hardeningMigration
  let lockdownMigration
  let inviteMigration
  let postflight
  let cleanSchemaExport

  test.beforeAll(async () => {
    hardeningMigration = await readFile(
      new URL('../supabase/migrations/20260812_map017_public_write_boundary_hardening.sql', import.meta.url),
      'utf8',
    )
    lockdownMigration = await readFile(
      new URL('../supabase/migrations/20260810_deprecated_rpc_lockdown.sql', import.meta.url),
      'utf8',
    )
    inviteMigration = await readFile(
      new URL('../supabase/migrations/20260814_invite_staff_operation_boundary.sql', import.meta.url),
      'utf8',
    )
    postflight = await readFile(
      new URL('../supabase/map017_public_write_boundary_postflight.sql', import.meta.url),
      'utf8',
    )
    const rawClean = await readFile(
      new URL('./fixtures/schema-truth-exports/fabricated-clean-sample.json', import.meta.url),
      'utf8',
    )
    cleanSchemaExport = parseSchemaExport(rawClean)
  })

  test('1. anon role direct DML is revoked across all sensitive and catalog tables', () => {
    const sensitiveRelations = [
      'brands',
      'categories',
      'warehouses',
      'product_drafts',
      'products_old',
      'channel_credentials',
      'staff_allocations',
    ]

    for (const rel of sensitiveRelations) {
      expect(hardeningMigration).toContain(`revoke all on table public.${rel} from anon, authenticated`)
    }

    // Anon only receives select on public catalog tables
    expect(hardeningMigration).toContain('grant select on table public.brands, public.categories to anon, authenticated')
  })

  test('1b. future repository-owned public objects fail closed', () => {
    expect(hardeningMigration).toContain('alter default privileges for role postgres in schema public')
    expect(postflight).toContain('unsafe public default privileges remain')
  })

  test('2. blanket public write policies are dropped and replaced with is_staff() enforcement', () => {
    // Blanket policies dropped
    expect(hardeningMigration).toContain('drop policy if exists "Admin Full Access" on public.brands')
    expect(hardeningMigration).toContain('drop policy if exists "Admin Full Access" on public.categories')
    expect(hardeningMigration).toContain('drop policy if exists "Admin Full Access" on public.warehouses')
    expect(hardeningMigration).toContain('drop policy if exists "Staff manage product_drafts" on public.product_drafts')

    // Replaced with staff-scoped policies
    expect(hardeningMigration).toContain('create policy brands_staff_manage on public.brands')
    expect(hardeningMigration).toContain('create policy categories_staff_manage on public.categories')
    expect(hardeningMigration).toContain('create policy warehouses_staff_manage on public.warehouses')
    expect(hardeningMigration).toContain('create policy product_drafts_staff_manage on public.product_drafts')

    // Every manage policy checks public.is_staff()
    expect(hardeningMigration).toMatch(/brands_staff_manage[\s\S]+public\.is_staff\(\)/)
    expect(hardeningMigration).toMatch(/categories_staff_manage[\s\S]+public\.is_staff\(\)/)
    expect(hardeningMigration).toMatch(/warehouses_staff_manage[\s\S]+public\.is_staff\(\)/)
    expect(hardeningMigration).toMatch(/product_drafts_staff_manage[\s\S]+public\.is_staff\(\)/)
  })

  test('3. operational views enforce security_invoker to prevent RLS bypass by anon/unauthorized roles', () => {
    expect(hardeningMigration).toContain('alter view public.v_channel_catalog_readiness set (security_invoker = true)')
    expect(hardeningMigration).toContain('alter view public.v_expiring_batches set (security_invoker = true)')
    expect(hardeningMigration).toContain('revoke all on table public.v_channel_catalog_readiness from anon, authenticated')
    expect(hardeningMigration).toContain('revoke all on table public.v_expiring_batches from anon, authenticated')
    expect(hardeningMigration).toContain('grant select on table public.v_channel_catalog_readiness to authenticated')
    expect(hardeningMigration).toContain('grant select on table public.v_expiring_batches to authenticated')
    expect(hardeningMigration).toContain('create or replace function public.get_public_product_stock()')
    expect(hardeningMigration).toMatch(/get_public_product_stock\(\)[\s\S]+security definer[\s\S]+set search_path = ''/i)
    expect(hardeningMigration).toContain('grant execute on function public.get_public_product_stock() to anon, authenticated')
    expect(hardeningMigration).toContain('grant select on table public.v_product_stock_from_batches to anon, authenticated')
    expect(hardeningMigration).toContain("where p.status in ('Live', 'Active', 'Unlisted')")
    expect(hardeningMigration).not.toContain('grant select on table public.product_batches to anon')
  })

  test('4. deprecated stock and consignment mutation RPCs are completely revoked from client roles', () => {
    const revokedSignatures = [
      'decrement_stock(text,integer)',
      'deduct_stock_fefo(text,integer)',
      'mark_order_line_packed(uuid)',
      'replace_product_batches(text,jsonb,text)',
      'add_consignment_item(uuid,text,text,date,integer)',
      'record_consignment_scan(uuid,text,text)',
    ]

    for (const sig of revokedSignatures) {
      expect(lockdownMigration).toContain(`revoke all on function public.${sig} from public, anon, authenticated`)
    }
  })

  test('5. storage policies drop public permissive writes and enforce file size and MIME allowlists', () => {
    expect(hardeningMigration).toContain('drop policy if exists "Anyone can upload" on storage.objects')
    expect(hardeningMigration).toContain('drop policy if exists "Anyone can update" on storage.objects')
    expect(hardeningMigration).toContain('drop policy if exists "Anyone can delete" on storage.objects')
    expect(hardeningMigration).toContain('file_size_limit = 10485760')
    expect(hardeningMigration).toContain("'image/jpeg', 'image/png', 'image/webp', 'image/avif'")
  })

  test('6. realtime publication excludes unmanaged legacy tables and scopes sensitive events', () => {
    expect(hardeningMigration).toContain('alter publication supabase_realtime drop table public.products_old')
  })

  test('7. role management requires is_admin(), AAL2 assurance, and protects final Admin from demotion', () => {
    expect(inviteMigration).toContain('create or replace function public.set_user_role')
    expect(inviteMigration).toContain('if not public.is_admin() then raise exception')
    expect(inviteMigration).toContain("if coalesce(auth.jwt()->>'aal', '') <> 'aal2' then raise exception 'AAL2 required'")
    expect(inviteMigration).toContain("if v_admin_count <= 1 then raise exception 'The final Admin cannot be demoted'")
  })

  test('8. security definer functions enforce safe search_path to prevent path hijacking', () => {
    expect(inviteMigration).toMatch(/create or replace function public\.claim_staff_invitation_operation[\s\S]+set search_path = ''/)
    expect(inviteMigration).toMatch(/create or replace function public\.complete_staff_invitation_operation[\s\S]+set search_path = ''/)
    expect(inviteMigration).toMatch(/create or replace function public\.release_staff_invitation_operation[\s\S]+set search_path = ''/)
    expect(inviteMigration).toMatch(/create or replace function public\.set_user_role[\s\S]+set search_path = ''/)
  })

  test('9. schema-truth engine validates complete authorization matrix across all roles and resources', () => {
    const expected = buildExpectedRepositorySchema()
    const diff = compareSchemaTruth(cleanSchemaExport, expected)

    expect(diff.clean).toBe(true)
    expect(diff.criticalCount).toBe(0)
    expect(diff.summary.status).toBe('CONFORMANT')
  })

  test('10. reviewed live RPC contracts fail closed when admin or AAL2 guard signals disappear', () => {
    const missingAdminGuard = structuredClone(cleanSchemaExport)
    missingAdminGuard.functions['public.set_user_role(uuid,text)'].references_is_admin = false
    missingAdminGuard.functions['public.set_user_role(uuid,text)'].references_aal2 = false

    const diff = compareSchemaTruth(missingAdminGuard, buildExpectedRepositorySchema())
    const issueTypes = diff.issues.map((issue) => issue.type)

    expect(issueTypes).toContain('FUNCTION_AUTHORIZATION_GUARD_MISSING')
    expect(issueTypes).toContain('FUNCTION_AAL2_GUARD_MISSING')
  })
})
