# K2 Jimzon Master Owner Actions and Questions

This file contains only actions and business decisions that require the owner.
It is not an engineering backlog; implementation remains exclusively in
`MASTER_ACTION_PLAN.md`.

## Owner action priority

| Priority | Owner item | Needed before | Current action |
| --- | --- | --- | --- |
| **Immediate** | `OWNER-005` public-write-boundary migration | MAP-017 remediation of live critical findings | Authorize applying one prepared, rollback-validated migration to production |
| Early | `OWNER-002` reservation holds | MAP-023 reservation activation | Choose hold, expiry, and extension rules |
| Early | `OWNER-003` wholesale and response claims | MAP-019/MAP-023 commercial activation | Choose eligibility, pricing, credit, minimums, and any SLA |
| Early | `OWNER-006` customer retention and deletion | MAP-019 privacy workflow | Approve record-specific retention, legal holds, anonymization, and request ownership |
| Early | `OWNER-004` public contact channels | Public Contact page activation | Supply the monitored business numbers/channels |
| Before domains | `OWNER-001` domain and DNS | MAP-024 activation | Choose the domain and confirm DNS control/preservation |

## OWNER-005 — Authorize the public-write-boundary production migration

**Decision:** Pending

**Backup evidence ID:** Pending

**Backup/restore verification:** Pending

**Needed for:** MAP-017 remediation. This is the only thing now standing between
the live database and the removal of anonymous write access. Raised 22 August
2026 after the first real live schema audit.

**What was found.** The audit had never been run against the real database. Once
the exporter was repaired and executed, the live result was
`NON_CONFORMANT_CRITICAL` with 21 findings. Independently confirmed against the
catalog, not merely reported by the tool:

- The anonymous role holds broad write privileges on `brands`, `categories`,
  `warehouses`, `product_drafts`, and `products_old`.
- Those tables do have Row Level Security switched on, but their policies are
  blanket `ALL USING(true)` rules named "Admin Full Access", "Admins manage
  products", and "Staff manage product_drafts". A blanket policy does not
  restrict anything, so RLS is not containing the grant.
- The `product-images` storage bucket still carries "Anyone can upload", "Anyone
  can update", and "Anyone can delete" policies, with no file size limit and no
  MIME type allowlist.

In plain terms: today an unauthenticated visitor can write to catalog tables and
the product image bucket.

The first report incorrectly attributed a `realtime.messages` grant to
`public.messages`. The schema-qualified correction removed that false finding;
`public.messages` is not part of this phase-one write exposure. The corrected
subset remains 21 findings: 13 critical, 7 high, and 1 medium.

**Why this is not simply an engineering fix.** The correction already exists.
`20260812_map017_public_write_boundary_hardening` was written on 12 August, was
executed inside a live transaction and rolled back cleanly, and is the single
migration genuinely absent from the applied ledger. It was never applied because
MAP-016 gated all production changes. MAP-016's blockers are now closed, so the
remaining gate for this phase-one migration is the standing rule that permanent
production DDL requires explicit owner authorization. The later exhaustive audit
also found separate provider-owned and coordinated-cutover work; authorization
of phase one does not falsely close those findings.

**Fresh rehearsal result (22 August 2026):** Codex re-ran the exact migration and
postflight against today's production schema inside an explicit transaction that
ended in `ROLLBACK`. After correcting the missing safe-stock projection, the
postflight and an anonymous stock read passed, and a separate read-only query
passed all nine sampled restoration checks. The exhaustive audit now records 55
findings (47 critical, 7 high, 1 medium) after the 24 authenticated-RPC evidence
gaps were closed with a live guard matrix; the earlier 21-finding result is the
phase-one contract subset. All live findings remain present because nothing was
committed.

The local behavioral runner now derives 12 phase-one assertion groups from its
SQL manifest instead of reporting a hard-coded test count. The full isolated
bootstrap, rollback/restoration, apply, role/Storage/Realtime/default-privilege
behavior, and idempotent replay pass without retaining test rows. This strengthens
local evidence but does not replace the owner's production authorization.

