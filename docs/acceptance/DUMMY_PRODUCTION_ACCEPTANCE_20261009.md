# Dummy production acceptance receipt — 9 October 2026

## 10 October — combined imported installation and recovery

### 10 October — BFF/reference identity boundary audit

MAP-018 / IDEA-20261009-11: source audit pins12 current files in
`docs/acceptance/BFF_TAXONOMY_IDENTITY_AUDIT_20261010.json`. Product Master
adds Admin/SuperAdmin authority after BFF authorization. Intake accepts the
existing staff identities through origin/cookie/restored Auth/AAL2/signed
session-registry/CSRF and signed dispatcher checks. BFF login/MFA applies returned
user state in the browser, with server cookies; it does not call that browser
Supabase client's `auth.setSession`. Sheet and CSV `useReferenceOptions` directly
list/insert brands/categories through that browser client. With no pre-existing
browser Auth session, the calls may use anon. This is an explicit source-backed
inference, not an observed deployed defect or authorization to widen grants.
Existing Product Master UI tests intercept the route with `route.fulfill`, so
their passing responses do not qualify this actual identity chain.

Extended native SQL test runs in fresh immutable `oci-taxonomy02` via
`node scripts/rehearse-captured-taxonomy.mjs --case=oci-taxonomy02`:
session77988 **exit0**, PostgreSQL17.6/no timeout, runtime19404 stopped/absent.
Actual `anon` role verifies SELECT present/INSERT absent, performs ordered options
reads and attempts both inserts. Each actual insert raises insufficient_privilege;
unexpected admission raises a different uncaught exception. Staff/Admin checks,
four actual inserts/readbacks and entire synthetic auth/profile/taxonomy rollback
remain. Complete schema is exact accepted e9ff1868... before/after; all original
88-table/two-sequence projections remain bc485716...; two separate complete
global/managed authority checks pass. Primary independently verified exact anon,
Staff/Admin/authority markers, native byte-comparison hash pairs, current/staged
SQL hash, terminal serial hash and all12 source pins. The report's historical
marker aggregate alone does not include the anon marker; this explicit independent
check is required for the anonymous claim.

Private terminal result SHA256
`0e48f85d585b2f88468787acd63fe040811cc84e53aff09d69183d9eccee4117`;
serial SHA256 `6d779ab9683278798a44de125d6f01841342f593babecf96195ecdd48b230d8c`;
executed SQL SHA256 `cf9034687d506e81f162984381c78ba76b1cdfa21e7095215131a96c7fef3e4c`.
Prior01 sources/results remain immutable. Final development8276 exits0; no
application/browser/release repeat. No product code, provider, permission,
token-storage or main/deployment change. Runtime is RAM-only/stopped; preserve
all source image/archive/case/serial/result files. Source revert recovers the
witness; the retained original captured archive remains database recovery.

Independent review finds no Critical/Important issue: all12 source pins,
current/staged SQL, terminal result/serial, PID absence, exact anonymous/Staff/Admin
markers and full conservation pairs were reproduced from retained evidence.
Audit JSON SHA256 `881e5ba39022f919b8e4dfccc37fad9c2088d380a21081907cdcc08210e19f8f`.

**Exact next MAP-018 action:** reproduce the fresh BFF-only browser identity
through genuine local Auth/PostgREST and current BFF routes with the exact captured
database authority, then select the smallest correction that preserves server-held
tokens and authenticated staff authority. Do not return tokens to the browser,
grant anonymous writes, weaken session/AAL2/CSRF or substitute intercepted HTTP
success. No genuine local HTTP Auth/PostgREST stack has been reached: Docker and
Podman commands are unavailable, WSL reports uninstalled, accepted QEMU launch
has `-nic none` and SQL-only evidence. These are setup gaps, not proof that an
isolated gateway cannot be prepared. Prepare that owned runtime next without
changing production settings; hosted/provider write gates remain separate.
Signed product concurrency, missing policy-clear/fallback/review/stock schedules,
ACL through-commit, transport/unknown-outcome and full real-host acceptance remain.

### 10 October — effective captured-authority taxonomy

MAP-018 / IDEA-20261009-11: `node scripts/rehearse-captured-taxonomy.mjs
--case=oci-taxonomy01` finished session45071 **exit0**, native PostgreSQL17.6,
no timeout, runtime5572 stopped and independently absent. The scoped RAM fixture
reuses immutable oci-imported02 inputs and installs the identical ba15a5d8...
package once. It does not rerun the prior fresh/replay/drift/cold recovery suite.
No production SQL, taxonomy grant or business writer changed.

`supabase/tests/captured_taxonomy_access.sql` creates two explicit synthetic
auth/profile identities inside one transaction. Actual `authenticated` role and
existing `is_staff()`/`is_admin()` predicates distinguish Staff and Admin. Staff
has public schema USAGE and table/column SELECT; both profiles perform actual
ordered `id,name` reads on brands/categories, insert explicit synthetic rows in
both tables and read those identities back. RLS and captured grants admit all
four inserts. The whole transaction rolls back, including synthetic users and
profiles. These are synthetic native claim settings, not verified JWTs.

