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

## Recovery

Before database application, revert the scoped source changes. After an
authorized application, use
`supabase/migrations/20260922_anonymous_chat_moderation_rollback.sql` only under
the MAP-017 backup/change-window procedure, then redeploy the prior known-good
Storefront and Admin artifacts.
