# K2 Jimzon Guest Commerce Security Contract

This is the accepted MAP-019/MAP-020 contract for guest checkout, Pasabuy, and
future universal messaging. It is not a backlog and does not claim the target is
live.

## Approved customer experience

- A customer can submit a website order request or Pasabuy request without a
  personal account.
- An account remains optional and provides verified history, saved identity, and
  cross-device messaging continuity.
- Guest submission is not payment, stock reservation, courier confirmation, or
  guaranteed fulfillment.
- Staff can communicate through the contact/channel the customer supplied.
- A guest receives a reference/receipt but cannot retrieve a private record merely
  by knowing that public reference or changing a URL ID.

## Verified live RPC findings

The current storefront calls `submit_order_request_v2`,
`submit_pasabuy_request`, and `validate_coupon`. It does not call legacy
`submit_order_request`.

| Live function | Safe foundation | Required correction |
| --- | --- | --- |
| `submit_order_request_v2` | Server selects products/prices; delivery remains pending quote; item count is bounded; idempotency key is unique | It returns the complete internal `order_requests` row, including PII/internal fields; input lengths and formats are mostly unbounded; idempotency is not contact/payload-bound; no abuse boundary exists |
| `submit_order_request` | Some server pricing/quantity checks | Storefront no longer uses it; it hardcodes PHP 85 shipping contrary to approved delivery logic and returns the full internal row; revoke it from browser roles after compatibility verification |
| `submit_pasabuy_request` | Minimal receipt fields; server enforces basic required values and shipping enum | No idempotency; text/URL/budget lengths and bounds are incomplete; no abuse boundary exists |
| `validate_coupon` | Reads only active/current coupons and confirmation revalidates later | Accepts a client-supplied subtotal and returns internal coupon ID/type/value; error differences support coupon enumeration; no abuse boundary exists |

The full order-row return is unacceptable because it includes customer contact
and address plus `confirmed_by`, raw source payload, external identifiers,
delivery/exception internals, and other fields the guest receipt does not need.
A high-entropy idempotency key reduces guessing but is not authorization.

## Required submission boundary

For launch, guest forms call a same-origin server/BFF endpoint. That endpoint:

1. accepts JSON only within a small byte limit and an exact schema;
2. validates and normalizes name/contact/address/note/SKU/quantity/URL/budget;
3. applies per-IP plus per-contact/risk rate limits and bot protection without
   logging raw sensitive fields;
4. generates or validates a high-entropy idempotency key and binds it to a
   normalized request fingerprint;
5. invokes one least-privilege database command;
6. maps database failures to stable public error codes/messages;
7. returns only the minimal receipt; and
8. records redacted security/operational telemetry.

Until that BFF is deployed and tested, direct public RPCs remain a transitional
surface and the storefront is not security-launch-ready.

## Minimal public receipts

Order receipt:

```text
public_reference
status
subtotal
discount_amount
total_amount
shipping_quote_status
delivery_status
created_at
```

Pasabuy receipt:

```text
public_reference
status
created_at
```

Coupon preview:

```text
valid
normalized_code (only when valid)
discount_amount (preview only)
message_code
```

Never return internal UUIDs, coupon IDs/configuration, customer PII, raw channel
payloads, staff IDs, private notes, credential metadata, or stack/database text.

## Guest access and account claiming

Submission does not automatically grant later record retrieval. When guest
history/messaging is implemented, the BFF issues an expiring, revocable,
high-entropy grant in an `HttpOnly`, `Secure`, appropriately scoped `SameSite`
cookie or a one-time verified magic-link exchange. Store only a hash server-side.
The grant is bound to one order/request/conversation and has use/expiry/revocation
metadata.

An account can claim a guest record only after verifying the matching contact,
checking for identity conflicts, consuming a one-time claim, and writing an audit
event. Public reference, email, phone, browser storage, or URL ID alone is never
enough.

## Universal messaging identity

Every conversation retains channel, external conversation/customer reference,
K2 customer/account link when verified, guest grant link when applicable,
consent/contact basis, last inbound/outbound event, delivery status, and raw
connector provenance. Channel identities are linked deliberately; they are never
silently merged because names, emails, or phone numbers look similar.

## Prepared database foundation (not live)

The MAP-019 migration defines separate customers, contact points, optional Auth
account links, channel identities, hashed guest grants and record scopes,
one-time claims, and canonical order/conversation links. Forced RLS denies anon
table access; browser roles receive no direct mutation grants. Constraint
triggers require a verified contact for account links, prevent cross-customer
guest scopes, reject conflicting account claims, and bound grant/claim expiry.
The exact migration passed a production rollback-only rehearsal and was fully
restored afterward. See `MAP_019_ROLLBACK_VALIDATION_2026-08-12.md`. Guest BFF
submission, raw-token cookies, retrieval/reply projections, verification, claim,
revocation, and cross-user runtime tests remain required before activation.

## Prepared signed boundary (not live)

The repository now contains a Storefront BFF and a signed database boundary for
order, Pasabuy, and coupon calls. It uses exact-origin checks, bounded allowlist
schemas, stable public errors, a limited Supabase key, HMAC request signatures,
five-minute freshness, single-use nonces, database-backed per-IP/contact limits,
payload-bound idempotency, canonical guest identity, conversation scopes, and a
30-day HttpOnly guest grant. The raw grant is returned only to the BFF and is
removed from the JSON receipt.

Prepared guest-message routes list only non-internal messages from scoped
conversations and accept an idempotent customer reply only when the grant owns
that exact conversation. They use a separate opaque conversation reference;
internal UUIDs, staff-only messages, and failure details are not returned.

The exact identity + boundary + cutover sequence passed production in an
explicit rollback-only transaction, including a real rollback-only order and
Pasabuy request. No object or record remained afterward. The storefront client
and accessible Turnstile challenge are prepared behind a feature flag that
remains off until real site/secret keys, the allowed preview host, permanent
migrations, the customer message surface, and coordinated legacy-RPC revocation
can be activated and tested together. Details are
in `MAP_020_GUEST_BOUNDARY_ROLLBACK_VALIDATION_2026-08-12.md` and
`GUEST_COMMERCE_BFF_RUNBOOK.md`.