Complete schema capture before/after has exact accepted after-catalog hash
`e9ff18682ab3f3f65c43bf16eff7e6bad6bc77dc32f3f329ecb68d5b22e15460`.
All original88-table/two-sequence projections before/after have exact hash
`bc48571670111f349382b9d675f38025aa0e7df0d40063b3b5c1c4d49906cb3c`.
Native byte comparisons pass before printing conservation success; unchanged
original-column semantics exclude only the previously admitted evidence bucket.
Separate non-superuser postgres checks compare every captured global role,
membership, event binding and eight managed settings before/after, both pass.
Primary independently verified source/staged SQL and probe hashes, terminal
receipt/serial hash, exact marker counts, projection/catalog hash pairs and PID
absence. The inherited `moduleGucs` report key is a scoped marker aggregate,
not a new broad managed-extension guarantee.

Private evidence remains in the explicit owned root's `oci-taxonomy01`:

- Executed SQL SHA256 `76b93744de88bef4700de227f05523d8931080a9119960d54500e1d4248db41c`.
- Executed orchestration SHA256 `0814041a4b4c39f2aed095ec84e89da9ab8b3e1928dbdafe1e7aeea3fbb7688a`.
- Retained derived runner SHA256 `357e260da57af0658a28eab51b3a08fa85bee6e22d4dfa348b4a45c831d447e2`.
- Terminal result SHA256 `e20f8016e0efe677478df938c881eeacc820e58680657bec37dca0f5aac3414b`.
- Serial SHA256 `184d8c6ec3bf302c1776b026265a43e8acc78264dd47d089e29f184a6a6003cb`.

Independent review confirms the native role/profile/statements, all88-table/two-sequence coverage, complete authority witness and stopped PID; no Critical/Important issue. The inherited marker-field naming limitation is preserved above.

SQL is the native test, not an activation migration. Earlier owner-only PG17.11
denials remain valid diagnostic evidence with different authority. Development
session67317 exits0 after the final source edits; syntax and diff checks pass.
No app/browser/release suite was repeated. RAM runtime is stopped; retain all
immutable source images/archives/results and the exact original cold restore.
Source revert recovers the witness; no inverse taxonomy SQL or provider cleanup
is required. Publishing remains separately blocked by automatic review pending
the owner's feature-branch push approval.

**Exact next MAP-018 action:** qualify actual BFF/Auth taxonomy and signed
imported product concurrency, then policy-clear/inherited-fallback and competing
review/first-stock schedules against current composition. Native permission
acceptance does not prove BFF serialization, real JWTs, all writers, provider
activation, stock/listing readiness or real-host behavior. Through-commit ACL,
management transport/unknown-outcome, current write authorization and complete
real-host acceptance gates remain unchanged.

**Publishing handoff, 10 October:** Verified captured-authority checkpoint171d832 is committed locally. Automatic approval review rejected `git push origin codex/dummy-production-acceptance`: it could not verify approved repository destination/exact code-disclosure authorization. Verified origin is https://github.com/k2jimzonwebsite/K2-Jimzon.git; remote feature branch remains8829f6e. No workaround or second push attempted. Owner approval for this exact feature-branch push is pending; local evidence and all remaining MAP-018 gates are preserved. Exact publishing action after approval: push the existing feature branch to that origin, then verify local/remote equality. This is separate from production activation/main promotion.

### 10 October — genuine captured-authority imported composition

MAP-018 / IDEA-20261009-11: **owned native execution passed**, not provider
activation or product readiness. `node scripts/prepare-imported-provider-fixture.mjs
--case=oci-imported02` prepared the immutable captured-authority extension;
`node scripts/run-imported-provider-fixture.mjs --case=oci-imported02` finished
session82754 **exit0**, PostgreSQL17.6, supautils/module probe true, no timeout,
runtime20164 stopped and independently absent. Native fixture uses retained
29-layer Linux image, captured baseline/locale, roles/memberships/event bindings,
managed settings and schema/table/column/default/function ACLs. Only three
existing function bodies change; one postgres-owned helper has only postgres
EXECUTE. Independent review compared the actual prepared expected contract:
all remaining metadata unchanged, seven protected tables and 81 cutover locks.
No permission grants, alternate operational writer or provider dispatch added.

Fresh installation and exact replay retain the original 2s/10s guards.
Independent terminal catalog checks match the package's complete before/after
constants and exact cold rollback. Serial independently contains three original
88-table foundation-row checks, two captured baseline/locale checks, one cold
global/managed-authority check, one committed original-projection check, one
fresh/replay check, one protected concurrent-drift refusal/recovery check and
one 43,768-reference-row check. Full schema/global/managed checks and timers
stay in the native SQL, not inferred from a process exit alone. This extends
the accepted oci-envelope12 package; earlier PG17.11/185-pass and oci-envelope12
receipts keep their historical source hashes and scopes.

Private immutable outputs live under
`D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc/oci-imported02`:

