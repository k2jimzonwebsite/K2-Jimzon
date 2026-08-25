# MAP-018 live schema audit — 12 August 2026

## Scope and safety

Read-only catalog queries were run against Supabase project
`pixplcjqivlfflickobf`. No DDL or data mutation was executed. The local intake
migration remains unapplied while MAP-016 credential recovery and MAP-017
boundary hardening are incomplete.

## Verified production facts

- `product_intake_sessions` does not exist.
- `products` uses `brand_id` and `category_id`, not `brand` and `category`.
- Product selling price fields include `srp`, `retail_price`, and
  `wholesale_price`; there is no `price` column.
- Product publication status is title-cased and constrained to `Live`, `Active`,
  `Unlisted`, `Draft`, or `Discontinued`. `Under Review` is not currently valid.
- `ingredients` is text, not `text[]`.
- `products` has no `after_image_url` or `usage_summary` column.
- `audit_logs` uses `table_name`, `record_id`, `action`, `old_data`, `new_data`,
  `user_id`, and `created_at`; the draft migration's event columns do not exist.
- `product_batches` is keyed by SKU and has no `product_id`, `unit_cost`, or
  `pin_flag` column. Its current compatibility fields include `is_pinned`,
  `batch_code`, `box_code`, `quantity`, `quantity_available`, expiry/best-before,
  hub, custodian, channel, reservation, and source-consignment linkage.
- Italy flight intake already has `consignments`, `consignment_items`, scan
  events, and guarded commands including `add_consignment_item_v2` and
  `finalize_consignment_receipt`.
- Opening-balance correction already has `reconcile_product_batches`, which
  requires a reason and preserves batch change events. No supplier-receipt table
  is currently available.

## Rejected migration behavior

The prior local migration cannot be applied safely. It targets nonexistent
columns, creates an all-authenticated/all-rows intake policy, exposes the SKU
generator, omits a fixed `search_path` and MFA guard on privileged functions,
and writes an incompatible lowercase publication state. It must be replaced,
not patched incrementally or submitted to the SQL editor.

## Local boundary repaired

The browser now performs structured duplicate queries against the verified
product identity columns and normalizes related brand/category names for the UI.
It never generates an SKU, directly inserts a product or lot, publishes through
a table update, or returns mock success. Named server commands are required and
failure leaves prior state unchanged. The modal also requires the current
`k2.product-content.v3` contract, explicit per-field acceptance, real local
camera/file selection, and saved checklist transitions before moving forward.

## Remaining MAP-018 proof

The replacement migration must add owner-scoped/staff-authorized sessions,
idempotent server SKU creation, protected evidence objects, source-specific
flight/receipt/reconciliation handoffs, publication readiness, correct audit
events, explicit grants, and negative tests. It must pass a rollback-only live
compatibility rehearsal before any permanent application. Supplier-receipt
inventory remains blocked on a canonical receiving record design and must not be
emulated with a direct lot insert.

## Replacement migration rollback proof

The rejected SQL was replaced with a live-schema-compatible migration plus
read-only preflight and postflight assertions. The exact migration body and
postflight ran against production in one explicit transaction ending in
`ROLLBACK`. The postflight passed. A separate read-only query then proved:

- `product_intake_sessions` remained absent;
- all new intake commands remained absent;
- the private evidence bucket remained absent;
- new lot cost/owner/source columns remained absent; and
- the original product status constraint was restored without `Under Review`.

This proves syntax compatibility, expected object/grant/policy configuration,
and transactional reversibility. It does not prove authenticated runtime
behavior and did not activate the workflow.
