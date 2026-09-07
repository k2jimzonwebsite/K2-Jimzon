# Operational readiness evidence — 7 September 2026

**Owning scope:** `IDEA-20260907-01` / MAP-018, MAP-023, MAP-026 and
MAP-028 I-016

**Checkout:** `.tools/hero-release`, branch
`codex/automatic-intake-preparation`, baseline `04734cb`

This record began as local preparation evidence. No API key was requested, no
paid provider call was made, no production SQL or migration was activated, and
no external channel operation was attempted. The owner later authorized a code
promotion to GitHub `main` and the two linked Vercel projects; that promotion is
tracked separately from database/provider/channel activation and is not claimed
until remote receipts are appended below.

## Production-release preflight

The fresh CI-equivalent local gate passed on 7 September 2026: dependency audit
reported zero vulnerabilities; security, environment, tracked-file, secret,
history and import checks passed; isolated Storefront and Admin builds passed;
and the aggregate acceptance command passed 641 base, 30 Storefront, 31 Admin,
1 Product Master, 1 Owner Close, 3 customer/Wholesale, 8 selling, 4 workflow API
and 2 intake-AI checks. A stale timeout source assertion failed on the first
aggregate run; it was corrected to verify the 15-second Admin command default,
the deliberate 125-second paid-start bound, and the absence of command retry.
The focused timeout suite then passed 8/8 before the full aggregate rerun.

The CI database portion also passed locally in a dedicated loopback PostgreSQL
17.11 cluster: MAP-017 migration/rollback and 12 authorization groups, followed
by the catalog migration/replay/security/rollback lifecycle. The three focused
operational runners were rerun successfully; the last-unit competitor waited
1825ms, and the channel vocabulary retained all 13 exact-shop checks. None of
these commands contacted or changed production.

## PostgreSQL rehearsals

The worktree does not contain a second PostgreSQL binary bundle. The existing
repository-local runtime was supplied explicitly to the three portable runners:

```powershell
$env:K2_TEST_PG_BIN = 'C:\Users\jerze\K2 JImzon\.tools\postgresql-17.11\runtime\pgsql\bin'
npm.cmd run rehearse:map023-last-unit
npm.cmd run rehearse:marketplace-snapshots
npm.cmd run rehearse:channel-vocabulary
```

The commands ran sequentially. Last-unit and marketplace use port 54329;
channel vocabulary uses 54328. All three exited successfully in the original
continuation. The audit reran all three successfully, including the expanded
last-unit and corrected channel rehearsals described below.

`rehearse:map023-last-unit` passed:

- migration installation of `confirm_order_request`;
- a winning transaction holding the one-unit lot lock;
- a competing transaction waiting and then receiving insufficient-stock
  refusal;
- exactly one confirmed order, reservation, event, and balance for the last
  unit; and
- same confirmed-order retry without duplicate effects.

`rehearse:marketplace-snapshots` passed:

- bootstrap and preflight;
- migration and migration replay;
- staged exact-shop snapshot/order behavior, duplicate/conflict and close
  assertions;
- postflight; and
- non-destructive rollback, including revoked entry points with staged evidence
  retained.

`rehearse:channel-vocabulary` originally passed 12 checks. Audit found that the
external-item negative case repeated the same shop/SKU and could pass for the
wrong constraint. The corrected runner passes 13 checks: item IDs can repeat
across shops, but a shop cannot map the same item to a second SKU. Denials now
require the exact expected SQLSTATE/message, including the named unique index.

The first sandbox-only attempt could not start PostgreSQL because Windows
restricted-token creation was denied. The successful rerun used the isolated
local runtime and loopback database process. This execution detail is not a
production-access or deployment result.

## Focused contract, browser, and build verification

The final scoped API/contract command in the MAP passed 86/86, including the
payment validator, receiving, exact-shop channel, marketplace-order,
product-intake and portable channel-runtime assertions. The local browser
suites also passed:

- `npm.cmd run test:admin-ui`: 31/31;
- `npm.cmd run test:intake-ai-ui`: 2/2; and
- `npm.cmd run test:owner-count-close-ui`: 1/1.

The first sandbox-only Admin browser launch failed before application
assertions with `browserType.launch: spawn EPERM`; the approved local rerun
passed. `npm.cmd run build:admin` passed its prebuild security gates, boundary,
budget and secret scan (188.47 kB/300.00 kB Admin entry). The separate
`npm.cmd run build:storefront` passed the same checks (149.89 kB/150.00 kB
landing JS gzip; 27.46 kB/30.00 kB CSS gzip). Builds only produced local
checkout artifacts; neither project was deployed.

## Session audit and corrected evidence

