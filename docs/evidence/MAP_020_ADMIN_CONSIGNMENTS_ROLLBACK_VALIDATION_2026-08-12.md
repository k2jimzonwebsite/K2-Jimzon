# MAP-020 Admin flight-consignment rollback validation — 12 August 2026

## Scope

This evidence covers a prepared, inactive Admin BFF flight-consignment slice.
It does not claim that cookie authentication, the signed database wrapper, the
legacy-RPC cutover, a domain, or any marketplace adapter is live.

## Production truth inspected

- `consignments`, `consignment_items`, and `consignment_scan_events` exist with
  row-level security enabled; forced RLS is not enabled.
- Exact production columns were inspected before the wrapper was written.
- The bodies and grants of `create_consignment_manifest`,
  `add_consignment_item_v2`, `record_consignment_item_scan`,
  `advance_consignment`, and `finalize_consignment_receipt` were inspected.
- Anonymous execution is absent and authenticated execution is currently
  present on those legacy mutation RPCs.
- The shared Admin BFF foundation compiled inside a production transaction that
  was rolled back.
- The flight wrapper compiled in a rollback-only harness with matching private
  verifier and receipt signatures.
- A post-rollback query proved the wrapper and private receipt objects were
  absent and the existing direct scan RPC remained available.

## Prepared boundary

- `GET /api/admin/consignments` returns a fixed projection of at most 100
  manifests with their allowlisted lines and at most 200 recent scan events.
- Named commands cover manifest creation, line addition, one-unit Milan/Manila
  scan, supported state advancement, and atomic receipt finalization.
- Every mutation enforces the Admin target, exact origin, current encrypted
  session, live staff role, AAL2, CSRF, bounded JSON, HMAC signature, nonce,
  durable payload-bound receipt, and per-actor/action database limit.
- The scan request includes both the actual scanned code and selected manifest
  line. The database verifies the code against that line's SKU or active product
  barcode before incrementing exactly one unit.
- A retry after a lost response keeps the same operation key; the next physical
  unit receives a new key.
- State advancement requires a reason. Finalization requires reconciliation
  notes when counts vary and retains the existing atomic lot creation behavior.
- The coordinated migration revokes authenticated browser execution of all five
  legacy mutation RPCs only when the BFF boundary is activated.

## Verification completed

1. Read-only live schema, function-body, RLS, and grant inspection.
2. Shared foundation rollback-only production compilation.
3. Flight wrapper rollback-only production compilation.
4. Post-rollback absence and legacy-grant restoration query.
5. Twenty-nine Admin/Storefront BFF contract tests.
6. Isolated Admin production build and 21-module boundary verification.

## Remaining before activation

- Complete MAP-016 and MAP-017 identity/authorization prerequisites.
- Install one matching private request secret and apply the foundation plus
  flight wrapper in one coordinated cutover.
- Run deployed positive and denial tests, including nonstaff, AAL1, CSRF,
  wrong-origin/project, replay, changed payload, rate, identifier tampering, and
  barcode mismatch.
- Rehearse representative Milan scans, independent Manila scans, failed and
  retried finalization, and exact-once lot creation.
- Implement the richer damage, unexpected/wrong-item, unknown-expiry,
  insufficient-shelf-life, and quarantine disposition workflow in MAP-023.
- Keep `VITE_ADMIN_BFF_ENABLED=false` until every required Admin capability can
  operate without browser Supabase Auth or privileged direct data calls.
