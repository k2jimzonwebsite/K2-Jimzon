# Protected brand/category creation

**11 October protected reference extended proof / MAP-018 / IDEA-20261010-06:** `docs/acceptance/PROTECTED_REFERENCE_EXTENDED_20261011.json` preserves native34 actual stored-index EXEC denial and native35/controller39012 terminal0. The pure normalized-key helper is now postgres-owned SECURITY DEFINER with empty search_path and EXEC only for existing authenticated/service_role table writers; private schema, inner cleaner and mutation/context/event privileges remain closed. Actual same-key commit/exact-receipt, rollback/create and changed-body refusal plus ordinary Staff reparent commit/refusal and rollback/create schedules pass. Staff/service existing UPDATE and normalized duplicate refusal, private/unsigned/anon/AAL1/tampered-signature refusal, upgrade/isolation refusal, SuperAdmin command, exact helper metadata and four events/receipts/five nonces-rate hits/cleared context pass. Original cold catalog/authority recover and PID9728 is independently absent. Development76426exit0/19checks/0routegaps. Source audit separately found potential verifier/rate-before-policy versus reference policy-before-verifier inversion across existing signed Admin commands; no actual deadlock proof or correction is claimed. This remains MAP-018 before activation alongside exact new metadata/revised installer conservation and genuine editor/Auth/BFF creation-to-paired-Save. No provider or production change. Recovery retains34/35 and reverts only this prepared helper/test extension; disposable cold reconstruction is not populated production recovery.


**11 October protected reference concurrent boundaries / MAP-018 / IDEA-20261010-06:** `docs/acceptance/PROTECTED_REFERENCE_CONCURRENCY_20261011.json` records owned native33/controller77351 terminal0: six deterministic real holder/waiter schedules pass. Independent brand insertion COMMIT produces reuse; ROLLBACK permits signed creation. Ordinary authenticated Staff parent DELETE acquires the exact exclusive policy entry before rows; signed child creation waits, then committed deletion refuses22023/K2_REFERENCE_PARENT_INVALID while rollback permits creation. Actual unique-insert waits expire55P03 at armed2s lock and57014 at armed500ms statement timer. Three successful events/receipts, cleared context and no failed business rows pass. Full original cold catalog/authority recover and PID is independently absent. Development39756exit0/19checks/0routegaps retained without documentation-only rerun. This synthetic native slice does not prove same-key/reparent schedules, genuine Auth/BFF/browser, exact new metadata/full revised installer or data-retaining production recovery. Those, editor/durable retry/Secure Sheet and deployment/real-host gates remain MAP-018; no provider/activation authorized. Recovery: revert this test/setup/fixture opt-in only, retain33 and prior receipts, use fresh successors.


**11 October protected reference creation / MAP-018 / IDEA-20261010-06:** `docs/acceptance/PROTECTED_REFERENCE_CREATION_20261011.json` records observed missing-command red28 and native green32/controller26661 terminal0 on owned captured PostgreSQL17.6. Prepared SQL adds the signed Admin/SuperAdmin command, all-writer normalized unique identities, backend/xid/actor/key/hash context, immutable events and category statement policy entry. Synthetic signer executes as authenticated; Admin create/reuse, exact receipt replay, changed-body refusal, category parent identity, Staff/unsigned creation refusal, independent duplicate INSERT/UPDATE, unarmed-brand refusal and six events/receipts with cleared context pass. Original full cold catalog and global/managed authority recover; all four executed case PIDs are independently absent. Failed30 compilation and31 test-schema grant are preserved;29 remains prepared-only. Final development20505exit0 (19 session/reference checks, zero route gaps). This is component proof: inherited after-catalog precedes new fragments; concurrent schedules, exact new metadata/full affected installer conservation, genuine Auth/BFF/browser creation→paired Save, durable retry/editor and Secure Sheet repair remain MAP-018. No provider, route activation, deployment or real-host claim. Recovery: revert prepared fragment/test and fixture opt-in together, retain evidence, use fresh successors only.


Owning work: MAP-018 / IDEA-20261010-06. Local development only.

## Status and confirmed scope

Owner selected Admin/SuperAdmin only on 11 October and then said `proceed`
after the understanding scope was presented. Understanding is confirmed;
technical design is approved by sequential review. This does not authorize production
SQL, changed provider settings, a main push, or release. The separate concurrent
administrative authority requirement remains unresolved.

Admin/SuperAdmin create canonical brands/categories through server-cookie login.
Preserve category hierarchy/shelf-life, shopping availability, request deadlines,
bounded reads and the current Admin design. Equivalent duplicate attempts must
not create multiple canonical identities. Report creation separately from product
assignment. Assignment remains the existing paired, reason/version-checked
initial operation on eligible zero-stock/history-free unpublished Drafts.

