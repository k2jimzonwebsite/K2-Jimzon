# 30 September guest continuity and support receipt

## Current existing-K2 recovery evidence, IDEA-20260930-07/-08/-09

`INSTALLATION_REVIEW.md` records the exact guarded installer, metadata capture
and data-retaining deactivation for 33 functions, 24 new tables and three hooks.
The actual local recovery witness passed retained records, browser denial,
drift/wrong-target refusal and rollback at 11:39:25 UTC. Two focused contracts
passed after red/green verification; independent source review found no actionable
findings with read-only scope/refusal/stdin assertions. Full captures and sample
SQL stay private/ignored, and the local sample must never be used on K2.

The fresh encrypted read-only production backup passed a new empty UTF8 local
restore at 11:37:47 UTC, including 51 public relations, current ledger and the
exact 14-row archive fingerprint. Real Windows input-closure/encoding failures
were fixed with successful supplied-input handling and explicit UTF8 transport;
integrity gates remain required. The complete dependency witness passed again
at 11:39:21 UTC. Final development verification exited zero, including the
1,684-file secret scan and import checks; PostgreSQL is stopped.

```powershell
npx playwright test tests/guest-install-recovery.spec.js
node docs/evidence/20260930-guest-continuity-rehearsal/rehearse-install-recovery.mjs
node docs/evidence/20260930-guest-continuity-rehearsal/rehearse-local.mjs --with-dependencies --preserve-legacy
```

Redacted receipts: `local-install-recovery-receipt.json`,
`local-dependencies-receipt.json`, `current-backup-manifest.json` and
`current-backup-restore-receipt.json`. Account/key recovery remains attested
Verified on 2 September; new-envelope off-site upload/retrieval is pending.
Recovery retains installed schema/data; provider recovery requires actual
same-target captures after an approved install. No live SQL/grant/key/setting/
flag/routing/connection/conversation changed. The extra-project path is withdrawn.
Exact next action and remaining configuration/acceptance gates live in MAP-017/019/020/022.

Owning work: MAP-017 / MAP-019 / MAP-020, with the Store origin compatibility
record also in MAP-027. The full production and inventory goal remains active.
IDEA-20260930-01/-02/-03 were audited and merged into those existing MAP items
before their corrections. This folder is evidence, not another backlog.

## Complete dependency rehearsal, IDEA-20260930-06

The current target is existing K2. `shared-dependency-preflight.json` records the
metadata-only provider read at 10:48:17 UTC: all 16 public RPCs used by the 17
prepared routes are absent; Admin verification/command receipts and `is_staff`
exist; identity, wholesale and delivery control tables are absent. No business
rows were read or changed by that query.

The existing local witness now has `--with-dependencies`. It composes the 18
ordered sources and hashes in `local-dependencies-receipt.json`, including
wholesale, delivery control/quote, account settings, origin and the latest order
replacements. Source transaction/psql wrappers are removed inside one local
transaction. This mode excludes direct-writer cutover and moderation; combining
the installation mode with moderation is refused. It preserves the original
legacy order/Pasabuy/coupon/chat function ACLs exactly.

Actual signed order submission first failed on `messages_delivery_status_check`
(the replacement used unsupported `delivered`), then exposed nonexistent event
columns. The replacement also read nonexistent `guest_grant_token` from the
identity helper, omitted order/conversation scopes and used a duplicate seed
key. The unapplied `20260916_automated_delivery_quotation.sql` now uses the actual
event columns, `received`, the canonical/legacy seed guards, helper
`raw_grant_token`, and scoped order/read plus conversation/read/reply access.
Its existing shipping policy is unchanged; server shipping validation and
Website order membership remain MAP-018/023 acceptance gates.

```powershell
node docs/evidence/20260930-guest-continuity-rehearsal/rehearse-local.mjs --with-dependencies --preserve-legacy
npm run verify:development
```

The final SQL rehearsal passed at 10:44:01 UTC: all 16 route-function grants and
fixed search paths, legacy ACL preservation, actual anonymous order submission
and identical replay, one seeded message, fresh order grant issuance, same-grant
order/thread recovery, missing/different order-grant denial, prior chat
start/reuse/reopen/denial, unchanged excluded history and rollback. Development
verification exited 0; the 1,677-file secret scan and import check passed. The
local server was stopped and status returned `no server running`.

