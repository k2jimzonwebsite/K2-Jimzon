# K2 Jimzon Authorization Matrix

This is the canonical MAP-017 authorization contract. It records required
behavior; it does not claim every capability is implemented. Active work remains
only in `MASTER_ACTION_PLAN.md`.

## Identity model

| Principal | Authentication and scope | Required database/API boundary |
| --- | --- | --- |
| Anonymous visitor | No personal account | Read the minimal live catalog; submit bounded guest order/Pasabuy requests; validate a coupon without enumerating private campaign data |
| Guest grant | Expiring, revocable, high-entropy grant bound to one record | Read/reply only to the exact guest order, request, or conversation; never use email, phone, URL ID, or sequential ID as ownership proof |
| Customer | Verified Supabase identity | Own profile plus owned/claimed orders, requests, conversations, and evidence; changing a URL/UUID must never cross ownership |
| Staff | Verified Supabase identity with explicit capabilities and assignments | Shared operational data only when capability, hub/assignment, record state, and action allow it |
| Admin | Verified privileged identity | Staff/security configuration and exceptional operations; AAL2, reason, confirmation, and audit required for sensitive actions |
| Edge/connector service | Server-held secret or verified signed webhook | Only its connector inbox/command surface; idempotent writes; no browser delivery and no unrestricted customer-data response |
| Database owner/service secret | Break-glass migration/maintenance only | Never used by storefront/Admin browser code or ordinary operational requests |

The current `user_role` enum has `Admin`, `Staff`, `Customer`, and `VIP`. `VIP`
is a customer commercial label, not a staff authorization role. Keep the coarse
role for login routing, then grant Staff users explicit capabilities rather than
expanding one all-powerful Staff role. Until capability enforcement is live,
current Staff access is transitional and not launch-ready.

## Staff capability codes

| Capability | Allows | Explicitly does not allow |
| --- | --- | --- |
| `catalog.read` | Read product masters, evidence, readiness | Edit or publish |
| `catalog.edit` | Draft/edit product content and media | Publish, stock adjustment, price override |
| `catalog.publish` | Publish/unlist reviewed products | Staff/security management |
| `inventory.read` | Read lots, balances, expiry, custody | Quantity changes |
| `inventory.receive` | Flight/receipt scans and reconciliation | General adjustments or finance |
| `inventory.adjust` | Reasoned quantity/disposition correction | Role, payment, or connector changes |
| `inventory.transfer` | Offered/accepted exact-lot custody transfers | Unattributed bulk movement |
| `orders.manage` | Review/confirm/cancel canonical orders | Verify payment or refund |
| `fulfillment.manage` | Reserve/pick/pack/handover within state rules | Price/payment changes |
| `pasabuy.manage` | Research, communicate, transition requests | Approve owner-only final price unless separately granted |
| `support.manage` | Conversations and customer exception workflow | Payment verification or identity merging |
| `finance.verify` | Verify manual payment evidence and settlement | Change roles, inventory, or credentials |
| `channels.operate` | Listings, connector health, retries, waybills/messages | Read raw secrets or install credentials |
| `staff.manage` | Invite/deactivate staff and assign capabilities | Bypass final-admin or AAL2 safeguards |
| `security.manage` | Credential metadata, incident controls, audit review | Reveal secret values to the browser |
| `audit.read` | Read immutable operational/security audit records | Modify/delete them |

Admin may receive all capability decisions but still cannot bypass state,
ownership, idempotency, audit, or secret-handling rules.

## AAL2 and separation requirements

Require a fresh AAL2 session for staff/capability changes, credential changes,
product deletion, publication, inventory write-off, payment/refund verification,
customer identity merge, security-log export, and destructive bulk actions.
Where practical, the actor who enters payment/refund evidence is not the actor
who verifies it. Every sensitive decision records actor, server time, reason,
record, prior/new value, and request/idempotency context.

## Public and guest contract

Public access is allowlisted, not inferred from an `anon` grant:

- Safe reads: live product/catalog projection, approved public reviews, and
  approved globe/editorial content.
- Safe calls: the current guest order v2 submission, Pasabuy submission, and
  coupon validation only after MAP-020 adds rate limiting and server validation.
- Deprecated `submit_order_request` remains temporarily callable only for
  compatibility evidence and must be removed after the storefront proves v2.
- No public table write is allowed for products, brands, categories, warehouses,
  drafts, inventory, customers, messages, reviews, errors, or operational data.
  Public forms go through a bounded server/RPC command.

## Enforcement order

1. Database grants and RLS deny direct access.
2. RPC/Edge/BFF commands re-check identity, capability, ownership/assignment,
   state, AAL2, input bounds, and idempotency.
3. The Admin/storefront UI hides unavailable actions but is never the security
   boundary.
4. Positive and negative tests impersonate anon, customer A, customer B, each
   staff capability, admin AAL1/AAL2, and the server connector.
