# Guest Commerce BFF Activation Runbook

This runbook implements the approved hybrid model: customers can buy, request
Pasabuy, start or continue a scoped conversation without an account; accounts remain
optional for verified history and cross-device continuity.

## Current state

The BFF code, identity migration, signed guest-boundary migration, cutover
migration, rollback evidence, and feature-gated guest inbox exist locally. None
is active in production. The storefront still calls the transitional direct
RPCs while `VITE_GUEST_BFF_ENABLED=false`.

## Required activation order

1. Obtain MAP-016 evidence that the exposed legacy service-role key is disabled
   and rejected. Do not proceed without it.
2. Apply and postflight the MAP-017 public-write boundary.
3. Apply and postflight `20260812_guest_account_identity_and_messaging.sql`.
4. Apply and postflight `20260812_guest_submission_boundary.sql`. Do not apply
   the cutover migration yet.
5. Generate two independent random 32-byte values outside the repository. Store
   the first as base64 in Storefront Vercel `K2_GUEST_BFF_SECRET`; store only its
   decoded bytes plus the second contact-HMAC key in the private database table.
   Never paste either value into Git, logs, screenshots, chat, or browser code.
6. Configure Storefront Vercel server variables: `SUPABASE_URL`, limited
   `SUPABASE_ANON_KEY`, exact `K2_STOREFRONT_ORIGINS`, and
   `K2_TURNSTILE_SECRET_KEY`. The signing secret must match the private database
   request secret. No service-role/secret key is used by these endpoints.
7. Configure the prepared `VITE_TURNSTILE_SITE_KEY` on the Storefront preview
   environment. Enable `VITE_GUEST_BFF_ENABLED=true` only for the coordinated
   preview release, then verify valid, missing, expired, replayed, and bot-failed
   challenges on the real preview host. Order and Pasabuy require the challenge;
   coupon preview uses the durable rate boundary without interrupting browsing.
8. Switch the storefront service calls to `/api/storefront/order`,
   `/api/storefront/pasabuy`, `/api/storefront/conversation`, and
   `/api/storefront/coupon`. Verify minimal
   receipts, safe errors, duplicate retries, 429 behavior, and HttpOnly cookie
   issuance without reading the cookie from JavaScript.
9. Enable the prepared guest history/message surface, which starts through POST
   `/api/storefront/conversation` and calls POST `/api/storefront/messages` and
   `/api/storefront/message`. Verify an anonymous
   browser with the scoped cookie can read/reply only to its own conversations;
   another browser, changed conversation reference, expired/revoked grant, and
   duplicate/different-content retries must fail safely. Prove that a clean
   browser can start a Website conversation without an order or Pasabuy request.
10. Apply `20260812_guest_submission_cutover.sql` in the same release window.
   Run its postflight and prove direct old RPC calls fail for `anon` and
   `authenticated` while all four submission/start BFF paths still work.
11. Run repository/history/bundle secret scans, both production builds, IDOR and
    cross-customer tests, then record real-host evidence before domains are
    considered ready.

If any step fails before cutover, keep the old storefront path and fix forward.
If cutover fails, roll back only the cutover grants immediately; do not delete
identity, request, conversation, grant, replay, or rate records.
