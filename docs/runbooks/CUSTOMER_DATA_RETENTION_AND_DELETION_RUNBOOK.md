# Customer Data Retention and Deletion Runbook

**Status:** Tier 0 documented and source-guarded; production request and erasure
workflows are BLOCKED by `OWNER-006`. No customer deletion endpoint, automated
anonymization job, or completed-deletion claim exists.

## Non-negotiable boundary

Customer deletion must not erase order, payment, quotation, fulfillment,
inventory-reservation, consignment, tax/accounting, security, or dispute truth.
A matching email, phone, name, account, or URL identifier is not sufficient
authority to erase a canonical customer. Requests require verified account
ownership or attributable staff verification, and every decision must be
audited without copying the subject's PII into the audit event.

The current identity migration deliberately uses `ON DELETE RESTRICT` from
customer contact points, account links, channel identities, guest grants, claim
requests, order requests, Pasabuy requests, and conversations to canonical
customers. That protection stays in place. A future implementation must
minimize or anonymize eligible PII while preserving required operational rows;
it must never solve retention by cascading deletion from `customers`.

## Data classes and pending decisions

| Data class | Current handling | Required decision before automation |
| --- | --- | --- |
| Auth identity and optional account link | Provider-managed identity plus restricted canonical link | When provider identity may be deleted versus disabled; reauthentication and appeal/recovery window |
| Email, phone, delivery and channel identifiers | Restricted PII needed for contact and active fulfillment | Retention after last active operation and the irreversible anonymization format |
| Orders, payments, quotes, invoices and fulfillment evidence | Preserved operational/financial truth | Legal, tax, chargeback, warranty and dispute retention periods by record type |
| Pasabuy and Wholesale inquiries | Preserved while active or commercially relevant | Closure period and whether free-form notes/messages are redacted earlier |
| Conversations and messages | Customer-visible history plus protected internal notes | Message retention, legal hold, dispute hold and approved redaction rules |
| Guest grants, claims and security evidence | Revocable capability and bounded audit evidence | Expiry/purge periods and which hashes must remain for abuse/claim defense |
| Backups | Governed by the backup runbook | How an honored deletion propagates through backup expiry and restore procedures |

## Required future workflow

1. Accept a request only through a verified account session or attributable
   staff-assisted identity check. Return `received` only after durable storage.
2. Freeze duplicate processing with a payload-bound idempotency key and one
   canonical request record. Never accept a browser-supplied customer UUID.
3. Classify active operations, financial/legal holds, channel dependencies,
   security evidence and backups. `Unavailable` or uncertain classification is
   not eligibility.
4. Produce an allowlisted plan: revoke access immediately where safe; minimize
   eligible PII; preserve restricted operational truth; record every retained
   category and policy basis. No generic table-name or column-name input.
5. Require Admin+AAL2 approval for irreversible execution, a reason, dry-run
   preview, concurrency lock, bounded batch, and immutable before/after counts.
6. Revoke account and guest access, terminate sessions, execute the approved
   plan transactionally, and return a public request reference—not internal IDs
   or deleted values.
7. Verify customer/account/guest denial and retained operational integrity.
   Record backup expiry implications and provide a truthful completion or
   retained-data response.

## Current customer-facing rule

Until `OWNER-006` is approved and the workflow above passes database, API,
authorization, recovery, and real-host tests, K2 may provide a monitored contact
channel for privacy requests but must not display an in-app `Delete account`
action or claim that a request was recorded, completed, or purged automatically.