- SQL package SHA256 `ba15a5d893b8fb188dc1c9180c4bef85ce3f6a69ca867b065622aedf45f7c4ef`.
- Fixture SHA256 `87e959e1b66b72d85875b79a786cc35169eb7d287efdadd45b7fe4a5cde50eac`.
- Composition manifest SHA256 `190164f4368ef46a8d8474fa658fac0c13359926574f4bfffa3065530254ccbc`.
- Terminal result SHA256 `530fa8ac4d49b72835827c441af8578d5ae24353f74882339656887a66de668f`.
- Serial SHA256 `eb579724b49a1415f139d42f8631aa4b5d36623ed77756690ff3712398def9ed`.
- Before/rollback catalog SHA256 `87941b6c79455be42391d9fb2b9a02eebc650f9ee6b1124b9aac2509526ff963`.
- After catalog SHA256 `e9ff18682ab3f3f65c43bf16eff7e6bad6bc77dc32f3f329ecb68d5b22e15460`.

The canonical generator now admits two exact reviewed content hashes: original
`7c7e96cc81aa6535976ddf447355fd707fbe3392e7e5b2f79866abe814afd1fb`
and imported `372b188c83b16cc64438a996a99d429c3ebe39a862a09824ce6caa2411951633`.
Unknown/modified contents and protected metadata drift still refuse. Generator
source SHA256 is `3e13cae309da45523b3f368321aeda4c3730dd4f128147da4c193b84a03158e5`;
the maintained local installer source-identity check follows that source revision,
while generated baseline SQL is proven byte-identical. Generic generator source
is explicitly versioned; raw captures/packages/logs remain private.

Focused `node --test tests/imported-provider-barrier.test.mjs` passes4/0/no skips;
reviewer independently reproduced4/0 and found no Critical/Important source
issue. These tests require retained private fixture inputs and are preparation
contracts, not native or hosted substitutes. Final source-edit development
session28059 exits0. `git diff --check` passes. No redundant app/browser/release
run or production deployment was performed.

Retained preparation diagnostics: the first derivation failed before writing
because replacement-string SQL interpolation duplicated an anchor; callback
replacement corrected it. `prepare-oci-imported01.mjs` remains as the next
refused source: existing barrier correctly rejected the unadmitted payload
before fixture creation. Four focused tests first demonstrated the missing
admission, then passed after the second fixed pin. The first run wrapper refused
an already prepared runner before execution; corrected wrapper requires exact
retained runner bytes and refuses existing execution directories. No diagnostic
overwrites prior evidence or modifies a provider. Runtime is RAM-only and stopped;
preserve all original archives/layers/source/result files. Harness recovery is
source revert, database recovery is the retained exact captured cold restore,
not inverse imported SQL.

**Exact next MAP-018 action:** qualify effective taxonomy option reads and
Staff/Admin writes on this genuine captured-authority composition, then actual
BFF/Auth concurrency, missing policy-clear/inherited-fallback and competing
review/first-stock schedules. Installation does not exercise that signed product
chain. ACL authority through commit remains unresolved; management API
transaction/unknown-outcome semantics, current owner authorization and real-host
Auth/media/imported review/listing/order/payment/packing acceptance remain required.
No provider write, main promotion, verified physical stock or user-ready claim.

### 10 October — native taxonomy authority boundary

MAP-018 / IDEA-20261009-11: the maintained witness's new scoped mode finished
with **17 diagnostic checks, zero failures**, while `nativeOptionsUsable=false`
and `productReady=false`. Actual `authenticated` Staff and Admin connections
each resolve their synthetic profile correctly. Both `brands` and `categories`
ordered `id,name` reads refuse with table permission errors; effective table and
column SELECT predicates are false. Both direct insert attempts refuse and
effective INSERT is false. Public schema USAGE is true; direct auth-schema USAGE
is false. Synthetic claim settings are not verified JWTs. No PostgREST/HTTP BFF,
provider, hosted Auth or product readiness claim follows from this diagnostic.

The private captured K2 catalog independently identifies project
`pixplcjqivlfflickobf`, version `170006`, and retains `anon=r/postgres` plus
`authenticated=arwd/postgres` on both tables. Catalog source SHA-256:
`43d329972489e2ff4f56800887f3eeb200ab913dc437e88e761d175cf24316eb`.
Historical source `20260812_map017_public_write_boundary_hardening.sql` also
declares these taxonomy read/staff mutation grants. The owner-only local contract
therefore differs from captured provider authority. This is a fixture fidelity
finding, not proof of a currently broken live taxonomy endpoint or a reason to
add new product grants. The stored capture is historical; no provider was queried.

Executed command:

```powershell
node scripts/rehearse-imported-draft.mjs --recovery-root=D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc --qualify-taxonomy-access
```