## Existing evidence

PROTECTED_REFERENCE_BOUNDARY_AUDIT_20261011.json pins the current sources and
accepted combined19 local catalog. Both tables have only ID uniqueness, and
captured authenticated RLS permits is_staff() management. Browser list/insert is
not race-safe. Secure Sheet refuses assignment, while its reference cell ignores
a false assignment result. InventoryGrid already owns reviewed paired assignment.
This evidence describes captured/local state, not new deployed behavior.

## Decisions and alternatives

1. Use one protected reference command boundary, modelled on existing signed
   procurement/Product Master commands. Keep the existing assignment owner.
   Rejected: replacing browser calls with a REST list then insert (race remains).
   Rejected: creating references inside the assignment command (couples reusable
   taxonomy maintenance to Draft eligibility and obscures partial outcomes).
2. Database normalization is authoritative. Browser/server validation can bound
   raw inputs but cannot choose duplicate identity using locale-dependent JS
   lowercase. Return the saved canonical name/ID and explicit `reused` result.
3. Brand duplicate identity is normalized name. Category duplicate identity is
   normalized name plus exact parent ID, including NULL root. Equal names under
   different parents remain distinct; never guess or change hierarchy.
4. Enforce duplicate identity with unique expression indexes, not cooperating
   advisory locks alone. Refuse installation on existing equivalence collisions;
   do not rename, merge, delete or backfill rows to make installation pass.
5. Scope new creation to insert only. Do not expose rename/delete/reparent or
   shelf-life publication through this endpoint. The existing category writer
   lock/trigger contract still governs category mutations.

## Command and read boundary

GET/POST `/api/admin/references`, routed through the existing Admin BFF and its
prepared-api forwarding convention. GET offers complete bounded brand/category
options with parent IDs for categories; over-limit/incomplete reads are an error,
not a partial list. Existing Product Master eligibility/read contract is retained.

POST exact body: `{ kind, name, parentId, reason }`; kind is `brand` or `category`.
Brand requires parentId NULL; category accepts NULL root or an existing category.
Use a caller-held UUID idempotency key. Role, current registry/session, AAL2,
CSRF and canonical signature/nonce verification are required on every call.
Name is nonblank, at most120 Unicode characters after database cleanup; reason
is8–500 characters. Refuse control characters before whitespace cleanup.

One signed SQL routine owns verification, receipt claiming, creation/reuse and
audit event in one transaction. Reuse existing receipt table/nonce mechanism;
use a dedicated reference event table for actor, action, key, kind, identity,
reason and created/reused outcome. Exact same-key/body replay returns the saved
receipt after current authorization; changed-body same key refuses. New commands
use the existing20/minute maintenance convention, subject to review.

Acquire the strongest category policy lock before receipt/category/reference
resources for category creation; never upgrade a shared lock. Preserve actual
READ COMMITTED and already armed lock<=2s/statement<=10s requirements. No setting
timeouts inside the routine may be presented as an armed request timer.

## Identity and all-writer guards

Private immutable normalization helper uses an explicit printable Unicode
whitespace set, trims/collapses to ASCII space and applies PostgreSQL lowercase
under the captured, verified collation. Version/locale admission remains mandatory.
Refuse C0/C1 controls. UI displays returned names and does not duplicate SQL
equivalence. Qualification must exercise Unicode, spacing, case and bounds.

The exact printable whitespace set is U+0020, U+00A0, U+1680,
U+2000–U+200A, U+2028, U+2029, U+202F, U+205F and U+3000. Refuse
U+0000–U+001F and U+007F–U+009F before cleanup; tabs/newlines are refused,
not silently converted. Trim/collapse that set, then count PostgreSQL characters
(not UTF-16 units). Do not perform Unicode composition or accent folding.
Identity uses the same helper expression for lookup and index: lowercase under
the admitted database default, compare the resulting text with COLLATE "C".
The captured baseline admission pins ICU en-US, en_US.UTF-8 collate/ctype and
version 153.121 (prepare-captured-baseline.mjs). Installation must independently
verify those values and actual ICU version. Refuse mismatch rather than choosing
a different locale. BFF preserves raw name/reason; no JS trim/collapse/casing
may alter the signed command. Tests cover NBSP, C1, supplementary characters,
locale-sensitive casing and canonically distinct Unicode sequences.

Unique indexes cover normalized brand name and category normalized name/parent
(NULLS NOT DISTINCT). They cover INSERT and identity-changing UPDATE from all
ordinary database writers, even when writers do not use the new command. Existing
collisions must refuse preparation/apply without data modification.