These receipts prove installation compatibility and the stated local behaviors,
not all 17 functional routes, PostgREST/browser/Turnstile, provider recovery or
activation readiness. The source inventory is now refreshed to 60 entries on
baseline `e6c828f5b71e4ed08a327d4505055adc8ff7b082`, including the newer recovery/
backup tools; it is not an approved live bundle.
Parent review compared the corrected definition with the actual restored
writer, identity helper and constraints; independent review remains unavailable.
Local recovery is a scoped feature-source revert preserving these receipts.
The exact shared-K2 backup/apply/recovery and branch-only connection package
remains in MAP-017/019/020. No live schema, grant, key, row, environment or routing
change occurred; the single authorized live conversation is unused.

## Request and current boundary

Continue the channel-listing handoff in dependency order, preserving current
guest-chat ownership and the separate Storefront/Admin artifacts. The feature
branch is `codex/map017-guest-chat-preview`, based on remote main `f95e384`.
Before this batch it was at `8097bd8`. GitHub's authenticated comparison
reconfirmed remote main identical to the full `f95e384` SHA; the shell network
read failed, so no successful fetch is claimed. The prior inventory-source
question has no new owner export or physical-count answer. No listing, stock,
channel allocation, provider setting, live schema, flag or K2 test row changed.

## Behavior found and corrected locally

1. `prepared-api/storefront/conversation.js` signs `guest_start`. The signing
   helper instead included a returning browser's grant only for unused action
   `conversation`. The minimal `server/storefront-bff/security.js` correction
   hashes the valid HttpOnly cookie for `guest_start`. Raw cookie tokens never
   enter RPC arguments. Missing/malformed cookies pass a null grant hash.
2. The base signed start function passed `website_message` into guest identity
   resolution. Actual SQL execution rejected it against customer/contact
   provenance constraints. Both the base boundary and the later origin
   replacement now use `website_guest` for identity; conversation source kinds
   remain separate. Order/wholesale identity already follows this vocabulary.
3. The later origin replacement additionally used a text variable for the
   `public.chat_platform` enum and selected absent member `Virtual Store`.
   Actual execution reproduced the text-to-enum failure. It now uses typed
   `Website`, matching the existing direct Website writer; the signed origin
   still selects `website_message` or `virtual_store_message`. No enum or
   historical row changed.

The corrected migrations are unapplied. The later origin function must run
before the moderation wrapper; replacing the public start function afterward
would bypass that wrapper. This order is now explicit in the guest runbook.
The archived 29 September structural assembly stays byte-for-byte intact and
its earlier receipt is not re-labelled as behavior evidence for these changes.

## Verification

- Red: two new signing tests failed before the helper change (undefined hash
  versus exact SHA-256/null). Green: the focused contracts passed afterward.
- Red: actual anonymous signed start rejected invalid identity provenance.
  After its correction, the later origin function exposed the enum insert
  failure. The older static shelf test also required the invalid enum value;
  its expectation now checks the surface source kind and canonical typed channel.
- Final focused command, exit 0, **30/30**:

  ```powershell
  npx playwright test --config=playwright.api.config.js tests/guest-commerce-bff-contract.spec.js tests/master-audit-recovery.spec.js tests/guest-conversation-seed-contract.spec.js tests/turnstile-wiring-contract.spec.js tests/map027-store-polish.spec.js --grep 'guest conversation|guest|signed|a conversation started at a shelf|an older client that sends no origin' --reporter=line
  ```

- Actual PostgreSQL 17.11 calls as `anon` passed in all three variants below.
  Each proved fresh issuance, reuse of the existing grant without a replacement
  token, both conversations visible under that grant, empty/denied history for
  missing/invalid grant, and isolation from a different active guest grant.
  The origin variant additionally proves Store source provenance on the same
  Website channel/customer. The final variant proves the moderation wrapper
  records all three local starts and its internal original is not anonymous-
  executable. It does not claim a full moderation command/block test.

  ```powershell
  node docs/evidence/20260930-guest-continuity-rehearsal/rehearse-local.mjs
  node docs/evidence/20260930-guest-continuity-rehearsal/rehearse-local.mjs --with-origin
  node docs/evidence/20260930-guest-continuity-rehearsal/rehearse-local.mjs --with-moderation
  ```

  Redacted receipts: `local-receipt.json`, `local-origin-receipt.json`, and
  `local-moderation-receipt.json` (08:37:48–49 UTC). All confirm rollback and
  absence of the temporary start function/customer conversations afterward.
  The runner refuses a different database/data directory and checks the
  immutable historical assembly SHA before inserting current source candidates.
