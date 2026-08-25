# MAP-020 Admin Fulfillment Boundary Validation

**Date:** 12 August 2026
**Target:** connected production Supabase project `pixplcjqivlfflickobf`
**Outcome:** prepared and rollback-proven; not applied and not live

## Read-only compatibility audit

The production catalog and function definitions confirmed:

- `order_requests`, `order_request_items`, `inventory_reservations`,
  `product_batches`, and `user_profiles` contain the fields used by the fixed
  Admin fulfillment projection;
- `confirm_order_request(uuid,text)`, `record_packing_scan(uuid,text)`,
  `set_order_request_payment_status(uuid,text,text)`,
  `set_order_delivery_details(uuid,numeric,text,text,text,boolean,text)`,
  `fulfill_order_request(uuid,text)`,
  `transfer_inventory_custody_exact(uuid,integer,text,text,text)`, and
  `transfer_inventory_custody(text,text,text,text)` exist as staff-guarded
  `SECURITY DEFINER` functions;
- the current functions already enforce order-state, sellable-lot reservation,
  full unit scan, payment evidence, delivery readiness, reserved-quantity, and
  exact-lot rules. The missing boundary was browser isolation, replay-safe
  idempotency, bounded input, and durable per-actor command limiting.

## Rollback-only migration proof

`supabase/migrations/20260812_admin_fulfillment_bff_boundary.sql` was executed
against production with its final `commit` replaced by `rollback`. PostgreSQL
compiled the private secret, nonce, receipt tables and signed command functions
against the real schema without error. No operational command was invoked and
no production row was changed.

A separate transaction verified:

- `to_regclass('k2_private.admin_command_receipts') is null` = `true`;
- `to_regprocedure('public.execute_admin_fulfillment_command_v1(text,bigint,uuid,uuid,text,text)') is null` = `true`.

Therefore the new objects were fully rolled back. This is compatibility and
reversibility evidence only. Permanent application is blocked until credential
containment, MAP-017 approval, matching private/server secret configuration,
and coordinated preview denial tests.

## Local verification

- `npm run test:contracts`: 20 passed.
- `npm run verify:admin-bff`: passed.
- `npm run security:secrets`: passed, 647 files checked.
- `npm run build:admin`: passed with compiled artifact isolation.
- `npm run build:storefront`: passed with compiled artifact isolation.
- `git diff --check`: no whitespace error; Windows line-ending notices only.

No deployment, migration application, feature activation, domain change, or
credential change was performed.