This mode reuses the exact accepted `abc2abd5...` package in one new owned clone,
without repeating installation/recovery/importer/browser coverage. Final session
53575 exits 0; private receipt root is
`D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc/imported-draft-ba9f7deb-2146-4caa-803e-2a3f97f86db6`.
Result SHA-256 `9a2bc92ae9b9fc4a28a9a887704472d817aef19f1a05b456bf4da6c024781972`;
current/executed runner `07c2ab8ba923a1c3092c381ceb4e3e008db79ec3edd4e200d2e6044e356f4ac7`.
All 105 ordinary public/k2_private row count/hash maps and captured metadata
(`c9f6b799...`) match before/after. These maps do not include auth/storage rows or
sequence values. Independent readback checks exact current/archived source,
both profile/role bindings, all four pairs of query refusals and predicates,
complete scoped maps, child settlement, clone removal, stopped mirror/original,
all 3,602 original files and both absent PID files. No grants or business SQL changed.
Independent final review reports no Critical/Important issues and separately
rehashes all 3,602 original manifest entries, both source copies and the receipt.

Preserved diagnostics: session28754/root `0a4f1404...` exits 1 after six preceding
checks because the observer directly called `auth.uid()` without auth-schema
USAGE; the observer now reads its claim setting and independently checks the
native profile helpers. Session96804/root `dd624b57...` exits 0/17 checks before
the report-only addition retaining both conservation maps. All three runs remove
their clone, stop owned runtimes and retain all original files. Final development
gate session38684 exits 0 after the last source edit. Existing 185/0 native and
1396-case CI receipts retain their own source pins; they were not rerun.

Exact next remains MAP-018: compose imported continuation into the genuine
captured-authority fixture and observe effective role/options behavior there,
then actual BFF/Auth and the uncovered policy-clear/fallback and competing-session
schedules. Preserve the historical inventory and private captured baseline;
do not patch the owner-only local package to resemble provider authority by
loosening guards. Recovery reverts only this harness mode; whole-backup recovery
and prior immutable receipts remain the database authority.

### 10 October — remaining writer coverage audit

MAP-018 / IDEA-20261009-11 now has a pinned read-only comparison in
`DUMMY_PRODUCTION_WRITER_AUDIT_20261010.json`. The accepted local package contains
261 functions and 161 relations; the retained full05 inventory contains 232
functions and 153 relations. Exact definition hashes identify 207 unchanged,
25 changed and 29 added functions. Earlier inventory edges and native receipts
remain historical evidence; matching a function alone does not prove unchanged
callers, authority, fixtures or concurrency. This audit rechecks the immutable
185-pass receipt/package/runner pins and records all nine observed schedules;
it executes no new native tests and changes no business code or provider state.

Detailed definition/ACL/lock comparisons remain private in
`.tools/current-writer-audit-20261010.json`, SHA-256
`32a3f62948c83f2f7ad9d9b3b67c503b5e4170447890e2aaced81c5e7c7e34de`.
The versioned JSON is a sanitized summary. A fresh Node assertion readback passed
all seven file pins, private/summary equality, complete definition counts, nine
schedules, taxonomy scope, unchanged historical inventory and exact MAP next
action; `git diff --check` exited 0. No application gate was repeated.

Coverage classification: catalog update and initial product brand/category
assignment versus imported review are observed in both directions. Policy
**set** versus imported review and first stock is observed in both directions.
Reviewed association before first stock is observed; the connected sequential
listing/order/payment/packing/handover path is retained. Policy **clear** and
inherited fallback, competing review-session versus first stock, broader lot/
recount and order/maintenance overlaps are not proved by these nine schedules.
Earlier staff policy/lifecycle receipts are scoped to their own frozen source;
compare the changed composed roots before reusing their operational claims.

The current contract lists only the postgres table ACL on both `public.brands`
and `public.categories`, no column ACLs and no triggers. It retains staff-manage
and public-read RLS policies. The current BFF taxonomy chooser performs direct
authenticated table reads, and the reference-option source still contains direct
browser inserts. RLS alone supplies no table privilege. Effective inherited role
authority and actual BFF/Auth reads were not observed by this offline audit;
this is a concrete readiness gap, not a claimed live permission failure or
authorization to add grants. MAP-018 owns the native effective-privilege and
taxonomy-options check before taxonomy CRUD races, then the missing policy-clear
and competing-session schedules. No repeated importer/browser/release gate is
needed for this documentation-only audit. Recovery removes only this audit
artifact/documentation; the existing private backup and native receipts remain.

### 10 October — observed current-writer schedules

**Current policy/stock extension, locally verified:** MAP-018 /
IDEA-20261009-11 / IDEA-20261007-01. The maintained combined rehearsal now exits0 with
**185 checks, zero failures** and nine observed native connection schedules.
The four added pairs reach advisory key1261585232/1347374169, with actual granted
holder/ungranted waiter modes: policy/review ExclusiveLock/ExclusiveLock in both
directions; policy/first stock ExclusiveLock/ShareLock and its reverse. Both
commands commit in each pair. Lazy signing follows actual distinct server-minute
buckets; original2s lock/10s statement limits and all signers remain unchanged.

Policy/review retains the same UUID/SKU/catalog/photo, one reviewed association
and catalog-version change, one policy version/event, exact saved policy reply,
and complete stale-policy refusal. Policy/stock retains six physical units,
zero reserved, on-hand6 and one stock-source audit. Policy-first intake projects
zero sellable; stock-first intake retains its admitted projection6 while the
current anonymous stock reader returns0 after stricter policy. The independently
resolved lot eligibility is0; physical custody is not erased by policy changes.
This tests current anonymous stock, not every catalog/Admin reader or actual host.