An INSERT authorization trigger must require a private, signed-command context
bound to backend, transaction, current actor, action and request key for browser
roles. Staff/customer/anonymous and forged/missing contexts refuse. Context is
inaccessible to public/authenticated/service_role callers, cleared before return,
and a deferred guard refuses an orphan at COMMIT. Reuse the existing private
context pattern; do not trust a client-settable GUC as proof. Captured grants/RLS
are recorded, not silently normalized. Any allowed installer-owner insert path
must be explicit, narrowly verified and tested; arbitrary owner/provider mutation
immunity is not established by this design.

The installer exception requires session_user=postgres, current role setting
none/postgres, no auth.uid(), no JWT actor and no command context. current_user
alone is never sufficient: a SECURITY DEFINER function also runs as postgres.
Authenticated/service callers, including functions invoked under those roles,
must fail that exception. Qualify actual login/SET ROLE/definer paths separately;
refuse installation if the captured owner maintenance path differs. A private
context stores payload hash as well as backend/xid/actor/action/key. Its closed
starter is reached only after successful signature verification in the one
signed routine; inventory every caller and deny ordinary direct execution/write.
No lot-context depth, evaluation instant or guest state is copied into it.

Creation uses INSERT ... ON CONFLICT DO NOTHING, never conflict UPDATE. If a
distinct-key competitor wins, perform a fresh READ COMMITTED lookup after the
insert finishes waiting and return that row as reused. If the competing row was
deleted/renamed before lookup, return a retryable conflict without an audit or
receipt effect; same-key retry can attempt again after transaction rollback.
Competing transaction rollback permits the waiting insertion to win. Same-key
receipt contention returns in-progress and retries the same key/body. Exercise
all four cases plus an independent identity-changing UPDATE collision.

Complete category order: read current actor/Admin/AAL2 authorization; acquire
exclusive policy entry (armed deadlines/READ COMMITTED); verify signature/nonce;
validate exact body/hash; read or claim receipt; validate parent full hierarchy
using effective_category_minimum_v1 and the existing private singleton maximum
depth (missing/invalid configuration refuses); establish signed context; insert
or fresh-read reuse; write one event and completed receipt; clear context.
No nonce/rate/receipt write precedes the category entry lock. Replay follows
current authorization and signature verification but returns its historical
receipt before current parent validation. Replays never recreate missing rows.
Brands omit the category lock/parent walk. SQL failures roll back nonce, claim,
context, insert and audit together; a committed successful replay adds no event.

Receipts are historical outcomes, not a current-reference guarantee. Response
includes created/reused identity plus a separately obtained current availability
status. UI refreshes bounded authoritative options before selecting: missing or
changed name/parent is shown for review; never silently recreate or select a
different identity. Existing assignment must independently check current IDs,
eligibility and saved version; a stale receipt cannot authorize assignment.

Category trigger ordering must preserve existing strongest policy entry before
row/name resources. New guards cannot invent hierarchy depth/policy defaults or
disable existing category guards. Installer maintenance/setup and caller roles
must be qualified separately under exact captured permissions.

Captured combined19 categories has no DML triggers. Do not claim an existing
all-writer category entry guard. Add a BEFORE STATEMENT INSERT/UPDATE/DELETE
guard which takes the existing exclusive policy lock before category row/index
resources for every ordinary writer; INSERT additionally requires signed Admin
context at its row guard. Retain READ COMMITTED/armed deadlines/upgrade refusal.
The narrowly identified installer-login exception remains separately qualified;
definer current_user is insufficient. Parent validation uses a fresh statement
after entry. Audit existing signed/legacy category writers for pre-held shared
locks or late entry; refuse unsupported ordering rather than silently changing
accepted behavior. Qualify creation versus reparent/delete holder/waiter schedules,
timeout/upgrade refusal and unchanged rows on refusal. This enforces ordinary
hierarchy serialization, not privileged owner override immunity.

## UI and recovery

Creation belongs beside the existing initial taxonomy choices in the signed
Product Master editor, using the existing AdminDialog, labelled name/parent/reason
controls,44px actions, focus recovery, restrained states and reduced motion.
Creation is deliberate, never triggered by input blur. A confirmed reference
fills the unsaved choice only; explicit paired Save performs assignment.

Report `Created/Matched reference; product changes are not saved yet`. If the
later Save fails, retain the reference selection and the existing save error.
Creation uncertainty freezes exact body/key and offers same-key retry; prevent a
second creation or changed body until resolved. Persist pending state scoped to
actor, reconcile after reload, and discard another actor's editing authority.
No session/token/secrets enter browser storage. A reload must not discard unknown
command outcome and silently generate a fresh key.

