import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test.describe('Admin access, MFA status, and permanent product deletion contracts', () => {
  test('new Auth identities default to Customer and the Admin runtime accepts only canonical staff roles', async () => {
    const schema = await read('supabase/migrations/20260723_master_security_rls.sql')
    const runtime = await read('src/context/useAdminAuthRuntime.js')

    expect(schema).toMatch(/INSERT INTO public\.user_profiles[\s\S]+?'Customer'/)
    expect(runtime).toContain("const STAFF_ROLES = ['Admin', 'Staff']")
    expect(runtime).toContain('STAFF_ROLES.includes(role)')
  })

  test('MFA status is read from verified provider factors and remains visible after enrollment', async () => {
    const view = await read('src/views/admin/StaffPermissionManager.jsx')

    expect(view).toContain('supabase.auth.mfa.listFactors()')
    expect(view).toContain("setMfaStatus((data?.totp?.length || 0) > 0 ? 'verified' : 'unavailable')")
    expect(view).toContain("mfaStatus === 'verified' ? 'Active' : 'Not active'")
    expect(view).toContain('Authenticator verified and required for privileged access.')
    expect(view).toContain('role="status" aria-live="polite"')
  })

  test('Delete PIN secrets move to a private schema and every public function is Admin+AAL2 guarded', async () => {
    const sql = await read('supabase/migrations/20260815_harden_admin_delete_pin.sql')

    expect(sql).toContain('k2_private.staff_delete_credentials')
    expect(sql).toContain("role::text='Admin'")
    expect(sql).toContain("coalesce(auth.jwt()->>'aal','') <> 'aal2'")
    expect(sql).not.toContain('set search_path = public')
    expect(sql).toContain("drop column if exists delete_pin_hash")
    expect(sql).toContain('drop function if exists public.verify_delete_pin(text)')
    expect(sql).toContain('revoke all on table k2_private.staff_delete_credentials from public, anon, authenticated')
  })

  test('deletion is bounded, retry-safe, audited, throttled, and refuses operational history', async () => {
    const sql = await read('supabase/migrations/20260815_harden_admin_delete_pin.sql')
    const cleanup = await read('supabase/migrations/20260815_remove_legacy_delete_products_rpc.sql')
    const modal = await read('src/views/admin/DeleteProductsModal.jsx')

    expect(sql).toContain('k2_private.product_delete_operations')
    expect(sql).toContain("cardinality(p_skus) > 50")
    expect(sql).toContain("char_length(trim(coalesce(p_reason,''))) < 8")
    expect(sql).toContain("now()+interval '15 minutes'")
    expect(sql).toContain("'code','PRODUCT_HAS_HISTORY'")
    expect(sql).toContain('insert into public.product_deletions')
    expect(sql).toContain("message='K2_DELETE_CLIENT_UPGRADE_REQUIRED'")
    expect(cleanup).toContain('drop function if exists public.delete_products_with_pin(text[],text)')
    expect(modal).toContain("supabase.rpc('delete_products_with_pin_v2'")
    expect(modal).toContain('p_request_id: requestIdRef.current')
    expect(modal).toContain('Reason for permanent deletion')
    expect(modal).toContain('Mark it Discontinued instead')
  })
})
