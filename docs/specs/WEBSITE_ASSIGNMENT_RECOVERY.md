# Website assignment and recovery

MAP-018 / existing IDEA-20261001-03; owner confirmed12 October2026.
This is a design and decision record, not another backlog.

## Understanding and assumptions

- Admin/SuperAdmin staff explicitly assign or remove one canonical product.
- Each new decision requires a reason and freshly read assignment version.
- Assignment does not alter publication, human review, stock or other channels.
- Original current account, AAL2, CSRF and signed command boundaries remain.
- An interrupted save retains original actor, literal body and key across reload.
- Uncertain/corrupt evidence is preserved; fresh decisions require current facts.

Assume existing bounded reads,15-second command timeout and20/minute database
limit remain adequate; no polling/background retries/dependencies. One pending
Website decision per actor across tabs; Product Master remains its own domain.
Local browser evidence is synthetic until the consolidated genuine journey.

## Approach and decision log

Recommended: a separate Website decision dialog from the existing Grid product
workflow, plus actor-scoped pending banner even if the product disappears.
Reuse the existing signed Website command; extend existing channels GET with a
bounded protected per-SKU assignment read. Extract shared recovery mechanics
from the already-qualified Product Master hook/storage rather than maintaining
a second copy of locks, actor checks, generation guards and acknowledgement.

Alternatives considered: independent duplicate recovery hook (divergent security
logic); generic bulk channel editor (unneeded scope). Preserve Product Master
validation/messages/results through thin stable adapters and regression tests.

## Boundary and flow

Per-SKU channels GET is Admin/SuperAdmin-only, verifies canonical product exists,
then reads exactly Website/null-shop listing with count and limit2. Zero complete
rows means unassigned/version null; duplicates, malformed/incomplete reads mean
unavailable. Return strict SKU, assigned boolean, nullable id/version, no secrets.
Only an exact complete zero-row read returns null id/version. Every existing row,
including Paused/paused or another legal intermediate state, retains its real UUID
and version. Assigned means exactly Active plus ready/published; false never
implies an absent row. Skeptic S1 accepted: this distinction prevents Remove then
Assign from incorrectly using a null expected version and permanently conflicting.
Existing aggregate GET and internal event POST retain their contracts.

Saved Website POST uses current CSRF, same literal body/key and optional expected
actor header, checked against authorized identity before dispatch. Existing SQL
remains sole assignment authority and canonical normalizer; no schema/RPC change.

Dialog first reads current assignment with scope guards. New Assign/Remove
requires explicit reason3..500 and exact nullable prior version. Persist before
POST under the actor-domain Web Lock. Fields freeze while working/pending; Close
retains evidence. Original saved request is displayed as history, never current
state. Current Staff may see held evidence but cannot dispatch.

Validate receipt exact SKU, assigned matching requested boolean, UUID id and
valid version; final current account/role/scope/storage guards precede matching
acknowledgement. Show recorded historical decision separately and refresh current
assignment; failed current read displays unavailable, never inferred state.

Resumed canonical WEBSITE_LISTING_STALE keeps evidence and enables explicit
Review latest assignment. Recheck exact command first; receipt acknowledges
history. Only repeated exact stale refusal plus validated fresh assignment and
final actor/scope/generation/record checks release the matching request. The fresh
review has blank reason; it does not submit automatically. All other resumed
refusals/unknowns remain held. Reload/storage/scope changes invalidate proof.
Fresh explicit pre-apply refusals can release as existing Product Master does.

## Verification and recovery

Failing-first shared/domain storage, actor boundary and per-SKU bounded-read
contracts; rendered assign/remove, stale-fresh review, lost reply/reload/exact
bytes, historical/current separation, permissions, corruption, actor ABA,
two-tab/storage invalidation, unavailable reads and malformed receipts.
Product Master regressions must remain green after common extraction. Inspect
one bounded375/1440 batch, keyboard focus, scroll and clear next actions using
all four design skills; one repair confirmation if needed. Development gate
once after final engineering edits. Native consolidated rendered acceptance
comes after both separate artifact compilations; existing native gates reused.

Recovery reverts Website control/GET/client/actor guard and shared extraction
together, restoring Product Master implementation from its pinned local receipt;
retain every pending original record and immutable backend archives. No provider
rollback, deployment or release is authorized or claimed.

Sequential review: Skeptic S1 accepted and addressed above; Constraint Guardian
APPROVED with unchanged Product Master keys/behavior and shared regression
qualification; User Advocate APPROVED independent decisions, historical/current
copy, preserved unknown evidence and fresh blank reason. Integrator/Arbiter
APPROVED; S1 accepted/resolved, no unresolved objections. Design only.
Remaining work belongs only in MAP-018.


**12 October MAP-018 / IDEA-20261001-03 Website local engineering verified:** Explicit reasoned Admin/SuperAdmin assign/remove now uses existing signed command, a bounded protected per-SKU read and independent Grid dialog/pending banner. Existing unassigned rows retain real identity/version; only exact complete zero rows yield null. Original actor/literal body/key persists with shared Product Master recovery guards and separate domain lock; historical receipt/current state and proven non-applied fresh choice/blank reason stay distinct. Evidence docs/acceptance/WEBSITE_ASSIGNMENT_RECOVERY_20261012.json:14 final Website browser cases,21 Product Master shared-extraction regressions,17 existing editor cases plus keyboard/44px/reduced-motion/Escape/focus restoration, final development53Admin/zero route gaps pass. Two independent Important findings (malformed row truthiness and delayed-lock stale handoff) were reproduced failing-first and fixed; final review APPROVED.375/1440 inspected. BFF remote Auth/PostgREST and rendered APIs are synthetic; genuine consolidated screen chain remains unverified. Completed local Website/shared engineering action removed from MAP-018; next separate artifact compilation then consolidated genuine rendered operational/recovery acceptance and remaining authority/provider/host/human/owner gates. Recovery restores named engineering source to4f69445 if whole-batch rollback needed, preserving all original Product Master and Website pending storage; reconcile original actor/body/key through protected command before replacement. No SQL/provider/deployment/main/release action.

Reviewer G1 malformed single null/false row accepted: branch on exact zero count and validate existing object. Reviewer G2 delayed-lock stale handoff accepted: remove freshResult entirely; pending changes invalidate current knowledge, receipt completion explicitly reads current assignment, non-applied installs validated facts directly. Other-tab resolution requires explicit current read. Both reproduced red then final green; no unresolved findings.
