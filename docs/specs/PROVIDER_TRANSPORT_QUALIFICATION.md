# MAP-018 migration transport qualification

Owner: MAP-018, existing IDEA-20261009-08; authority prerequisite:
IDEA-20261009-07. Exact locally qualified preparation, 12 October 2026. This document
is neither an active backlog nor permission to execute SQL. Remaining actions,
dependencies and recovery stay in MASTER_ACTION_PLAN.md.

## Required result and preserved boundaries

- Use only K2 `pixplcjqivlfflickobf` and its owner-controlled Management API.
- Establish actual request acceptance, stored statement serialization, and the
  relationship between committed SQL effects and migration history.
- Preserve the existing 8,278,524-byte installer, SQL SHA-256
  `8ca8e22fedcae9fa63eaba682b897b2dcfaa0b817f3f1c7a010204314fa5dc99`.
- Preserve 2-second lock and 10-second statement limits, current privileges,
  business records, normal staff/customer workflows and separate deployments.
- Never infer an installation outcome from HTTP success, a notice or history
  alone. Never automatically retry an uncertain write.
- Keep provider observations distinct from local simulations and finite tested
  schedules distinct from an all-failure guarantee.

Assumptions: a separately approved, uniquely named private disposable schema
is acceptable for a transport experiment; its creation and exact cleanup are
database writes. No such approval currently exists. Provider-managed activity
and noncooperating privileged sessions are outside a coordinated window's
enforced control. The owner must explicitly disposition that residual risk
before activation. A fresh identity/readiness receipt and immediate pre-write
backup are required at execution, not merely this document's date.

## Existing evidence

The exact native76/77 installer and recovery are already locally qualified.
CURRENT_PROVIDER_REQUEST_20261012.json pins the sole request constructor;
PROVIDER_TRANSPORT_HISTORY_20261012.json pins the credential-free prepared wire
body: 9,214,478 bytes, SHA-256
`fa64cc8ecffbeb2da2cff69fe4ca67f87ff54da01c6efa093bf25932174744b3`.
That body has never been dispatched. The existing provider history sample
matches one older local migration after removal of anchored BEGIN/COMMIT;
the responsible transformation and original dispatched bytes are unproven.
The current classifier deliberately returns UNKNOWN for every installation
outcome. No new application build or repeat installer rehearsal is warranted
by this preparation.

