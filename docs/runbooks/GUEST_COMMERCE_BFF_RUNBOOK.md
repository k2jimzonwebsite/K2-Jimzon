# Guest Commerce BFF Activation Runbook

This runbook implements the approved hybrid model: customers can buy, request
Pasabuy, start or continue a scoped conversation without an account; accounts remain
optional for verified history and cross-device continuity.

## Current state

The BFF code, identity migration, signed guest-boundary migration, cutover
migration, rollback evidence, and feature-gated guest inbox exist locally. None
is active in production. The storefront still calls the transitional direct
RPCs while `VITE_GUEST_BFF_ENABLED=false`.

The isolated production Storefront does not expose the workstation `DemoRail`.
Appending `#demo` cannot reveal its direct-password VIP prototype or claim that
authentication unlocks tier pricing. That prototype remains only in combined
local mode. Optional customer accounts and wholesale pricing must not be added
back through the rail: they require verified-contact claim commands and server-
authorized commercial terms under MAP-019.

The default Wholesale fallback currently opens a reviewable email draft. It is
not a BFF receipt and must remain labelled unsent until the customer presses
Send in their email client. Do not restore the removed `WA-*` browser reference,
`k2_wholesale_applications` localStorage record, registration-number-first
intake, or unapproved response-time copy. A secure inquiry route is now prepared
locally behind the same disabled Storefront BFF flag. It uses exact Origin,
Turnstile, signed request, durable rate, idempotency, safe-error, and scoped guest
conversation controls; it may capture an inquiry but cannot grant wholesale
authority. Activation still requires the ordered migration, matching private
secrets, exact provider environments, preview denial tests, and real-host proof.

The optional customer-account UI now awaits the deferred Storefront Supabase
client before reading Auth, owns cancellation and subscription cleanup, and
signs out only through the resolved client reference. The exact local
customer-account/secure Wholesale harness passes 3/3 and one uninterrupted
exact current-tree local `npm test` aggregate passes 550/550 after the final
customer-fixture containment change. This is fixture/browser evidence only; the
customer flag, provider delivery, migration, and production route remain
inactive until the activation order below is satisfied.

The Vercel Hobby deployment rejects more than 12 Serverless Functions. The 81
route handler files remain under `prepared-api/`, outside Vercel's deployable
`api/` directory. Only one guarded consolidated entrypoint per artifact has
been promoted locally. Both server and browser BFF flags remain false. The
Contact email-draft fallback and legacy browser Admin Auth do not require these
inactive functions.

The local consolidation is now prepared: `server/storefront-bff/router.js`
explicitly allowlists all 14 Storefront handlers and
`prepared-api/storefront-router.js` is the shared router adapter, and
`api/storefront/index.js` is the single deployable entrypoint.
The verifier derives the endpoint inventory from the filesystem and fails on a
missing or duplicate route; unknown and traversal-like paths return a minimal
`404`. `vercel.storefront.json` now declares the exact
`/api/storefront/*` rewrite carrying the bounded remaining path as `route`.
The entrypoint independently requires `K2_DEPLOYMENT_TARGET=storefront` and
`K2_STOREFRONT_BFF_ENABLED=true`, so its default response is `404` even if the
browser flag changes accidentally. This is locally tested source, not a
deployment or feature activation. Preview function inventory must prove that
the Storefront artifact contains only its intended function.

## Required activation order

1. Obtain MAP-016 evidence that the exposed legacy service-role key is disabled
   and rejected. Do not proceed without it.
2. Apply and postflight the MAP-017 public-write boundary.
3. Apply and postflight `20260812_guest_account_identity_and_messaging.sql`.
4. Apply and postflight `20260812_guest_submission_boundary.sql`. Do not apply
   the cutover migration yet.
5. Apply and postflight `20260822_guest_account_claim_boundary.sql`. Its account
   command must remain unreachable until the customer Auth flow and active guest
   grant cookie are both available on the same preview host.
   This migration also provides the owner-scoped account history and account
   reply commands used after successful claim.
6. Apply and postflight `20260825_storefront_customer_auth_boundary.sql`. Prove
   its exact anonymous grant, forced-RLS private nonce/rate tables, HMAC-only
   subjects, denial persistence, cleanup, and replay rejection before enabling
   any customer Auth route. It reuses the Storefront request secret and creates
   no browser-readable table access.
