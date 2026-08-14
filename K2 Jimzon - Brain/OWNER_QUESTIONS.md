# Questions for the K2 Jimzon Owner

## OWNER-001 — Production domain and DNS control

**Needed for:** `MAP-024` custom-domain activation only. Other local and platform
hardening can continue without this answer.

Please confirm:

1. The exact domain K2 will own and use publicly.
2. Who controls the registrar/DNS account and can approve DNS changes.
3. Whether any existing website, email, verification, or business records already
   use that domain and must be preserved.

**Recommendation:** use `www.<domain>` as the canonical storefront host, redirect
the apex `<domain>` to it, and use `admin.<domain>` only for the separate admin
Vercel project. Never point the admin hostname at the storefront project. Inspect
and preserve mail/verification DNS records before changing nameservers.

**Why the owner must answer:** choosing the production brand domain and granting
registrar access is a business ownership decision, not a safe engineering default.

The current case-by-case delivery, customer-resolution, and Pasabuy pricing
practices are recorded in `SYSTEM_BRAIN_CURRENT.md`. Add another question here
only when the owner must make a new business-policy decision that cannot be
answered by the Brain or handled safely as configurable system behavior.

## OWNER-002 — Reservation hold and release policy

**Needed for:** MAP-023 production activation of confirmed-order and wholesale
reservations. Schema, commands, audit, and release/recovery tests can be built
with a configurable duration before this answer.

Please confirm:

1. How long K2 should hold stock after staff confirms a direct/website order but
   before verified payment or another approved completion condition.
2. Whether Pasabuy and wholesale commitments use different hold durations.
3. Who may extend a hold, the maximum extension, and what customer communication
   is required before automatic or manual release.

**Recommendation:** store an explicit deadline on every temporary reservation;
notify staff before expiry; allow only authorized, reasoned extensions; and
release exact lots idempotently when the deadline passes. Never silently keep a
temporary reservation forever.

**Why the owner must answer:** the system can enforce and audit a configurable
policy, but engineering cannot invent how long K2 promises stock to a customer.

## OWNER-003 — Wholesale commercial policy and public response-time claims

**Needed for:** MAP-019/MAP-023 activation of server-authorized wholesale pricing,
terms, reordering, and any promised response time. Secure inquiry and manual
review can remain available without these answers.

Please confirm:

1. Who qualifies for wholesale and what business evidence staff must review.
2. Whether pricing uses approved account price lists, quantity tiers, manual
   quotes, or a controlled combination; include minimum order/case rules.
3. Whether K2 will offer payment terms or credit limits, and who may approve or
   suspend them.
4. Whether K2 wants to publish a response-time promise for retail, Pasabuy, or
   wholesale inquiries. If yes, define the measured business hours and owner.

**Recommendation:** begin with staff-approved organizations, immutable quote or
price-list versions, server-side eligibility, shared-stock revalidation, and no
credit until an explicit limit/approval policy exists. Remove the current
hard-coded 24-hour Pasabuy promise unless K2 adopts and measures it.

**Why the owner must answer:** eligibility, prices, credit risk, minimums, and a
public SLA are commercial promises, not safe engineering defaults.

## OWNER-004 â€” Public phone, Viber, and WhatsApp details

**Needed for:** publishing direct phone-based channels on the storefront Contact
us page. Email, Messenger, Shopee, and secure Website messaging can proceed
without this answer.

Please confirm:

1. The exact public K2 business phone number, including country code.
2. Whether that same number is active for calls, SMS, Viber, and WhatsApp, or
   whether each channel uses a different number.
3. Which of those channels K2 wants customers to use publicly.

**Recommendation:** publish only dedicated business numbers that staff actively
monitor, format them with `+63`, and test every public link from a real phone
before launch.

**Why the owner must answer:** engineering must not invent or expose a private
number, and a configured channel name does not prove the account is monitored.
