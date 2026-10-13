# Retained operational code repair qualification

MAP-018 / IDEA-20261010-08. Reviewed design approved for local preparation; repair-envelope source now prepared; no native repair execution,
provider apply or deployment. The sole active work queue remains MASTER_ACTION_PLAN.md.

The owner confirmed: “Yes, use that recovery approach” for preserving saved rates
and orders, keeping shopping available and testing repair locally first, with no
emergency pause feature. This settles recovery scope. The separate captured
authority-through-commit question and every provider/live gate remain open.

The initial candidate restores only the three already reviewed business-conflict
corrections, using their existing SQL fragments rather than a second writer.
It does not attempt arbitrary damaged-schema repair. Read-only catalog comparison
shows imported02 and combined23 differ solely in those three function definitions;
every non-definition field and the remaining complete catalog are identical.

| Existing fragment | Exact prior definition | Exact corrected definition |
| --- | --- | --- |
| product_master_version_conflict_transport.sql | b9553f8fc638395ce9b5db66197eeaa8b1a9271b218c73dececffae7fefa78d2 | c7e9f53fe80c68ce99401caf10d31f4ee272bd506a0c0f3bc7f6363c97f38b94 |
| customer_tariff_version_conflict_transport.sql | 15f0d4d3373ae753c062d37c70d91def0dc6bb1d292f99f6935e2d2db26fbb81 | 151af34efea459c7b0b20938e50a2b05ae081c603296ca6abc1b0dba93dd521b |
| category_policy_version_conflict_transport.sql | 4de418fc3b9204f6dbe72beb708ce3becd1b9ae7d6439997c29452b2e3f9e75c | d3ec75173304d4c8709b81ea0f2e0d101dffa47d7ce85202d29d7efa783f570a |

The local qualification envelope admits only the captured installed catalog with
each target at its exact prior or corrected definition. It checks the complete
catalog, owners, ACLs, settings, roles/memberships/events and managed authority;
unknown differences refuse. It atomically executes each existing pinned fragment
only for a prior-state target; corrected targets are checked and skipped. Final
catalog must equal the complete corrected catalog of the selected fixed matched
profile. The original profile is imported02/combined23; the second is the exact
native calibration01 complete prerequisite catalog paired with a derived prior
containing only the three known definition substitutions. The derived prior is
not an observed native starting state. Cross-profile pairs and unknown metadata
refuse. RETAINED_REPAIR_PROFILE_PREPARATION_20261010.json records composition
review, source tests and original-profile SQL byte compatibility. An all-corrected
repeat is an exact no-op. No fresh table installer or historical inverse is used.

The original caller/target ownership and positive2s lock/10s statement limits stay
fixed. The local envelope uses the existing entry advisory admission; it introduces
no persistent pause/config, new publication drain, tariff-head change, history
trigger bypass or privilege widening. Existing temporary locks can queue or refuse
a conflicting command within the limits; this is not a claim of zero latency or
immunity to lock failures. A refused/unknown repair must never be reported as
successful. Readers/quotes keep valid retained rates outside ordinary existing
transaction contention; no new global availability guarantee is asserted.

All catalog profiles are local source inputs, never live provider observed state. The first
envelope is disposable-fixture-only with exact owned RAM target/marker checks;
it cannot execute on a provider. A later provider envelope needs its own reviewed
project binding, backup/readiness/authorization and transaction/receipt semantics.

Verification must populate category history/current policy, tariff heads/immutable
versions, successful signed category/tariff command receipts and genuine accepted
orders before repair. Native seeding is not signed-command evidence. Preserve
the source-pinned genuine Auth/PostgREST/BFF publication/order paths and existing
complete business observer, adding only missing category signed operations and
whole-database row/sequence capture to the disposable witness.

The fixture coordinator first waits for every genuine HTTP/signing/Auth request
and any pending refresh/session operation to settle, then holds independent
fixture writers constant across each native repair capture. Prove that capture
boundary in the executed witness; unexpected background changes invalidate the
comparison rather than being excluded. This is disposable witness coordination,
not a production traffic pause or an admission guarantee for arbitrary writers.
Keep raw all-table/sequence snapshots solely in the owned private evidence root;
they can contain Auth/customer/grant/signing material. Committed receipts expose
only hashes, relation counts and bounded sanitized diagnostics.