Full metadata and all rows outside exact synthetic identities are retained.
The105 public/private table projections preserve existing target-category event
history and null audit identities; normal nonce/rate/command-receipt effects are
explicitly excluded from these business-row projections. Exact filters and both
count/hash maps are retained in the result. Independent review corrected the
earlier table-only allowlist and partial policy-reply checks before acceptance.

Command: node scripts/rehearse-imported-draft.mjs
--recovery-root=D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc
--qualify-installation --qualify-writers.
Final session61495 terminal0; immutable private root
D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc/imported-draft-025b3682-3b76-465e-bd2a-5c2c0c597314.
ResultSHA2562a3dba7e597c3199e0b6540d9386b17ab15b9b86ab0feebb9a536f4464e2f36a;
archived/current runnerSHA25600ced3261c399bddf19627a341dbbecb1bfd548f1794648a487eaa5700a95b00.
Combined package remains11532586bytes/abc2abd5...; populated backup
SHA25699fe7799c59f096534d70c6f994ae883deb2fa497aab3ab4906a381eea502bad.
Current/cold installation/replay/drift/rollback/populated recovery and connected
dummy order/handover checks pass. Independent readback confirms all185 passes,
nine schedules, exact key/modes/minute ordering, all four projected maps equal,
source hashes equal, child settlement/all clones removed/stopped mirror/original
and manifest3602; both postmaster.pid files are absent. JSON OID identity fields
are exact decimal strings; the independent checker corrected its numeric-type
expectation without altering source or native evidence.

Preserved diagnostics: 2a1acf25... session13009 terminal1/160pass1fail selected
the AAL-context JSON instead of the stock receipt; resultSHA8eb4f05290fb....
535acc58... session15251 terminal1/161 preceding checks pass; the new anonymous
query used the wrong return column stock_available; resultSHA23298392b5f5....
Actual contract stock_from_batches is retained. Both diagnostics settle children,
remove clones, stop runtimes and preserve all3602 originals. No product SQL changed.
Final npm run verify:development session9947 exits0 after final source edits;
unaffected42-contract/26-UI/1396-CI and previous SQL evidence are retained.
No new full browser suite, release gate, provider call or live promotion.

Remaining MAP-018: other taxonomy/stock schedules and actual BFF/Auth concurrency,
genuine captured17.6/supautils composition, ACL through-commit protection,
management transaction/unknown-outcome, current backup/offsite and hosted/human
acceptance. No global authority or real Auth/media/physical stock claim.
Recovery is scoped harness-source rollback and the retained whole local backup,
never an inverse merge over staff edits. This completed witness leaves the active
queue; the full MAP item remains open.

