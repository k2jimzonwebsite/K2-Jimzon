# MAP-019 closure authority core — 27 October 2026

IDEA-20261027-02. The owner's complete profile/settings/deletion goal remains active. This qualifies the locally prepared decision and journal components; nothing is installed, subscribed, deployed or enabled, and no real account is closed.

## Change and reason

`server/privacy-authority/state.js` validates exact K2/genesis commands, binds immutable logical operation bytes, derives separate predecessor-bound candidates, and reconstructs checkpoint consistency from exact ordered receipts. One original Auth UUID has one open request and cannot register again after authorization. Cancellation, expiry and authorization have one terminal winner. Historical receipts always return `execution.allowed=false`; default proof adapters deny access.

`journal.js` implements the reviewed conditional direct-object protocol over injected R2 operations and a monotonic witness: immutable command/candidate, head ETag CAS, exact commit seal, and witnessed result. It scans every marker page, rebuilds continuity from pinned genesis, compares the independent witness and rechecks the head around the scan. Rollback, forks, missing records and conflicting seals refuse. Unsealed winners block later decisions. A single default nine-second deadline covers every awaited object/proof/witness operation; expired work cannot start further I/O. Already-issued writes can finish later, so a timeout remains uncertainty and an identical operation reconciles it.

`sqlite-witness.js` maintains dedicated control, request, actor and exact-operation tables in a synchronous transaction, then calls the documented storage flush before acknowledgment. It verifies both incoming and existing checkpoints, preserves the witnessed operation prefix, and returns pending on a legitimate concurrent advance during validation. Native SQL parameters hold the bounded canonical pseudonymous records; the fixed table names are internal. There is no second customer/order/payment database or business-data writer.

`package.json` includes the three maintained authority suites in the existing privacy/development gate. No frontend or existing closure-route wiring changed in this batch.

## Evidence

| Check | Observed result |
| --- | --- |
| Missing state/journal/witness modules before implementation | Expected module-missing red runs; these are initial harness failures, not behavioral regression proof. |
| Review regressions before fixes | Two command timing/identity failures; malformed self-checksummed checkpoint failures; two hung-I/O failures; two native witness history/corruption failures; concurrent witness advance failure. All were observed failing before their fixes. Tool execution IDs and descriptions are retained in the JSON receipt. |
| Final focused command | `node --test tests/customer-closure-authority-state.test.mjs tests/customer-closure-authority-journal.test.mjs tests/customer-closure-authority-sqlite.test.mjs`: 45 passed, zero failed (18 state, 21 journal, 6 native SQLite). |
| Independent review | Bounded source/re-test review approves local components, no remaining Critical/Important findings; independently 45/45. Earlier findings and fixes are preserved. |
| Initial development gate | Stopped at unrelated existing Product Master loopback fixture, 90/91; no request reached localhost. Diagnostic fetch reports `connect EACCES`. |
| Focused environment diagnosis | Existing `tests/admin-product-master-recovery-client.test.mjs`: sandbox 1/2, then loopback-enabled 2/2, no application/test source change. |
| Final development gate | `npm run verify:development` with loopback access: exit 0, including 64 privacy Node checks. Private failed and passing logs are retained and hashed in the JSON receipt. |

Native witness tests use Node 24.16.0 / SQLite 3.53.0 with real file-backed SQL, transactions, rollback, separate connections and reopen. Only the API facade maps Node SQL to the documented Durable Object synchronous interface; its `sync()` is a no-op because native SQLite commits synchronously. Journal tests use an in-memory conditional object-I/O double, not actual R2. These tests verify the real source algorithm and SQL, not Cloudflare runtime, replication, storage protection, delivery, capacity or real customer/provider behavior.

## Review disposition

Accepted/fixed: snapshot commands before the first await; claim exact operation bytes before current-state transition refusal; reconstruct the full checkpoint rather than trusting a checksum or partial indexes; bound all remote/proof waits; preserve existing witness history and reject corrupt previous state; classify legitimate checkpoint advancement as pending instead of false corruption. No objection was rejected. The reviewer briefly hit a usage limit, then resumed and completed the final review; the interrupted message is not counted as approval.

## Limits, recovery and continuation

The complete service still needs actual Workers/R2/SQLite composition, serialized coordinator behavior, capacity/deadline qualification, append-only custody and bootstrap/key recovery, authenticated proof/manifest adapters, native freeze barriers across all writers, versioned offline suppression including absent old Auth rows, provider access/Storage/Auth isolation and cleanup, supported scheduling/resumption, signup/code/re-registration/sign-out and real-host customer/staff journeys. OWNER-006 retention and exact production actions remain open. The complete goal is not achieved by these green tests.

The current full replay repeatedly verifies prior receipts; it is correctness-first local source, with no measured production growth bound or resumable background checkpoint scan. Exhausted pages/time return pending. Capacity and recovery progress beyond that bounded scan must qualify before activation; no claim of background recovery exists yet.

Before adoption, recovery removes only these three new modules/tests and the added test-command entries, preserving all prior work, receipts and design evidence. They have no caller in a live artifact. Never restore closed PII as an application rollback. Exact next work and unresolved gates live only in MAP-019 in `MASTER_ACTION_PLAN.md`; this receipt is evidence, not another backlog.

Provider contract references: [R2 conditional operations and pagination](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [direct consistency](https://developers.cloudflare.com/r2/reference/consistency/), and [Durable Object SQLite transactions/flush](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/). Documented contracts inform the candidate; no K2 provider guarantee was exercised.
