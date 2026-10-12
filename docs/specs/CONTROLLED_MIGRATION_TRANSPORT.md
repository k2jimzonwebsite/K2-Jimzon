# MAP-018 controlled migration transport candidate

Owner: existing IDEA-20261009-08 / MAP-018. Candidate dated12October2026.
This is a design record, not another backlog, executable packet, or write approval.
The owner authorized the original three Management API probes and guarded cleanup
only. Two attempts occurred; the full-size attempt remains UNKNOWN/no retry.
`PROVIDER_TRANSPORT_TIMEOUT_DIAGNOSTICS_20261012.json` owns that evidence.

## Understanding and assumptions

- Qualify the complete existing installer and reliable outcome reconciliation,
  preserving the full production-readiness objective and MAP dependency order.
- Use only owner-controlled K2 `pixplcjqivlfflickobf`; no Supabase connector.
- Preserve the8,278,524-byte source SQL, SHA256
  `8ca8e22fedcae9fa63eaba682b897b2dcfaa0b817f3f1c7a010204314fa5dc99`.
- Preserve business semantics, original actor/body/key, permissions,2s lock/10s
  statement limits, recovery, normal staff/customer availability and separate
  Admin/Storefront artifacts. No new operational product feature.
- Make installer effects and their named durable receipt part of one explicitly
  controlled database transaction rather than assume private API implementation.
- Local design/preparation is authorized by owner prelaunch direction. Replacement
  probes, SQL installation, history writes and release still need distinct exact
  authorization and immediate identity/readiness/backup/recovery gates.

Assumptions requiring qualification: the existing owner-controlled database URL
can reach K2 as the intended postgres non-superuser over TLS; the complete body
can execute within the existing limits; the actual migration ledger can accept
one reviewed receipt without new grants/schema/roles; provider event triggers do
not introduce unqualified effects. Capability is not permission. Captured role
names in local restore are not provider ownership/membership equivalence.

Performance/scale: one coordinator, one maintenance operation, current existing
catalog and full-size source; no batching, deadline increases or payload shrinking.
Security/privacy: credentials in process environment only, never args, output,
browser, VITE variables or tracked receipts. Raw data remains private; tracked
evidence contains hashes and scoped results. Reliability: immutable request files,
one attempt, no client retry, independently observed state after uncertainty.
Maintenance: use existing database/backup/capture helpers and the same14fragments;
do not copy business SQL into a second implementation. The coordinated window's
accepted residual administrator/provider risk remains explicit.

Owner prelaunch direction supersedes generic local-understanding confirmation
loops. This records the existing intent, without silently accepting a new live
transport. Review may revise this candidate; no implementation begins before the
required sequential review. Remaining actions live only in MAP-018.

## Alternatives and proposed choice

1. **Controlled direct transaction, recommended for local qualification.** Existing
   `psql` and owner-controlled K2 database connection execute one reviewed envelope
   that puts the conserved installer body and its ledger receipt before COMMIT.
   PostgreSQL transaction semantics are visible. This changes transport and needs
   new payload/envelope/recovery evidence and authorization; no API-equivalence
   claim follows.
2. **Authoritative deployed Management API contract.** Keep the API path if the
   provider establishes deployed size limits, serialization, transaction/history
   boundaries and terminal outcome. Current docs and sampled logs do not supply
   this. No support message is authorized; do not contact others implicitly.
3. **Retain the current gate.** Preserve the original unknown attempt and stop
   installation. Smaller probes or a longer client deadline cannot establish
   acceptance of the actual full source or all history-failure boundaries. Do not
   disguise those changes as a retry under the original one-attempt approval.

Choice is proposed for local preparation, not final live adoption. Its value is
explicit transaction ownership, not greater privileges or weaker acceptance.

## Exact source and transaction boundary