For every successful repair/repeat, compare all existing physical table rows and
every sequence before/after under the same deterministic session/serialization
context, including signing/control tables; repair itself has no declared row
mutation. Do not substitute the fixed synthetic observer or original88 projection
for complete populated-state conservation. Compare the full accepted catalog and
complete global/managed authority too. Later signed receipt retries may add their
normal verifier nonce/rate facts, so distinguish those effects from repair no-op
conservation and keep the business/receipt state exact.

All eight known combinations of prior/corrected target definitions require
actual executable qualification against populated state: the seven prior/mixed
cases reach the complete accepted catalog, while the already-corrected case is a
no-op. Each is followed by a no-op repeat and complete row/sequence/catalog/global/
managed comparisons. Fault injection after each actually executed correction
boundary, before commit, must prove complete rollback to that known starting
state; pre-admission refusal or interrupted no-op is insufficient. Unknown body/
owner/ACL/search_path/schema drift refusal also needs exact complete state
evidence. Deliberately reverting only the known safe SQLSTATE correction in
the owned fixture is a fault setup, not production rollback permission; never
restore NULL-sensitive signing or vulnerable historical bodies. Retained history
triggers remain enabled throughout populated repair qualification.

After repair, actual quotes must still resolve retained rates, old saved order
receipts and charges must match, and a new accepted order must obtain a single
canonical hold at the current rate. Category/tariff successful signed receipt
replay must retain original results under current authority. Preserve customer
grant isolation and old order conversation/message links. Full new populated
recovery cannot be claimed from existing sequential connected05 evidence alone.

Final disposable cleanup may reconstruct the exact original captured archive only
after retained-state qualification is complete and separately recorded. That
cleanup is not the repair method. Terminal results, independently absent PID and
listeners, immutable executed-source hashes and every failed diagnostic remain
part of the receipt. No original private archive or prior fixture is reused/deleted.

Native fixture calibration (not populated repair): calibration01 qualifies complete supplemental catalog capture and refusal conservation for168 permanent user physical relations,11 sequences and44393 staged rows. The exact delta adds existing maintained telemetry/Admin-preauth schema and disposable observers, preserves the prior qualified session correction, and adds only their four Auth foreign-key triggers. The original profile intentionally refused these additions. The independently reviewed second fixed profile now pins the complete catalog and only the same three reviewed definition corrections; every control fact remains included. Its source preparation passes36 tests and development18973, but native populated repair remains unverified. Evidence: RETAINED_FIXTURE_CALIBRATION_20261010.json and RETAINED_REPAIR_PROFILE_PREPARATION_20261010.json. No arbitrary installed metadata admission is authorized.

Decision log:

- Accepted scope: code repair retains saved rates/orders and available shopping;
  no emergency pause/drain. Owner explicitly confirmed after plain explanation.
- Preferred candidate: reuse existing exact corrections inside a guarded installed
  state envelope. This repairs known reviewed code states without touching data.
- Rejected for this scope: global category-config deactivation, because it closes
  fresh purchases; changing jt_current.active, because its CHECK requires active.
- Rejected as repair proof: complete-installer exact replay, because it returns
  without payload for matching metadata and refuses other drift.
- Not a normal repair method: original archive reconstruction, because newer
  operational records would be lost. It remains isolated fixture cleanup only.
- Assumptions: one canonical tariff head, existing data scale and authority,
  local disposable fixtures first, no new services/cost/UI and no wider repair
  allowlist. Arbitrary damage needs separate review; do not silently broaden scope.
- Risks: exact scope is known correction recovery, not every failure; global
  authority through commit and production transaction/timeout/hosted acceptance
  remain separately unverified. Ordinary lock failures remain visible.
- Skeptic REVISE accepted: executable populated proof for all eight known states
  replaces source-only enumeration; interruption must follow actual corrections
  at each mutation boundary. These close admission/order and atomicity gaps.
- Guardian REVISE accepted: prove a settled fixture-only capture boundary without
  silent Auth/control-table exclusions; raw populated snapshots remain private,
  with only hashes/counts/sanitized diagnostics committed. No production pause.
- User Advocate APPROVED: ordinary editing stays simple, accepted charges and
  confirmations remain intact, and known correction recovery adds no staff pause
  workflow. After-repair resumption must not imply concurrent/live availability.
- Final Integrator/Arbiter APPROVED for scoped local implementation preparation:
  both Skeptic and Guardian revisions are resolved. Runtime qualification,
  authority through commit and provider/live acceptance remain open.

