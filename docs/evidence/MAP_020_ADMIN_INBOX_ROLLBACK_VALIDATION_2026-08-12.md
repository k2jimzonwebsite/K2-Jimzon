# MAP-020 Admin Universal Inbox Boundary Validation

**Date:** 12 August 2026
**Target:** connected production Supabase project `pixplcjqivlfflickobf`
**Outcome:** prepared and rollback-proven; not applied and not live

## Operational truth preserved

The current Admin Inbox can save an `internal_only` note, mark a conversation
read, and update status, priority, assignee, deadline, and reason. It cannot send
an external marketplace/customer reply. Staff must still copy the reviewed text
and use the verified external channel until a real provider adapter confirms
delivery. The prepared BFF preserves this distinction and never converts a note
into a `sent` message.

The target hybrid model remains compatible: guest and optional-account website
conversations normalize into the same canonical conversation records, while
future Shopee, TikTok Shop, and Lazada adapters retain original channel identity
and provider event IDs. No identity is merged merely because contact text looks
similar.

## Read-only live audit

The connected production catalog confirmed the exact columns used from
`conversations`, `messages`, `conversation_events`, and `user_profiles`. Live
function definitions confirmed:

- `append_internal_message(uuid,text)` writes `internal_only`, records the
  staff actor, and appends an `internal_note_added` event;
- `mark_conversation_read(uuid)` clears unread count for staff;
- `update_conversation_workflow(uuid,text,text,uuid,timestamptz,text)` validates
  status/priority/assignee, requires a reason to resolve or reopen, and appends
  before/after workflow evidence.

## Rollback-only database proof

The shared Admin command foundation plus
`supabase/migrations/20260812_admin_inbox_bff_boundary.sql` compiled together
inside one production transaction ending in `rollback`. The inbox wrapper adds
server-HMAC verification, nonce replay denial, payload-bound durable receipts,
per-actor/action limits, exact command schemas, and minimal results.

A separate query proved all staged objects remained absent afterward:

- `k2_private.admin_command_receipts` absent = `true`;
- `public.execute_admin_inbox_command_v1(...)` absent = `true`;
- `public.execute_admin_fulfillment_command_v1(...)` absent = `true`.

No conversation, message, event, user, or configuration row was changed.

## Local proof

- 22 contract tests passed, including loose-schema rejection and internal-note
  truth.
- Admin production build passed compiled artifact isolation.
- Storefront production build passed and contains no Admin inbox boundary.
- Secret scan passed across 655 files.
- `git diff --check` found no whitespace error; Windows line-ending notices only.

Permanent activation remains blocked by credential containment, MAP-017,
matching server/private Admin HMAC secret configuration, remaining Admin browser
operations, and deployed origin/session/CSRF/AAL2/direct-bypass tests.
