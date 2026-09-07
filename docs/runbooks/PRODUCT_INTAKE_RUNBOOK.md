# Product Intake and First-Source Runbook

**Current status:** verified local implementation and rollback-tested migration;
not active in production. Permanent activation remains behind MAP-017.
Supplier receipt is intentionally unavailable until a canonical
receiving record is implemented.

## Operational-readiness trace — 7 September 2026

The manual Admin path is locally prepared for the allowed sequence: registered
package evidence and field review create one unpublished Draft; Step 6 can add
an expected SKU/batch/box line to a declared `Packing_Italy` manifest or record
an authorized opening balance with the required physical identity and reason.
It never turns product import into stock, and the Supplier Receipt control
remains disabled because no canonical purchasing/receiving record exists.

The separate Flight Consignments path uses the selected manifest line and
actual code for one-unit Milan and Manila scans. The existing hardened SQL
finalizer creates accepted `product_batches`, balances, and immutable receiving
events exactly once; a shortage is retained as a reconciliation event and a
lost response can be retried with the same protected operation identity. The
earlier focused source checks did not execute this workflow. The session audit
now executes the original receiving SQL functions in a minimal synthetic schema
and verifies independent scans, shortages, box/source identity, short-dated
quarantine and retry. The receipt automatically quarantines dates below 90 days
(and legacy null dates); unknown dates cannot be newly declared through the
current add-line command. Overages are refused. Wrong-item, damaged and unexpected
goods still lack a complete arrival-exception workflow. Full UI/BFF/RLS receiving
acceptance and production activation remain open in MAP-023.

Focused local evidence for this boundary passed 86/86 API/contract checks and
the two intake-AI browser checks (2/2). The separate Admin and Storefront builds
also passed their local boundary, budget and secret checks. This does not prove
production migration activation, supplier receiving, rich arrival dispositions,
or real staff receiving acceptance.

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

### Optional paid API path (locally prepared; production unavailable)

The owner has accepted paid OpenAI calls in principle as an optional per-product
route for descriptions, usage/instructions, SEO fields, media briefs, and
PRIMARY/AFTER Draft image candidates. It is not a default and it never fills
physical stock, SKU, price, cost, lot, batch, expiry, custody, approval, or
publication. The deployed Admin has no verified operational paid route: the confirmation
sequence, spend caps, reviewed model/provider, retention setting, server-only
credential, and production activation still require approval and evidence. The
prepared Staff & Roles control is editable only by an owner-controlled
SuperAdmin with AAL2; null/incomplete caps and a missing model are fail-closed.
It is not a spending authorization or provider-live signal.

Until those gates are closed, staff must use the manual sequence above:
**K2 Product Content → Smart Paste field review → K2 Product Image Studio**
(separate PRIMARY and AFTER requests). A future activated route must show the
priced scope and current cap, obtain explicit confirmation, validate the exact
`k2.product-content.v3` response at the server boundary, return field-by-field
review, and only then request image candidates. Every call must be idempotent,
audited, recoverable, and fail closed to the manual path.

### Key-later configuration and activation

Local preparation exposes Automatic API alongside Manual ChatGPT Projects.
Check readiness / Recover saved results never starts a paid request. Content is
loaded into the existing field review with every field initially unaccepted.
Save that review before separately confirming PRIMARY and AFTER image requests.
Review candidates against the package, record an acceptance/rejection reason,
then explicitly attach accepted candidates after creating the canonical Draft.
Attachment replaces the named media slot through existing signed intake/media
commands; it does not approve, publish or change stock.

Adding `OPENAI_API_KEY` supplies server authentication only. Activation also needs:

- MAP-017-authorized dependency migrations and the rehearsed private
  `20260906_automatic_intake_jobs.sql`, existing evidence/media storage and signer.
- Owner-controlled SuperAdmin+AAL2 paid-path configuration with non-null product,
  session and monthly caps and the exact model/version snapshot.
- Server-only `K2_INTAKE_AI_ENABLED`, exact `K2_AI_CONTENT_MODEL` and
  `K2_AI_IMAGE_MODEL`, `K2_AI_RETENTION_REVIEWED`, and `K2_AI_PRICING_REVIEWED`.
  Defaults remain off; never put credentials in VITE variables or Storefront.
- Current official capability, price and account-access review. The prepared
  `gpt-image-1` alias is deprecated; confirm support or change adapter, SQL snapshot,
  bounds, owner configuration and tests together. `store:false` does not establish
  zero retention. Review actual provider data controls before enabling.
- Verified ownership of the separate Admin Vercel project and its prepared
  180-second function allowance. Do not configure an unrelated connector account.
- Owner-approved paid preview, invoice reconciliation and authenticated real-host
  acceptance before production enablement. None occurred during preparation.

The server reserves $0.10 for content and $1 per image; these are conservative
upper reservations, not billed costs. Durable claims precede provider calls.
Unknown outcomes keep their reservation; recovery reads cannot dispatch again.
One job per session and kind is deliberate: use manual fallback for rejected,
failed or uncertain jobs rather than deleting records or starting paid retries.
The same normalized product identity shares the product cap across sessions.

Evidence, official source links and verification gaps are recorded in
`docs/evidence/20260906-intake-ai/README.md`; remaining work stays in MAP-018 /
MAP-028 I-016. Disable feature and owner paid-path gates to stop new dispatch;
already claimed calls may finish. Preserve private jobs and media receipts.
Retry canonical attachment with the same candidate; reconcile deterministic public
orphans with existing media controls. Roll back code with scoped Git changes.

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
real device permission, real provider failure, authenticated deployed app-switch
resume, and production activation evidence remain open.

## Local interrupted-resume evidence — 26 August 2026

The 375×812 reduced-motion journey now creates one fixture server session, saves
Step 2, closes the modal, reopens it, and verifies that the same active record
restores `Step 2: Capture Packaging Evidence` with an explicit `Intake resumed`
status. The fixture is stateful because a server that reports no active record
after accepting its own save cannot test resume behavior. The source contract
also verifies that rejected research fields do not return after a Step-5 resume.
This is local simulated-server evidence only; repeat it against the activated
Admin BFF with an authenticated staff/AAL2 session and real mobile app switching
before production acceptance.

## Local canonical custody evidence — 26 August 2026

For an administrator-authorized opening balance, **Hub / Location** and
**Custodian** are canonical selections rather than free-text fields. Selecting a
hub limits the custodian control to records assigned to that hub. The browser
sends the stable hub and custodian IDs; the Admin BFF rejects an unknown ID or a
custodian assigned to another hub, and both prepared SQL boundaries repeat the
table and relationship checks before reconciliation.

The reduced-motion 375×812 journey selects `HUB-MIL-DEPOT` and confirms
`CUST-STAFF-MARCO`, with 44px controls and zero horizontal overflow. Sixty
focused BFF/intake contracts, all 16 Admin UI journeys, the MAP-018 verifier,
security gate, and isolated Admin build pass. This is local prepared evidence,
not proof that the canonical identity migration, intake migration, Admin BFF,
or production staff assignments are active. After MAP-017 permits activation,
repeat valid, unknown-ID, and cross-hub mismatch cases with an authenticated
staff/AAL2 session before accepting this gate in production.

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
