# MAP-020 Admin Pasabuy rollback validation — 12 August 2026

## Scope

This evidence covers the prepared, inactive Admin BFF Pasabuy read and command
boundary. It does not claim deployment, cookie-session activation, marketplace
connection, customer delivery, payment, or domain readiness.

## Live contract inspected

- `public.pasabuy_requests`, `public.pasabuy_quotes`, and
  `public.pasabuy_events` columns were inspected on project
  `pixplcjqivlfflickobf`.
- `public.transition_pasabuy_request(uuid,text,text)` was inspected and remains
  the authority for the current narrower live transition matrix.
- `public.save_pasabuy_quote(...)` was inspected. It already enforces staff
  access, locks the request, calculates landed cost, and creates immutable quote
  versions, but it has no complete numeric bounds, database below-landed guard,
  owner price-rationale requirement, or durable idempotency.

## Prepared controls

- `GET /api/admin/pasabuy` uses a fixed bounded request/quote projection.
- `POST /api/admin/pasabuy/transition` requires an exact payload and a specific
  reason.
- `POST /api/admin/pasabuy/quote` bounds all financial, FX, weight, customs,
  margin, and date inputs; rejects final price below landed cost; and requires a
  price rationale.
- Both commands require target/origin/session/AAL2/CSRF checks, a unique
  operation key, server-only HMAC, nonce replay denial, durable payload-bound
  receipts, and per-actor/action rate limits.
- The rationale is recorded as `quote_price_rationale` with actor, quote ID,
  version, landed cost, final price, and explicit `sent=false`/`paid=false`
  metadata.
- `VITE_ADMIN_BFF_ENABLED` remains false. The existing browser path remains the
  fallback until coordinated cutover.

## Verification results

1. Foundation plus Pasabuy migrations were executed against the production
   schema inside one transaction ending in `rollback`; compilation succeeded.
2. Post-rollback query returned `null` for both
   `public.execute_admin_pasabuy_command_v1(...)` and
   `k2_private.admin_command_receipts`, proving no staged objects remained.
3. `npm run test:contracts`: 24 passed.
4. `npm run build:admin`: passed; 21 manifest modules plus compiled bundle
   isolation verified.
5. `npm run build:storefront`: passed; 15 manifest modules plus compiled bundle
   isolation verified. Existing large-chunk warnings remain non-blocking work.
6. `npm run security:secrets`: passed across 661 files; secret values were not
   printed.

## Activation gate

Do not apply this migration or enable the Admin BFF until the exposed elevated
Supabase credential is contained, MAP-017 is approved for permanent activation,
the private/server request secret is installed correctly, all remaining Admin
browser capabilities have named server boundaries, and deployed positive and
negative tests pass on the owner-approved HTTPS Admin domain. The storefront
project must return `404` for every Admin API.
