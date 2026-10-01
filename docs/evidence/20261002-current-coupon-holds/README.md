# Current signed coupons and confirmation commitment — 2 October 2026

IDEA-20261001-06 and IDEA-20261002-01; owning MAP-023, with installation and
recovery under MAP-017/020. Feature branch `codex/map017-guest-chat-preview`.
Prepared and locally verified only. No provider SQL, configuration, records,
push, deployment or shipping implementation changed.

The owner retained separate NCR Lalamove/Grab express. The delivery candidate's
separate approach question remains pending. This independent slice verifies the
existing prepared coupon/purchase/confirmation behavior on the current restore;
it does not approve that shipping candidate or make browser fees authoritative.

## Request, defect and correction

The preceding signed-hold witness verified the whole purchase migration and
current 11-argument writer but did not install confirmation commitment or test
coupons. The new `--coupon-lifecycle` mode uses the same exact loopback/restore,
random clone ownership marker, actual signed anonymous entry and current schema.
It adds the whole `20260912_confirmation_stock_commitment.sql` source, making
30 manifest entries. Existing recount scope is still an extracted original
function followed by its repository lock patch; this is not a full provider
installation or every pending writer.

Actual confirmation exposed a compatibility defect missed by the unconstrained
synthetic legacy table: the restored `inventory_events_event_type_check` allowed
eight event names but rejected the required `stock_committed` event. The unapplied
confirmation migration now adds only that event to the reviewed vocabulary,
retains the prior eight, validates existing history and refuses unfamiliar or
unvalidated named constraints. A legacy fixture with no check receives the same
validated nine-value check. No audit row is rewritten or removed.

Independent review identified two guard defects. A failed real regression proved
that global whitespace removal could accept a changed quoted event name; exact
canonical definition comparison now preserves literal contents. A second failed
regression queued owner DDL ahead of installation behind a current writer: the
old implementation inspected before locking and overwrote the unfamiliar new
check. Installation now takes `ACCESS EXCLUSIVE` before inspection, sees the
committed owner definition and refuses without overwriting it. This lock belongs
to the installation transaction and must be included in provider apply review.

The witness also corrected its own fixture UUID command-tag parsing, used the
current valid `not_requested` payment state, and assigned independent fixture
buyers documentation-range IPs. The real five-order IP limiter remains active;
these cases do not disable or claim new rate-limit behavior.

## Verification

All times below are UTC; the work date is 2 October in Asia/Singapore.

| Command/check | Recorded result |
| --- | --- |
| `node scripts/rehearse-website-stock-locks.mjs --signed-holds --coupon-lifecycle` | Exit 0, **77/77**, captured `2026-10-01T16:24:57.037Z`; 30 entries, `couponConfirmationIntegration=true`. |
| Same command with `--before-event-type` | Expected exit 1; **47 pass, one fail**. Clone-only restoration of the original eight-value check rejects commitment. The accepted order, coupon, legacy rows, allocations and events remain unchanged before the intended failure. |
| Same command with `--before-commitment` | Expected exit 1; **46 pass, one fail**. Actual confirmation without the later migration does not record ownership commitment. |
| Quoted-literal guard before correction | Expected exit 1; **43 pass, one fail** in `before-literal-guard-receipt.json`. The intermediate migration normalized away the trailing space. |
| Constraint-lock guard before correction | Expected exit 1; **44 pass, one fail** in `before-constraint-lock-receipt.json`. Queued owner DDL was overwritten. |
| `node scripts/rehearse-purchase-time-reservation.mjs` | Final corrected source exits 0, **48/48** on its separate synthetic legacy fixture; it does not establish current payment/handover acceptance. |
| `npx playwright test --config=playwright.api.config.js tests/confirmation-commitment-contract.spec.js tests/purchase-time-reservation.spec.js` | Final corrected source: exit 0, **20/20**. |
| `npm run verify:development` | Once after the final code edit: exit 0, zero source security gaps, secret scan 1,721 files and import-integrity pass. Later documentation changes do not repeat application checks. |
| Independent source review | Both Important guard findings were reproduced and resolved; final read-only review found no remaining actionable defect in this scoped slice. Reviewer verified green source hashes, claims and cleanup, without repeating SQL/provider tests. |
| Cleanup/shutdown | Every final red/green receipt records marker-matched clone removal and unchanged original count/function/ACL fingerprint. `runtime-receipt.json` records clean fast stop of exact postmaster PID 14500, no PID file/process, and actual refused connections to ports 54388 and 54331. |
| Final staged scope/integrity/security | `git diff --cached --check` exits 0; final witness pins and 89 entries across the current green/two baseline manifests match source. Sensitive-file policy passes 1,723 files; secret scan passes 1,724. The owner Gemini row and `.backups/` are excluded and the working idea file is preserved byte for byte. |

The final witness SHA-256 is
`c5b6ace947f5e762c935de7b02bc904054b9dc965127a7b3adf63ba5c946ed75`.
Final confirmation source SHA-256 is
`ce149700884acfb38a168e9f0c68119782e9dca6058985d6ca1428f46b08872a`.
The current green and two controlled baseline receipts pin the final witness.
The literal/lock red receipts deliberately retain their intermediate migration
hashes; they are failing-first history, not current installation manifests.
The historical 1 October 42-check/29-entry receipts are preserved unchanged.

The current run proves fixed/percentage/capped discounts from canonical subtotal,
existing fixture shipping/total continuity, no early redemption, signed replay,
confirmation/replay with one attributable commitment per exact lot and unchanged
physical custody, direct helper-role denials, committed expiry exclusion,
cancellation/replay retaining commitment history and one coupon release, all
eight prior event names and unknown-event rejection. Missing/inactive/archived/
future/expired/exhausted/minimum-spend coupon refusals roll back business records,
holds and transactional request controls. Two actual confirmations serialize the
last coupon redemption; the loser remains unchanged. A forced second-lot event
failure rolls back confirmation, redemption, legacy rows and commitment events;
retrying the same order commits both lots and redeems once.

Coupon redemption rows remain `reserved` at confirmation under the existing
schema, and cancellation releases them. This slice does not prove their later
handover transition. Preserving a controlled ₱95 fixture fee proves continuity,
not rate/destination/weight authority or immutable-charge enforcement.

## Remaining work and recovery

MAP-023 still owns the complete current payment/handover/remaining-writer chain,
server-authoritative delivery and real operating cycles. MAP-017/020 must expand
the stale installer/captures to include this constraint and commitment objects,
verify recovery against the exact current schema, refresh same-target backup and
obtain exact apply/configuration authorization. MAP-018 retains real reviewed
product facts, media rights, Website assignment and physical counts. MAP-025
retains human payment/QR/dispatch acceptance. Nothing here is applied, deployed
or verified on the real host.

Local recovery is a scoped source revert retaining these receipts; stop owned
sessions and drop only a marker-matched disposable clone. The original restore
is read-only to this witness. Transaction rollback evidence is not provider
installation recovery. `confirmation_stock_commitment_rollback.sql` remains a
historical broad installer: it can replace later ordered/coverage hold bodies and
sweep exemptions, and is **not approved for the current composed chain**. Current
provider recovery must use reviewed exact function/ACL snapshots or controlled
deactivation/roll-forward, retaining commitment columns, `stock_committed` events
and the extended check; never delete history to restore the old vocabulary.

The exact next independent local action is to compose and rehearse the current
payment/handover definitions with these confirmed holds and coupon facts. The
delivery approach choice remains with the owner; do not repeat the answered
express-policy question or infer approval from elapsed time.