11 October coordinator implementation preparation: 11 October settled retained fixture coordinator prepared (MAP-018 / IDEA-20261010-08): new disposable settled-fixture.mjs drains admitted request promises, seals new requests, requires explicit stopped Auth/PostgREST and zero-writer adapter witness, compares stable before/exact after private bytes and keeps failure sealed. Focused expected9-red then10-green; source review no Critical/Important findings. docs/acceptance/RETAINED_SETTLED_COORDINATOR_20261011.json owns source evidence. Controlled-adapter tests do not prove native process stop, signed population, populated repair, service resumption or deployed behavior. Exact remaining integration/native qualification stays in MAP-018 step3.
Native adapters must use actual stopped-process/writer observations, existing complete retainedSnapshotSql and explicit healthy restart; supplied booleans or arbitrary bytes in coordinator unit tests cannot substitute for that execution evidence. Every failed native boundary requires explicit fixture recovery/shutdown.

Executed local qualification,11October: 11 October signed-populated retained repair qualified locally (MAP-018 / IDEA-20261010-08): fresh04/session70224 terminal0, actual signed category receipt/replay plus tariff versions1/2 and two genuine accepted orders precede stopped Auth/PostgREST and zero-other-client capture. All8 known correction states,8 exact no-op repeats and3 interruptions after actual corrections pass full physical-state/catalog/global/managed checks. Complete168relations/11sequences/44521rows match initial/final SHA48e1e44c...;15 authority witnesses and separate original88-row/two-sequence captured reconstruction/corrected combined19 baseline recovery pass. PID3124 and five ports independently absent. docs/acceptance/RETAINED_POPULATED_REPAIR_20261011.json owns source/execution/snapshot pins and limitations. No unknown-drift, post-repair request resumption, production availability, provider or hosted claim; exact next stays MAP-018. Unexecuted01/02/03 preparation failures remain preserved.
The native host population driver completes every awaited operation before its control result; guest stops/waits actual Auth/PostgREST services and refuses any remaining database client before stable captures. This qualifies the executed fixture boundary only; the source-prepared JS coordinator alone remains insufficient evidence of native behavior. Failed population/qualification runs preserve their status and reach guarded original reconstruction through the reviewed child-scope recovery path.

Executed drift refusal qualification, 11 October: 11 October unknown-drift refusal qualified locally (MAP-018 / IDEA-20261010-08): fresh drift02/session95945 exit0; five actual body/owner/ACL/search-path/schema changes each differ from baseline, refuse exit3 K2_RETAINED_REPAIR_SCHEMA_DRIFT, conserve full physical state/catalog and restore exact baseline. Nine global/managed authority witnesses; 168relations/11sequences/44521rows initial/final SHA5de9b3e3898bf4f9ad9e0316cb9eadb321d0dfe11dce7c4ee2b012cfb0dc4a53. Signed category/tariff/two-order population precedes actual stopped Auth/PostgREST and zero-client capture. Separate original archive/corrected installed-baseline recovery passes; PID19372/five ports independently absent. docs/acceptance/RETAINED_DRIFT_REFUSAL_20261011.json owns pins and limits. Known eight-state matrix was reused without rerun. Genuine post-repair requests, full installation/hosted acceptance and owner/provider gates remain in MAP-018; no production change.
Drift01 remains unexecuted and superseded by drift02 for explicit cmp status1 enforcement; private artifacts are unchanged. Repair envelope profiles and fragments are unchanged. Focused checks final2/2; development session16598 exit0. Raw private snapshots stay outside the repository.

Executed local resumption qualification,11October: 11 October genuine post-repair request resumption qualified locally (MAP-018 / IDEA-20261010-08): fresh04/session84749 terminal0; actual known-three correction/no-op/full-state/catalog conservation precedes healthy Auth/PostgREST restart. Retained staff/guest cookies replay exact category/tariff/two old order receipts and conserve old business/conversation/message rows. New customer separate cookies and actual127.0.0.2 peer receives rate2/20000 quote, one accepted order/one hold and exact receipt replay without duplicate effects. Existing unused stale-test key preserves exact three-key observer/catalog; IP900s5/contact3600s3 limits are unchanged. Full168relations/11sequences/44525rows repair initial/final SHA18c27fe2c094ea30eb65aa3349021e4be9b04b5198d702371ce1fcf2e5169007; four authority witnesses, separate original88/two-sequence reconstruction and corrected installed-catalog recovery pass. PID18244/five ports independently absent. docs/acceptance/RETAINED_RESUMPTION_20261011.json binds actual/source pins; independent actual-evidence review found no findings. Failed01 recovery unverified; failed02/03 original recovery verified and all remain preserved. No production availability/provider/hosted claim; remaining integration/activation stays MAP-018.
Source initial2red; actual retiring-listener EOF, distinct-customer generation and exact observer-selection regressions each failed before correction; final6green including actual ephemeral TCP/HTTP. Final source development97011 exit0. The guest remains running under its existing bounded limit after host-control failure to permit guarded recovery. Normal request nonce/rate/session changes after restart are distinct from exact full repair conservation. Full native proof reuses known matrix/drift evidence rather than rerunning them.