The [official migration API](https://supabase.com/docs/reference/api/v1-apply-a-migration)
defines POST, required query, optional name/rollback, and an empty success
response. It does not publish a query/history atomicity or payload-size
contract. The optional rollback field is SQL text; it is not a read-only
dry-run switch. Do not use it as permission to test production.

## Approaches and recommendation

1. **Bounded actual transport experiment, recommended candidate.** After exact
   approval, use isolated private marker objects and a deferred commit witness
   to observe whether the named history row is present in the marker's own
   transaction. Include refusal and cleanup controls. This establishes tested
   behavior rather than a general provider implementation guarantee.
2. **Provider implementation contract.** Obtain authoritative guarantees for
   deployed transaction boundaries, history insertion, serialization and request
   limits. No support message is authorized, and public client source is not
   evidence of the private deployed server. Such a contract could supplement
   the experiment's limits.
3. **Change migration transport.** Use a directly controlled transaction that
   writes the exact SQL and its receipt together. This would change the reviewed
   transport and potentially package/history ownership. It needs separate
   design and qualification; it is not a shortcut authorized by this document.

The bounded witness is selected for local preparation under the owner's existing
prelaunch direction. It is not accepted for provider execution. Local design,
probe construction and isolated qualification do not depend on the unresolved
live authority disposition. Do not implement a production dispatcher or weaken
the classifier during this preparation.

## Candidate commit witness

Use a fresh, explicitly named schema with no PUBLIC/anon/authenticated/service
access and no application dependencies. Inside the same BEGIN / SET LOCAL /
single DO / COMMIT envelope as the installer, create only a marker table,
one marker row, a schema-qualified trigger function and an initially deferred
constraint trigger. The trigger asserts at transaction end that exactly one
history row with the unique probe name exists and that its xmin belongs to the
current transaction. Do not use an AFTER/history fixture as provider evidence.

The strict comparison is the history row's current-version 32-bit xmin against
the low 32 bits of the marker's top-level `pg_current_xact_id()`. It is sufficient
for the tested current row-version membership, not the original INSERT provenance.
A history writer using a subtransaction may refuse this conservative comparison;
that is unsupported evidence, not proof of separate commits. Create the trigger
before the INSERT and require the marker's durable witnessed flag and recorded
history version/xmin. Missing/disabled trigger or an unwitnessed marker refuses.
Explicit SET CONSTRAINTS can fire a deferred trigger early; no final-instant
claim follows merely from INITIALLY DEFERRED.

The probe must refuse pre-existing schema/history names. Its source, ordered
statements and complete name/query JSON must be frozen and hashed before any
approval. Function search_path is fixed; object privileges are explicitly
revoked. No role, default ACL, platform table, business row, stock, order or
credential is changed by the probe. A fresh read-only capture records any
provider-owned event-trigger effects rather than assuming none.

If COMMIT is executed before the API inserts history, the deferred assertion
must reject the marker transaction. If history is inserted in the same
transaction before its final commit, the witness can succeed. Historical
serialization is read back as ordered stored statement bytes/hashes and compared
to the frozen request with only the transformation actually demonstrated.
An unexpectedly present marker after refusal is a failure, not permission to
continue. SQL execution, serialization and cleanup require local review before
the owner sees an exact write request.

## Required controls and outcome limits

The same witness needs a success case with request size at least the prepared
9,214,478-byte JSON body, a deliberate exception inside the DO before commit,
and a bounded post-envelope failure control that detects an early commit. The
size case uses inert padding; it proves body acceptance only, not the full
installer's execution load. Do not send the full business installer as a probe.

Read back marker existence/content, exact named history entries, complete
catalog/global/managed authority and full business fingerprints after every
terminal or uncertain request. Preserve raw receipts privately; expose only
redacted pins. A lost HTTP response stays UNKNOWN until an independent readback
establishes the tested state. No client auto-retry is allowed.

Successful samples cannot prove rollback under every failure of the platform's
own history writer. Do not intentionally alter migration-history ACLs, block
provider workers or inject a platform outage to manufacture that failure.
Any untested history-write failure remains explicit. If this leaves the existing
full outcome gate unsatisfied, either obtain a provider contract or separately
review a controlled transport; do not declare APPLIED/NOT_APPLIED on assumed
atomicity. Before and after equality alone also cannot exclude an intervening
privileged change or a write followed by restoration.

## Recovery and decision register

Cleanup may drop only the exactly witnessed probe trigger/table/function/schema,
without CASCADE, and only after object identity, definition, ownership, ACL,
marker content and unexpected-dependency checks pass. Keep successful probe and
cleanup migration history; never delete or repair provider history to make a
test look clean. Cleanup SQL must be frozen and approved with the probe. Any
unknown object or outcome stops mutation for reconciliation. Preserve backup
and failed evidence. No provider rollback is needed for this document alone.

Repeat those checks inside cleanup's transaction after acquiring and retaining
the marker-table lock; prior readback is insufficient. DROP RESTRICT preserves
unexpected dependencies by rolling the entire cleanup back. The lock does not
exclude privileged function/ACL/global changes; the existing authority counterexample
and separate activation disposition still apply. Require independent post-cleanup
catalog/global/managed/business-state readback.

| Decision | Current disposition |
| --- | --- |
| Existing installer, backups and local integration | Reuse; no duplicate implementation or unaffected rerun. |
| Actual migration POST | Owner explicitly authorized the exact three probes and conditional guarded cleanup, call_65d6de961784425d82a1293553937def. One intended inner-failure control was dispatched and independently read back; full-size request timed out; independent readback finds no markers/history and unchanged protected snapshots, but outcome remains UNKNOWN. Further writes stopped. No installer/release authorization. |
| Deferred commit witness | Implemented and qualified only on synthetic ordinary PostgreSQL17.6, eleven controls; actual API semantics remain unqualified. |
| Coordinated authority boundary | Owner explicitly accepted option1 and its stated limits12October/session01a12ffa. Actual coordinator/inventory/interval controls remain required; no enforced immunity or SQL approval. |
| Platform history-writer failure | Unqualified; finite controls cannot replace a contract. |
| Production release and human acceptance | Remain open in MAP-018; no permission or evidence inferred. |
| Skeptic review | REVISE resolved in design: strict xmin row-version/top-level/subtransaction limits, durable trigger witness, in-transaction locked cleanup checks and independent readback. |
| Constraint Guardian | APPROVED bounded local SQL construction and isolated qualification; no provider execution or full outcome claim. |
| User Advocate | APPROVED bounded local construction; eventual permission must name exact project, probe/control/cleanup hashes, disposable objects, prerequisites, stop conditions and residual gaps, separately from activation/release. |
| Arbiter | APPROVED bounded local construction and isolated qualification; accepted all Skeptic corrections and rejected inference of provider approval, classifier changes, enforced authority or production completion. |

| Code review | APPROVED with no Critical/Important findings. Final delta conserves all fifteen executed query/doBody/body/cleanup/readback properties; eighteen case02 artifacts match their pins and fifteen case01 artifacts remain unchanged. |

Local evidence: three preparation contracts pass; synthetic native casegfvXdz
passes eleven controls and is stopped. Final `npm run verify:development` exits0,
53 Admin checks and zero route classification gaps. Failed predecessor cases are
preserved with their actual causes and stopped clusters. New marker SELECT
projection and cleanup JSON envelope are prepared/source-reviewed; the SQL
transaction and cleanup bytes are identical to the executed native case.
The consolidated receipt is
`../acceptance/PROVIDER_TRANSPORT_PROBE_PREPARATION_20261012.json`.

## Exact bounded owner-write packet, authorized12October2026

Target: POST `https://api.supabase.com/v1/projects/pixplcjqivlfflickobf/database/migrations`
using the owner-controlled K2 environment only. Immutable files are in
`.tools/map018-transport-20261012-02/`; manifest SHA256
`18b8123f9691570e1a7eeaa2e175c64df8e3ec61402dfdd2d54a309cd3c3583b`.
Never regenerate, replace, edit or retry these bodies during execution.

| Exact body | UTF8 bytes | SHA256 |
| --- | ---: | --- |
| inside_failure.request.json | 2426 | 2faad7aea53c8a06ef641b975a76a16ef579f65120c1a7694c2206c56eed9959 |
| success.request.json | 9214478 | e0d15ec7ccf56d1b81bae7aeb9515d3185f6663d1a99eae9cebaab64bc942a80 |
| after_commit_failure.request.json | 2454 | eb9996db464e00ea0aa9628710693e7bdc5a47111997c46941e407fbe9006178 |
| inside_failure.cleanup.request.json | 4996 | 5a951a465b3f8f31621968ed8ba9adfc96ffee9801d0fb0f7951b387a4b1333d |
| success.cleanup.request.json | 5009 | 1356a0b4451202929f973b571a1d6226f3fccbf86c8cdd78cb5eacdb957e741d |
| after_commit_failure.cleanup.request.json | 4983 | 63db49d25ba63602df0b6af8639a400cd3093353f2b0daaf95b6264e28e7e79e |

Probe names are `k2_map018_transport_20261012_inside01`,
`k2_map018_transport_20261012_success01`,
`k2_map018_transport_20261012_after01`; cleanup names append `_cleanup`.
Disposable schemas respectively are `k2tq_20261012_inside01`,
`k2tq_20261012_success01`, `k2tq_20261012_after01`. Each may create only
its private probe table/primary-key index/row, commit_witness function and
history_commit_witness trigger. The Management API may write migration history;
successful probe and cleanup entries are retained. Provider event-trigger effects
are captured and assessed, never assumed absent. The packet intends no business
row, stock, order, role/grant outside the private objects, setting or credential
change. Its exact SQL preserves the2s lock/10s statement limits.

Owner authorization received12October/session01a12ffa: at most one dispatch of each of the three probes, in the
listed order, and at most one conditional dispatch of each matching cleanup.
Before any write require fresh `preflight:k2-project` confirming exact K2 identity,
`readiness:k2-live` with zero failed gates, immediate verified encrypted backup
and recovery receipt, exact artifact hashes, absent probe/cleanup names and
schemas, and same-target before-state fingerprints. Capture raw responses and
independent read-only marker/history/full catalog/global/managed/business
fingerprints after each terminal or uncertain response.

Expected inner exception is a control only if readback proves absent effects
and unchanged protected state. Advance only after the preceding control has an
explained state. Cleanup requires exact durable witness, objects and history;
its lock/identity/ACL/dependency checks repeat inside its transaction. Absent
marker objects need no cleanup request. A raw HTTP error alone never authorizes
cleanup or retry. Unexpected effects, missing evidence, drift, ambiguous results,
failed prerequisites or a refused witness stop further writes for reconciliation.
Unknown/different objects must be preserved. DROP RESTRICT and independent
post-cleanup readback are mandatory; preserve successful history and backups.

This bounded approval would authorize only these experiment/cleanup requests.
It cannot establish all provider failure guarantees or close MAP-018, change the
UNKNOWN classifier, authorize the business installer, promote main or deploy.
Those remaining decisions and actual coordinated-window controls stay in MAP-018.


Actual execution receipt: `../acceptance/PROVIDER_TRANSPORT_EXECUTION_20261012.json`. Tail and cleanup were not dispatched; read-only reconciliation of the full-size timeout is the next owning MAP-018 action. No retry is permitted.

Later diagnostics and independent execution review: `../acceptance/PROVIDER_TRANSPORT_TIMEOUT_DIAGNOSTICS_20261012.json`. Two attempts are reviewed; timeout remains UNKNOWN despite later absent markers/history and unchanged protected state. No retry or remaining write is permitted from that evidence.
