# Italy box scanner preparation — 30 October 2026

Owner: MAP-023 / IDEA-20261030-01. **Locally prepared; not applied or deployed.**

## Request and decision

The owner reported that the camera control was disabled and that staff packing Italy-to-Philippines boxes should not have to supply a product expiry or batch for the shipping box. The MAP gate accepted this as a correction to the existing flight workflow. A physical box label remains necessary for custody; the screen suggests `BOX-1` for an empty manifest and tells staff to put that label on the box or replace it. The camera control is no longer disabled for a missing product lot/date. An empty box label focuses that field with a direct message. A genuinely paused saved-command journal still prevents new scans.

## Prepared change

- `src/views/admin/ConsignmentPackingWorkspace.jsx` removes product lot/date inputs from Italy box packing. New camera, keyboard and +1 scans send `batchCode:null` and `bestBeforeDate:null`; existing line counters retain their original factual values.
- `src/lib/consignmentPackingCommand.js` admits a jointly unknown product lot/date while preserving exact body shape, box, actor and code validation. Partial known/unknown pairs refuse. Existing literal command bodies and keys remain valid.
- `supabase/migrations/20261030_italy_box_scan_without_lot.sql` drops only the two consignment-item NOT NULL constraints, adds a null-safe unique index, and patches the existing private packing and receiving functions through guarded exact anchors. Unknown scans remain separate from planned factual lot lines. An unknown received batch uses an explicit `UNVERIFIED-<box>` quarantine holding identifier rather than silently copying the box label as a manufacturer lot. The current receiving function's null date path yields quarantine; no artificial expiry is assigned.
- The scoped tests and disposable database rehearsal cover command shape, scan identity, rapid counting, saved-key recovery, actor and closure races. The design correction is recorded in `docs/specs/MILAN_PACKING_WORKFLOW.md`.

## Evidence and limits

- Failing first: the unknown-lot Node validator test refused `null`; the old SQL rejected the same signed command with `K2_ADMIN_PAYLOAD_INVALID`.
- Passing local: `node --test tests/consignment-packing-command.test.mjs` 7/7; scoped Playwright 18/18 plus 2/2 after the final focus edit; disposable native PostgreSQL rehearsal passed unknown-lot counts, one-line identity, known-lot separation, historical retry and existing concurrent count/dispatch and Draft cases. The rehearsal compiled the captured current receiving function and applied the guarded patch. Its owned PostgreSQL instance stopped.
- `npm run verify:development` passed after local loopback was permitted and the isolated worktree used the already installed dependency tree. The earlier sandboxed run failed an unrelated HTTP recovery fixture before it reached its POST; the focused unchanged test passed 2/2 with loopback. An intermediate development run then failed dependency policy because the isolated worktree had no direct `node_modules/webgl-constants/LICENSE`; the focused policy passed after linking the repository's existing dependencies. These setup failures are retained, not represented as source regressions.
- `npm run build:admin` passed with loopback permitted: 729 modules transformed, Admin application 227.46/300 kB, boundary and secret scans passed. Phone 375 and desktop 1440 screenshots were inspected: `italy-box-scanner-20261030/packing-375.png` and `packing-1440.png`. The fixture shows a known historical lot; the null-lot request is separately asserted in the browser and native tests.
- The native rehearsal uses a disposable minimal schema. It compiled but did not execute the captured finalizer against a full restored current schema. Actual Manila product-batch creation, provider triggers, real camera or keyboard device, hosted Auth, physical contents and sellability readback remain unverified.

## Production boundary and recovery

No K2 production SQL, shipment/product/stock write, source push, deployment or journal replay occurred. The current production Admin still shows its old required fields. The actor-scoped 16 saved packing requests, real `K2-2026-10` shipment and dummy `TEST-CODEX-20261029-01` manifest remain untouched.

Next MAP-023 action: qualify this exact migration with the full restored current schema and receiving/quarantine readback, plus backup/rollback and reviewed packet. Obtain the owner's named authorization for this SQL apply, then fresh `preflight:k2-project` and zero-failed `readiness:k2-live` before any provider write. Run the release gate once before a separately owner-authorized production-main promotion; verify separate Storefront/Admin artifacts and real staff/Manila behavior. Reconcile the 16 original literal requests and receipts before any resume or dismiss.

Before provider application, recovery is a scoped revert of this feature branch's source, migration, tests and records. After any new packing/receiving data exists, preserve original keys, line/lot/audit history and quarantined inventory; use an explicit forward correction rather than restoring over later business data.
