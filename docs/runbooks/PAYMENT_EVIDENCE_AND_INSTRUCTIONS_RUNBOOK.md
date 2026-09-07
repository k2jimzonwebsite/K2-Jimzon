# Payment Evidence and Instructions Runbook

**Owner:** MAP-018 / MAP-023 / MAP-028 I-016

**Current state, 7 September 2026:** the Admin fulfillment surface is locally
prepared for a narrow manual payment-state transition. It is not a payment
gateway, instruction-delivery system, settlement ledger, refund executor, or
production acceptance. No payment was collected, refunded, sent, or verified
during this preparation.

## What the current Admin path actually records

`OmniOperationsHub` and the prepared
`/api/admin/fulfillment/payment` route can move the existing order-request
state through the allowed transition matrix and attach one bounded free-text
evidence/reconciliation note to an order-request event. The legacy
`set_order_request_payment_status` function and the signed BFF wrapper do not
have separate fields or records for:

- approved payment method and currency;
- amount actually received and amount verified;
- payer identity;
- searchable merchant/payment reference;
- proof file or proof hash;
- a separate finance-verifier capability or separation-of-duties decision; or
- customer instruction content, delivery channel, delivery receipt, or
  uncertain-delivery state.

Correction from the session audit: `order_request_events` already stores
`actor_id`, `created_at`, the note and payment transition metadata. These identify
the actor/time of evidence submission or verification. The missing pieces are
structured evidence and verifier authorization, not a total absence of audit
identity/time. The local SQL rehearsal now executes the original payment
function and verifies these events, invalid transitions, required notes and
same-state retry. Auth is synthetic; this does not prove BFF/RLS authorization.

The UI wording correctly says that the control records evidence and does not
process payment. `awaiting_instructions` is only a state value; it is not proof
that instructions were sent. The customer-facing review-first copy must remain
unchanged until an approved instruction boundary exists.

The focused local refresh passed the fixed Admin payment-validator contracts as
part of 86/86 API/contract checks, the Admin browser suite 31/31, and both
separate production build boundary/security checks. This proves local payload,
feature-gate and artifact behavior only; it does not prove payment collection,
instruction delivery, provider settlement, or finance verification.

## Required owner decisions before publishing payment instructions

The only recorded candidate is GCash in `IDEA-20260902-04`; that idea is marked
captured but not audited into the active MAP and is not authorization to build
or display payment details. Existing generic commands can be implemented and
tested without merchant details. Before instruction publication, the owner must approve and
record:

1. the exact method(s) and currency;
2. the payee/merchant display name, account identifier and approved QR/asset
   (static versus per-order);
3. the customer instruction channel and exact template, including how the
   order reference is tied to the payment reference;
4. the required reference format and whether screenshot/proof is optional or
   required;
5. evidence retention/access rules and refund authority; and
6. the `finance.verify` AAL2 verifier role, separation from evidence entry where
   practical, and escalation owner for timeout or ambiguous provider results.

Never guess merchant details or expose credentials in browser/VITE configuration.
An owner-approved public payee/QR instruction is different from a secret and must
eventually be displayed to the intended payer through the approved workflow.
No payment details or keys were requested or added during this preparation.

## Required implementation boundary after approval

Add the smallest reviewed schema and signed Admin commands that preserve the
rulebook's separate evidence fields and immutable lifecycle events. The
instruction record must be versioned and distinguish prepared, approved,
delivered, delivery-uncertain, and retired instructions. Payment evidence must
be linked to the exact canonical order/request and retain the raw submitted
reference/proof metadata without exposing private proof or secrets to the
browser. Verification must be a separate capability and must record actor,
server time, amount, notes, and the prior/new state.

Test exact transitions, malformed types, mismatched amount/reference/order,
duplicate and changed-payload idempotency, rejected evidence, ambiguous
instruction delivery, verifier separation, refund authorization, and recovery
after a lost response. Keep the existing manual note/state path available as a
truthful fallback until the new boundary is accepted.

## Activation order

1. Record the owner decisions above in the owner-decision record and MAP.
2. Review and apply the payment schema/command migration only through the
   approved MAP-017 migration window; do not paste fragments into production.
3. Deploy the Admin BFF and UI to the separate Admin project, verify exact
   origin/session/CSRF/AAL2/capability denials, and keep Storefront separate.
4. Run an authenticated staff rehearsal with a non-production or explicitly
   approved test account, including uncertain delivery and retry recovery.
5. Only after receipt and real-host evidence passes, publish approved payment
   instructions and revise the review-first storefront copy. A key or an
   account detail alone does not complete this sequence.

## Recovery and rollback

Disable the instruction/payment command flag before disabling or rolling back
code. Preserve evidence, events and uncertain records for reconciliation; never
delete a payment attempt to make a retry look clean. Reconcile the exact order
and provider truth before reusing the same operation identity. If an
instruction message has uncertain delivery, do not resend blindly; inspect the
external channel and retain the uncertainty. Existing production rollback
procedures apply only to boundaries that were actually activated; this prepared
runbook records no production change.
