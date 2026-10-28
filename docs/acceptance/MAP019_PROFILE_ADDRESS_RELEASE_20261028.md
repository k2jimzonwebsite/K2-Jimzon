# MAP-019 profile and saved-address release

**28 October current state — APPROVED SQL APPLIED TO K2, SOURCE PROMOTION PENDING:** Owner explicitly approved packet4a662c94 and reiterated the K2 Jimzon account/project constraint. Fresh required K2 preflight/readiness passed, immediate encrypted backup and isolated restoration passed, and the unchanged transaction was sent exactly once at14:42:56Z to pixplcjqivlfflickobf. Readback proves exact ledger20261028140000, both RPCs, six columns and private helper. Existing settings count0/hash is unchanged; no deletion schema/function was installed. A post-apply encrypted backup restores the exact new migration; latest readiness remains8verified/2owner/3connector/0failed. No main/source promotion has occurred yet.

The initial orchestration postcheck incorrectly expected service_role=false on new public functions. Live catalog proves the existing postgres/public function default grants that platform role; the approved SQL preserves it. PUBLIC/anon are denied, authenticated is explicitly granted, the helper remains private, and installed source retains auth.uid()/signed-BFF checks before commands. No additional grant change or SQL replay occurred. Raw failed classification and exact reconciliation are preserved in apply-result.json and grant-reconciliation.json. An optional read-only invocation probe returnedHTTP400 and is not hosted-caller evidence.

The immediate backup verifier first hit a Windows pg_ctl inherited-output-handle timeout before restoration; owned stop/refused-port/plaintext cleanup passed. Matching the existing stdio-ignore launcher pattern fixed the verifier; both subsequent pre/post backup restorations and cleanups pass. The immutable failed receipt remains under .tools/map019-profile-release/backup-restore-06fa6813-4174-41f7-bde9-c4d434230ed2/.

One final configuration correction adds the public privacy flag to Vite’s existing explicit allowlist. The existing opt-in synthetic recovery test reproduced the missing control before correction, then passed; this does not enable any production privacy flag. Final development/disabled checks and the one release gate remain in source release receipts below.


Owner decision: **Release profile/addresses first**, followed by **continue here**. This supersedes deletion-first release prerequisites. IDEA-20261027-02 and IDEA-20261028-01 remain the accepted scope; MAP-019 remains open for automated deletion and any unverified release action.

## Prepared behavior and source

Existing profile/settings and the structured address book proceed independently. The customer privacy component defaults to a contact route unless `VITE_CUSTOMER_PRIVACY_ENABLED` is exactly `true`; the disabled branch never mounts the recovery effects or sends a deletion request, including when a saved receipt exists. Established Storefront typography, spacing, colors and contact route are preserved. The API separately requires `K2_CUSTOMER_PRIVACY_ENABLED=true` in production; the worker always requires it and its scheduler is omitted otherwise. Keep both privacy flags absent/false, with no privacy service credential or scheduler activation for this release.

All four required UI skills were applied together, with TDD and Karpathy guidelines. The existing design is preserved:

| Before | After | Why |
| --- | --- | --- |
| Account closure controls appeared even when its production API was disabled. | Privacy links to Contact K2 while settings and addresses remain available. | Offer a usable next action without implying deletion is operational. |
| A stored closure receipt mounted an automatic recovery request. | The disabled component never mounts that recovery effect. | Keep automated deletion entirely outside the selected release. |

## Exact database packet for owner review

Target: K2 `pixplcjqivlfflickobf`, `https://pixplcjqivlfflickobf.supabase.co` only. The installed unrelated ScoutIT connector was not used.

Frozen activation: `docs/acceptance/profile-address-release-20261028/activate.sql`, SHA-256 `4a662c94adc48a95b7b3bd68950a9d62570006efdc16a4358ee2bf729d4b4774`.

This generated packet contains only the existing portfolio and delivery-address migration bodies, current live function body/owner/config/EXECUTE drift guards, private-table grant checks, absent-object/replay refusal, bounded locks and one migration receipt. It adds six address columns and a private payload helper, replaces the two existing settings RPC bodies, adds the signed portfolio/address RPCs and portfolio index, and explicitly grants authenticated execution on the new signed RPCs while retaining Supabase’s existing service-role function default. It does not install any privacy automation, hold, freeze, writer-scope, manifest or erasure migration. Source migration hashes are in `profile-address-release-20261028/packet.json`. Frozen SQL is an immutable reviewed artifact; edit the maintained migrations and prepare a new packet rather than hand-editing this copy.

