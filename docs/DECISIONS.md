# K2 Jimzon — Architecture Decision Records (ADRs)

This document records the foundational architectural decisions, rationale, and consequences governing the K2 Jimzon platform.

---

## ADR-001: Separate Production Deployments for Storefront and Admin BOS

- **Date**: 2026-08-11
- **Status**: Accepted & Implemented
- **Context**: The application serves two entirely distinct user classes: public retail buyers and internal warehouse/procurement staff. Deploying them as a single monolithic bundle risks leaking administrative route structures, staff UI logic, and internal API shapes to public crawlers and attackers.
- **Decision**: Compile and deploy Storefront and Admin BOS as two completely separate Vercel projects and production bundles (`build:storefront` and `build:admin`). Enforce strict bundle isolation via `scripts/verify-build-boundary.mjs`.
- **Consequences**: Storefront bundles are completely devoid of Admin code. Staff tools can evolve rapidly without touching storefront bundle sizes or SEO assets.

---

## ADR-002: Backend-For-Frontend (BFF) Architecture with Serverless Function Consolidation

- **Date**: 2026-08-12
- **Status**: Accepted & Implemented
- **Context**: Directly allowing browser clients to perform multi-table mutations or call broad Supabase REST endpoints creates RLS policy bloat and exposes sensitive database table structures. Furthermore, Vercel free/pro tiers limit individual serverless function counts.
- **Decision**: Implement two consolidated BFF routers (`api/admin/index.js` routing 68 endpoints, `api/storefront/index.js` routing 13 endpoints). All business logic, CSRF validation, rate limiting, and audit logging happen inside the BFF before invoking database RPCs.
- **Consequences**: Serverless deployment stays well under Vercel function quotas. Client code only talks to clean, predictable `/api/*` routes.

---

## ADR-003: Scoped HttpOnly Guest Grant Cookies for Passwordless Commerce

- **Date**: 2026-08-14
- **Status**: Accepted & Implemented
- **Context**: Requiring customers to create accounts with passwords before placing orders or submitting Pasabuy requests creates massive conversion friction. However, allowing unrestricted access to order status or chat threads invites IDOR and enumeration attacks.
- **Decision**: Issue an encrypted, scoped `k2_guest_grant` `HttpOnly` cookie upon order creation. This cookie grants read and reply access *only* to that specific order ID and conversation thread.
- **Consequences**: Customers get instant guest checkout without passwords; orders and chats remain cryptographically protected from tampering or eavesdropping.

---

## ADR-004: Derived Batch Inventory (FEFO) over Direct Stock Cell Editing

- **Date**: 2026-08-15
- **Status**: Accepted & Implemented
- **Context**: In traditional e-commerce, stock is a mutable integer column on a product row. In direct Italian import operations, stock consists of distinct physical batches with varying flight origins, arrival dates, and expiration dates. Mutating a raw stock number leads to phantom inventory and expired shipments.
- **Decision**: Available stock is strictly derived via SQL view `v_product_stock_from_batches` from active, non-expired, unreserved batches in `product_batches`.
- **Consequences**: Stock numbers can never drift from physical reality. FEFO order reservation happens automatically.

---

## ADR-005: Database-Enforced Domain-Separated Rate Limiting

- **Date**: 2026-08-20
- **Status**: Accepted & Implemented
- **Context**: In-memory rate limiting fails across distributed serverless functions. Storing raw IP addresses or plain emails in rate-limit tables creates privacy liabilities and leaks customer contact data.
- **Decision**: Implement rate limiting in `k2_private.rate_limit_buckets` using rotating HMAC-SHA256 subject hashes separated by domain (e.g. `order-ip`, `auth-email`, `recovery-phone`).
- **Consequences**: Rate limits are synchronized globally across all serverless instances with zero plaintext PII stored in rate-limit tables.

---

## ADR-006: Server-Generated Deterministic Product SKUs

- **Date**: 2026-08-21
- **Status**: Accepted & Implemented
- **Context**: Allowing client apps or AI prompts to suggest product SKUs causes duplicate SKUs, broken barcodes, and catalog fragmentation.
- **Decision**: SKUs are generated exclusively on the server by `k2_private.generate_product_sku()` based on brand, category, volume, and variant attributes.
- **Consequences**: SKUs are stable, collision-free, and immutable.

---

## ADR-007: Mandatory AAL2 Multi-Factor Authentication for Staff Operations

- **Date**: 2026-08-22
- **Status**: Accepted & Implemented
- **Context**: Compromised staff passwords could allow attackers to manipulate pricing, drain inventory, or tamper with customer orders.
- **Decision**: Require TOTP MFA for all staff accounts, and enforce Authenticator Assurance Level 2 (AAL2) step-up verification for high-risk operations (inviting staff, MFA resets, clearance approvals, lot reconciliations).
- **Consequences**: High-privilege actions are safeguarded even in the event of password exposure.

---

## ADR-008: Operations Guide Navigates; Canonical Workflows Record Completion

- **Date**: 2026-08-31
- **Status**: Accepted; implementation pending in MAP-023
- **Context**: Staff need outcome-based, step-by-step help that names the exact
  screen, control, input, external tool, expected result, and recovery action.
  The existing guide retrieves procedure text and opens a broad Admin section,
  but making it store operational progress would create a second completion
  truth that could disagree with products, lots, orders, payments, files, and
  provider receipts.
- **Considered options**: (1) extend the single versioned procedure registry and
  derive completion from the owning workflow; (2) duplicate instructions inside
  every Admin page; or (3) let the guide store its own operational progress.
  Page duplication risks copy/target drift, while guide-owned progress can claim
  completion without canonical evidence.
- **Decision**: Extend the existing registry with plain-language outcomes and
  structured steps linked to stable, visibly labelled Admin controls. The guide
  may navigate, focus, explain, and copy an approved customer-free prompt, but
  it never submits a mutation or marks work complete. Only bounded canonical
  records, events, files, provider receipts, or owning-workflow read models can
  show `Verified by workflow`; local guide state remains rehearsal/navigation.
  External tools remain explicit manual handoffs whose returned output must be
  validated and human reviewed inside K2.
- **Consequences**: Staff get one phone-safe source of instruction without a
  parallel ledger. Missing or renamed controls become acceptance failures.
  Product Content/Image Studio and other external steps stay honest and
  recoverable. Implementation requires structured step contracts, a real-control
  target registry, bounded completion readers where available, and representative
  phone/laptop recovery testing before guide approval.