The pinned original starts with the target warning and
`begin;set local lock_timeout='2s';set local statement_timeout='10s'` and ends
with `$provider_install$;` followed by `commit;`. Offline inspection confirms one
anchored BEGIN and one anchored COMMIT. Do not send the unmodified source inside
an extra outer transaction: its internal COMMIT could escape that boundary.

The candidate constructor must require the original hash, parse only the exact
reviewed outer envelope, and conserve every byte between its BEGIN and COMMIT.
It emits one new frozen envelope: BEGIN; the original SET LOCAL and single
installer DO; a separate guarded ledger INSERT; COMMIT. No internal body edit,
statement rearrangement, unreviewed regex stripping, `psql -1` nesting, runtime
generation or multiple sessions. The original source, extracted body and new
envelope each get separate byte counts/hashes; never describe the new envelope as
the original8ca8e22f SQL or reuse its API write approval.

Actual ledger shape, constraints, triggers, grants and supported tooling convention
must be captured read-only before designing the INSERT. The receipt stores the
complete original source statement, preserving its exact SQL hash, under a newly
reviewed unique name/version. Pin source hash and envelope identity in durable
execution evidence without inventing a provider-owned column. Refuse colliding
name/version, unexpected ledger metadata or lacking existing permissions. Do not
change ledger ACLs/schema, introduce a second receipt store, delete old history,
claim an API-created receipt or silently substitute a platform migration format.

Ledger row insertion failure must abort the same transaction as installation.
The source's internal after-state/authority guards remain before the INSERT;
receipt insertion/event-trigger behavior and authority through final commit need
explicit qualification. A receipt alone cannot prove canonical operational
acceptance or prevent privileged alteration. Expected catalog/history after-state
must account for the deliberately added ledger row and any captured supported
effects, never ignore unexplained differences.

## Execution, ambiguity and recovery

Use reviewed `psql` with `-X`, ON_ERROR_STOP and immutable input-file delivery,
one connection/session, TLS and UTF8. Do not leak the credential-bearing URL in
arguments or logs. Pin binary/source/environment identity, query current/session
role and read-only identity separately, and record an observable backend identity
when available. No connection reuse, automatic reconnect, client retry or writer
cancellation is inferred. Native client exit0/COMMIT output is supporting evidence;
independent same-target readback still determines observed catalog/history/data.

After transport loss the operation remains UNKNOWN while the original backend
or platform work could still commit. Establish actual terminal backend state
using evidence with sufficient visibility; an empty filtered pg_stat_activity or
elapsed deadline alone is insufficient. Even after terminal evidence, only exact
before state plus receipt absence can support proven non-application, and exact
after state plus matching unique receipt can support application, under explicitly
qualified transaction and authority assumptions. Drift, unreadable authority,
missing/changed receipt, duplicate identifiers or uncertain visibility remains
UNKNOWN. Never automatically retry, create a fresh key or drop unknown objects.

Rollback continues to use the reviewed captured before-state recovery package
with data-retaining semantics and its existing permissions/deadlines. Qualify the
new receipt's documented treatment before approving a write; keep audit history
and never falsify or delete successful migration entries for cosmetic cleanup.
No full-database destructive restore is implied by a backup. The original timed-out
private-marker API attempt has a distinct name/object scope and retains UNKNOWN;
do not relabel it as non-applied or reuse its identifiers in the replacement.

## Review corrections: explicit replay, binding and unresolved original work

The earlier unknown API request remains a live-replacement gate. Distinct private
identifiers do not prevent its delayed execution from changing history/catalog
during replacement. Local preparation may proceed; replacement dispatch requires
terminal evidence for that attempt or a separately reviewed and owner-accepted
isolation disposition addressing late execution. Sampled absence cannot satisfy it.

Replay contract: the direct dispatcher refuses every pre-existing chosen receipt
name/version before invoking installer SQL. An independently matching existing
receipt may be reconciled read-only, never re-executed. Changed source/envelope,
duplicate identity or partial receipt refuses without effects. Existing installer
idempotency is retained as business behavior, not permission for transport retry.