The permanent executor is now prepared and exercised only against the isolated
PostgreSQL rehearsal database. It binds the exact SQL payload to SHA-256
`8AF7C69ABFBE6694302AC8AFD30A177EBEEA8461BD7B0963CD3AE23570DFC5F1`, writes
ledger version `20260824143000` in the same transaction, never retries the
write, and independently verifies the receipt plus 11 post-commit invariants.
It will refuse production unless this OWNER-005 section records the exact
decision `Authorized`, a named backup-evidence identifier exists, and every
project/payload/ledger/live-finding/recovery gate matches. No production apply
has been attempted.

**Options now:**

1. **Authorize the prepared migration.** Applies the reviewed, rollback-validated
   remediation and clears the verified phase-1 findings while restoring the
   minimal public stock projection without exposing lot rows. Recommended.
2. **Defer.** The anonymous write paths stay open until a later decision.

**What the owner must decide:** whether to permit this permanent DDL change.
Engineering must not apply production DDL without that authorization.

**Related decision surfaced at the same time:** `products_old` is a legacy table
that is still anonymously writable, still published in the realtime feed, and
confirmed on 22 August to be anonymously **readable** — all 14 of its rows are
returned to an unauthenticated caller. Whether it is retired, archived, or
retained is a data-retention decision, not a purely technical one. It is recorded
here rather than assumed.

**Scope note — this decision covers one migration, not the queue behind it.**
Five further migrations are prepared and unapplied. Four are safe to apply once
authorized, but `20260822_catalog_spreadsheet_commit` must **not** be applied yet:
it revokes direct write access to the products table from staff sessions, and
three Admin screens still write that table directly, so applying it early would
break product creation, spreadsheet editing, bulk status change, and bulk paste.
Each of those five will come back as its own authorization request when its
application-side prerequisites are actually met. Authorizing `OWNER-005` does not
authorize any of them.

**One reassuring result worth stating plainly.** A read-only behavioural test of
the live database confirmed that customer and staff data is *not* anonymously
readable: `user_profiles`, `orders`, and `product_batches` all refuse anonymous
requests outright, and `messages`, `conversations`, `channel_credentials`, and
`staff_allocations` return nothing. The problem described above is a write-side
and legacy-table exposure, not a customer-data leak.

**A second, customer-visible issue rides on the same migration.** Anonymous
callers currently cannot read `v_product_stock_from_batches`, the view holding
authoritative stock counts. The live storefront is throwing HTTP 401s for it
right now. The catalogue still displays because the deployed code quietly falls
back to the older stock column, which means shown availability may not be the
authoritative figure. This is the same permission gap the 21 August provider log
review recorded as repeated "permission denied for view" errors. Restoring that
grant is part of the same MAP-017 remediation, so authorizing it fixes a real
customer-facing accuracy problem as well as closing the write exposure.

## OWNER-001 — Production domain and DNS control

**Needed for:** `MAP-024` custom-domain activation only. Other local and platform
hardening can continue without this answer.

Please confirm:

1. The exact domain K2 will own and use publicly.
2. Who controls the registrar/DNS account and can approve DNS changes.
3. Whether any existing website, email, verification, or business records already
   use that domain and must be preserved.

**Recommendation:** use `www.<domain>` as the canonical storefront host, redirect
the apex `<domain>` to it, and use `admin.<domain>` only for the separate admin
Vercel project. Never point the admin hostname at the storefront project. Inspect
and preserve mail/verification DNS records before changing nameservers.

**Why the owner must answer:** choosing the production brand domain and granting
registrar access is a business ownership decision, not a safe engineering default.

The current case-by-case delivery, customer-resolution, and Pasabuy pricing
practices are recorded in `SYSTEM_BRAIN_CURRENT.md`. Add another question here
only when the owner must make a new business-policy decision that cannot be
answered by the Brain or handled safely as configurable system behavior.

