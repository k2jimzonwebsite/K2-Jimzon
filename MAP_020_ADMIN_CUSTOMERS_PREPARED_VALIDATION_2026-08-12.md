# MAP-020 Admin customer-directory prepared validation — 12 August 2026

## Scope

This evidence covers an inactive Admin BFF customer-directory read slice. It
does not claim the hybrid identity migration, account claiming, channel linking,
customer metrics, cookie Auth, domain, or deployed interface is live.

## Provider evidence available

- `MAP_019_ROLLBACK_VALIDATION_2026-08-12.md` records the prior direct production
  inspection: canonical `customers`, contact, account, channel identity, guest
  grant, and claim tables are absent; conversations still point at Auth users.
- That proof also records zero order, Pasabuy, conversation, and message rows at
  inspection time and successful rollback of the proposed hybrid schema.
- The current Admin directory reads full `user_profiles` rows, filters Customer/
  VIP roles, and therefore cannot represent accountless or marketplace customers.
- A fresh provider query was attempted for this slice but the connected tool had
  reached its usage limit. No workaround or database mutation was attempted.

## Prepared read boundary

- `GET /api/admin/customers` requires the Admin production target, exact origin,
  encrypted active session, current live `Admin` role, and AAL2.
- Until explicit support capabilities exist, Staff cannot retrieve the complete
  customer identity directory through this route.
- When MAP-019 tables exist, the route returns at most 500 canonical customers
  with fixed contact/account/channel fields. It never returns guest token hashes,
  claim tokens, raw connector provenance, internal notes, or generic table rows.
- It calculates bounded order, Pasabuy, and conversation summaries from canonical
  `customer_id`. If any supporting query fails, every operational metric is
  marked unavailable rather than silently undercounted.
- When canonical tables are absent, it returns only fixed Customer/VIP account
  profile fields and labels the result `legacy_profiles`. It does not invent a
  guest, channel, or verified identity link.

## Prepared interface

- The interface labels canonical versus registered-profile-only mode and states
  that matching names, email addresses, and phone numbers are never auto-merged.
- Account, guest/channel, contact, source, channel links, and operational activity
  remain separate facts.
- Desktop uses the established Admin register; phones use vertical cards with
  no horizontal-table dependency and a 44px refresh action.
- Loading, empty, permission, partial-data, and safe error states are explicit.
  The screen contains no raw provider errors, invented totals, broadcast claim,
  or customer mutation action.

## Local verification

- 36 BFF and regression contracts pass, including canonical identity separation
  and all-or-unavailable metric behavior.
- The Admin BFF foundation verifier passes.
- The secret scan passes across 699 files.
- `git diff --check` passes; line-ending notices are informational.
- The post-change Admin production build was requested but could not start because
  the execution quota was exhausted. It remains required and is not inferred from
  the earlier pre-customer build.

## Remaining

- Re-run direct provider schema/grant/count inspection when connector quota is
  available and compare it with the MAP-019 proof.
- Run both isolated production builds and bundle-boundary checks after this code.
- Permanently activate and test the MAP-019 identity/guest boundaries only after
  MAP-016/MAP-017 security prerequisites and coordinated cutover are satisfied.
- Implement verified account claim/conflict recovery and deliberate channel-link
  workflows; do not infer identity from contact similarity.
- Add explicit support/customer-read capabilities before allowing non-Admin staff.
- Run cross-customer IDOR, guessed-ID, direct-table, role, AAL, origin, and real-
  host tests plus phone/laptop staff acceptance before activation.
