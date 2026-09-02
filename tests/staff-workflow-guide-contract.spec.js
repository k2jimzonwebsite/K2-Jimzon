import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  PROCEDURE_STATUS,
  STAFF_GUIDE_META,
  STAFF_PROCEDURES,
} from '../src/views/admin/staffProcedureRegistry.js'

const REQUIRED_COVERAGE = [
  'product.create', 'product.edit', 'product.archive',
  'product.intake.manual', 'product.intake.paid_api', 'product.intake.fallback',
  'inventory.first.flight', 'inventory.first.supplier', 'inventory.first.adjustment',
  'inventory.receive', 'inventory.recount', 'inventory.reconcile', 'inventory.transfer',
  'inventory.quarantine', 'inventory.clear', 'inventory.write_off', 'inventory.edit',
  'product.publish', 'product.unpublish',
  'order.exception', 'payment.exception', 'packing.exception', 'delivery.exception',
  'pasabuy', 'wholesale', 'customer.messages', 'staff.security', 'ai.paid_controls', 'sales.compute',
  'channel.readiness', 'backup', 'incident', 'rollback', 'integration.unavailable',
]

test('staff guide registry is a versioned draft with one authoritative source', () => {
  expect(STAFF_GUIDE_META.version).toMatch(/^2026-08-30-draft\./)
  expect(STAFF_GUIDE_META.approvalStatus).toBe('DRAFT — NOT LOCKED')
  expect(STAFF_GUIDE_META.effectiveDate).toBeNull()
  expect(STAFF_GUIDE_META.authority).toBe('K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md')
  expect(STAFF_GUIDE_META.advisoryOnly).toBe(true)
})

test('every required staff operation is covered by a complete procedure contract', () => {
  const covered = new Set(STAFF_PROCEDURES.flatMap(procedure => procedure.covers))
  for (const operation of REQUIRED_COVERAGE) {
    expect(covered.has(operation), `missing staff procedure coverage for ${operation}`).toBe(true)
  }

  for (const procedure of STAFF_PROCEDURES) {
    expect(procedure.id).toBeTruthy()
    expect(procedure.title).toBeTruthy()
    expect(Object.values(PROCEDURE_STATUS)).toContain(procedure.status)
    expect(procedure.authorizedRoles.length, `${procedure.id}: roles`).toBeGreaterThan(0)
    expect(procedure.prerequisites.length, `${procedure.id}: prerequisites`).toBeGreaterThan(0)
    expect(procedure.entryPoint, `${procedure.id}: entry point`).toBeTruthy()
    expect(procedure.steps.length, `${procedure.id}: steps`).toBeGreaterThan(0)
    expect(procedure.validationsAndBlockers.length, `${procedure.id}: validations`).toBeGreaterThan(0)
    expect(procedure.expectedState, `${procedure.id}: expected state`).toBeTruthy()
    expect(procedure.forbiddenShortcuts.length, `${procedure.id}: forbidden shortcuts`).toBeGreaterThan(0)
    expect(procedure.recovery.length, `${procedure.id}: recovery`).toBeGreaterThan(0)
    expect(procedure.sources.length, `${procedure.id}: sources`).toBeGreaterThan(0)
    expect(procedure.version).toBe(STAFF_GUIDE_META.version)
    expect(procedure.effectiveDate).toBe(STAFF_GUIDE_META.effectiveDate)
  }
})

test('unavailable work names the blocker and never invents a workaround', () => {
  const unavailable = STAFF_PROCEDURES.filter(procedure => procedure.status === PROCEDURE_STATUS.UNAVAILABLE)
  expect(unavailable.length).toBeGreaterThan(0)
  for (const procedure of unavailable) {
    expect(procedure.blocker, `${procedure.id}: exact blocker`).toBeTruthy()
    expect(procedure.expectedState).toMatch(/no canonical|no provider|remains unchanged|no operational/i)
  }

  const paidApi = STAFF_PROCEDURES.find(procedure => procedure.covers.includes('product.intake.paid_api'))
  expect(paidApi.status).toBe(PROCEDURE_STATUS.UNAVAILABLE)
  expect(paidApi.blocker).toMatch(/owner confirmation|spend|activation/i)
  expect(JSON.stringify(paidApi)).toMatch(/manual.*K2 Product Content.*K2 Product Image Studio/is)
})

test('the daily guide exposes the complete procedure register', async () => {
  const startHere = await readFile(new URL('../src/views/admin/StartHereGuide.jsx', import.meta.url), 'utf8')
  const admin = await readFile(new URL('../src/views/admin/Admin.jsx', import.meta.url), 'utf8')
  expect(startHere).toContain('Browse procedures')
  expect(startHere).toContain('onOpenOperationsGuide')
  expect(admin).toContain('onOpenOperationsGuide={() => setShowAiCopilot(true)}')
})
