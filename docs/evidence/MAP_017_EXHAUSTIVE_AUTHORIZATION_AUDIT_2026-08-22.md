# MAP-017 Exhaustive Exposed-Authorization Audit — 22 August 2026

## Verdict

`NON_CONFORMANT_CRITICAL`: **55 control findings** across every object currently
present in the exposed `public` schema: **47 critical, 7 high, and 1 medium**.
Findings are control failures, not a count of unique exploit paths; several
deliberately overlap when one object has both a broad grant and an unsafe policy.

This supersedes the earlier 21-finding report as the authoritative breadth
assessment. The earlier report remains the exact comparison for its reviewed
13-table, 4-view, 5-function phase-one contract.

**24 August 2026 refresh:** the live metadata export and exhaustive comparator
were rerun without mutation. The inventory and result are unchanged at 42 public
tables, 9 public views, 53 public functions, 15 schema grants, 120 default-
privilege entries, and 55 findings (47 critical, 7 high, 1 medium). The anonymous
behavioral probe is also unchanged at 12/14, including all 14 `products_old`
rows exposed and HTTP 401 for `v_product_stock_from_batches`. The exact prepared
migration again passed production preflight, postflight, and anonymous stock
read inside a forced-rollback transaction, followed by 9/9 baseline restoration
checks. The isolated PostgreSQL lifecycle passed all 12 authorization assertion
groups and idempotent replay. The new `npm.cmd run verify:map017-portable`
command reproduced the complete local lifecycle from a stopped-server state and
stopped the server afterward. The lifecycle now executes the exact generated
permanent-apply payload, records its atomic ledger receipt, independently checks
11 post-commit invariants, and proves idempotent replay. All 20 schema-truth tool
tests and all 11 authorization contract tests pass. No production DDL was
committed.

The production apply path is prepared but remains owner-gated and unused. Its
three SQL artifacts are bound to SHA-256
`D1E1EAA0696F12BF467584016A5013B655BB074D44D2A52AFF3951B335EBDB62`; the
atomic receipt uses ledger version `20260824143000`. Execution requires a
durable OWNER-005 Authorized decision, exact project/hash/ledger/finding-count
confirmations, a named backup-evidence identifier, and roll-forward recovery
acknowledgement. It performs no automatic write retry; an ambiguous response is
accepted only when the separate read-only receipt and all invariants pass.

The payload hash above was corrected on 26 August 2026 after independent review
proved the earlier recorded token did not identify the final committed SQL. The
SQL artifacts themselves were not changed by that documentation correction.

## Evidence boundary

- Live metadata refreshed read-only through the Supabase Management API.
- 42/42 public tables, 9/9 public views, and 53/53 public functions audited.
- 15 schema-grant entries and 120 explicit default-privilege entries audited.
- No row data, function bodies, credentials, tokens, emails, or customer data
  were exported. Boolean-only live signals record whether each function body
  references the reviewed staff/admin/AAL2 guards and explicit exceptions.
- The export contract is now `2026-08-22.map017.meta.v2` and fails closed when
  schema grants or default privileges are missing.

## Tier 0 — controls verified across the complete exposed inventory

- All 42 public tables have RLS enabled.
- All nine public views have `security_invoker=true`.
- No client role has `CREATE` on the exposed `public` or `storage` schemas.
- The audit is schema-qualified, so grants on `realtime.messages` cannot be
  misattributed to `public.messages`.
- All 24 previously unreviewed authenticated RPCs now have explicit state,
  ownership, AAL2, idempotency, failure, and disposition contracts. Their live
  guard signals match those contracts. This closes 24 evidence findings; it does
  not convert transitional direct RPCs into the target Admin BFF boundary.

These facts do not neutralize the findings below: RLS with a blanket write
policy, and `security_invoker` with broad relation privileges, remain unsafe.

## Tier 1 — 47 critical live control findings

| Group | Count | Current evidence |
| --- | ---: | --- |
| Anonymous write-capable table grants | 6 | `brands`, `categories`, `warehouses`, `product_drafts`, `products_old`, and `error_reports` |
| Blanket public write policies | 5 | Four catalog/legacy policies plus anonymous `error_reports` insertion |
| Blanket authenticated write policy | 1 | All authenticated identities can manage all `product_drafts` |
| Client DML grants on views | 2 | `v_expiring_batches` and `v_channel_catalog_readiness` carry broad anon/authenticated relation privileges |
| PostgreSQL `PUBLIC` function execution | 7 | `receive_po`, `receive_po_scanned`, and five trigger/helper functions retain default execution |
| Unreviewed anonymous function execution | 11 | Includes the seven above plus `validate_coupon`, both order submission RPCs, and Pasabuy submission |
| Unsafe future-object defaults in `public` | 12 | `postgres` and `supabase_admin`, each split by anon/authenticated and tables/functions/sequences |
| Public Storage write policies | 3 | Anyone can upload, update, and delete in `product-images` |

The seven `PUBLIC`-executable functions are:

1. `public.receive_po(uuid)`
2. `public.receive_po_scanned(uuid,jsonb)`
3. `public.reject_event_mutation()`
4. `public.touch_staff_allocations()`
5. `public.sync_product_compat_columns()`
6. `public.sync_product_batch_compat_columns()`
7. `public.prevent_conversation_event_mutation()`

## Tier 2 — 7 high and 1 medium findings

- Anonymous SELECT remains on two operational views.
- The safe public stock function is absent and its view lacks the intended
  anonymous SELECT grant (one high plus one medium).
- The product-image bucket lacks both size and MIME enforcement.
- `products_old` remains in Realtime.
- The phase-one migration ledger entry is absent.

## Remediation and blocker classification

### Ready but owner-gated

The phase-one migration now also hardens `postgres`-owned default privileges.
Its exact migration, postflight, anonymous stock read, and forced rollback pass
against production; the isolated PostgreSQL lifecycle also passes apply,
rollback restoration, authorization behavior, and idempotent replay. Permanent
application still requires `OWNER-005`.

### Provider-owned blocker

A rollback-only production rehearsal proved the Management API SQL role cannot
change default privileges owned by `supabase_admin` (`42501 permission denied`).
That attempted transaction committed nothing. The unsupported statements were
removed from phase one. The six `supabase_admin` default groups require a
provider-supported owner context or Supabase support/configuration path; they
must not be bypassed or falsely reported fixed.

### Separate coordinated cutovers

- Direct anonymous `error_reports` insertion is now selected for retirement:
  Admin classifications already use the protected redacted boundary and
  Storefront errors remain local, so no replacement public intake is required.
  The separate revoke/policy migration passes locally but remains unapplied.
- Legacy anonymous order, Pasabuy, and coupon RPCs require the prepared
  Storefront BFF cutover before revocation (MAP-019/020).
- The prepared function-execute lockdown removes the two obsolete purchase RPCs
  and client execution from trigger helpers, but remains unapplied.
- The 24 authenticated RPC reviews are recorded in
  `MAP_017_FUNCTION_AUTHORIZATION_MATRIX_2026-08-22.md`. Thirteen mutations still
  require an idempotency boundary at the Admin BFF or exact-lot replacement;
  their reviewed status is not permission to keep browser-direct mutations as
  the final architecture.

## Reproduction

```text
npm run evidence:map017-schema
npm run audit:schema-truth -- --export=live-schema-metadata.json --allow-findings
npm run rehearse:map017-local -- --target=<loopback k2_map017_rehearsal database>
npm run evidence:map017-rehearse
```

The live metadata file is ignored and is not a database backup.