Data-retaining deactivation: `docs/acceptance/profile-address-release-20261028/deactivate.sql`, SHA-256 `55ce13f569e4041b4ffefba9319cbd97ce1c3649ee9551aaf10b891927c78b67`. Disable the released account/address UI first, then separately authorize the two EXECUTE revocations if recovery is required. Keep every saved column and the initialized-address legacy writer guard. Never restore the old writer, drop saved addresses, or restore the entire production database over later customer data. Re-enabling requires a reviewed grant-only action; do not replay activation.

No production SQL approval is inferred from credentials, feature-branch push approval or main/source release authorization. The repository owner rule explicitly requires approval of this named database packet. After approval, refresh exact-K2 identity/readiness, capture and verify an immediate encrypted backup, compare current dependencies, and apply this unchanged transaction once. An unknown response requires readback of the exact ledger/objects before any retry.

## Evidence and limits

- Required read-only project preflight: pass. Readiness: 8 verified / 2 owner / 3 connector / 0 failed. This does not authorize a write.
- Targeted live metadata at 2026-10-28T13:44:38Z confirms installed settings, canonical delivery reference data, delivery snapshots and receipt dependencies; portfolio/address RPCs are absent. Function bodies, owners, ACLs and configs were read without customer row contents.
- Failed-first mobile/desktop disabled-closure tests reproduced the missing contact state. Focused green checks pass at 375 and 1440, with settings/address controls available, no deletion control, no recovery request and no horizontal overflow. Captures and terminal output are pinned in the companion JSON receipt.
- `npm run verify:development`: exit 0; final privacy/address group 142 passed, 0 failed. Receipt-only updates do not require another application run.
- Exact packet rehearsal: `.tools/privacy-current-schema/1fa1bfe7-d314-41de-9221-66e32c4e8175/receipt.json`, exit 0. Signed portfolio anonymous/unlinked/owner scope, rejected customer selector/foreign proof, address revision/idempotency/default/PSGC/legacy-deletion/ownership/grants and two real concurrent saves pass. Replaying the package refuses safely. Committed deactivation preserves the populated saved-address rows and revokes both new RPC grants. No privacy migration is present.
- Original 161-table / 49,717 summed-row restored schema, data and exact sequence states match before/after rollback; the owned clone is dropped, cluster stopped, port refuses connections and restored plaintext is removed. Managed Vault/Storage/provider state is excluded. Restored ACLs are an explicit fixture derived from the live metadata, not genuine hosted caller evidence.
- First focused rehearsal `67fc6fb0-bd20-4765-9919-c4073f6f470c` passed serial checks and both races, then the test expected the wrong replay refusal label. Actual changed-body drift refusal was correct and data/cleanup passed. The corrected assertion accepts either explicit existing-package or changed-body refusal; no production behavior was weakened.

## Unfinished work preserved and exact next action

Deletion work remains suspended. Its unqualified runner is preserved byte-for-byte at `.tools/map019-profile-release/suspended-deletion-runner.mjs` (SHA-256 `6f35d7ee80eb3820186fdfa86ef2742d34f98385b35b6f48916e2d2ae84b488c`); the active runner contains only the small profile-only extension over published HEAD. Other unfinished writer-scope sources, old failed/passing evidence and unrelated image work remain untouched. Do not resume them as a release dependency.

Vercel's current connector refuses the known K2 team with 403; its team-consent helper returns 404. Local browser access is disabled in Work settings. No replacement team/project, token, environment or deployment was created. The selected two existing projects remain Storefront `prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL` and Admin `prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x` under `team_C3Wf3dVUBjUqGQ4rndMTCchz`.

Exact next action (SQL approval/apply above is complete): use the already authorized Git-connected source release, verify the actual account screen with privacy disabled, run `npm run verify:release` once immediately before the already requested main promotion, and verify both existing production artifacts plus genuine account save/default-address checkout behavior. Do not claim live completion before those steps. Full MAP-019 deletion completion and physical-device acceptance remain separate unfinished work.

28 October source release qualification: the one complete release invocation on clean d2b728b7 passes the earlier stages and 1129 base browser cases, then fails one obsolete UI-copy assertion expecting customer-visible Website messages. The product already says Your linked orders, requests and Website messages. Updating only the contract literal passes the focused case; resume the unrun stages after test:base, packaging and both builds. Preserve the original failed invocation; do not call it a clean aggregate pass or rerun passed unaffected base suites.

Actual public source inspection (HTTP only, no browser/session) confirms the current Storefront account capability compiles false: index-Bm5vXvBc.js exports k to Mo(), returning Ao=false. Both canonical host build-target markers return200/correct targets, but this is not profile activation. The K2 Vercel access limit now blocks a concrete necessary provider flag step; owner browser/connection access is requested. Do not bypass the existing rollout flag or silently claim the source push activates it.
