# MAP-017 guest-chat continuity and isolated Preview candidate

- **Captured:** 30 September 2026 (Asia/Singapore)
- **Owning work:** MAP-017 first; MAP-019 and MAP-020 own the guest/account and
  coordinated route cutover gates. MAP-018 Website assignment and production
  listing remain downstream.
- **State:** The guest-history decision and one-record test authorization are
  recorded. The isolated Preview branch is pushed and its page loads are
  verified; signed-chat behavior is blocked by missing Preview server settings
  and an unapplied K2 function. Production cutover and listing acceptance remain
  open.

## Owner decision

The owner confirmed current UUID-only Storefront conversations are test data
and may be left out. Do not migrate those conversations into a new grant and do
not delete their historical server rows under this decision. The owner later
authorized exactly one new K2 guest-chat test conversation record, after the
required gates pass. This narrow authorization does not authorize a
database-schema/grant change, feature flag, provider setting, Preview-to-K2
server connection, deployment change, or production release. The one record
has not been created.

## Live read-only MAP-017 evidence

The local Management API exporter was blocked by network `EACCES`. I then ran
the same repository-owned `supabase/export-schema-metadata.sql` query through
the authenticated Supabase SQL connector, scoped only to project
`pixplcjqivlfflickobf`. The query is a metadata-only `WITH`/`SELECT`; it reads
no business rows and changes no database state. The full export is preserved
locally, ignored by Git, at
`.tools/current-production-backups/live-schema-metadata-20260930-mcp.json`.
Its timestamp is `2026-09-30T06:51:31.19553` UTC (the query emits no timezone
suffix), and its SHA-256 is
`F4B780E68CDF79CFE2C2F34E90AC44EE44351A18B0FE1B1AA69C2F87876DB849`. It
contains 11 schemas, 100 tables, 167 functions, and 10 ledger entries; the
latest migration is `20260928092634`.

After adding explicit schema-truth contracts for the two authenticated receipt
readers below, the fresh export audit
`node scripts/schema-truth-audit.mjs --export=.tools/current-production-backups/live-schema-metadata-20260930-mcp.json --allow-findings`
reports **15 critical and 0 high**. Nine critical findings are anonymous
SECURITY DEFINER grants without a reviewed MAP-017 contract; six are unsafe
`supabase_admin` default-privilege groups in `public`. Earlier 11/0 and 15/2
reports are superseded by this current export and contract set.

The export confirms ten direct `anon` EXECUTE grants on public SECURITY
DEFINER functions. All ten also grant `authenticated`; none has a direct
`PUBLIC` grant. The live signatures are:

- `public.get_order_conversation_v1(uuid, text)`
- `public.get_public_product_stock()`
- `public.get_storefront_chat_v1(uuid)`
- `public.submit_order_message_v1(uuid, text, text, uuid)`
- `public.submit_order_payment_receipt_v1(uuid, text, text, text, text, uuid)`
- `public.submit_order_request_v2(text, text, text, text, text, text, jsonb, text, text, numeric, text)`
- `public.submit_order_request(text, text, text, text, text, text, jsonb, text)`
- `public.submit_pasabuy_request(text, text, text, text, text, integer, numeric, text, boolean, text)`
- `public.submit_storefront_chat_v1(text, text, text, uuid, text)`
- `public.validate_coupon(text, numeric)`

The current public-schema
`supabase_admin` defaults grant anonymous and authenticated privileges on
future functions, tables, and sequences, yielding six unsafe groups. Separate
export reads show `get_order_payment_receipt_v1(uuid)` and
`list_order_payment_receipts_v1(uuid)` are SECURITY DEFINER, executable by
`authenticated` but not `anon`, with live `auth.uid()`, `is_staff()`, and AAL2
signals. I added explicit staff/AAL2 contracts for those two functions in
`scripts/schema-truth-core.mjs`; the core now verifies the live staff and AAL2
signals. Their two HIGH findings are cleared from the audit. The focused
contract test and `npm run verify:development` passed. The Admin UI still calls
these reads directly (`src/views/admin/OmniOperationsHub.jsx:970,985`); no
Admin BFF deployment is inferred.

The current export shows only `USAGE`, not `CREATE`, on `public` for
`public`, `anon`, and `authenticated`. That supports schema-truth's fixed
`search_path=public` assumption. It does not resolve unreviewed authorization
for guest functions.

## Source-route reconciliation