Application matching requires exact unique ledger version/name and a byte-exact
UTF8 roundtrip of the original SQL statement, plus independently retained immutable
dispatch intent binding its original source hash, conserved body hash, new envelope
hash, target and actual session/backend identity. Source-only receipt equality
with absent/mismatched envelope execution evidence cannot yield APPLIED. Intent
is supporting evidence rather than proof of execution; exact current after-state,
transaction qualification and terminal evidence remain necessary. Do not invent
an attestation stronger than those assumptions.

The constructor must represent the complete8MB source as SQL literal data safely,
without execution, interpolation, encoding changes or truncation; the exact UTF8
stored bytes/hashes must roundtrip. Qualify collisions with candidate dollar-quote
delimiters, quotes/backslashes and control-character refusal. No dynamic unbounded
delimiter guess or normalization. Unsupported input refuses before dispatch.

Recovery acceptance includes the approved retained ledger entry treatment and
current recovered catalog/data meaning. A retained successful historical receipt
cannot override contradictory recovered current state; classify that state as
recovered/history-retained rather than currently APPLIED. Exact recovery policy
must be qualified before any new write approval.

## Qualification requirements and decision register

Local qualification must use the complete14-fragment source, full conserved body,
captured ledger shape and existing current-state/authority contracts. Establish
the complete new envelope's byte count/execution cost, including its additional
8MB source literal and ledger write, within the unchanged deadlines. Establish
fresh/replay/refusal/drift/collision behavior, ledger insertion failure rollback,
failure before final commit, committed receipt with lost client reply, genuinely
running backend reconciliation, full protected data/sequence conservation and
affected original recovery. Reuse accepted native50/76/77 evidence for unchanged
behavior; run only affected transport/recovery controls. Synthetic wrappers are
local evidence, never actual K2 permission or provider equivalence. Independent
design and code/evidence review precede any exact owner write request.

| Decision | Disposition and reason |
| --- | --- |
| Original full-size API attempt | UNKNOWN/no retry, preserved. Later absence and sampled logs do not establish terminal outcome. |
| Existing installer business logic | Reuse conserved body and all14fragments; no alternate operational implementation. |
| Direct single transaction | Candidate for local qualification only; removes assumed API history boundary, does not remove privilege/authority/recovery gates. |
| Ledger receipt | Exact current schema/grants/convention capture required; no inferred INSERT shape or metadata change. |
| Execution envelope | New separately hashed artifact; strict outer transformation must be independently reviewed and tested. |
| Source deadlines/privileges | Unchanged; inability to qualify within them stops design rather than increasing privileges/timeouts. |
| Authority window | Owner accepted limits; actual coordinator/inventory/deferral/interval controls still required before activation. |
| New writes/release | Not authorized by original probe approval. Separate exact request after complete local qualification. |
| Skeptic | REVISE objections accepted: original unknown live gate, refusal-only transport replay, exact receipt/envelope/target/session binding, safe SQL-data roundtrip and explicit history-retained recovery meaning. Corrections documented; no implementation. |
| Constraint Guardian | APPROVED local construction/qualification; full new envelope including extra8MB literal/ledger write must meet unchanged deadlines, captured metadata/permission/UTF8/rollback/conservation/recovery gates. No live capability or authorization claim. |
| User Advocate | APPROVED local construction/qualification; eventual owner request must distinguish new envelope/original SQL, exact permitted writes, unknown original disposition and separate install/release authorization. Retained historical receipt never proves current application after recovery. |
| Arbiter | APPROVED local construction/qualification only. Accepted all four Skeptic objections and Guardian/Advocate dispositions; no unresolved design objection. Complete14fragments/body/permissions/2s10s and extra full-source receipt cost remain mandatory. Independent code/evidence review and distinct exact authorization precede any replacement write; original UNKNOWN remains live gate. |

