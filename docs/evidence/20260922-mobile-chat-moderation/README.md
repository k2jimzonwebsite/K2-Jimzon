# 22 September mobile store and anonymous-chat moderation evidence

## Scope and owning MAP item

IDEA-20260922-03 through -06 are owned by the active 22 September slice in
MAP-019/020/024/027/028. This record covers locally prepared behavior only.

## Changed systems

- Store mobile Shopkeeper/camera controls and sheet interaction.
- Storefront footer marketplace destinations.
- Separate Admin-target install prompt and network-only service worker.
- Prepared private anonymous-chat hash/block/deletion-receipt migration, rollback,
  signed Admin BFF routes, runtime, and Inbox controls.

## Evidence

23 September final local release-gate recheck: `npm run verify:release`
exited 0 with 1,152/1,152 tests and both separate production builds passing
their security, source-boundary, secret-scan and bundle-budget gates. The prior
base-suite stall was Playwright web-server teardown denied by the Windows
sandbox; the full browser run exited with permitted local process control.
The only source adjustments in this recheck were test fixtures: the Store
reset button's actual accessible name, an isolated Admin HelpTip mount for
the cold-load test, and a 240-second budget for the complete Owner Count &
Close phone journey (it passed in 1.7 minutes inside the full gate). This is
local verification, not proof of production migration or live chat moderation.
Read-only Vercel inspection now identifies both K2 projects and their latest
production deployments at the previous GitHub SHA; neither has this slice.
Read-only production Supabase inspection still shows the guest-start/reply
prerequisites absent and the direct chat writer present, so the moderation
migration cannot be applied safely as-is. MAP-019/020 prerequisite
reconciliation, MAP-017 authorized coordinated cutover, real-role/guest
acceptance, and physical phone checks remain open. No push, provider write,
flag flip, or deployment occurred in this recheck.

23 September release recheck: a regression contract failed before the collapsed
Shopkeeper was moved below the landscape chat sheet, then the focused
MAP-027/moderation/security suite passed 85/85. Prepared Admin route counts in
both architecture references now match the 95-route registry; Storefront remains
15. A fresh `npm run verify:release` printed 945 base passes but again stalled
before that phase returned, and was interrupted. This is not a full release
pass. Read-only live Supabase metadata showed no `start_guest_conversation_v1`
or moderation RPC and retained anonymous access to `submit_storefront_chat_v1`.
The prepared migration's unconditional guest-RPC rename would fail against that
schema; it remains unapplied. No GitHub push or live provider change followed.
The exact next action is MAP-019/020 guest-boundary reconciliation, release
runner teardown diagnosis, full gate and real-role/landscape acceptance, then
MAP-017-governed coordinated cutover. Revert the local source slice before any
database application if abandoning it; after application use the reviewed
rollback only inside that controlled window.

23 September branch review found seven gaps and corrected them locally: the
append-only event cascade, guest scope cleanup, missing-role metadata denial,
Admin verifier action allowlist, legacy direct-chat bypass, all account-linked
customer protection, and the open store chat's deleted-thread reset. The
focused 4/4 contract suite now runs in the regular `npm test` gate. A passing
source contract is not PostgreSQL execution or real-host acceptance; both
remain pending in the owning MAP item.
The isolated `node scripts/rehearse-anonymous-chat-moderation.mjs` run passed
against portable PostgreSQL 17.11 after catching and correcting two SQL syntax
defects. It applied the migration, denied missing-role metadata access,
deleted an anonymous thread with append-only events and grant scopes,
blocked/unblocked a hashed principal, refused a revoked account-linked
customer deletion, and applied the rollback. This fixture does not prove
production schema compatibility, deployed behavior, or a real browser session.
`npm run verify:development`, focused 4/4 contracts, and separate Storefront
and Admin production builds also pass after the review fixes. The attempted
`npm run verify:release` printed 945 passing base cases but did not exit that
phase after several minutes; it was interrupted, so the aggregate release gate
is **not** claimed as passed. Do not push or deploy on that evidence.
Local `main` fast-forwarded through `bde1f12` from the only branch with unique
commits, followed by this documentation receipt. `origin/main` was not pushed;
no provider state changed. The post-merge focused suite passed 4/4.

- Focused contract: `4 passed` in
  `tests/mobile-store-moderation-pwa-contract.spec.js`.
- `npm run build`: passed Storefront build and security/source-boundary checks.
- `npm run build:admin`: passed Admin build, 214.07/300.00 kB application budget,
  target boundary, and secret scan; `dist/admin-sw.js` was emitted.
- Final `npm run verify:development`: passed after the last code edit, including
  security surface, secret, environment-boundary, dependency and import checks.
- Rendered in-app browser check at 390×844: no horizontal document overflow; the
  Shopkeeper measured 56×56 and remained `data-open=false` after opening the
  full-screen Questions and answers sheet.

## Truth and remaining acceptance

The Supabase migration is not applied, no production artifact is deployed, and
no live moderation event was executed. Browser install prompting depends on a
supported device/browser and has not had physical-device acceptance. Admin and
SuperAdmin positive cases, Staff denial, account-linked deletion refusal,
anonymous delete visibility on both sides, blocked start/reply, manual unblock,
and Android/iOS chat usability require the authorized database/deployment window
and representative acceptance.

The migration deliberately removes the legacy direct chat writer's client
grant, because it has no trusted IP and would bypass blocks. Current production
uses direct mode. Never apply this migration alone: prepare and verify the
signed guest/Admin BFFs, announce a controlled chat cutover window, switch
the Storefront browser path, then prove blocked start/reply and direct-RPC
denial on the real host. If that sequence cannot be executed safely, keep the
migration unapplied and direct chat unchanged.

## Recovery

Before database application, revert the scoped source changes. After an
authorized application, use
`supabase/migrations/20260922_anonymous_chat_moderation_rollback.sql` only under
the MAP-017 backup/change-window procedure, then redeploy the prior known-good
Storefront and Admin artifacts.