This is a source-to-live-grant map, not an exact-host interaction test. The
metadata export deliberately records non-sensitive guard signals, not
function bodies. Local migrations are supporting source evidence; they do not
prove the current live body byte-for-byte.

| Live function(s) | Current caller or source finding | MAP-017 disposition |
| --- | --- | --- |
| `get_public_product_stock()` | Storefront and Admin read `v_product_stock_from_batches` (`src/context/StoreContext.jsx:306`, `src/context/AdminStoreContext.jsx:52`). The schema-truth core has an explicit anonymous contract for this public stock projection. | Expected public read; retain the narrow `anon`/`authenticated` grants. |
| `get_storefront_chat_v1(uuid)` | Production still has the legacy chat path. The current Preview candidate removes direct calls. `security-surface-policy.mjs` lists this as a transitional anonymous read, but the schema-truth core has no guest-ownership contract. Live metadata says SECURITY DEFINER, `search_path=public`, and no `auth.uid()`/staff guard. The 17 September migration source selects a thread by conversation UUID; the export omits its body. | Keep critical. The separate allowlist is not a safety proof. Require signed same-browser reopen plus missing/cross-browser denial before retiring this route. |
| `submit_storefront_chat_v1(text,text,text,uuid,text)` | The Preview candidate removes direct calls; Production has not received that cutover. Live metadata says SECURITY DEFINER, `search_path=public`, and no `auth.uid()`/staff guard. The 17 September source accepts an optional conversation UUID and writes to that conversation without a guest ownership token. | Keep critical until signed guest continuity is verified and the coordinated cutover can revoke the direct writer. Historical chat rows stay untouched. |
| `get_order_conversation_v1(uuid,text)`, `submit_order_message_v1(uuid,text,text,uuid)`, `submit_order_payment_receipt_v1(uuid,text,text,text,text,uuid)` | `src/services/orderReceiptService.js:22,32,66` calls these with the order ID and saved `accessKey`. The 28 September migration source checks the matching order ID/idempotency key. Live metadata reports fixed empty `search_path` and direct `anon` grants. The separate security-surface policy lists these, but the schema-truth core does not yet model the guest key boundary. | Keep critical until the anonymous key-boundary contract is explicitly modeled and the signed/BFF replacement is verified. |
| `submit_order_request_v2(...)`, `submit_pasabuy_request(...)`, `validate_coupon(...)` | Direct fallback calls in `src/context/StoreContext.jsx:206,626,757` run when `VITE_GUEST_BFF_ENABLED` is false. Live metadata reports SECURITY DEFINER with `search_path=public` and no `auth.uid()`/staff signal. Signed guest replacements are absent from the live function list. | Keep critical until the signed routes are live and the direct grants/callers are cut over in MAP-020 order. |
| `submit_order_request(...)` | Live anonymous grant remains, but no direct RPC call was found in the current `src`, `server`, or `api` source search; the current type metadata still names it. Live metadata reports SECURITY DEFINER with `search_path=public`. | Treat as an unused legacy public entry point; verify deployed-client compatibility before revocation. |
| `get_order_payment_receipt_v1(uuid)`, `list_order_payment_receipts_v1(uuid)` | Staff UI calls these reads directly (`src/views/admin/OmniOperationsHub.jsx:970,985`). The live export shows authenticated-only grants with `auth.uid()`, `is_staff()`, and AAL2 signals. | Explicit staff/AAL2 schema-truth contracts added. Audit HIGH findings cleared; Admin BFF and exact-host staff flow remain unverified. |

The static source inventory
`node scripts/audit-security-surfaces.mjs` (also run by
`npm run verify:development`) reports 18 expected grants, 18 effective grants
from the cumulative local migration tree, and zero unexpected or missing
grants. This is **not live database evidence**. Five source-policy entries
overlap the ten current live grants. Thirteen expected signed-guest grants
are absent live, while five live legacy direct entries are not in the current
expected list: the two order-submit overloads, Pasabuy submit, direct
Storefront chat submit, and coupon validation.

The ignored `.tools/current-production-backups/live-readiness.json` remains a
stale receipt: it names `codex/map017-guest-chat-test-only`, while this checkout
is `codex/map017-guest-chat-preview`; its named npm scripts are absent from
`package.json`. The full schema export has now been refreshed and audited via
MCP, so local Node network access no longer blocks that evidence step. Do not
reuse its old **8 verified, 2 owner, 3 connector, 0 failed** result as current
branch readiness. No K2 SQL write, provider change, ACL change, feature-flag
change, or chat row write occurred.