- Final code-batch `npm run verify:development`: exit 0, source/security
  controls and import integrity passed; secret scan covered 1,667 files.
  No release gate, full browser suite or production build is claimed.
- Requested independent review could not run because the agent hit its usage
  limit. Parent review traced the handler, all start-function replacements,
  identity constraints, live-restored enum and wrapper order. Independent
  review remains unverified; passing tests do not imply it occurred.

The runner uses only synthetic keys/contacts and rollback-only transactions on
`127.0.0.1:54388/k2_current_restore_20260929`. It requires the existing isolated
restore and `.tools/current-production-backups/guest-current-20260929-rollback.sql`
with SHA-256 `18F9D58BA00797461FA19FE0BC0C0DF4AF0B9F2B3506023BAC8E1485DC7F741B`.
It creates no second migration bundle or managed recovery artifact. The local
server was stopped after the receipts. Historical assembly/backup files were
not modified or staged; `.backups/` stays excluded from the feature push.

This proves application-schema SQL behavior only. PostgREST, browser cookies,
Turnstile, managed role memberships, Storage, Vault, provider configuration,
production/exact-host continuity and owner recovery access remain unverified.
The exactly one authorized K2 conversation record is still unused.

## Authorized support follow-up

Both Google profiles were reverified as `k2jimzonwebsite@gmail.com`. The owner
then authorized the exact prepared message in `SUPPORT_REPLY_REVIEW.md`.
Gmail sent it to `support@supabase.com` in SU-483740 at 08:29:58 UTC; independent
thread readback matched sender, recipient, subject, approved opening body and
SENT label. Message `1a0f16f4e8f70d9f`, thread `1a0d2dfb9d2f1162`.
`support-receipt.json` records this without private inbox headers. The connector
appended the quoted automatic acknowledgment. The thread has two messages and
no human guidance at readback. The reply requests guidance only and explicitly
prohibits project changes/support access under this authorization.

## Feature transport and backend availability

The installed `git-pushing` script committed and pushed this batch as
`23ef44228a2c0d570c77ea9c588dcd1099668245` on
`codex/map017-guest-chat-preview`. Explicit `.backups/` exclusion was supplied
only for this push, without changing global Git configuration. Readback showed
HEAD and upstream identical, a clean worktree and no backup paths in the commit.
Authenticated GitHub comparison independently returned identical for that SHA
and the remote branch. No main branch was merged or pushed.

At 08:50 UTC, separate Vercel Preview builds for this exact source were READY:

| Artifact | Deployment | URL |
| --- | --- | --- |
| Storefront | `dpl_517CgyYwenzvFfXWrLWWTnKsrWfP` | `https://k2-jimzon-i7w7r0qrb-k2-jimzon.vercel.app/` |
| Admin | `dpl_2q9exPE5oQcoW8q4tYbipzgE4rYh` | `https://k2-jimzon-admin-1juuljaq1-k2-jimzon.vercel.app/` |

The provider returned Preview target (`target:null`) and matching feature
ref/SHA. READY is build evidence only; no interaction was exercised on these
new hosts. It does not establish a backend connection or live chat continuity.

Read-only Supabase inventory exposed only K2 production
`pixplcjqivlfflickobf`; `list_branches` returned an empty list. There is no
existing isolated provider backend to adopt. The owner was asked which setup
to prepare for exact review: an isolated test backend or a shared-K2 Preview
cutover. That preference request authorizes no creation, cost, SQL, data copy,
secret/environment change or shared connection. An isolated branch's successful
schema replay is not assumed: manual/history drift must be checked, production
data/private signing keys must not be copied, and any new provider resource
requires its specific organization, quoted cost and exact scope authorization.
All remaining actions and recovery ownership stay in MAP-017/019/020.

