# Phase checkpoint: Phase 4 — MAP-019 Hybrid Identity, Guest Continuity, Wholesale, and Messaging

## Result

`Blocked — evidence required` (local contracts, BFF architecture, rollback transactions, and UI suites verified; permanent DB activation, custom domains, and live Turnstile keys unapplied/gated).

## Scope and dependency gate

- MAP requirements addressed: MAP-019 canonical customer/contact/account/guest/channel identities, reload-safe HttpOnly guest grants, account linking without contact-value merges, server-authorized wholesale buyers, Admin BFF HttpOnly session foundation, universal messaging normalization with internal-note separation.
- Earlier dependency evidence relied upon: Phase 1 & 2 schema boundaries, `MAP_019_ROLLBACK_VALIDATION_2026-08-12.md`.
- Owner decisions required: Authorization to permanently apply identity migrations, configure Turnstile production credentials, and establish production domain routing.
- Work deliberately excluded: Client-side wholesale unlocking, merging accounts by unverified email/phone matches, claiming external provider message delivery without receipts.

## Current-state due diligence

- Code/schema/provider state inspected: `src/services/guestCommerceService.js`, `src/context/useAdminAuthRuntime.js`, `src/context/useAdminInboxRuntime.js`, `src/views/storefront/Wholesale.jsx`, `src/views/storefront/Contact.jsx`, `tests/guest-commerce-bff-contract.spec.js`, `tests/inbox-phase2.spec.js`.
- Dirty-worktree preservation: All modified files preserved.
- Problem reconfirmed from: Identity and guest continuity requires server-side HMAC validation and HttpOnly cookies, not exposed tokens or direct database calls from browser.

## Changes and files

- `src/services/guestCommerceService.js` (BFF submission and guest status/chat methods).
- `src/views/storefront/Wholesale.jsx` (Server-authorized wholesale inquiry interface, no client price unlock).
- `src/views/storefront/Contact.jsx` (Owner-confirmed channel links + fallback contact form).
- `src/lib/adminInboxNormalization.js` (Unified message and unread state normalizer).
- `supabase/migrations/20260812_canonical_identities.sql` (Canonical customer, contact, and channel records).
- `supabase/migrations/20260812_guest_account_identity_and_messaging.sql` (Scoped guest grants, account claim, conversation ownership).
- `supabase/migrations/20260812_guest_submission_boundary.sql` (Signed DB submission commands, replay protection, rate limits).
- `scripts/verify-map019-identity.mjs`, `scripts/verify-guest-bff.mjs`, `scripts/verify-admin-bff.mjs`.

## Verification

| Exact command or provider check | Exit/result | Behavior proven | Evidence level |
| --- | --- | --- | --- |
| `npm run verify:map019-identity` | Exit 0 | Canonical identity models, forced RLS, scoped guest grant schemas | Prepared locally |
| `npm run verify:guest-bff` | Exit 0 | Storefront BFF boundary, signed DB commands, replay/rate limits | Prepared locally |
| `npm run verify:admin-bff` | Exit 0 | Admin BOS session handling, AAL2 gate, CSRF protection | Prepared locally |
| `npx playwright test tests/guest-commerce-bff-contract.spec.js tests/inbox-phase2.spec.js` | 9 passed | Guest boundary security, inbox normalization, internal note truth, mobile inbox | Prepared locally |
| Rollback-only production validation (12 Aug 2026) | Passed | Guest boundary and identity migrations executed inside transaction and rolled back | Validated in rollback-only production transaction |

## Denial, failure, and recovery evidence

- Permission/ownership/IDOR denial: Guest grant scopes conversation access strictly to the matching customer/session. Cross-guest access denied.
- Invalid/unknown/oversized input: Request schema validation denies unknown JSON keys and oversized bodies before database invocation.
- Duplicate/concurrent/replay behavior: Nonce replay protection and payload-bound idempotency prevent duplicate orders/messages.
- Timeout/retry/recovery: Preserves conversation list across background poll failures; reload restores guest conversation view.
- Transaction/data rollback: Transactional rollback tested against live production DB on 2026-08-12.
- Safe errors/log redaction: Error responses omit internal identifiers and provider messages.

## UI and accessibility evidence

- Four-skill design compliance: Implemented with `ui-ux-pro-max`, `impeccable`, `design-taste-frontend`, `emil-design-eng`.
- Touch targets: 44px minimum touch targets on mobile inbox and forms.
- Responsive layout: Dedicated single-conversation mobile view with clear back navigation.
- States: Loading, empty, expired session, partial refresh, and retry states.

## Provider and production truth

- Local/prepared: All contracts, services, normalizers, and UI flows fully functional.
- Rollback validated: Tested in live DB transaction on 12 August 2026.
- Production state: Unapplied on live DB (gated on MAP-017 / owner authorization).

## Rollback

- Code/config rollback: Revert identity and BFF client scripts.
- Migration/data rollback: Tested via SQL transaction `ROLLBACK`.
- What was actually rollback-tested: Full identity and guest submission schemas rolled back cleanly.

## Remaining blockers and next safe phase

- Failed or skipped checks: Permanent DB activation and live Turnstile keys unapplied.
- Exact unblock condition: Permanent application of identity migrations and production domain setup.
- Next phase safe to begin: Phase 5 (MAP-020 and MAP-021) can proceed.

## Truth statement

`No claim above exceeds its evidence.`
