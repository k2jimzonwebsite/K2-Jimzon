# Payment Evidence and Instructions Runbook

**Owner:** MAP-018 / MAP-023 / MAP-028 I-016

**Current state, 16 September 2026 (AUD-OPS-001, MAP-023 §16, MAP-019, local):**
The Admin fulfillment surface and database layer are locally prepared and
rehearsed for structured manual payment evidence and distinct staff verification.
It is not an automated payment gateway, instruction-delivery system, settlement
ledger, or production activation. No remote database migration or production
activation has occurred.

## What the Admin and database path now records

`OmniOperationsHub`, `/api/admin/fulfillment/payment`, and
`supabase/migrations/20260916_structured_payment_evidence.sql` provide
structured payment evidence and separation of duties:

- **Structured Evidence:** `payment_evidence jsonb` on `order_requests` stores:
  - `method`: whitelisted to `gcash`, `bank_transfer`, `maya`, `cash`, `other`;
  - `amount`: positive numeric amount (PHP);
  - `currency`: strictly `PHP`;
  - `payer_name`: nonblank string (up to 140 chars);
  - `payment_reference`: nonblank string (up to 100 chars);
  - `proof_asset_ref`: optional URL or stored asset reference (up to 500 chars);
  - `submitted_at` and `submitter_id`: recorded from server context.
- **Separation of Duties:** `set_order_request_payment_status` enforces that
  the verifier confirming funds arrived in the merchant account must be
  distinct from the staff member who submitted payment evidence
  (`auth.uid() <> v_submitter`).
- **Admin BFF Validation:** `server/admin-bff/fulfillment.js` strictly validates
  all payment fields and rejects invalid methods (`PAYMENT_METHOD_INVALID`),
  non-positive or non-numeric amounts (`PAYMENT_AMOUNT_INVALID`), unsupported
  currencies (`PAYMENT_CURRENCY_INVALID`), blank payers/references
  (`PAYMENT_PAYER_INVALID`, `PAYMENT_REFERENCE_INVALID`), or oversized proof URLs
  (`PAYMENT_PROOF_INVALID`).
- **Staff Admin UI:** `PaymentStatusModal` in `OmniOperationsHub.jsx` provides
  structured input fields when recording `evidence_submitted` and renders an
  independent evidence review card plus an explicit merchant account check
  confirmation ("I independently checked the merchant receiving account and
  confirmed funds arrived") when advancing to `verified`.
- **Verified Evidence:**
  - `node scripts/rehearse-payment-recovery.mjs` exits code 0 against local PG 17.11.
  - `tests/admin-bff-contract.spec.js` passes all 66 contract tests.
  - `tests/payment-recovery-ui.spec.js` passes all 36 payment UI tests across viewports.
  - Contract suite passes 636/636 tests; production builds pass within budget.

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
