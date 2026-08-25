# MAP-017 Rollback-Only Validation — 12 August 2026

This is an evidence record, not a backlog or proof of permanent deployment.
Active work remains only in `MASTER_ACTION_PLAN.md`.

## Scope

The exact local phase-1 migration
`supabase/migrations/20260812_map017_public_write_boundary_hardening.sql`
and its postflight assertions were executed against the connected production
schema inside one explicit transaction. The migration's final `COMMIT` was
removed for this validation only, the postflight ran inside the same transaction,
and the transaction ended with explicit `ROLLBACK`.

No customer/order/product row was inserted, updated, or deleted by the migration.
The transactional changes exercised were grants/default privileges, RLS policies,
view options/grants, Storage bucket limits/policies, and Realtime publication
membership.

## Result

- Migration preflight completed.
- Every migration statement executed against the live object signatures.
- The complete postflight returned:
  `MAP-017 public write boundary postflight passed`.
- The transaction rolled back.

## Rollback proof

A separate read-only query after the transaction confirmed the original live
state was restored:

| Original state checked after rollback | Result |
| --- | --- |
| Legacy public Storage upload policy present | Restored (`true`) |
| `products_old` anon read present | Restored (`true`) |
| `products_old` Realtime membership present | Restored (`true`) |
| Brands public-all policy present | Restored (`true`) |
| `product-images.file_size_limit` remains null | Restored (`true`) |
| `product-images.allowed_mime_types` remains null | Restored (`true`) |

These `true` values prove rollback, not security. The vulnerabilities remain
live until the migration is permanently applied after incident
`SEC-20260811-001` is closed.

## What this proves

- The prepared phase-1 SQL is syntactically valid against the current live
  Supabase schema.
- Its preflight assumptions match the live objects.
- Its postflight invariants hold inside the transaction.
- Its tested changes are transactionally reversible in this environment.

## What this does not prove

- The migration is permanently deployed.
- The exposed service-role credential is disabled.
- Staff/storefront end-to-end workflows still pass after a permanent migration.
- MAP-017 is complete; the remaining RPC, role/capability, ownership, customer,
  guest, Realtime, Storage-byte-validation, and negative-test work still applies.
