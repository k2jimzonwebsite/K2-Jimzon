# Shopee webhook intake

This Edge Function verifies Shopee pushes and stores each signed event in
`channel_event_inbox`. It deliberately does **not** create an order from the
push because Shopee's status notification does not contain a complete order.

## Current readiness

- Signature verification: implemented; confirm the exact signing string with
  the approved Shopee app documentation before deployment.
- Durable, idempotent event capture: implemented by
  `20260809_operations_hardening.sql`.
- Retry-safe failure response: implemented. Persistence failures return `503`
  so the platform can retry instead of silently losing the event.
- Full order-detail retrieval: pending partner credentials and API approval.
- Canonical order normalization, inventory reservation, chat, and waybill:
  pending the real API payloads and owner account access.

## Required secrets

- `SHOPEE_PARTNER_KEY`
- `SUPABASE_URL` (injected by Supabase)
- `SUPABASE_SECRET_KEYS` (Supabase-injected JSON; the function uses the named
  `default` modern secret key)

The function must be deployed without Supabase JWT verification because
Shopee is the caller. Its own HMAC verification remains mandatory.

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

Do not reintroduce placeholder SKUs, guessed quantities, or a `200` response
after a persistence failure.