## Source change and local verification

The Storefront change removes direct browser calls to
`get_storefront_chat_v1` and `submit_storefront_chat_v1`, clears the old
`k2-store-chat-convo-id` pointer, and makes new chat use the signed guest BFF.
It may retain a new opaque `CV-…` reference only as a lookup pointer; on reopen,
the current HttpOnly guest grant must return that exact reference. The floating
launcher no longer infers “Resume Chat” from the old UUID. With the browser BFF
flag disabled, the UI shows its unavailable state and sends nothing.

The legacy UUID/launcher contract and the secure opaque-reference reopen
contract failed before their behavior was implemented. Afterward:

| Verification | Result |
| --- | --- |
| Focused chat contracts (`playwright.api.config.js`) | 4/4 passed |
| Guest-commerce BFF and Turnstile contracts | 19/19 passed |
| `npm run verify:development` | Exit 0 |
| `git diff --check` | Passed |

No exact-host Preview check was included in these local results.

The audit-contract update adds authenticated-only AAL2 contracts for
`list_order_payment_receipts_v1(uuid)` and
`get_order_payment_receipt_v1(uuid)` in `scripts/schema-truth-core.mjs`, with
a focused regression case in `tests/schema-truth-tool.spec.js`. The focused
case first failed because both functions were unreviewed, then passed after
the contract addition. `npm run verify:development` exited 0. Re-auditing the
fresh K2 export then returned **15 critical, 0 high**; the nine anonymous
function findings and six provider-owned default groups remain open. This was
an audit-model update only: no application deployment or Supabase change.

## Isolated Preview branch

The original source branch `codex/map017-guest-chat-test-only` is 23 commits
ahead of GitHub `main`; that unrelated history was excluded from this candidate.
`codex/map017-guest-chat-preview` starts at GitHub `main`
`f95e384eefaebf372f5e8037bd8fd1819118dc17` and contains code commit `1e7b818`,
limited to:

- `src/components/shop/StoreChatPanel.jsx`
- `src/components/shop/StorefrontChatButton.jsx`
- `tests/map027-store-polish.spec.js`

The same focused checks and development verification passed on that baseline.
The owner authorized publishing this isolated branch. The branch was pushed to
`origin/codex/map017-guest-chat-preview` at
`31ffbb47fbd2181bad950829b3cfb963372d8da0` (source commit `1e7b818`, followed
by documentation commit `31ffbb4`).

## Preview publication and exact-host page receipt

Both projects created Preview deployments from branch commit `31ffbb4` and
reached **Ready**:

| Artifact | Deployment | Preview URL | Result |
| --- | --- | --- | --- |
| Storefront (`prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL`) | `dpl_Dgt1aow6VPFphFPSATnWHDWB46zG` | `https://k2-jimzon-70i11vdb2-k2-jimzon.vercel.app/` | Ready; signed browser loaded storefront and catalog |
| Admin (`prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x`) | `dpl_HPj2QDLRH4tAXqabNXMURjxZQVvF` | `https://k2-jimzon-admin-csr0cbmwe-k2-jimzon.vercel.app/` | Ready; signed browser loaded staff sign-in |

The unauthenticated page fetch encountered Vercel Preview protection; the
signed in-app browser could read both roots. It showed the Storefront catalog
and the `Chat with K2 staff` button. The Admin showed its staff email/password
sign-in form; no credentials were entered. Browser-control clicks did not change
the page state for the chat button or safe Storefront controls, so the chat
drawer and any signed route are **not verified**. Treat this as a browser
interaction limitation, not as proof the application button is broken. No
guest chat was submitted, no grant was issued, and no database row, flag,
provider setting, or deployment configuration was changed by the check.

## 30 September fresh readiness and Preview connection check

### Supabase support-status lookup

Read-only search in the K2 mailbox `k2jimzonwebsite@gmail.com` found Supabase
ticket `SU-483740`, acknowledged 24 September at 6:04 PM for the supported
correction of provider-owned `supabase_admin` defaults. The thread contains
only the automatic receipt and no human reply. The Free plan notice says
support is best-effort with no guaranteed response. No follow-up was sent and
no duplicate request was created. A follow-up requires explicit owner
authorization; if granted, reply in this ticket and ask for the supported
remediation procedure. The earlier
project-specific Dashboard support URL returned 404; the Dashboard new-request
form did not expose existing history. No permission, provider, or database
state changed.

### 30 September Security Advisor snapshot

