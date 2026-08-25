# MAP-017 Function Authorization Matrix — 22 August 2026

## Verdict

The 24 authenticated-callable RPCs previously reported as unreviewed now have
explicit authorization contracts in `scripts/schema-truth-core.mjs`. A fresh,
read-only production export confirms that all 21 staff RPCs reference
`public.is_staff()`, all three delete-PIN RPCs reference an inline Admin-role
check and AAL2, and all 24 use explicit exception paths. Function bodies were
not exported; only non-sensitive boolean guard signals were retained.

This closes 24 evidence gaps. It does not make browser-direct staff mutations
the target architecture and does not authorize applying any production DDL.

## Tier 0 — retained guarded security operations

| Function | Authorization | State and replay contract | Disposition |
| --- | --- | --- | --- |
| `has_delete_pin()` | Admin + AAL2 | Read-only | Retain behind Admin BFF |
| `set_delete_pin(text)` | Admin + AAL2 | Repeat-safe outcome; every change audited | Retain behind Admin BFF |
| `delete_products_with_pin_v2(text[],text,text,uuid)` | Admin + AAL2 | Request UUID and payload hash | Retain behind Admin BFF |

## Tier 1 — guarded transitions with replay-safe terminal/state assignment

These functions enforce staff authorization and either return an existing
terminal state or assign a deterministic state on replay. They still move behind
the Admin BFF so session, rate, and audit controls remain centralized.

1. `advance_consignment(uuid,text)`
2. `finalize_consignment_receipt(uuid,text)`
3. `mark_conversation_read(uuid)`
4. `cancel_order_request(uuid,text)`
5. `confirm_order_request(uuid,text)`
6. `fulfill_order_request(uuid,text)`
7. `set_order_request_payment_status(uuid,text,text)`
8. `transition_pasabuy_request(uuid,text,text)`

## Tier 2 — guarded but idempotency must be supplied at the Admin BFF

These 13 functions enforce the live staff guard and fail transactionally, but a
repeated request can create an extra event, scan, message, manifest, transfer,
or reconciliation record. Their contract therefore remains
`required_at_bff`; the BFF command must claim an operation key and payload hash
before calling the database function.

1. `add_consignment_item_v2(uuid,text,text,text,date,integer)`
2. `create_consignment_manifest(text,text)`
3. `record_consignment_item_scan(uuid,uuid,text)`
4. `append_internal_message(uuid,text)`
5. `update_conversation_workflow(uuid,text,text,uuid,timestamptz,text)`
6. `record_packing_scan(uuid,text)`
7. `set_order_delivery_details(uuid,numeric,text,text,text,boolean,text)`
8. `reconcile_product_batches(text,jsonb,text)`
9. `set_batch_clearance_approval(uuid,boolean,text)`
10. `transfer_inventory_custody(text,text,text,text)`
11. `transfer_inventory_custody_exact(uuid,integer,text,text,text)`
12. `save_pasabuy_quote(uuid,numeric,numeric,text,timestamptz,numeric,text,numeric,numeric,numeric,numeric,numeric,timestamptz)`
13. `verify_internal_channel_event(text,text,text)`

The legacy whole-box `transfer_inventory_custody` RPC has the stricter
disposition `revoke_after_exact_lot_cutover`; it must not remain as a competing
inventory truth path once exact-lot custody is routed through the Admin BFF.

## Automated enforcement

The schema-truth audit now fails closed when a reviewed callable function loses
its required staff/Admin authorization signal or AAL2 signal. The fabricated
authorization regression deliberately removes both Admin and AAL2 signals from
`set_user_role` and verifies critical findings.

### Executable phase-one behavioral tier

`supabase/tests/map017_authorization_assertions.sql` now declares 12 unique,
machine-counted assertion groups. The isolated PostgreSQL lifecycle proves:

- explicit privilege removal and anonymous write/legacy-read denial;
- the two-column public stock projection without private lot or Draft exposure;
- customer and unsupported future-role write denial;
- current `Staff` and `Admin` phase-one allowance parity;
- `products_old` denial for Customer, Staff, and Admin browser roles;
- customer-versus-Staff RLS behavior through the expiring-lot view;
- anonymous and browser-Admin Storage write denial plus bucket limits;
- `products_old` removal from Realtime; and
- repository-owned future objects inheriting no browser privileges.

The runner derives its reported count from the SQL manifest, requires an
explicit success marker, and the entire assertion script rolls back. A direct
post-run query confirmed zero retained role-test rows and no future-object probe
table. All 127 repository API/security contracts pass. This is Tier **local
database-executed** evidence only.

It does not claim cross-user, guest-grant, cross-hub, guessed-UUID, finance,
warehouse/receiving, or full operational-RPC coverage. Those require the
corresponding canonical schemas, fixtures, and role contracts under later
MAP-017/MAP-019/MAP-020 work; unsupported role labels currently fail closed
rather than silently inheriting `Staff` access.

The current live breadth result after this matrix is 55 findings: 47 critical,
7 high, and 1 medium. The remaining findings are separately tiered in
`MAP_017_EXHAUSTIVE_AUTHORIZATION_AUDIT_2026-08-22.md`.
