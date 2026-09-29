# Anonymous execute surface reconciled, and the publication guard rehearsed

**Date:** 29 September 2026. **Read-only on production except where stated.**
**Idea:** IDEA-20260929-05. **Owning items:** MAP-017 (execute surface),
MAP-018 (publication gate), MAP-019 (signed guest cutover).

## The 10-versus-18 discrepancy is resolved

Earlier sessions recorded an unexplained gap: the live database has **10**
anonymous-executable public functions while the repository policy expects
**18**. Left as a bare number it reads as a security finding. It is not one. The
live set is the sum of two deliberate states, and both are now classified by
`npm run readiness:k2-live` instead of merely counted.

Measured live, read-only:

| Class | Count | Meaning |
| --- | --- | --- |
| Expected and live | 5 | The current policy's grants that have been applied. |
| Legacy transitional | 5 | The direct RPCs the prepared signed-guest chain replaces. |
| Expected but not yet applied | 13 | The unapplied portion of the MAP-019/020 chain. |

5 + 5 = 10 live. 5 + 13 = 18 expected. The arithmetic closes exactly, so there is
no unexplained residue.

### The 5 expected and live

`get_public_product_stock`, `get_storefront_chat_v1`, `get_order_conversation_v1`,
`submit_order_message_v1`, `submit_order_payment_receipt_v1`.

### The 5 legacy transitional grants, and what replaces each

| Transitional grant | Replaced by (unapplied) |
| --- | --- |
| `submit_order_request` | `submit_guest_order_v1` |
| `submit_order_request_v2` | `submit_guest_order_v1` |
| `submit_pasabuy_request` | `submit_guest_pasabuy_v1` |
| `submit_storefront_chat_v1` | `start_guest_conversation_v1` + `append_guest_message_v1` |
| `validate_coupon` | `preview_guest_coupon_v1` |

This is a one-to-one replacement map, so the MAP-019 cutover now has an explicit
revocation list rather than a count to be interpreted. All five were confirmed
reachable by `anon` through `has_function_privilege` at the time of measurement.

**Count correction:** the Master Action Plan refers to "six transitional direct
guest RPC grants". The measured current figure is **five functions**. There is no
sixth hiding on a table: `information_schema.role_table_grants` returns **zero**
`anon` table privileges in `public`. The sixth was most likely counted before
`get_storefront_chat_v1` was added to the expected policy list, or referred to a
grant since revoked. Recorded so the number in the plan is not carried forward
as fact.

### The broader boundary is intact

- `PUBLIC` holds **no** implicit execute on any function in `public`. The
  25 September stock-grant correction is verified still in place, and
  `readiness:k2-live` now asserts it as a first-class gate.
- `anon` holds **zero** table-level privileges in `public`.
- All 10 live functions are `SECURITY DEFINER` with explicit named grants only.

The live surface is narrow and known. It is mid-cutover, not overgrown.

## The publication review guard is now prepared and rehearsed

The admin sheet on `main` refuses to publish an unreviewed product, but that only
closes the admin path. A different writer — and the undeclared
`k2-jimzon-vert.vercel.app` surface proves one exists — could still set
`published = true` directly, which is exactly how all 22 published products
reached customers with `is_human_reviewed = false`.

New files:

- `supabase/migrations/20260929_published_requires_human_review.sql`
- `supabase/migrations/20260929_published_requires_human_review_rollback.sql`
- `supabase/tests/published_review_guard_bootstrap.sql`
- `supabase/tests/published_review_guard_assertions.sql`
- `scripts/rehearse-published-review-guard.mjs`, exposed as
  `npm run rehearse:published-review-guard`

The constraint is a single statement, added **NOT VALID** on purpose: 22 live rows
already violate it, and validating would fail. NOT VALID still enforces the rule
on every future insert and update, which is the bypass being closed, while leaving
history readable.

### Rehearsal evidence

`npm run rehearse:published-review-guard` passed against an isolated
PostgreSQL 17.11 cluster on a loopback port, running the real migration file
verbatim including its preflight:

1. The constraint lands **NOT VALID** with two rows already violating it.
2. The pre-existing published rows stay readable.
3. Publishing an unreviewed product is **refused**.
4. Marking it reviewed and then publishing **succeeds** — staff are not locked out.
5. **Unpublishing** a legacy row is **allowed**, so the owner can act on the 22
   without first reviewing them.
6. Editing an unrelated column of an already-published legacy row is **refused**.
7. The rollback drops the constraint and restores the previous behaviour,
   confirmed by an unreviewed publish that then succeeds.

Two of the rehearsal's own test lines were wrong and the guard caught them, which
is the point: an attempt to re-publish a legacy row was refused, exactly as
intended. The test was corrected rather than the guard.

### Operational consequence, stated before anyone applies it

Assertion 6 is a behaviour change, not a formality. Once this constraint is
applied, **any staff edit to one of the 22 published-and-unreviewed products will
be rejected** until that row is either marked human-reviewed or unpublished,
even if the edit touches an unrelated column. That is the intended pressure, but
it is the owner's decision about those 22 products, not this file's, and it is
why the migration stays unapplied.

## What is still not done

- The migration is **prepared and rehearsed, not applied.** Applying it is a
  production write and needs the owner authorization named in the MAP.
- The 5 legacy transitional grants are **still live and still anon-reachable.**
  Revocation belongs to the MAP-019 signed-guest cutover, which needs its Preview
  continuity evidence first.
- The 13 unapplied expected functions are the prepared chain, not a defect.
- No production row, grant, function or flag changed in this work.