On the exact K2 project `pixplcjqivlfflickobf`, the signed-in Dashboard's
Security Advisor showed **0 errors, 56 warnings, and 7 suggestions**. Visible
warning classes included public listing on `storage.product-images`, public
and signed-in execution of `SECURITY DEFINER` functions (including
`get_storefront_chat_v1` and `submit_storefront_chat_v1`), and disabled
leaked-password protection. Treat this as a provider-side linter snapshot, not
a finding-by-finding vulnerability verdict. Reconcile each finding against
current grants, policies, function guards, and intended exposure before
changing anything. No advisor action, setting, ACL, storage policy, flag,
provider, or database state changed. The list still requires full
finding-by-finding classification.

The owner-authorized one-record chat test remains pending. A fresh exact-project
read-only SQL check on 30 September found ten migration rows, latest
`20260928092634`, and no public functions named
`start_guest_conversation_v1` or `append_guest_message_v1`. These missing signed
guest functions and the absent Preview server configuration block the test
record. The previous readiness receipt's **8 verified, 2 owner, 3 connector**
and 13-unapplied-grant summary is not reproducible from this checkout: the
ignored receipt names `codex/map017-guest-chat-test-only`, and the current
`package.json` has no `preflight:k2-project` or `readiness:k2-live` script. Do
not use that receipt as current branch evidence. Backup freshness and the
isolated local restore receipt passed; the 29 September envelope's owner-only
Drive upload, independent hash readback and redacted-companion checks are
recorded in `docs/evidence/20260929-inventory-readiness/README.md`.

The latest Storefront Preview is `dpl_FR5MuYXCvxEbk3ZUwXp39McoC7pu`, Ready at
`b0be083ca816d4f0aadddc36e0a67b41b3ea7d38`, URL
`https://k2-jimzon-3388zdrkc-k2-jimzon.vercel.app/`. The browser loaded the
homepage and catalog. The public client bundle contains the exact host
`https://pixplcjqivlfflickobf.supabase.co`. A read-only Vercel environment
settings check showed Preview-targeted `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`; server-side `SUPABASE_URL` and
`SUPABASE_PUBLISHABLE_KEY` are Production-only. The latter server pair is what
`server/storefront-bff/supabase.js` reads, and that helper throws
`SUPABASE_SERVER_CONFIG_MISSING` if either value is absent. No chat route was
invoked. In addition to the missing Preview server configuration, the K2
signed-chat start function remains unapplied. Therefore this Preview cannot
currently create a signed K2 conversation. The one-record authorization does
not authorize adding Preview server access to the shared production database.

No chat submission, K2 row, environment setting, grant, migration, flag,
deployment target, or production release changed during these checks. The
previously authorized local/Drive backup remains available; there is no test
row to clean up or roll back.

## Remaining work and recovery

1. Keep production `main` unchanged while the ordered gates remain open.
2. Resolve the nine anonymous SECURITY DEFINER findings against the route map
   above. Keep the unguarded legacy chat read/write paths critical; replace or
   retire direct checkout and Pasabuy paths only in the reviewed MAP-019/020
   cutover. The current full export is captured and audited; the old readiness
   receipt remains branch-mismatched.
3. Reply in ticket `SU-483740` only after the owner authorizes the specific
   message. Do not change provider-owned defaults while their supported
   remediation is unknown.
4. Continue through signed guest prerequisites in MAP order. Thirteen expected
   signed-guest grants/functions remain absent live, including
   `start_guest_conversation_v1`; Preview also lacks server-side Supabase
   settings. The one test record remains pending.
5. Once those prerequisites are ready, obtain the separate owner decision to
   connect Storefront Preview server functions to shared K2, or identify an
   approved isolated test backend. Do not add production database access to
   Preview based only on the one-row authorization.
6. Then prove one fresh signed-chat start, same-browser reopen, and denial with
   a missing or different browser grant. Do not use the legacy direct chat RPC.
7. Continue MAP-018 only after its dependencies clear. Its current gaps include
   protected Website assignment, server-side order-membership enforcement,
   reviewed Website membership for the 22 published products, physical counts,
   and real-host product acceptance. Never auto-assign the 22 products.

Source recovery is to revert the guest-chat source commit. No server-data
rollback is needed; no rows were migrated or deleted. The records governing
remaining work are `MASTER_ACTION_PLAN.md`,
`docs/runbooks/GUEST_COMMERCE_BFF_RUNBOOK.md`, and the MAP-017 owner gates.
