# K2 Jimzon — Known Technical Debt & Open Owner Decisions

This document tracks active technical debt, pending architectural migrations, and business decisions awaiting explicit owner approval in `K2 Jimzon - Brain/OWNER_QUESTIONS.md`.

---

## 🏛️ Gated Owner Decisions (Awaiting Approval)

| Decision ID | Summary | Impacted MAP Item | Current Status |
| :--- | :--- | :--- | :--- |
| **`OWNER-001`** | **Production Domains & DNS**: Custom domain mapping for Storefront (`k2jimzon.ph`) and Admin (`admin.k2jimzon.ph`). | MAP-024 | Queued; local builds pass on default hosts. |
| **`OWNER-002`** | **Reservation Hold Policy**: Default timeout duration for unpaid order reservations (e.g. 24h vs 48h). | MAP-023 | Queued; local default set to 24h. |
| **`OWNER-003`** | **Wholesale Terms & Tiers**: Minimum order quantities (MOQ) and discount percentages per tier. | MAP-023 | Queued; sample tiers configured. |
| **`OWNER-004`** | **Official Contact Channels**: Verification of official WhatsApp / Viber / IG phone numbers for public display. | MAP-023 | Queued; placeholder support numbers disabled. |
| **`OWNER-005`** | **Public-Write Boundary Production Migration**: Authorization to apply prepared DDL hardening to production Supabase. | **MAP-017** | **Prepared & rehearsed on Postgres 17; permanent apply blocked pending owner sign-off.** |
| **`OWNER-006`** | **Customer Data Retention Policy**: Bounded retention period for guest order contact info. | MAP-019 / Runbook | Documented in runbook; awaiting owner review. |

---

## 🛠️ Active Technical Debt & Refactoring Queue

### 1. Production DDL Apply Gate (`MAP-017`)
- **Status**: Exhaustive live schema audit completed (55 findings recorded in `MAP_017_EXHAUSTIVE_AUTHORIZATION_AUDIT_2026-08-22.md`).
- **Remediation**: Hardening migration, preflight, rollback, and idempotent replay pass 100% on isolated PostgreSQL 17.11 loopback (`npm run verify:map017-portable`). Permanent apply to production database is fail-closed pending `OWNER-005`.

### 2. Provider Quotas & Edge Timeouts (`MAP-020`)
- **Status**: All BFF endpoints enforce strict 10s execution timeouts and payload caps (256 KB on webhooks, 4 MB on private photo evidence).
- **Future Improvement**: Add streaming upload support directly to S3/Supabase Storage for multi-gigabyte video evidence if required.

### 3. Marketplace Webhook Live E2E Verification (`MAP-020`)
- **Status**: Shopee webhook ingress function (`supabase/functions/shopee-webhook`) passes unit and boundary contract tests.
- **Next Step**: Connect live Shopee Open Platform test environment once developer credentials are provisioned by owner.