## Full controlled-installation profile candidate, 13 October 2026

Existing owner-confirmed understanding applies: retain operational records and
saved command receipts, keep shopping available, test locally first, and introduce
no emergency pause or publication drain. This amendment changes the qualification
profile and receipt-conservation evidence, not that recovery behavior. The broad
prelaunch preparation direction and that existing confirmed scope supersede a
repeated understanding-confirmation loop. No replacement/provider write is
accepted here. Owning IDs remain IDEA-20261010-08 and IDEA-20261009-08 in MAP-018.

Understanding: qualify the existing three exact corrections against the complete
current fourteen-fragment installation, with its successful full-source migration
receipt and later canonical business changes retained. Staff/customer operations
continue to use existing writers. Full physical rows, materialized views and
sequence counters, catalog and global/managed authority are evidence requirements.
No original-snapshot overwrite, fresh-only installer replay, history deletion,
new pause control, looser drift admission, additional privilege or longer deadline.

Assumptions and constraints: one coordinator and immutable fresh local fixtures;
original postgres/non-superuser role, positive 2s lock/10s statement limits, no
new service/cost/UI. The tested settled observation boundary is fixture-only,
not an operational traffic pause or universal availability guarantee. Genuine
signed native operations are distinct from real Auth/HTTP/rendered evidence;
reuse accepted unchanged service-boundary evidence without relabeling it as a
new full-profile runtime. Raw snapshots remain private, including Auth/customer,
signing and complete migration-source bytes. Maintainers get bounded counts,
exact hashes, failures, recovery and the next MAP action in durable receipts.

Evidence reconciliation: CONTROLLED_TRANSPORT_RECOVERY_PROFILE_AUDIT_20261013.json
pins eight source/accepted evidence inputs. Current full corrected catalog
1d7ff4a4339029a42786df660edf70a81c012132679219121ce350d0008aae2e has the
same three corrected definition hashes as the accepted retained repair. A prior
candidate derived by changing only those definitions is a synthetic fault state,
not an observed native starting state. The existing constructor currently refuses
this full catalog/package and must continue refusing all unadmitted combinations.

Alternatives: recommended local preparation extends the sole existing constructor
with one fixed matched prior/corrected/exact-package triple; no second repair
implementation. Repeating the earlier profile cannot qualify the changed complete
catalog/history composition. Cold reconstruction remains disposable cleanup and
cannot retain later operational changes. Neither rejected alternative substitutes
for this gate.

Proposed qualification: construct an immutable matched pair from the full accepted
catalog, the three exact retained prior definitions and the full original guarded
package. Couple each allowed catalog pair to its exact package bytes, so old/new
cross-profile packages refuse. Original profiles must remain byte-compatible.
Extract the same canonical complete catalog and authority serializers from the
matched pinned package, preserving all target/owned-marker/permission/deadline
checks. Apply only the existing three pinned correction fragments. No generated
business SQL or fresh-only table fragment is a recovery method.

Use a fresh network-disabled owned PostgreSQL17.6 fixture. Execute the unchanged
complete controlled envelope once and require exact source receipt/current after
state before population. Populate later business facts through existing canonical
signed commands, including retained policy/rate histories and accepted old/new
orders with exact holds/charges and original actor/body/key receipts; fixture
setup facts are labelled separately. If actual necessary prerequisites change
the complete catalog, stop and independently calibrate/review a fixed exact profile;
do not wildcard or silently admit them. No provider implementation follows from
a local profile.