## OWNER-002 — Reservation hold and release policy

**Needed for:** MAP-023 production activation of confirmed-order and wholesale
reservations. Schema, commands, audit, and release/recovery tests can be built
with a configurable duration before this answer.

Please confirm:

1. How long K2 should hold stock after staff confirms a direct/website order but
   before verified payment or another approved completion condition.
2. Whether Pasabuy and wholesale commitments use different hold durations.
3. Who may extend a hold, the maximum extension, and what customer communication
   is required before automatic or manual release.

**Recommendation:** store an explicit deadline on every temporary reservation;
notify staff before expiry; allow only authorized, reasoned extensions; and
release exact lots idempotently when the deadline passes. Never silently keep a
temporary reservation forever.

**Why the owner must answer:** the system can enforce and audit a configurable
policy, but engineering cannot invent how long K2 promises stock to a customer.

## OWNER-003 — Wholesale commercial policy and public response-time claims

**Needed for:** MAP-019/MAP-023 activation of server-authorized wholesale pricing,
terms, reordering, and any promised response time. Secure inquiry and manual
review can remain available without these answers.

Please confirm:

1. Who qualifies for wholesale and what business evidence staff must review.
2. Whether pricing uses approved account price lists, quantity tiers, manual
   quotes, or a controlled combination; include minimum order/case rules.
3. Whether K2 will offer payment terms or credit limits, and who may approve or
   suspend them.
4. Whether K2 wants to publish a response-time promise for retail, Pasabuy, or
   wholesale inquiries. If yes, define the measured business hours and owner.

**Recommendation:** begin with staff-approved organizations, immutable quote or
price-list versions, server-side eligibility, shared-stock revalidation, and no
credit until an explicit limit/approval policy exists. Remove the current
hard-coded 24-hour Pasabuy promise unless K2 adopts and measures it.

**Why the owner must answer:** eligibility, prices, credit risk, minimums, and a
public SLA are commercial promises, not safe engineering defaults.

## OWNER-006 — Customer-data retention and deletion policy

**Needed for:** MAP-019 customer privacy request, anonymization, and deletion
activation. Source guards preserve operational records until this is decided.

Please confirm with appropriate Philippine legal/accounting advice:

1. Retention periods for customer contact/delivery PII, orders, payments,
   invoices, quotations, fulfillment evidence, Pasabuy/Wholesale inquiries,
   conversations, security evidence, and backups.
2. Which active operations, disputes, chargebacks, warranties, tax/accounting
   duties, fraud/security investigations, or legal holds pause anonymization.
3. Who receives and verifies a request, who may approve irreversible execution,
   the response channel, and whether an appeal/recovery window is required.
4. Which fields may be anonymized while the operational record remains, and
   when the Supabase Auth identity may be disabled or deleted.

**Recommendation:** revoke access promptly after verified approval, preserve
restricted financial/operational truth for its approved basis, anonymize
eligible PII transactionally, never cascade-delete the canonical customer, and
let backup copies age out under the documented backup schedule.

**Why the owner must answer:** engineering cannot invent legal/tax retention or
promise erasure while K2 still needs a record for fulfillment, disputes,
accounting, security, or recovery.

## OWNER-004 — Public phone, Viber, and WhatsApp details

**Needed for:** publishing direct phone-based channels on the storefront Contact
us page. Email, Messenger, Shopee, and secure Website messaging can proceed
without this answer.

Please confirm:

1. The exact public K2 business phone number, including country code.
2. Whether that same number is active for calls, SMS, Viber, and WhatsApp, or
   whether each channel uses a different number.
3. Which of those channels K2 wants customers to use publicly.

**Recommendation:** publish only dedicated business numbers that staff actively
monitor, format them with `+63`, and test every public link from a real phone
before launch.

**Why the owner must answer:** engineering must not invent or expose a private
number, and a configured channel name does not prove the account is monitored.
