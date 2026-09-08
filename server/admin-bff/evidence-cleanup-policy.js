/**
 * When intake evidence may be deleted, and when it must not be.
 *
 * Evidence is the proof a product was physically received. Removing a Storage
 * object is irreversible, so a failed registration is not on its own a licence
 * to delete: a transport failure does not prove the transaction rolled back, and
 * an idempotency conflict proves the opposite — an earlier registration
 * succeeded and may reference this exact object path.
 *
 * The object path is content-addressed (user, session, slot, operation key and a
 * SHA-256 prefix), so the same path means the same bytes. What it does not
 * encode is the file name, which participates in the registration payload hash.
 * That is the case that turns a blind overwrite-then-delete into destruction of
 * registered evidence (MAP-028 H-013).
 */

export const EVIDENCE_REGISTRATION_OUTCOME = Object.freeze({
  /** The command was refused deterministically. Nothing was registered. */
  REFUSED: 'refused',
  /** This operation key already registered evidence. The object is referenced. */
  ALREADY_REGISTERED: 'already_registered',
  /** No proof either way. Treat the evidence as possibly registered. */
  UNKNOWN: 'unknown',
})

export function classifyEvidenceRegistrationFailure(error) {
  const message = String(error?.message || '')
  if (message.includes('K2_ADMIN_RATE_LIMITED')) {
    return { outcome: EVIDENCE_REGISTRATION_OUTCOME.REFUSED, code: 'RATE_LIMITED', status: 429 }
  }
  if (message.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) {
    return { outcome: EVIDENCE_REGISTRATION_OUTCOME.ALREADY_REGISTERED, code: 'IDEMPOTENCY_CONFLICT', status: 409 }
  }
  return { outcome: EVIDENCE_REGISTRATION_OUTCOME.UNKNOWN, code: 'EVIDENCE_REGISTER_UNAVAILABLE', status: 503 }
}

/**
 * Cleanup requires both proofs: that nothing registered, and that this request
 * created the object. Anything less keeps the bytes and, where the outcome is
 * unknown, records a pending state a human can reconcile.
 */
export function evidenceCleanupDecision({ classification, objectCreatedByThisRequest }) {
  if (classification.outcome === EVIDENCE_REGISTRATION_OUTCOME.ALREADY_REGISTERED) {
    return {
      remove: false,
      recordPending: false,
      reason: 'An earlier registration used this operation key and may reference this object.',
    }
  }
  if (classification.outcome === EVIDENCE_REGISTRATION_OUTCOME.UNKNOWN) {
    return {
      remove: false,
      recordPending: true,
      reason: 'Registration is not proven to have failed, so the evidence is retained for reconciliation.',
    }
  }
  if (!objectCreatedByThisRequest) {
    return {
      remove: false,
      recordPending: false,
      reason: 'This object already existed, so it is not this request’s to delete.',
    }
  }
  return {
    remove: true,
    recordPending: false,
    reason: 'The command was refused and this request created the object.',
  }
}