Before each repair/refusal capture, establish the existing actual settled fixture
boundary with no other clients; compare every permanent non-system relation and
sequence. The existing retainedSnapshotSql discovers migration history rather
than excluding it. Prove the exact source/version/name/idempotency ledger entry
unchanged through all eight known states, no-op repeats, interruptions after each
actual correction and unknown body/owner/ACL/search_path/schema refusals. Complete
current corrected catalog and global/managed authority must match. A retained
receipt never means recovered current code is still the original installed state;
record the current state and history meaning separately. Refuse installer replay
under its existing receipt rule.

After repair, reuse existing canonical signed operations to verify historical
category/tariff/order command results and agreed charges, retained links and a new
current-rate accepted order with one hold/exact retry. Separate normal nonce/rate
and other command effects from the zero-row/sequence repair transition. Where
existing genuine Auth/HTTP/rendered evidence is unchanged, link its precise prior
scope; do not claim concurrent/live availability from fixture resumption. Cold
original reconstruction may occur only after retained-state assertions, as labelled
fixture cleanup. Every failed diagnostic, terminal/owned-process absence and exact
executed source remains retained.

Decision register: owner scope reused; exact full-profile/history qualification
recommended; old-profile-only replay and cold restore rejected as substitutes.
Structured Skeptic/Guardian/Advocate/Arbiter review APPROVED for local construction
and qualification only. No unresolved design objection remains. TLS/current-host route and cross-clock
intent chronology, original API UNKNOWN disposition, exact write authorization,
immediate backup/identity/zero-failed readiness and full operational/hosted/human/
release acceptance stay open in MAP-018. Audit/design revert needs no provider
rollback; preserve all full source/envelope/backups and prior accepted/failed cases.

Skeptic APPROVED for bounded local scope. Acceptance interpretation retained: each
interruption/drift refusal conserves its exact starting catalog/data/authority;
only successful repair reaches the corrected catalog. Three-definition equality
is source evidence only; full-profile native qualification remains required.
Earlier service evidence and fixture resumption keep their stated scope.

Constraint Guardian APPROVED bounded local preparation/qualification. Fixed
matched profile/package, complete physical/history conservation, private snapshots,
actual settled observations and unchanged authority/deadlines satisfy constraints;
prerequisite differences still require calibration/review before admission.

User Advocate APPROVED: retained rates/orders/receipts and agreed charges match
owner intent; shopping remains available without an emergency pause. Faults and
refusals conserve their starting state; successful repair reaches corrected code.

Integrator/Arbiter APPROVED local construction and qualification. Accepted all
review interpretations above; rejected old-profile-only replay and cold reconstruction
as substitutes for affected full-profile retention evidence. No unresolved objection.
Provider authorization, original UNKNOWN disposition, TLS/clock and full operational,
hosted, human and release gates remain outside this approval.

Local construction prepared: 13 October SGT / MAP-018 / IDEA-20261010-08 and IDEA-20261009-08 full-profile preparation: sequential Skeptic/Guardian/Advocate/Arbiter APPROVED local construction/qualification; all objections resolved. Existing sole repair constructor now couples each exact catalog pair to its exact package and admits one full controlled-installation triple a7e4c6d8/1d7ff4a4/ddf4def0. Same three corrections, complete serializers, owned target, authority and 2s lock/10s statement limits unchanged. Redbcd3b4 refused missing profile (nine failures); green795259 passes46 focused tests including all eight full-profile states, cross-package/body/metadata/authority refusal. Eight earlier-profile SQL hashes across two profiles/fault0..3 remain byte-identical. Frozen preparation6fea73 in private .tools/map018-retained-full-profile-20261013-01 includes synthetic prior, corrected catalog, exact guarded package and four repair SQL files; no native execution. Independent code review APPROVED with zero findings. Final development c27c29/8e50b3 passes53 Admin tests/zero route gaps/2291 secret-scanned files; initial restricted b18994/e71992 failed before HTTP request, focused loopback31e301 passes2 without code change. Receipt docs/acceptance/CONTROLLED_TRANSPORT_RECOVERY_PROFILE_PREPARATION_20261013.json pins14 artifacts and distinguishes source preparation from native proof. Historical audit pin refers to pre-change HEAD5ddddee. Exact next MAP-018 action: review/stage fresh owned network-disabled native17.6 full-envelope/populated fixture, then affected full physical/history/catalog/authority all-eight/repeat/actual-interruption/drift and later canonical resumption qualification; stop for separately calibrated/reviewed profile if prerequisites differ. TLS/current-host route/clock/original UNKNOWN-no-retry/exact write authorization/immediate backup/readiness/full operational/hosted/human/release gates remain. Preserve frozen full-profile01 and all prior fixtures/source/envelope/backups; recovery reverts only unactivated local source/preparation, no provider rollback. No provider read/write or deployment.

