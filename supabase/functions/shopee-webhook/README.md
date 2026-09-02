# Shopee webhook intake

This Edge Function verifies Shopee pushes and sends each signed event through
one atomic database capture command. It deliberately does **not** create an
order from the push because Shopee's status notification does not contain a
complete order.

## Current readiness

- Signature verification: implemented; confirm the exact signing string with
  the approved Shopee app documentation before deployment.
- Ingress validation: prepared with a 256 KiB JSON limit, untouched signed bytes,
  strict UTF-8 decoding for JSON,
  a required 1–30,000 ms absolute body-read deadline with stalled-stream cancellation,
  required shop/timestamp/event identity, deterministic inbox keys, and a
  configurable signed-event replay window. `Date.now()` is never an event ID.
- Durable, idempotent event capture: prepared by
  `20260825_shopee_webhook_ingress_boundary.sql`. The service-role-only command
  consumes private forced-RLS shop/global budgets before insert, preserves an
  existing row on exact replay, and rejects changed evidence under the same ID.
- Rate configuration: deliberately absent by default. Approved per-shop/global
  limits and their shared window must be inserted into
  `k2_private.shopee_webhook_rate_config` during an authorized rollout; without
  that row the capture command fails closed and the Edge response is `503`.
- Retry-safe failure response: implemented. Persistence failures return `503`
  so the platform can retry instead of silently losing the event. Durable rate
  denial returns `429` with `Retry-After`; changed evidence returns `409`.
- Full order-detail retrieval: pending partner credentials and API approval.
- Canonical order normalization, inventory reservation, chat, and waybill:
  pending the real API payloads and owner account access.

## Required runtime settings and secrets

- `SHOPEE_PARTNER_KEY`
- `SHOPEE_PUSH_MAX_AGE_SECONDS` (60–86,400; set from the approved Shopee retry
  and timestamp contract before activation rather than guessing a production value)
- `SHOPEE_BODY_READ_TIMEOUT_MS` (1–30,000; set deliberately for the approved
  provider path before activation; missing/invalid configuration returns `503`)
- `SUPABASE_URL` (injected by Supabase)
- `SUPABASE_SECRET_KEYS` (Supabase-injected JSON; the function uses the named
  `default` modern secret key)

The function must be deployed without Supabase JWT verification because
Shopee is the caller. Its own HMAC verification remains mandatory.

Do not deploy this source, apply its migration, or configure guessed limits
before MAP-017 authorization and the approved Shopee contract gates are met.
Local verification is `npm run verify:map020-shopee-ingress-portable`.
The same authoritative lifecycle carries MAP-023 inbound-event acceptance: an
identical retry after an ambiguous successful response preserves one terminal
event row, changed-payload identity reuse conflicts without overwriting evidence,
and all three attempts remain visible in both local rate budgets.

## Required next worker

Process `channel_event_inbox` rows in `received` state. For every order event:

1. Lock/claim the event and increment `attempt_count`.
2. Request Shopee order details with the correct shop access token.
3. Validate external item identifiers against `channel_listings`.
4. Upsert one `order_requests` header using `(channel_source,
   external_order_id)` as the idempotency boundary.
5. Insert real `order_request_items` and let staff confirmation allocate exact
   FEFO lots.
6. Mark the event `processed`, or `failed` with `last_error` for retry.

Do not reintroduce direct inbox upserts, placeholder SKUs, guessed quantities,
guessed rate limits, or a `200` response after a persistence failure.
