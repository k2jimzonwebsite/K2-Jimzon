# MAP-017 guest-chat continuity and isolated Preview candidate

- **Captured:** 30 September 2026 (Asia/Singapore)
- **Owning work:** MAP-017 first; MAP-019 and MAP-020 own the guest/account and
  coordinated route cutover gates. MAP-018 Website assignment and production
  listing remain downstream.
- **State:** Owner recovery choice resolved; source and local checks prepared.
  The owner authorized publication of the isolated Preview branch. Exact-host
  behavior, production cutover, and listing acceptance are not verified here.

## Owner decision

The owner confirmed current UUID-only Storefront conversations are test data
and may be left out. Do not migrate those conversations into a new grant and do
not delete their historical server rows under this decision. This does not
authorize a database/grant change, feature flag, provider setting, deployment,
or production release.

## Live read-only MAP-017 evidence

The read-only 30 September audit on the local source branch reported **11
critical, 0 high**. The owner-controlled `npm run preflight:k2-project`
confirmed K2 project `pixplcjqivlfflickobf`. The read-only export was produced
there with `node scripts/map017-evidence/export-live-schema-metadata.mjs
.tools/current-production-backups/live-schema-metadata-20260930-contracts.json`;
that audit helper is not part of this minimal Preview candidate. It classified
five remaining legacy anonymous RPC grants
and six `supabase_admin` default-privilege groups. `get_storefront_chat_v1` is
separately classified as an expected contracted guest read; its disposition
must be reconciled with the signed cutover before revocation. No ACL was
changed. The read-only `npm run readiness:k2-live` result on the source branch
was **8 verified, 2 owner, 3 connector, 0 failed**. The gate did not apply
migrations or write rows.

Export timestamp: `2026-09-29T17:04:07.280841` (the source field has no
timezone suffix); export SHA-256:
`52DE2F3D6F4A8C02C815ECE331CEC411751C738013D025395625781868AEB484`. The full
export and audit JSON remain in the ignored local evidence directory and are
not committed because they contain environment-specific metadata. The source
branch audit receipt records the full command and classifications. No K2 SQL,
provider, grant, or feature-flag write occurred.

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

## Remaining work and recovery

1. Keep production `main` unchanged while the ordered gates remain open.
2. Establish a reliable exact-host interaction check and confirm the Preview's
   data target before creating a conversation. If it uses K2, follow the owner
   authorization, preflight, readiness, and backup gates before any test write;
   otherwise confirm the isolated test backend.
3. On the exact Storefront Preview, prove fresh signed-chat start,
   same-browser reopen, and denial with a missing or different browser grant.
4. Reconcile the separate live chat-read grant, receive the pending Supabase
   support response for provider-owned defaults, and follow the MAP-017/019/020
   readiness, backup, and exact owner-authorization gates before any cutover.
5. Continue MAP-018 only after its dependencies clear. Its current gaps include
   protected Website assignment, server-side order-membership enforcement,
   reviewed Website membership for the 22 published products, physical counts,
   and real-host product acceptance. Never auto-assign the 22 products.

Source recovery is to revert the guest-chat source commit. No server-data
rollback is needed; no rows were migrated or deleted. The records governing
remaining work are `MASTER_ACTION_PLAN.md`,
`docs/runbooks/GUEST_COMMERCE_BFF_RUNBOOK.md`, and the MAP-017 owner gates.
