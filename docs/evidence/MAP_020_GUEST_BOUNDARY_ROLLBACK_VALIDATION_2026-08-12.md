# MAP-020 Guest Boundary Rollback Validation — 12 August 2026

This is evidence for prepared work, not a live-activation claim.

The exact MAP-019 identity body, MAP-020 signed-boundary body, test-only secret
configuration, and coordinated cutover body were executed against production
inside one explicit transaction ending in `ROLLBACK`.

Verified inside that transaction:

- the signed order, Pasabuy, and coupon functions compile on the live schema;
- only the new signed commands retain `anon` execution after cutover;
- an invalid coupon is returned as one non-enumerating result;
- replaying the same signed nonce is rejected;
- a real live product can create a rollback-only guest order with a canonical
  customer, hashed grant, order scope, and conversation reply scope;
- a rollback-only Pasabuy request reuses the same guest customer and its existing
  trigger-created conversation is linked rather than duplicated; and
- the scoped guest cookie hash lists only its own conversation, accepts one
  idempotent customer reply, and denies a different valid guest grant attempting
  to reply to that conversation;
- order/Pasabuy receipts contain the intended minimal public fields while the raw
  guest token is available only to the BFF for an HttpOnly cookie.

A separate production query after rollback proved that the private schema, new
identity tables, and new public functions were absent and the legacy order RPC's
original `anon` execution was restored. No schema, secret, customer, request,
conversation, rate bucket, or grant from this rehearsal remains live.

Permanent activation remains blocked by MAP-016 exposed-key disablement evidence,
then requires the ordered steps in `GUEST_COMMERCE_BFF_RUNBOOK.md`.