## Remaining work and recovery

**Current owner steering:** The extra-project approach is withdrawn after the
owner questioned its need. No resource retry, pause or upgrade will proceed;
the capacity-choice question is superseded. Existing K2 is the exact guest
dependency/backup/recovery review target. Provisioning notes below are historical
evidence of the approved but quota-rejected attempt.

**IDEA-20260930-05, local preservation:** The existing witness's new
`--preserve-legacy` mode inserts a synthetic UUID-only conversation before the
dependency chain and checks its original values/physical row location stay
unchanged, customer/reference stay NULL, and the fixture disappears on rollback.
The old migration failed at `EXCLUDED_LEGACY_CONVERSATION_CHANGED`. Removing only
the historical reference backfill/NOT NULL requirement fixes that defect; future
rows retain the unique opaque default and grant authorization is unchanged.

```powershell
node docs/evidence/20260930-guest-continuity-rehearsal/rehearse-local.mjs --with-moderation --preserve-legacy
npm run verify:development
```

The full base/origin/moderation rehearsal passed at 10:06:09 UTC. Fresh anonymous
start, same-grant reuse/two-thread reopen, missing/different/other active grant
denial and rollback also pass. `local-legacy-receipt.json` records the new source
hashes; earlier receipts remain historical. Development verification exited 0
with 1,677 files scanned; the local server was stopped. No live K2 row, key,
grant, flag or setting changed. PostgREST/browser/Turnstile/managed-provider proof
and independent review remain unverified; the single live conversation is unused.
The refreshed source manifest is an inventory, not a complete executable order
or approval. Recovery is a scoped source revert while retaining these receipts.

The later read-only provider/routing investigation is frozen in
`BACKEND_REVIEW.md`, with `resource-quotes.json`, current/proposed routing-rule
exports and `backend-source-manifest.json`. The owner selected K2jimzon for
quotes: separate project $0/month, branch $0.01344/hour. The owner then approved
the exact empty Singapore project and cost confirmation succeeded, but one
creation attempt was rejected for the two-active-free-project limit. Fresh
inventory has no candidate and original K2 is healthy/Free. The other counted
project is not exposed; `resource-provisioning-receipt.json` records the outcome.
Branching requires Pro, so that hourly quote alone is not plan eligibility.
The Vercel path-only API
404 gate is verified; its proposed exact feature-host exception was exported
from an unsaved form, canceled and read back unchanged. Local source/hash and
hostname checks are in `backend-preparation-receipt.json`; they establish only
proposal scope, not provider Test Rules, installed dependencies or live chat.
MAP-017 now consolidates current findings, dependencies and exact next actions;
older preparation/build/support history remains in these permanent receipts.
This documentation/proposal batch requires no repeat application test/build or
release gate. The resource approach is withdrawn; its approval does not authorize
a retry under current owner steering. Schema/hosting activation remains a later
exact payload review for existing K2. No pause, deletion, membership change or
upgrade was performed.

The next required action stays in MAP-017/019/020: review the corrected exact
dependency, backup and recovery payload against existing K2 before its specific
SQL/Preview connection approval. Supabase's supported procedure for six internal-
role defaults and the nine anonymous-grant contracts remain open. Live export
truth is still **15 critical, 0 high**; these fixes did not change its ACLs.
Then prove one authorized conversation on the exact approved host: start,
same-browser reopen and missing/different grant denial. Broader multi-start
live evidence would require additional record authorization.

MAP-018 retains protected Website assignment, server order-membership enforcement
and real inventory acceptance after its dependencies. Owner source export and
confirmed physical quantities/media rights remain missing. Do not infer physical
on-hand from marketplace quantities or auto-publish the current 22 products.
Main promotion still requires the owner's release request and the complete
release gate immediately before that promotion.

Local recovery is a scoped source revert of this feature batch. The rehearsal
rolls back all its temporary SQL state; no production rollback has been used or
is justified by this work. Preserve this receipt and the sent-message evidence
if reverting code. On a later provider apply, use the reviewed migration-specific
recovery and backup procedure recorded in the owning MAP/runbook, not the local
witness as production permission.
