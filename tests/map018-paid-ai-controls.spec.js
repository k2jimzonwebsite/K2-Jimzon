import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  AI_SPEND_CONTROL_ACTION, AI_SPEND_CONTROL_CONFIRMATIONS,
  dollarsToMicros, microsToDollars, normalizeAiSpendControls, paidPathCanRun,
} from '../src/lib/aiSpendControls.js'
import { validateAiSpendControlsCommand } from '../server/admin-bff/ai-spend-controls.js'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')
const actorPayload = {
  paidPathEnabled: false,
  providerModelSnapshot: null,
  perProductUsdMicros: null,
  perSessionUsdMicros: null,
  monthlyUsdMicros: null,
  contentConfirmationRequired: true,
  imageConfirmationRequired: true,
  manualFallbackRequired: true,
  expectedVersion: 1,
  reason: 'Keep the paid path disabled until owner approval.',
  confirmation: AI_SPEND_CONTROL_CONFIRMATIONS.SAVE,
}

test.describe('MAP-018 deliberate paid-AI spend controls', () => {
  test('defaults fail closed and converts bounded dollar values without floating-point spend state', () => {
    const defaults = normalizeAiSpendControls()
    expect(defaults.paidPathEnabled).toBe(false)
    expect(defaults.perProductUsdMicros).toBeNull()
    expect(defaults.contentConfirmationRequired).toBe(true)
    expect(dollarsToMicros('0.123456')).toBe(123456)
    expect(microsToDollars(123456)).toBe('0.123456')
    expect(microsToDollars(2000000)).toBe('2')
    expect(dollarsToMicros('')).toBeNull()
    expect(paidPathCanRun(defaults)).toBe(false)
  })

  test('requires exact SuperAdmin control payload, hard-cap ordering, and typed enable confirmation', () => {
    expect(validateAiSpendControlsCommand({ action: AI_SPEND_CONTROL_ACTION, payload: actorPayload })).toEqual({
      action: AI_SPEND_CONTROL_ACTION, payload: actorPayload,
    })
    const enabled = {
      ...actorPayload,
      paidPathEnabled: true,
      providerModelSnapshot: 'openai/model@owner-approved-2026-08-30',
      perProductUsdMicros: 1000000,
      perSessionUsdMicros: 2000000,
      monthlyUsdMicros: 10000000,
      confirmation: AI_SPEND_CONTROL_CONFIRMATIONS.ENABLE,
    }
    expect(validateAiSpendControlsCommand({ action: AI_SPEND_CONTROL_ACTION, payload: enabled }).payload).toMatchObject({
      paidPathEnabled: true, perProductUsdMicros: 1000000,
    })
    expect(() => validateAiSpendControlsCommand({ action: AI_SPEND_CONTROL_ACTION, payload: { ...enabled, confirmation: AI_SPEND_CONTROL_CONFIRMATIONS.SAVE } })).toThrow('AI_SPEND_CONTROLS_CONFIRMATION_REQUIRED')
    expect(() => validateAiSpendControlsCommand({ action: AI_SPEND_CONTROL_ACTION, payload: { ...enabled, perProductUsdMicros: 3000000 } })).toThrow('AI_SPEND_CONTROLS_LIMIT_REQUIRED')
    expect(() => validateAiSpendControlsCommand({ action: AI_SPEND_CONTROL_ACTION, payload: { ...actorPayload, contentConfirmationRequired: false } })).toThrow('AI_SPEND_CONTROLS_INVALID')
    expect(() => validateAiSpendControlsCommand({ action: AI_SPEND_CONTROL_ACTION, payload: { ...actorPayload, perSessionUsdMicros: 1.5 } })).toThrow('AI_SPEND_CONTROLS_INVALID')
  })

  test('prepared server and database boundary are SuperAdmin-only, signed, audited, and manual-fallback safe', async () => {
    const [server, staff, security, migration, runtime, ui, service] = await Promise.all([
      read('server/admin-bff/ai-spend-controls.js'),
      read('server/admin-bff/staff-access.js'),
      read('server/admin-bff/security.js'),
      read('supabase/migrations/20260830_paid_ai_spend_controls.sql'),
      read('src/context/useAdminAuthRuntime.js'),
      read('src/views/admin/StaffPermissionManager.jsx'),
      read('src/services/adminBffService.js'),
    ])
    expect(server).toContain('isAiSpendControlsConfigured')
    expect(server).toContain('AI_SPEND_CONTROL_CONFIRMATIONS.ENABLE')
    expect(staff).toContain("command.action === 'ai_spend_controls_update'")
    expect(staff).toContain("authorized.identity.role !== 'SuperAdmin'")
    expect(staff).toContain('execute_admin_ai_spend_controls_command_v1')
    expect(security).toContain("new Set(['Admin', 'Staff', 'SuperAdmin'])")
    expect(migration).toContain("alter type public.user_role add value if not exists 'SuperAdmin'")
    expect(migration).toContain('k2_private.ai_spend_control_config')
    expect(migration).toContain('k2_private.ai_spend_control_events')
    expect(migration).toContain("role::text='SuperAdmin'")
    expect(migration).toContain('verify_admin_bff_request')
    expect(migration).toContain('K2_AI_SPEND_LIMIT_REQUIRED')
    expect(migration).toContain("'admin_mfa_replacement_requested'")
    expect(migration).toContain("'inbox_send_reply'")
    expect(migration).toContain("'product_knowledge_save'")
    expect(migration).toContain('admin_request_rate_buckets')
    expect(migration).not.toMatch(/VITE_OPENAI|VITE_.*OPENAI/i)
    expect(runtime).toContain("role === 'SuperAdmin'")
    expect(ui).toContain('Paid AI intake spending controls')
    expect(ui).toContain('Only a SuperAdmin may change these limits')
    expect(ui).toContain('K2 Product Content → Smart Paste → K2 Product Image Studio')
    expect(service).toContain('AI_SPEND_CONTROLS_UNAVAILABLE')
  })
})
