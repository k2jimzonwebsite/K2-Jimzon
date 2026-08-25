# Product Intake and First-Source Runbook

**Current status:** verified local implementation and rollback-tested migration;
not active in production. Permanent activation remains behind MAP-017.
Supplier receipt is intentionally unavailable until a canonical
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
   accepted up to 4 MB each. Files upload to the private intake-evidence bucket
   under the signed-in staff member and session. They are not storefront media.
   Public product media uses a separate prepared Admin BFF route and public
   bucket path after equivalent image decoding and metadata stripping. A public
   upload is not intake evidence and does not assign or publish a product.
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
  signed session registration failed, the Admin BFF first attempts to remove the
  unregistered private object immediately.
- If Storage cannot confirm that removal, the server records the exact private
  path and its SHA-256 only in the forced-RLS cleanup ledger. The browser receives
  an opaque cleanup ID, never the path. Intake cannot advance or select another
  evidence file while this cleanup is pending.
- Use **Retry file cleanup** in the persistent amber recovery panel. A retry
  claims only the signed-in staff member's pending record, revalidates the path
  against its hash, asks Storage to remove it, and marks the ledger complete only
  after Storage returns success. If Storage or the completion write is
  unavailable, the panel remains and retry is safe. After ten provider attempts,
  stop retrying and escalate the opaque cleanup ID to an administrator; never
  expose a private Storage path in chat, tickets, or browser logs.
- Draft retries reuse the session request ID and return the original product.
- First-source retries reuse one locally cached request ID; the server returns
  the original result or refuses a different second request.
- Offline, permission, expired-session, MFA, validation, duplicate, and provider
  failures preserve the prior server state and display a recovery message.
- While offline, review remains available but duplicate checks, uploads, step
  saves, Draft creation, inventory commands, and publication changes are paused.
  Reconnection retries session initialization and clears the stale offline error.
- A denied or unavailable camera never blocks the workflow: staff may select an
  existing package photo. Clipboard denial shows a recoverable inline message.
- Closing the modal clears temporary local image-preview URLs. Replacing a photo
  also releases the previous preview, without changing the durable private evidence.
- Never fix product intake by inserting directly into `products`,
  `product_batches`, Storage, or `audit_logs` from the SQL editor.

## Activation and verification

1. Confirm MAP-016 exposed-key disablement and old-key rejection.
2. Permanently apply and verify MAP-017 public-boundary hardening.
3. Run `supabase/map018_product_intake_preflight.sql`.
4. Apply `supabase/migrations/20260811_product_intake_and_sku_gate.sql` through
   the migration workflow, never as a partial pasted fragment.
5. Apply
   `supabase/migrations/20260824_map018_intake_evidence_cleanup_boundary.sql` in
   the same reviewed activation window. Do not enable the Admin BFF intake route
   if the cleanup ledger and all three signed functions are absent.
6. Run `supabase/map018_product_intake_postflight.sql`.
7. Run `npm run verify:map018-intake`,
   `npm run verify:map018-cleanup-portable`, both production builds, secret/bundle
   scans, database role tests, and the phone acceptance matrix.
8. Rehearse exact match, distinct variant, interrupted resume, upload failure,
   registration failure plus successful immediate deletion, registration failure
   plus failed deletion and successful retry, repeated provider failure,
   duplicate retry, flight manifest, admin reconciliation, publication denial,
   and valid publication using non-production or reviewed rehearsal records.

Rollback-only compatibility proof from 12 August 2026 is recorded in
`MAP_018_LIVE_SCHEMA_AUDIT_2026-08-12.md`. That proof is not deployment evidence.

## Local phone acceptance evidence — 22 August 2026

The rendered Admin component passed Chromium acceptance at 375×812 with reduced
motion, zero horizontal overflow, initial close-button focus, semantic dialog and
error/status regions, an offline command denial, reconnect recovery, and Escape
close. The same rendered flow exposes the camera-denied file-picker fallback and
keeps Step 2 active with an inline recovery message when a fabricated Storage
upload returns 503. The complete five-test Admin UI suite, 127 API/security contracts,
`verify:map018-intake`, the security gate, and the isolated Admin production build
also pass. This is local behavior evidence only; authenticated deployed-role,
real device permission, real provider failure, interruption/resume, and production
activation evidence remain open.

## Local orphan-cleanup reconciliation evidence — 24 August 2026

The inactive Admin BFF now records a durable private cleanup event only when both
evidence registration and the immediate Storage delete fail. Its new exact POST
route returns an opaque cleanup ID, and the phone modal presents one persistent
44px retry action, blocks forward progress, and never renders the private path.
The database ledger is forced-RLS with no direct `anon` or `authenticated` table
privileges; signed staff+AAL2 functions own record, claim, and completion.

An isolated PostgreSQL 17.11 rehearsal passed migration apply, pending → claim →
completed behavior, privilege assertions, and idempotent migration replay. All 44
focused Admin BFF/intake contracts pass, the security inventory reports 63 Admin
routes with zero route-control gaps and no unexpected function grants, the
isolated Admin production build passes, and the real intake modal still passes
its reduced-motion 375×812 Chromium journey with zero horizontal overflow and
failure recovery. This is local prepared evidence only. The migration and Admin
BFF flag remain inactive; real Storage-provider failure/recovery, deployed-role
denials, MAP-022 alert delivery, and production activation are still required.