Recovery for this candidate alone: remove only this design/current status if
rejected, preserving all source, immutable attempts, backups and receipts. Full
readiness and MAP-018 closure remain unproven.


## Actual ledger and connection observations,12October2026

Read-only capture996b77 observes ledger schema/table owned by postgres, ordinary
table, null explicit ACLs, no RLS/policies/table triggers, and postgres USAGE,
SELECT and INSERT capability. Columns: version text NOTNULL primary key;
statements text[]; name text; created_by text; idempotency_key text with UNIQUE;
rollback text[]. Other columns nullable without defaults/identity/generation.
Ten existing entries remain. These are observed permissions, never authorization.

Official CLI source commitc6bbe3221b551c9310d2ff5754dce8c50b485adc,
apps/cli-go/pkg/migration/history.go and file.go, uses version/name/statements
INSERT and encodes a text-array of parsed statements. Its source batching/parsing
is not the private Management API contract. The candidate single full-original
statement array is custom receipt serialization; it must not claim CLI byte
serialization equivalence. Existing created_by/idempotency_key/rollback extras
are not required by that three-column source convention. Do not modify defaults,
ACLs or schema to fit the candidate; receipt identity/collision matching must also
account for the actual idempotency uniqueness constraint.

The owner-controlled URL validates as K2 pooler, not a direct backend socket.
Initial SELECTeac538 observes postgres/non-superuser/INSERT capability but
transaction_read_only off despite PGOPTIONS default_transaction_read_only=on;
its safety assertion refused. No write ran. Explicit BEGIN TRANSACTION READ ONLY,
SELECT, ROLLBACK successor6a991a observes readOnly on. psql conninfo confirms
client TLS; pg_stat_ssl reports backend SSL false. These refer to different
connection legs; do not infer end-to-end TLS or weaken TLS/identity requirements.
Do not rely on startup GUCs or stable backend PID outside an explicit transaction.
Pooler transaction affinity, client loss, cancellation, visibility and terminal
evidence still need qualification before live adoption. No replacement write ran.


Offline constructor preparation12October: four contracts and independent reconstruction review pass; new envelope c3cd02e1/16565984bytes preserves executed bodycb969b36/8278397bytes and originalsource8ca8e22f as inert receipt data. Final local development gate passed. SQL remains unexecuted; full affected runtime/recovery qualification remains MAP-018. Receipt: `../acceptance/CONTROLLED_TRANSPORT_CONSTRUCTOR_20261012.json`. Existing candidate construction/review records remain historical scope; no direct write authorization follows.


Full affected local transaction qualification12October: case02 reviewed receipt `../acceptance/CONTROLLED_TRANSPORT_NATIVE_20261012.json` establishes exact-envelope commit, real synthetic receipt constraint-failure rollback, full-source UTF8storedarray roundtrip, four NULLrefusals and originalprojection/collision-refusal conservation. Case01 nullableassertion gap is preserved and superseded only by freshcase02. Both guests stopped. Retained-history recovery, replyloss/backend/terminal/pooler and actual provider adoption remain unqualified in MAP-018; original unknown API attempt is unchanged.


Recovery scope correction12October: case03 receipt `../acceptance/CONTROLLED_TRANSPORT_COLD_RECOVERY_20261012.json` proves cold reconstruction of captured original state with exact historical receipt retained. It does not prove in-place data-retaining deactivation or preservation of later business changes. The design requirement for those behaviors remains open; no live recovery packet may substitute a stale snapshot. Current BEFORE plus retained historical receipt is recovered/history-retained, never current APPLIED or proof of original non-application. Reply-loss/terminal/pooler qualification remains in MAP-018.