7. Generate two independent random 32-byte values outside the repository. Store
   the first as base64 in Storefront Vercel `K2_GUEST_BFF_SECRET`; store only its
   decoded bytes plus the second contact-HMAC key in the private database table.
   Never paste either value into Git, logs, screenshots, chat, or browser code.
8. Configure Storefront Vercel server variables: `SUPABASE_URL`, limited
   `SUPABASE_PUBLISHABLE_KEY`, exact `K2_STOREFRONT_ORIGINS`, and
   `K2_TURNSTILE_SECRET_KEY`. Keep `K2_STOREFRONT_BFF_ENABLED=false` until the
   preview is otherwise ready. The signing secret must match the private database
   request secret. No service-role/secret key is used by these endpoints.
9. Configure the prepared `VITE_TURNSTILE_SITE_KEY` on the Storefront preview
   environment. Confirm the deployed function inventory, enable
   `K2_STOREFRONT_BFF_ENABLED=true` on preview, prove the server routes and
   denials, then enable `VITE_GUEST_BFF_ENABLED=true` last for the coordinated
   preview release. Verify valid, missing, expired, replayed, and bot-failed
   challenges on the real preview host. Order and Pasabuy require the challenge;
   coupon preview uses the durable rate boundary without interrupting browsing.
10. Apply and postflight `20260831_guest_order_status_boundary.sql` after its
   guest-grant/request-signing dependencies and before enabling the browser
   switch. Switch the storefront service calls to `/api/storefront/order`,
   `/api/storefront/order/status`,
   `/api/storefront/pasabuy`, `/api/storefront/conversation`, and
   `/api/storefront/coupon`. Verify minimal
   receipts, safe errors, duplicate retries, 429 behavior, and HttpOnly cookie
   issuance without reading the cookie from JavaScript. Submit an order, reload
   `/confirmation`, use Back/Forward, and prove only the scoped safe status
   projection returns. A clean browser, changed scope, expired/revoked grant,
   cross-guest attempt, and unavailable boundary must fail with explicit
   recovery and no contact/address/note/internal-ID leakage.
11. Enable the prepared guest history/message surface, which starts through POST
   `/api/storefront/conversation` and calls POST `/api/storefront/messages` and
   `/api/storefront/message`. Verify an anonymous
   browser with the scoped cookie can read/reply only to its own conversations;
   another browser, changed conversation reference, expired/revoked grant, and
   duplicate/different-content retries must fail safely. Prove that a clean
   browser can start a Website conversation without an order or Pasabuy request.
   Verify the guest conversation view and post-order confirmation both state
   that cancellation and return have no self-service path, direct the customer
   to K2 staff, and describe case-by-case review without promising a response
   time or outcome.
12. Configure and verify the actual Supabase email-link redirect, phone/SMS OTP
    policy, expiry, resend, provider throttling, and the exact preview callback.
    Prove `POST /api/storefront/account/auth/email`, `account/auth/phone`, and
    `account/auth/verify` permit and deny at their documented IP/contact/global
    thresholds before any provider call. For email/SMS issuance, prove a valid
    `customer_auth` Turnstile action, missing/expired/replayed/wrong-action denial,
    budget denial before remote challenge work, challenge denial before provider
    delivery, and browser reset after success, safe denial, timeout, or ambiguous
    request failure. SMS verification must
    remain protected by its strict attempt budget without a second challenge.
    Test malformed input, safe `Retry-After`, delivery ambiguity, code expiry,
    and session establishment on the real preview host. Do not enable the browser
    flag first.
13. Prove `POST /api/storefront/account/claim` with a real confirmed customer
    session: matching contact succeeds once, the guest grant is revoked, retry is
    idempotent, and unverified, mismatched, conflicting, replayed, expired, and
    cross-guest attempts fail without account or audit duplication.
    Then enable `VITE_CUSTOMER_ACCOUNT_ENABLED=true`
    on preview only and prove `/api/storefront/account/history` and
    `/api/storefront/account/message` exclude cross-customer/internal data after
    the guest grant is revoked. The browser flag stays false in production.
14. Apply `20260812_guest_submission_cutover.sql` in the same release window.
   Run its postflight and prove direct old RPC calls fail for `anon` and
   `authenticated` while all four submission/start BFF paths still work.
15. Run repository/history/bundle secret scans, both production builds, IDOR and
    cross-customer tests, then record real-host evidence before domains are
    considered ready.

If any step fails before cutover, keep the old storefront path and fix forward.
If cutover fails, roll back only the cutover grants immediately; do not delete
identity, request, conversation, grant, replay, or rate records.