**Final CI observation, 10 October:** [Run38009805472](https://github.com/k2jimzonwebsite/K2-Jimzon/actions/runs/38009805472)
is completed/SUCCESS, attempt2, head d9cd9245fe6a2435eca2c7bbbb1a4bb78aec6c3e.
Actions tested PR merge1a4336192a1dbfae9730bcdd1f283603fceacd76 against base
b6ef5863308e60caa4d9b16da3978c5a8f50f37a, not documentation-only HEAD1a54099.
Original build job114086932528 retained all1396 passing Playwright cases across18
suites, separate builds, security/import checks and MAP-017/catalog rehearsals;
it was not rerun. Original SQL job114086932689 failed before final-Admin SQL:
PostgreSQL could not bind127.0.0.1:54332 (Address already in use). Purchase-hold
48/48 and payment recovery had passed; the occupying process was not identified.
These runners were unchanged between02247ff andd9cd924. Connector retry refused
403; authenticated CLI accepted `gh run rerun 38009805472 --failed`.
Retry job114093633868 succeeds: purchase-hold48/48, payment recovery/composed
packing, final-Admin one demotion commit/one K2_ADMIN_FINAL_ADMIN refusal and
retained Staff,Admin. This confirms unchanged checks on a fresh runner, not the
original port owner's identity. Run metadata was independently read with
`gh run view 38009805472 --json status,conclusion,headSha,attempt,url` and connector
job metadata/logs. Private receipt: .tools/ci-run-38009805472-receipt.json.
Documentation-only continuation; no source fix, unaffected local suite, release
gate, provider write or deployment. Private evidence/backups remain intact.
The completed CI observation leaves MAP-018's active queue; broader writer,
provider, recovery and actual-host/human gates remain open there.

**Remote source checkpoint:** d9cd9245fe6a2435eca2c7bbbb1a4bb78aec6c3e
publishes this reviewed harness/evidence batch to draft PR16. Earlier application
checkpoint02247ff completes Linux run38008808492 with both jobs SUCCESS:
1396 Playwright cases across18 suites (1103/4/12/32/29/41/8/42/1/41/17/1/8/14/2/4/11/26),
separate isolated builds, security checks, MAP-017/catalog rollback and critical
stock/payment/final-Admin SQL rehearsals. This closes the earlier Linux phone-map
failure for that application checkpoint. Later38009805472 completes SUCCESS at
d9cd924 on attempt2; the focused SQL retry and first failure are recorded above.
Both new separate Vercel deployments
dpl_EhgLqDpKxUQ7WWLzgRGcj9tN56BT and dpl_Aq7YSrfby1MzxWLxD3gRiT4GQuCA
are directly observed READY/target:null/exactd9cd924 in the same two K2 projects.
Exact Admin https://k2-jimzon-admin-f67ft1639-k2-jimzon.vercel.app and Storefront
https://k2-jimzon-g9ly7iyui-k2-jimzon.vercel.app roots return200/correct separate
titles. These remain previews/HTTP proof, not activated workflow/production.

The same maintained rehearsal with `--qualify-installation --qualify-writers`
exits0 with125 checks/zero failures. Private root
`D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc/imported-draft-d9231f93-dcb5-4288-8c36-62c741fec276`,
resultSHA25676222e348611f25ae710aa9c67d6f6a6905975f305eef03ba331f0abc612eaa7;
combined package remains exactabc2abd5.... Five uniquely named native connection
pairs explicitly observe firstPgSleep after its signed body and secondLock wait
with the first PID in pg_blocking_pids. Actual observed blocking pairs:
catalog→review18568→668; first brand/category assignment→review4056→4676;
review→catalog15640→5420; review→taxonomy2512→12016;
review→first inventory19840→11640. All waits are transactionid, not an assumed
advisory-lock observation. The holder commits; stale review/catalog/taxonomy
contenders exit3 with the exact version error. First inventory succeeds only
after reviewed association commits; a new second first-stock request refuses
and preserves all application rows/metadata. Exactly six dummy units are recorded.

Immediate child rejection handling and settlement precede clone disposal.
`--writer-observation-failure` deliberately throws only after a real signed
review is observed holding its transaction: diagnostic root1b05fa18-404f-4d33-8158-1813840f2428,
resultSHA25665a464d3a6e113bbd783474a2c834f85a3f35df54fe16b61b0ed946fe374dcc8.
Expected terminal1/EXPLICIT_WRITER_OBSERVATION_FAILURE,25 preceding checks pass;
independent readback confirms every child settled, clone removed, mirror/original
stopped and all3602 original files retained. Parent disposal refusal preserves
shutdown/result handling. Earlier120-check rootb06cdbef... remains private and is
superseded for concurrency claims because it did not observe the contender wait.
Independent review's two Important findings were corrected and re-reviewed.

Final `npm run verify:development` after the final diagnostic edit exits0;
source/environment/import/secret/dependency and security inventories pass.
No application code changed in this witness batch, so passing42-contract/26-UI
and prior source proofs were retained without rerunning unaffected suites.

Scope is these five native signed schedules and duplicate first-stock refusal,
not every taxonomy/policy/inventory operation, real BFF/Auth concurrency, genuine
provider authority or global through-commit immunity. Other required acceptance
remains solely MAP-018. No application/business writer changed in this witness.

**GitHub/preview checkpoint:**02247ff648500462b79f71a68a577e7a8ab7e431
is pushed to codex/dummy-production-acceptance; [draft PR16](https://github.com/k2jimzonwebsite/K2-Jimzon/pull/16)
is attached to this chat. K2 Vercel connector directly returns READY/target:null
for Admin dpl_Fi1voUqwKpy5Cf4XAbZdyvpqCemv/projectprj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x
and Storefront dpl_JBCN1wa11s6VUY8F1HdZ9xtGKvB6/projectprj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL,
both with exact commit02247ff. Root fetches at
https://k2-jimzon-admin-e9592s77g-k2-jimzon.vercel.app and
https://k2-jimzon-getb09lbc-k2-jimzon.vercel.app return200 and separate correct
titles. This observes preview metadata/HTTP only, not rendered/Auth/activated
workflow or a main promotion. Linux run38008808492 critical-sql-behavior succeeds;
complete build-and-smoke/browser status remains in MAP-018 until terminal.
The script-unreached Vercel gate remains accurate for that script, but no longer
supports a blanket claim that K2 Vercel previews cannot be reached.

MAP-018 / IDEA-20261007-01/-12. The existing owned rehearsal now uses
`scripts/qualify-imported-installation.mjs` and the canonical
`operatingReplayPackage` generator. Source-pinned accepted contents and the
imported fragment share one full current/cold contract; repeated nested
admission wrappers alone are removed. Original2s lock/10s statement limits
remain. Calibration permits exactly three function-body changes and one private
helper, preserving all other contract/function-authority metadata. This is an
owned PG17.11 package, not a provider installation candidate.

```powershell
node scripts/rehearse-imported-draft.mjs --recovery-root=D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc --qualify-installation
```

Final run exits0: **102 checks, zero failures**. Populated and schema-only copies
pass fresh commit, exact replay, original RLS drift refusal, helper ACL drift
refusal and explicit failure after successful apply with complete rollback.
Rollback/recovery/replay compare every original row. Successful-install
conservation alone permits the absent-before evidence bucket, whose exact
private configuration is separately checked. Original columns of all88 tables
and both sequence states remain. A custom-format populated backup restores into
a third marked database with full original logical contract, rows, sequences
and event bindings matching. The signed imported review-to-handover chain passes
on this combined installation: SKU K2-SKU-001001, dummy order WEB-CD8EF48276,
physical5/reserved0/one ownership event from six dummy units. No real Auth/media,
paid AI, money or physical stock is asserted.

Private immutable root:
`D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc/imported-draft-1b575df3-478e-4b1d-a2ba-b8d361746037`.
ResultSHA25649223d1bb569c8d109ad844ba6e1f2d593f237d894854b2200c8250f3d9ce2a1;
package11532586bytes/SHA256abc2abd5d685913d07508bd704aa1ecc0a29c6b0bae0f870cb47cb5ca82f85d5;
backupSHA25689d3d36740f25f3bcf19ab771604a195980b428c729a69596e2a047855e7c8e4.
Logical query/builder hashes are pinned and recorded. Independent readback
checks receipt/package hashes, all102 passes, all three clone removals, stopped
mirror/original and all3602 original files retained. Independent source review's
bucket-comparison weakness was corrected and re-reviewed with no remaining
Critical/Important finding. Final `npm run verify:development` exits0; no
unaffected browser suite or release gate was repeated for this harness batch.

Regression d3866aa6... proves old-foundation replay refuses after the separate
fragment.93eac602.../7d862bb0... are constant-reader/sequence-composite harness
failures.32357ced... retains the unchanged10s nested-wrapper timeout; its cold
clone was removed after exact mirror/marker/owner/no-session verification,
receipt `.tools/cleanup-installation-cold-receipt.json`. Final flattening retains
all pinned function guards and complete outer admission/postconditions. Client
terse errors avoid duplicating large SQL in stderr without changing SQL limits
or error/notice status. All failures remain private; no production write occurred.

This supersedes prior current/cold/populated recovery gaps only for the owned
PG17.11 package. Current catalog/taxonomy/inventory writers, genuine provider
composition/transport, the authority-through-commit counterexample, explicit
live authorization and actual-host/human acceptance remain MAP-018/023/025.
Recovery restores the verified whole backup, not an inverse merge over staff edits.

Owning work: MAP-018/023/025. This records tested scope and gaps; it is not another
backlog. No real stock, funds, Auth identity or human participation is asserted.

| Scope | Evidence | Qualification |
| --- | --- | --- |
| Released source | Prior local verify:release exit0,1384 browser cases and separate builds retained | Local source proof; unrelated suites not repeated |
| Release CI |37941316559 SQL job success; browser failure at tests/workflow-map-ui.spec.js:94 | Remote candidate is not fully green |
| Phone role control |375px Arial18px probe397px before correction; new strict test fails before; full map suite11/11 after | Local correction; remote Linux CI still unverified |
| Development guard | npm run verify:development exit0 after final source edit | Secret, import, source/environment, dependency and security checks pass |
| Final map render |375/1440 document width equals viewport; actual captures inspected | Chromium viewport evidence; no physical touch/Safari claim |
| Connected canonical fulfillment | Existing native N121/0 and maintained HTTP26/0 retained | Dummy checkout, instructions, proof, separate Admin verdict, packing/handover; no rendered imported-product chain |
| Permission race05 | Actual owner ACL revoke and installer each commit0 after final check | Counterexample verified; permission protection fails |
| Race recovery | Original88 tables/two sequences matchbc485716..., full after-catalogabb347eb..., global/managed witness passes; guest stopped | Local records and authority restored; no provider write |
| Imported-product review | Superseded by the 10 October local implementation receipt below | Provider/hosted qualification remains open |
| Full human cycle | No full human test started | Still gated by connected workflow/provider readiness |

Focused commands:

```powershell
$env:K2_ACCEPTANCE_NO_WATCH='true'
npx playwright test --config playwright.workflow-map.config.js --grep 'wider native'
npx playwright test --config playwright.workflow-map.config.js
npm run verify:development
```

The first focused command failed against the unchanged layout at its width
assertion. After two flex sizing changes, the complete11-case map suite exits0.
Standalone screenshot/geometry probe confirms375/1440 widths. Private artifacts
are .tools/dummy-acceptance-map-phone.png and ...-desktop.png; they are not product
claims or intended public GitHub uploads.

Native commands prepare and execute the retained owned postcheck05 diagnostic;
their immutable targets must not be reused/overwritten. Execution session48398
exits0, guest PostgreSQL17.6, no network device, RAM-only database. Independent
read-only Node assertions verify serial/result hash, exact source difference,
observed barrier/lock, committed grant-option drift, both commit statuses, all
original projections and recovery markers. Serial SHA256:
a02911b461cbb5ab034cc84131a595ef1ebda17ac6cf7b7e226c902f0e7983a3.
PID17184 is independently absent. Accepted SQL SHA256 remains
db0cb4d188a743bbadd29cc337e329573ab5405f83e30dc9ae6de554a92036ff.

The observed ACL behavior agrees with [PostgreSQL17 relation.c](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/access/common/relation.c): permission changes do not acquire a target relation lock. A stronger table lock alone is therefore not a supported fix. This is a source-backed inference beyond the observed AccessShare experiment; global/managed protection is still unqualified.

Changed source: MasterWorkflowGraph.jsx and workflow-map-ui.spec.js. Design keeps
existing Admin type/colors/44px controls and motion. All four mandatory design
skills applied; no broader visual redesign. Recovery reverts only this slice.
Main/deployed source and provider remain unchanged. The 10 October receipt below
supersedes the earlier pending approach selection. Exact remaining actions stay
solely in the owning MAP.

## 10 October — imported Draft continuation, local candidate

IDEA-20261007-01/-12, MAP-018/020/023/025. Staff can open a successfully imported
CSV row in the existing intake, complete the same packaging review, edit proposed
facts, explicitly approve fields, and save against the original product identity.
Only accepted facts merge; rejected/absent values and supplied photo/SKU/import
history remain. Existing null brand/category may resolve to existing taxonomy;
non-null reassignment is refused. Origin aliases remain coherent. Optional AI
compares registered package bytes against bounded original facts; visible advice
and unknowns require staff judgement. Supplied photo URLs are not fetched, and
imported image generation/attachment is refused before provider/storage effects
in the BFF and before budget/job/media changes in the locked SQL command.

| Final evidence | Result | Scope |
| --- | --- | --- |
| Signed native imported lifecycle |56/0, terminal0 | Actual CSV→review→six stock units→publication→Website→guest order→payment→pack→handover |
| One-winner review race | Two independent native connections, one success/one version refusal | One product association and one audit; committed retry stays identical |
| Native refusals/replay | All public/private rows and complete catalog fingerprint unchanged | Incomplete/stale/role/AAL2/provenance/image claim/attachment refusal and guarded replay |
| Maintained contract/provider batch |42/42, terminal0 | Exact bigint selection, immutable baseline, bounded advice, no paid retry, imported image preflight |
| Actual intake/CSV UI |26/26, terminal0 | Phone manual review, explicit acceptance, AI unavailable/advice visibility, stale refresh/new session, actor and lost-reply recovery |
| Development gate |npm run verify:development exit0 | Required secret, source, imports, dependency, environment and security checks |
| Independent code review | Three important findings corrected and re-reviewed | No remaining Critical/Important issue in reviewed corrections; source review only |

Commands:

```powershell
node scripts/prepare-imported-draft.mjs
node scripts/rehearse-imported-draft.mjs --recovery-root=D:/K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc
npx playwright test --config=playwright.api.config.js tests/product-intake-contract.spec.js tests/intake-ai-provider.spec.js tests/intake-ai-jobs.spec.js --output=.tools/imported-contract-reviewed-final
npx playwright test --config=playwright.intake-ai.config.js --output=.tools/imported-ui-reviewed-final
npm run verify:development
```

Prepared-only SQL: supabase/prepared/imported_draft_continuation.sql,55,237 bytes,
SHA25626ec4db009173aef02e3954504c05991937fb4d503769fc5133f3ebaa999d52a.
The deterministic generator refuses a changed private capture. It preserves
the existing function OIDs/ACL/config/metadata while patching exactly three
captured bodies and adds one closed private eligibility helper. It is not a
provider executor or substitute for the complete captured installation envelope.

Final native immutable output:
`D:\K2-Jimzon-local-recovery-32c52df326424b5a8b845c327824f4bc\imported-draft-d48ae53f-daf1-4c08-a690-6e3f32e34daf`.
Result SHA256e610f23429e7b8b1ef6cd3ce616dc638f3d38c24c9410475ef6ec4882c9bc938.
Exact original K2-SKU-001001 completes WEB-DC51AD06BD with physical5/reserved0/
one ownership event. Clone removed, mirror stopped, original stopped and all3,602
original backup files retained. Registered evidence, actors, payment and stock are
explicitly synthetic; this proves signed database/validator behavior, not real
Auth identity, uploaded Storage objects, money or physical inventory.

Meaningful red evidence precedes the target/provenance/AI-context changes,
stale-screen correction, advice display, origin coherence and authoritative image
guards. Failed immutable rehearsal outputs remain private for diagnosis; no raw
capture or private SQL was force-added. UI screenshot output now uses each test's
own output folder; three archived screenshots overwritten by an old test were
restored exactly from HEAD. Final375/1440 captures were inspected; the imported
review uses the existing outer modal scroll and avoids a nested cramped pane.

Changed systems: existing BFF intake/AI handlers, intake service/resume helper,
CSV/Sheet/modal/AI panel, prepared generator/SQL, maintained native runner and
focused tests. Rulebook, Brain, design, map, architecture, idea register and intake
runbook record the behavior and limits. Rollback is scoped source rollback plus
the verified whole local baseline/recovery protocol; do not improvise a reverse
merge over staff edits. Current/cold guarded envelope integration, other current
writer races, populated recovery, provider authority-through-commit and actual
connector semantics remain MAP-018/023. Actual-host Auth/media/listing/order and
full human acceptance remain MAP-020/025. No new provider write, main promotion,
paid AI call or production deployment is asserted by this receipt.
