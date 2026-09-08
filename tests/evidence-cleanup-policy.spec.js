import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  EVIDENCE_REGISTRATION_OUTCOME,
  classifyEvidenceRegistrationFailure,
  evidenceCleanupDecision,
} from '../server/admin-bff/evidence-cleanup-policy.js'

/**
 * MAP-028 H-013. Intake evidence is the proof a product was really received.
 * Deleting it is irreversible, so cleanup may only run when the failure proves
 * nothing registered AND this request is the one that created the object.
 *
 * These are source-derived failure paths. Nothing here reproduces against real
 * evidence, and no test deletes anything.
 */

test('a provider refusal is a proven non-registration', () => {
  const classification = classifyEvidenceRegistrationFailure({ message: 'K2_ADMIN_RATE_LIMITED: slow down' })
  expect(classification.outcome).toBe(EVIDENCE_REGISTRATION_OUTCOME.REFUSED)
  expect(classification.code).toBe('RATE_LIMITED')
  expect(classification.status).toBe(429)
})

test('an idempotency conflict proves an earlier registration succeeded', () => {
  const classification = classifyEvidenceRegistrationFailure({ message: 'K2_ADMIN_IDEMPOTENCY_CONFLICT' })
  expect(classification.outcome).toBe(EVIDENCE_REGISTRATION_OUTCOME.ALREADY_REGISTERED)
  expect(classification.code).toBe('IDEMPOTENCY_CONFLICT')
  expect(classification.status).toBe(409)
})

test('anything else leaves the outcome unknown', () => {
  for (const error of [
    { message: 'fetch failed' },
    { message: '' },
    {},
    null,
  ]) {
    const classification = classifyEvidenceRegistrationFailure(error)
    expect(classification.outcome).toBe(EVIDENCE_REGISTRATION_OUTCOME.UNKNOWN)
    expect(classification.status).toBe(503)
  }
})

test('only a proven non-registration of an object we created may be removed', () => {
  const refused = classifyEvidenceRegistrationFailure({ message: 'K2_ADMIN_RATE_LIMITED' })
  expect(evidenceCleanupDecision({ classification: refused, objectCreatedByThisRequest: true }).remove).toBe(true)

  // We overwrote or reused an existing object: it may be someone's registered
  // evidence, so it is not ours to delete.
  expect(evidenceCleanupDecision({ classification: refused, objectCreatedByThisRequest: false }).remove).toBe(false)
})

test('an idempotency conflict never deletes, because the stored object is referenced', () => {
  const conflict = classifyEvidenceRegistrationFailure({ message: 'K2_ADMIN_IDEMPOTENCY_CONFLICT' })
  for (const created of [true, false]) {
    const decision = evidenceCleanupDecision({ classification: conflict, objectCreatedByThisRequest: created })
    expect(decision.remove).toBe(false)
    expect(decision.reason).toMatch(/earlier registration/i)
  }
})

test('an unknown outcome keeps the object and becomes a recoverable pending state', () => {
  const unknown = classifyEvidenceRegistrationFailure({ message: 'socket hang up' })
  const decision = evidenceCleanupDecision({ classification: unknown, objectCreatedByThisRequest: true })
  expect(decision.remove).toBe(false)
  expect(decision.recordPending).toBe(true)
  expect(decision.reason).toMatch(/not proven/i)
})

test('the evidence route classifies before it deletes, and never blind-upserts', async () => {
  const source = await readFile(new URL('../server/admin-bff/product-intake.js', import.meta.url), 'utf8')

  expect(source).toContain('classifyEvidenceRegistrationFailure')
  expect(source).toContain('evidenceCleanupDecision')
  // An unconditional overwrite is what lets a changed file name destroy the
  // object an earlier successful registration points at.
  expect(source).not.toContain('upsert: true')
  expect(source).toContain('upsert: false')
})
