# Product Intake and First-Source Runbook

**Current status:** verified local implementation and rollback-tested migration;
not active in production. Permanent activation remains behind MAP-016 and
MAP-017. Supplier receipt is intentionally unavailable until a canonical
receiving record is implemented.

## Staff prerequisites

- Sign in through the Admin BOS as an authorized staff member.
- Enroll and complete MFA. Draft creation, first-source recording, and
  publication transitions require AAL2.
- Use a phone camera, device file picker, hardware scanner, or manual identity
  entry. Never invent a barcode, SKU, batch, quantity, expiry, or source.

## Workflow

1. Scan or type the manufacturer barcode, K2 code, or known name.
2. Run the duplicate check. An exact match opens the existing product and its
   lots. A possible name match blocks progress until staff records the exact
   physical variant difference and confirms it.
3. Capture front, back/label, and barcode evidence. JPEG, PNG, and WebP are
   accepted up to 10 MB each. Files upload to the private intake-evidence bucket
   under the signed-in staff member and session. They are not storefront media.
4. Complete the category evidence checklist. The server requires all three
   evidence slots and all checklist confirmations before Draft creation.
5. Copy the `k2.product-content.v3` prompt to the private ChatGPT Product Content
   Project. ChatGPT provides content/evidence JSON only; it cannot provide SKU,
   price, stock, batch, expiry, or publication state.
6. Paste the JSON and review every proposed product field. Accept or reject each
   field explicitly. Legacy or unversioned JSON is rejected in this workflow.
7. Ask the server to create the Draft. The server verifies staff+AAL2, ownership,
   idempotency, evidence, schema version, duplicate identity, and accepted name;
   then assigns one SKU, creates the Draft, saves provenance, and writes audit
   evidence atomically.
8. Choose an optional first source:
   - **Italy flight/box:** select a real open `Packing_Italy` manifest and enter
     box, batch, best-before date, and expected quantity. This adds a manifest
     line only. It does not create on-hand stock. Stock is created after separate
     Milan/Manila scans and final receipt.
   - **Opening balance:** administrator+AAL2 only. Record verified legacy stock
     with box, batch, physical count, expiry/non-expiry evidence, owner, unit
     cost, hub, custodian, and written reason. Non-expiry opening stock remains
     quarantined until eligibility is resolved.
   - **Supplier receipt:** unavailable. Do not imitate it with an opening balance
     or direct lot insert.
9. Move the Draft to Under Review only after verified primary evidence exists.
   Move Under Review to Live only when the server proves resolved brand/category,
   price, primary storefront image, human review, and the valid prior state.

## Failure and retry rules

- A visible success is shown only after the server returns success and the
  authoritative session is re-fetched.
- A failed upload is not added to session evidence. If the file uploaded but the
  session update failed, the client attempts to remove the orphan object.
- Draft retries reuse the session request ID and return the original product.
- First-source retries reuse one locally cached request ID; the server returns
  the original result or refuses a different second request.
- Offline, permission, expired-session, MFA, validation, duplicate, and provider
  failures preserve the prior server state and display a recovery message.
- Never fix product intake by inserting directly into `products`,
  `product_batches`, Storage, or `audit_logs` from the SQL editor.

## Activation and verification

1. Confirm MAP-016 exposed-key disablement and old-key rejection.
2. Permanently apply and verify MAP-017 public-boundary hardening.
3. Run `supabase/map018_product_intake_preflight.sql`.
4. Apply `supabase/migrations/20260811_product_intake_and_sku_gate.sql` through
   the migration workflow, never as a partial pasted fragment.
5. Run `supabase/map018_product_intake_postflight.sql`.
6. Run `npm run verify:map018-intake`, both production builds, secret/bundle
   scans, database role tests, and the phone acceptance matrix.
7. Rehearse exact match, distinct variant, interrupted resume, upload failure,
   duplicate retry, flight manifest, admin reconciliation, publication denial,
   and valid publication using non-production or reviewed rehearsal records.

Rollback-only compatibility proof from 12 August 2026 is recorded in
`MAP_018_LIVE_SCHEMA_AUDIT_2026-08-12.md`. That proof is not deployment evidence.