Reviewed native qualification staging: 13 October MAP-018 / retained full-profile native preparation: case04 staged503129 and independently reviewed APPROVED for one local attempt, zero remaining findings. Two Important preexecution findings corrected: all three nullable current_version/reserved assertions use IS DISTINCT FROM with actual extracted guards tested against temporary valid/missing/NULL observations; launch/serial write failure and stdin errors terminate/await owned child. Actual child red5a9b50 and greenad6368 plus independent absencef5415a qualify launcher cleanup only; native NULL controls await execution. Cases01–03 remain preserved/unexecuted. docs/acceptance/CONTROLLED_TRANSPORT_RECOVERY_NATIVE_PREPARATION_20261013.json pins42 inputs, including byte-exact existing base/envelope and frozen executed source. Native once dispatched d7c5a7, unified exec session81068, QEMU PID1368, network disabled/4GB/RAM-only/10min bound. Exact next MAP-018 action: follow this existing live handle to terminal evidence and independent absence, reconcile full populated rows/sequences/history/catalog/authority/all-eight/repeat/three-actual-interruption/five-drift/canonical-resumption/installer-replay evidence; stop and separately calibrate/review if necessary prerequisites alter exact full catalog. Native signing/setup observer caller supabase_admin and original canonical SECURITY DEFINER postgres are explicit; no new Auth/HTTP/caller-role/concurrency/production-availability claim. Earlier service scope and final development c27c29/8e50b3 retained; no tracked production-code edit or unaffected suite repeat. Live TLS/clock/original UNKNOWN-no-retry/exact write authorization/immediate backup/readiness/full operational/hosted/human/release gates remain. Preserve all sources/envelopes/backups/failed cases; no provider read/write or rollback.

Actual native04 disposition: 13 October MAP-018 / full-profile native04 actual partial result: once-dispatched d7c5a7/session81068/QEMU1368 is terminal58336e, no timeout, guest poweroff/PG stopped and independent79daf5 process absence. Launcher exit0 does not establish fixture success: passed false/K2_GUEST_FAILED. Unchanged complete envelopec3cd02e1, exact receipt roundtrip/global-managed authority and full corrected-catalog guard1d7ff4a4 reached; actual valid/missing/NULL scalar controls passed. Synthetic setup then refused K2_CATEGORY_POLICY_UPGRADE_REFUSED at full-population.sql:57: older setup acquired shared admission before full category-write trigger required exclusive mode. No signed population completion, all-eight repair/repeat/interruption, drift, later canonical resumption or replay evidence. No full failed-population rollback readback before shutdown, so no retention/conservation claim. docs/acceptance/CONTROLLED_TRANSPORT_RECOVERY_NATIVE04_20261013.json binds frozen executed sources/runtime and preserved failure. Executed-preparer archive matches original source pin; mutable generator now stages fresh05. Native preparation receipt has42 pins, not43; earlier cases01–03 remain unexecuted. Source red95eea4 and actual staged green4dd8a3 select unchanged lock_category_policy_v1(true) strongest mode before any category/lot setup resources; canonical guards/deadlines/authority/source/profile unchanged. Case05 prepared with37pins and independently reviewed APPROVED for one fresh local attempt with zero findings. The require_escalated launcher request was not executed because automatic approval review hit its usage limit; this was a review-service failure, not an unsafe-action determination. No case05 launch/serial/result exists. Exact next MAP-018 action: resolve approval-service availability through the same approval path, execute one reviewed fresh local case05 attempt and complete affected populated physical/history/catalog/authority/repair/drift/canonical resumption/replay evidence, then actual evidence review. Do not bypass approval or infer native success from preparation. Signing/setup caller supabase_admin versus canonical SECURITY DEFINER postgres and earlier Auth/HTTP scope remain explicit. Existing final development c27c29/8e50b3 retained; no new tracked production-code edit or unaffected suite. Live TLS/clock/original UNKNOWN-no-retry/exact write authorization/immediate backup/readiness/full operational/hosted/human/release gates stay open. Preserve all cases/raw/source/envelope/backups; RAM-only failed guest is discarded, no provider rollback/read/write/deployment.