Freeze the literal serialized payload text once; retries send those same bytes
and key. Store only actor ID, key, payload text and recovery state. Require the
same current actor/session before retry. Expired login pauses until that actor
reauthenticates; role loss blocks retry and preserves the pending record for
authorized reconciliation. In-progress, network loss and timeout remain unknown;
close/reload preserves the record. A definitive pre-execution validation refusal
or transaction rollback permits correction with a new key; a committed receipt
permits clearing pending state only after its outcome is displayed. Another actor
cannot resume or erase it automatically. Changed/missing current references
require acknowledgement and refreshed choices, not another creation. Test exact
payload replay across reload/re-auth and absence of a second audit/creation.

Secure Sheet must stop offering direct taxonomy create/assignment operations;
point staff to the existing product Edit workflow, without a second assignment
implementation. Supplier creation stays with signed procurement and warehouse
creation stays with its custody/location owner. Neither gets a generic name-only
adapter. Do not claim these separate workflows fixed by taxonomy work.

## Verification and release limits

Implementation follows meaningful red/green checks for validation/authorization,
duplicate concurrent creation and independent-writer collision, same-key retry,
category lock ordering/deadlines, current actor and uncertainty/reload recovery.
Actual signed local Auth/PostgREST/BFF and rendered Draft creation→paired Save
must prove the usable chain, including Staff/anonymous/tampered refusals.

New SQL metadata needs exact source/package pins, atomic local installation,
replay, full catalog/authority/data/sequence conservation and failure recovery.
Reuse unchanged accepted witnesses; requalify only what new schema/code affects.
Native process/client cleanup and all failures remain durably recorded.

Run verify:development once after final runtime source edits. No release gate or
provider activation until separately authorized live promotion and all MAP gates.
Physical inventory, reviewed facts/images, staff/human and real-host acceptance
remain separate; fixtures and intercepted UI are not deployed evidence.

## Review log

Native34 source-driven index correction (11 October): closed EXECUTE on the
normalization key blocks ordinary authenticated Staff identity UPDATE when the
stored unique expression index evaluates it. Captured table writers are
authenticated and service_role; anon retains SELECT only. The pure immutable
key helper is therefore SECURITY DEFINER, postgres-owned, empty search_path,
with EXECUTE only for authenticated/service_role and owner. Its exact body only
lowercases the cleaned supplied input under the admitted default collation;
no database reads/writes or dynamic SQL are allowed. Private schema USAGE stays
owner-only, so direct namespace/key invocation remains denied. Inner cleanup,
context, signature, event and mutation helpers remain closed. Signed creation
still requires Admin/SuperAdmin; this adds no mutation authority. Native proof
must exercise Staff/service identity UPDATE and collision refusal, direct/helper/
context/raw INSERT denials and exact helper body/owner/definer/path/ACL.
Skeptic APPROVED, Guardian APPROVED, Arbiter APPROVED this minimum compatibility
correction; original UI/User Advocate/role decisions remain locked. Failed34
and remaining qualification live in MAP-018, not as verified behavior here.

Skeptic: REVISE, six accepted objections. Resolutions: explicit owner-login
exception distinct from definer identity and signature-proven private context;
fresh READ COMMITTED losing-insert lookup and rollback/contention cases; exact
whitespace/collation/character semantics; historical replay plus current-reference
reconciliation; full lock/nonce/receipt/parent/context order; frozen payload bytes
and terminal versus unknown retry rules. These are requirements for implementation
and qualification, not claims that the controls already exist. YAGNI objection
accepted: no shared context refactor or unrelated lot/guest machinery.

Constraint Guardian: APPROVED, no additional scoped design defects. Authorization,
concurrency, normalization, timer/lock, durable retry and affected installer
conservation remain implementation proof gates. Privileged owner mutation immunity
remains a separate unresolved scope and is not a reason to reopen this design.

User Advocate: APPROVED, no additional scoped usability objections. Explicit
creation versus paired Save, unsaved status, retained selection, exact pending
request recovery and changed/missing identity review satisfy the confirmed flow.

Arbiter: APPROVED for local implementation. All six Skeptic objections and the
YAGNI boundary are accepted/resolved; Guardian and Advocate approvals stand.
No unresolved design objection remains within the confirmed scope. Implementation
and actual qualification gates remain MAP-018; production authorization and
privileged administrative permission-change scope are separate.

Source-driven revision during normalization preparation: combined19 categories
has no DML triggers. Skeptic REVISE accepted: ordinary reparent/delete could
otherwise bypass creation's policy lock. The statement entry guard above is the
minimal hierarchy-preservation correction, not a new maintenance feature. Prior
UI/creation/assignment decisions remain locked. Constraint Guardian APPROVED the
correction as hierarchy serialization within scope; existing-writer schedules,
actual timers and unchanged refusal state remain proof gates. Arbiter APPROVED
the narrow correction; original User Advocate/UI/assignment approvals stand.
No production authorization or privileged-owner immunity follows.
All objections must be resolved here before implementation. Remaining execution
actions live solely in MAP-018, not in this specification.
