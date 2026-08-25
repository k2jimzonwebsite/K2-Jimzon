# MAP-019 Hybrid Identity Rollback Validation — 12 August 2026

## Live starting state

Read-only inspection verified that production currently has no canonical
`customers`, account-link, contact-point, channel-identity, guest-grant, or claim
tables. `conversations.customer_id` points directly to `auth.users`, so it cannot
represent guests. At inspection time, order, Pasabuy, conversation, and message
tables contained zero rows. Existing operational RLS allowed staff-only reads.

## Prepared contract

The migration separates canonical customer, verified contact, optional Auth
account, deliberate channel identity, hashed guest grant/scope, one-time claim,
canonical order/Pasabuy ownership, and channel-aware conversation provenance.
It never auto-merges by name, email, or phone. Validation triggers reject an
account without its customer's verified contact, a scope pointing at another
customer's record, conflicting account claims, and unbounded grant/claim expiry.
All new tables use forced RLS, no anonymous table privileges, read-only browser
grants, and server-command-only mutation.

## Rollback-only production rehearsal

`supabase/map019_identity_preflight.sql` passed. The exact migration and
`supabase/map019_identity_postflight.sql` then ran in one production transaction
ending with `ROLLBACK`. All object, grant, RLS, policy, helper, trigger, and
operational-link assertions passed.

A separate read-only query proved rollback restored the original state:

- `customers` and `guest_access_grants` are absent;
- the ownership helper is absent;
- `order_requests.customer_id` is absent; and
- `conversations.customer_id` again references `auth.users`.

This proves syntax compatibility and transactional reversibility. It is not
deployment, guest ownership, account-claim, messaging, or cross-user denial
evidence. Permanent application remains behind MAP-016/MAP-017 and must be
followed by BFF commands and authenticated positive/negative tests.