12 October local controlled-transport client-loss qualification: fresh case08 passed all seven controls and stopped (terminal6613a4, no timeout). Actual psql termination before COMMIT conserves the complete original catalog, protected rows/sequences and migration history; termination during a later statement after COMMIT retains the exact source receipt and expected committed catalog. Original two-second lock and ten-second statement deadlines are unchanged. Case07 diagnosed the earlier failure as lock timeout; cases04-07 remain preserved as failed or partial. Final development gate209d76/45db21 passed after a focused test confirmed sandbox loopback EACCES; no application change was needed. Receipt: docs/acceptance/CONTROLLED_TRANSPORT_CLIENT_LOSS_20261012.json; independent runtime review approved with no Critical or Important findings. This does not prove COMMIT acknowledgement loss, actual pooler/provider behavior, end-to-end TLS, or data-retaining production recovery. Original API outcome remains UNKNOWN/no retry. Next action stays MAP-018: qualify acknowledgement-loss/terminal evidence, binding/pooler/TLS and data-retaining recovery before any separately authorized replacement write or release. Guest13096 is stopped; preserve all source, envelope, backup and failure evidence.


12 October controlled COMMIT acknowledgement-loss qualification passed locally: fresh case09 executes the unchanged complete 16,565,984-byte envelope c3cd02e1 through a test-only Unix-socket proxy in genuine isolated PostgreSQL17.6. Original backend657 is observed idle in transaction before COMMIT with receipt absent. The proxy forwards final COMMIT, receives actual CommandComplete(COMMIT) and idle ReadyForQuery, withholds both, then closes both legs; psql reports connection lost at COMMIT and exits nonzero. Exact original backend/application disappears; independent byte-exact source receipt, full expected catalog1d7ff4a4, original row projection and authority pass. Guest8652 stops, terminal942b5b exit0/no timeout/seven controls. Ten file pins and seven runtime hashes are recorded in docs/acceptance/CONTROLLED_TRANSPORT_COMMIT_ACK_LOSS_20261012.json; independent runtime review approved with no Critical or Important findings. Final development4a3ee9/2d2c27 exits0/53Admin/zero route gaps. This establishes this local acknowledgement-loss schedule only, not pooler/provider/TLS, crash durability or every commit race. No dispatcher/classifier or automatic retry was added. Original API remains UNKNOWN/no retry. Exact next action stays MAP-018: source/body/envelope/target/session intent binding, actual pooler/TLS qualification and in-place data-retaining recovery policy/qualification, then original-unknown disposition and separately authorized provider/release gates. Preserve immutable case09/earlier failures/source/envelope/backups; local fixture recovery stops only the owned guest and reverts unactivated test documentation. Never restore a stale original snapshot over later business data.


12 October controlled execution-intent preparation: scripts/prepare-controlled-migration-intent.mjs is pure offline serialization, with strict full source/body/envelope hashes and sizes, allowlisted isolated-local/exact-K2 target record, raw session-evidence hash and observed-session identity fields. Five focused contracts pass (finala47e79); missing-feature red1fd866, impossible-calendar red46c58d and microsecond-ordering red29621b are preserved. Independent review APPROVED with no remaining Critical or Important findings; timestamp ordering now preserves all six fractional digits. Frozen synthetic1282-byte intent456b2db2 in .tools/map018-controlled-intent-20261012-01 is preparation only. It proves neither observation provenance nor durable retention, same-session execution, fresh K2 identity, TLS, permission, dispatch or application; every operational claim remains false. No case09 retroactive intent or classifier change. Receipt docs/acceptance/CONTROLLED_TRANSPORT_INTENT_PREPARATION_20261012.json records exact pins and limitations; final developmentbeda3a/a6869f passed with53Admin checks/zero route gaps/2286 secret-scanned files. Next MAP-018 action: fresh local retention before the body and same-session/provenance qualification, then actual pooler/TLS and in-place data-retaining recovery plus existing original-UNKNOWN/no-retry, exact authorization/backup/readiness/release gates. Recovery reverts only unactivated intent scripts/docs; preserve synthetic01, source/envelope, all accepted/failed cases and backups. No provider read/write or deployment.