The original browser/build counts above are supported by this session's actual
successful tool outputs. They were not rerun for the subsequent documentation
and rehearsal-only changes. The scoped contract command was rerun: **86 passed
(3.1s)**. No application UI, bundle code, PRODUCT.md or DESIGN.md changed in this
audit.

The expanded `npm.cmd run rehearse:map023-last-unit` now also extracts and executes
six original SQL functions from the 20260803 and 20260809 migrations using
`supabase/tests/operational_readiness_{bootstrap,assertions}.sql`. This phase
runs inside a transaction that rolls back before the concurrency fixture:

- Declaring two lines creates neither scanned units nor stock; premature
  departure/Manila scans and a line from another manifest are refused.
- Milan and Manila counts remain independent; extra scans are refused.
- Receiving retains box/source identities, records one missing unit and actor/
  time/note, and quarantines a 45-day lot. Physical stock includes quarantined
  units while sellable stock excludes them. Finalization retry duplicates nothing.
- Payment rejects skipped transitions and empty evidence, records event actor,
  timestamp, note and state metadata, and preserves same-state retry behavior.
  Refund here is a manual recorded state, with no money movement.
- The concurrency probe now waits for PostgreSQL's actual `PgSleep` wait event
  after confirmation. The competitor waited **1835ms**, was refused, and final
  reservation/order/event/balance counts and retry invariants passed.

This uses a minimal compatible schema and synthetic `auth.uid`/`is_staff`.
It proves the extracted functions' behavior, not complete migrations, Supabase
Auth/RLS, signed BFF commands, scanner hardware, or intake-to-stock end-to-end
acceptance. The original receiving checks were source inspections; the original
three database runs did not execute receiving. The prior blanket claim that
payment actor/time or automatic receipt quarantine were absent was incorrect.
The prior statement that no secret existed anywhere in the checkout was also
unsupported; no secret was added by this work.

New automation, supplier receipts and richer arrival-exception handling remain
separate engineering scope. The MAP retains those gaps instead of describing
the remaining work as only owner inputs/provider activation.

Fresh `npm.cmd run security:surfaces` passed with 92 prepared Admin routes,
15 Storefront routes and zero route-control classification gaps. Architecture
and project-map records were corrected for stale route counts, flag-off browser
Supabase behavior and unproven production RLS/grant assertions. The inventory
is source evidence only.
`npm.cmd run security:secrets` also passed over 889 in-scope files, and
`git diff --check` passed (line-ending warnings only). Neither check establishes
the contents of excluded/ignored local files or production configuration.

## Operational trace

| Area | Locally prepared/current evidence | Still not established |
| --- | --- | --- |
| Payment | Admin state transition and free-text event with actor/time; malformed types refused; SQL transition/note/retry behavior executed | Structured method/amount/currency/payer/reference/proof, verifier separation, instruction receipt, approved merchant details, real staff/payment acceptance |
| Intake/receiving | Declared lines, independent scans, receipt quantities/box/source, shortage, automatic short-date quarantine and retry executed in isolated SQL; Draft/opening-balance paths covered separately | Supplier receipt, rich wrong-item/damage/unexpected-goods workflow, composed intake/UI/BFF/RLS acceptance, production migration/flag and real receiving acceptance |
| Exact-shop channels | Snapshot/order staging binds a provider to one saved shop ID; product matching, duplicate/changed-payload conflict, Owner Count & Close and observation-only quantities pass local rehearsal | Redacted real exports/dictionaries, provider receipts, Shopee order ingestion, Lazada/TikTok/social adapters, outbound listing/publication and stock synchronization |

## Activation handoff

Remaining activation steps are intentionally not represented as completed:

1. Approve the payment method, payee/merchant/QR details, instruction channel
   and template, reference format, proof retention and `finance.verify`/AAL2
   responsibility. The GCash candidate in `IDEA-20260902-04` is captured but
   not audited or authorized for implementation.
2. Review and implement the structured payment instruction/evidence boundary,
   then apply its migration only through the approved MAP-017 window and run
   negative, uncertain, idempotent and verifier-separation acceptance.
3. For receiving, complete the rich arrival-disposition and canonical supplier
   receiving design before claiming those workflows; apply the existing
   prepared boundaries only through their coordinated activation order.
4. For channels, review one real export per exact shop, map it to the fixed
   schema, approve retention, run the real-export rehearsal, and prove the
   provider/canonical reconciliation before any connector or publication flag.

Recovery is selective: preserve the staged/uncertain evidence, disable only an
activated capability, reconcile its receipt before retrying, and use the
reviewed rollback SQL for that boundary. Do not reset the worktree or delete
evidence to make a retry appear clean.
