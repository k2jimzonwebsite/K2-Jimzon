# K2 Jimzon — Audit Findings Register

> **Historical snapshot — not current system truth or an active backlog.** This
> register is retained as audit provenance. Counts, statuses, and remediations
> may have changed; use `MASTER_ACTION_PLAN.md` and
> `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md` for current authority.

This register assigns a stable identifier to every verified finding from the full project and website audit.

---

## AUD-001 — Live Database Public Write Exposure on Catalog & Legacy Tables

Severity: CRITICAL  
Priority: P0  
Category: Security  
Status: CONFIRMED  
Effort: SMALL  

### Location
Live Supabase PostgreSQL (`brands`, `categories`, `warehouses`, `product_drafts`, `products_old`, `error_reports`, Storage `product-images` bucket)

### Problem
The anonymous PostgreSQL role holds direct `INSERT`, `UPDATE`, `DELETE`, and `TRUNCATE` privileges on catalog and legacy tables with blanket `ALL USING(true)` policies. Additionally, the `product-images` Storage bucket permits public unauthenticated uploads and deletions with null size and MIME limits.

### Why It Matters
Anyone with the public Supabase URL and publishable key can tamper with core catalog tables, modify warehouse metadata, or flood/delete public media objects.

### Recommended Action
Obtain `OWNER-005` authorization and apply the prepared, postflight-validated migration `20260812_map017_public_write_boundary_hardening.sql` which revokes public DML, installs staff-scoped RLS policies, removes `products_old` from Realtime, and enforces 10MB/MIME upload limits.

### Dependencies
`OWNER-005` recorded authorization.

### Verification
Run `npm run evidence:map017-anon` and assert 14/14 checks pass with 0 permitted anonymous writes.

---

## AUD-002 — Live Production Storefront Stock View 401 Permission Denied

Severity: HIGH  
Priority: P1  
Category: Data / Bug  
Status: CONFIRMED  
Effort: SMALL  

### Location
`public.v_product_stock_from_batches` / `src/context/StoreContext.jsx` (lines 199–224)

### Problem
The live database lacks an anonymous `SELECT` grant on `v_product_stock_from_batches`, causing the live storefront to receive HTTP 401 and fall back to the legacy `products.stock_available` column.

### Why It Matters
Customers on the live storefront may see stock numbers that deviate from actual batch-derived physical inventory.

### Recommended Action
Grant `SELECT` on the hardened `v_product_stock_from_batches` security-invoker view to `anon` as part of the MAP-017 hardening migration.

### Dependencies
AUD-001 (MAP-017 migration).

### Verification
Unauthenticated query to `v_product_stock_from_batches` returns HTTP 200 with accurate stock totals.

---

## AUD-003 — Storefront State-Based Routing Lacks URL Synchronization & Deep Linking

Severity: MEDIUM  
Priority: P2  
Category: Architecture / SEO / UX  
Status: CONFIRMED  
Effort: MEDIUM  

### Location
`src/StorefrontApp.jsx`, `src/context/StoreContext.jsx` (`go()`, `openProduct()`, `setView()`)

### Problem
Storefront navigation operates purely via in-memory React state (`view`, `productId`) without updating browser history (`pushState`) or matching URL paths (`/catalog`, `/product/:sku`, `/pasabuy`, `/checkout`).

### Why It Matters
Refreshing the browser on a product page or checkout resets the user back to `home`. Deep links to products cannot be shared on social media/chat, and search engine crawlers cannot crawl distinct page paths.

### Recommended Action
Implement URL pathname/query-state synchronization using native HTML5 History API (`history.pushState` / `popstate` listener) or lightweight router integration that maps URLs to storefront views while maintaining multi-target build compatibility.

### Dependencies
None.

### Verification
Navigating to `/catalog` or `/product/KM-NUTELLA-304` directly loads that view; refreshing preserves the current view.

---

## AUD-004 — Dual Competing Product Detail Components (`ProductDetail.jsx` vs `MasterProduct.jsx`)

Severity: MEDIUM  
Priority: P2  
Category: Architecture / Technical Debt  
Status: CONFIRMED  
Effort: SMALL  

### Location
`src/views/ProductDetail.jsx`, `src/views/MasterProduct.jsx`, `src/StorefrontApp.jsx`

### Problem
`StorefrontApp.jsx` lazy-loads both `ProductDetail` (key `product`) and `MasterProduct` (key `master_product`). `StoreContext.openProduct()` points exclusively to `master_product`, leaving `ProductDetail.jsx` as an orphaned/legacy predecessor.

### Why It Matters
Increases bundle size, creates developer confusion regarding where product detail UI changes belong, and risks regression if legacy routes reference `ProductDetail`.

### Recommended Action
Consolidate all product detail logic into `MasterProduct.jsx` (or rename to canonical `ProductDetail.jsx`) and remove the redundant view.

### Dependencies
None.

### Verification
Single canonical product view in `StorefrontApp.jsx` passing all product smoke tests.

---

## AUD-005 — Heavy 3D Three.js Globe Section Chunk (>900 kB) Loaded in Storefront Initial Chunks

Severity: MEDIUM  
Priority: P2  
Category: Performance  
Status: CONFIRMED  
Effort: SMALL  

### Location
`src/components/home/GlobeSection.jsx`, `src/views/Home.jsx`

### Problem
The Three.js globe bundle is 903.44 kB (gzip: 244.43 kB). While `GlobeSection` is lazy-loaded, on landing page load it begins downloading immediately because `Home.jsx` renders it directly.

### Why It Matters
On slower mobile 3G/4G connections in the Philippines, initial page interactivity and Largest Contentful Paint (LCP) can be delayed by heavy Three.js assets.

### Recommended Action
Implement IntersectionObserver / deferred mounting for `GlobeSection` so Three.js loads only when the user scrolls near the globe viewport.

### Dependencies
None.

### Verification
Initial bundle request on home landing does not download Three.js until scrolled into view; lighthouse performance score improved.

---

## AUD-006 — Inactive BFF Feature Flags on Production Hosts

Severity: HIGH  
Priority: P1  
Category: Architecture / Security  
Status: CONFIRMED  
Effort: MEDIUM  

### Location
`api/admin/index.js`, `api/storefront/index.js`, `server/admin-bff/router.js`, `server/storefront-bff/router.js`

### Problem
The 68 Admin BFF endpoints and 13 Storefront BFF endpoints exist and pass all 179 contract tests, but remain doubly disabled on Vercel (`K2_ADMIN_BFF_ENABLED=false`, `K2_STOREFRONT_BFF_ENABLED=false`). Production currently operates in transitional direct-client mode.

### Why It Matters
Direct Supabase client calls in the browser lack the server-side CSRF, rate-limiting, Turnstile verification, and cookie-based session isolation that the BFF provides.

### Recommended Action
Complete MAP-018, MAP-019, and MAP-020 dependencies, deploy the Vercel server environment variables, and activate both BFF routers.

### Dependencies
AUD-001 (MAP-017), MAP-018, MAP-019.

### Verification
Both BFF routers respond to signed POST/GET requests and return 404/405/403 on invalid requests.

---

## AUD-007 — Migration Cutover Hazard in `20260822_catalog_spreadsheet_commit.sql`

Severity: HIGH  
Priority: P1  
Category: Bug / Migration Hazard  
Status: CONFIRMED  
Effort: SMALL  

### Location
`supabase/migrations/20260822_catalog_spreadsheet_commit.sql` (Line 398: `revoke insert,update,delete on table public.products from authenticated`)

### Problem
Applying this migration prematurely will revoke direct table write access from authenticated staff while three Admin views (`InventoryGrid.jsx`, `Sheet.jsx`, `SmartPasteModal.jsx`) still write `public.products` directly via Supabase client when BFF is disabled.

### Why It Matters
If applied before the Admin BFF is activated, staff will immediately experience broken product creation, editing, and CSV pasting.

### Recommended Action
Hold application of `20260822_catalog_spreadsheet_commit.sql` until Admin BFF cutover is deployed and verified in production.

### Dependencies
AUD-006 (Admin BFF activation).

### Verification
Admin BOS product edits successfully route through `/api/admin/catalog-import/commit` before revoking direct table privileges.

---

## AUD-008 — Migration Ledger Out of Sync with Live Database Catalog

Severity: MEDIUM  
Priority: P2  
Category: Data / DevOps  
Status: CONFIRMED  
Effort: MEDIUM  

### Location
`supabase/migrations/`, `supabase_migrations.schema_migrations` table

### Problem
Repository contains 60+ migration files while the live database ledger only contains 5 entries. 87 live tables exist that are not mapped in the ledger. Running `supabase db push` blindly would cause migration collisions and syntax errors.

### Why It Matters
Standard automated migration tooling cannot determine what has been applied versus what is pending.

### Recommended Action
Maintain explicit, dated additive migrations and use targeted migration rehearsal scripts (`npm run rehearse:map017-local`, etc.) rather than bulk `supabase db push`.

### Dependencies
None.

### Verification
`scripts/schema-truth-core.mjs` validates schema consistency against live export.

---

## AUD-009 — Missing Storefront Robots.txt and Dynamic XML Sitemap

Severity: LOW  
Priority: P2  
Category: SEO  
Status: CONFIRMED  
Effort: SMALL  

### Location
`public/`, `public/robots.txt`, `public/sitemap.xml`

### Problem
`vercel.admin.json` sets `X-Robots-Tag: noindex, nofollow` correctly, but the public Storefront lacks an explicit `robots.txt` and dynamic `sitemap.xml` mapping catalog products.

### Why It Matters
Search engine crawlers (Google, Bing) cannot efficiently discover all live product SKUs or understand crawling boundaries.

### Recommended Action
Create `public/robots.txt` with appropriate `Allow: /` and `Disallow: /admin-portal-k2-secure`, plus an automated `sitemap.xml` generator script.

### Dependencies
None.

### Verification
`robots.txt` and `sitemap.xml` accessible at root with valid XML schema.

---

## AUD-010 — Missing JSON-LD Schema.org Product Structured Data on Storefront

Severity: LOW  
Priority: P2  
Category: SEO  
Status: CONFIRMED  
Effort: SMALL  

### Location
`src/views/MasterProduct.jsx`, `src/views/ProductDetail.jsx`

### Problem
Product pages display rich product data (name, brand, SRP, description, country of origin, net weight, ingredients), but do not inject JSON-LD `<script type="application/ld+json">` for Schema.org `Product` and `Offer`.

### Why It Matters
Search engines cannot parse rich snippets, prices, availability, and brand facts for search results.

### Recommended Action
Add JSON-LD structured data injection in `MasterProduct.jsx` containing name, description, image, sku, brand, offers (price, currency PHP, availability FEFO).

### Dependencies
None.

### Verification
Google Rich Results test passes on rendered product pages.

---

## AUD-011 — Large Monolithic Admin Components

Severity: LOW  
Priority: P3  
Category: Code Quality / Maintainability  
Status: CONFIRMED  
Effort: MEDIUM  

### Location
`src/views/admin/ProductIntakeSessionModal.jsx` (1,147 lines), `src/views/admin/InventoryGrid.jsx` (907 lines)

### Problem
These components exceed the 800-line guideline and combine state management, camera scanning, upload dropzones, AI JSON parsing, validation, and table rendering in single files.

### Why It Matters
High cognitive load for maintenance, higher probability of unintended side effects during modifications.

### Recommended Action
Decompose `ProductIntakeSessionModal.jsx` into smaller subcomponents (`IntakeCameraStep`, `IntakeEvidenceStep`, `IntakeAiReviewStep`, `IntakeInventoryHandoff`) and extract table logic from `InventoryGrid.jsx`.

### Dependencies
None.

### Verification
All components under 400 lines while retaining 100% test pass rate.

---

## AUD-012 — Smoke Test Slow First Render Timeout (5s) on Consignment Section

Severity: LOW  
Priority: P3  
Category: Performance / Testing  
Status: CONFIRMED  
Effort: SMALL  

### Location
`tests/smoke.spec.js` (lines 35–44)

### Problem
Tests pass on retry but occasionally fail on initial 5s timeout waiting for "The latest consignment" heading due to slow initial hydration and asset loading.

### Why It Matters
Indicates initial render time on cold starts can exceed 3-4 seconds, impacting user perception and test flakiness.

### Recommended Action
Optimize initial component mount in `Home.jsx` and defer non-critical visual decorations.

### Dependencies
None.

### Verification
`npm run test:smoke` passes on first attempt with 0 retries in under 30s.

---

## AUD-013 — Missing Production Custom Domain Configuration (`OWNER-001`)

Severity: HIGH  
Priority: P1  
Category: Architecture / Deployment  
Status: CONFIRMED  
Effort: SMALL  

### Location
Vercel DNS / Domain settings (`docs/DEPLOYMENT.md`, `K2 Jimzon - Brain/OWNER_QUESTIONS.md`)

### Problem
Storefront and Admin BOS currently reside on Vercel preview/default subdomains (`k2-jimzon-admin-seven.vercel.app`). Custom production domains (e.g. `k2jimzon.com` / `admin.k2jimzon.com`) are not yet linked.

### Why It Matters
Production launch and brand trustworthiness require custom HTTPS domains, and Supabase OAuth callback URLs must be finalized.

### Recommended Action
Obtain owner domain decision (`OWNER-001`), configure DNS records (CNAME/A records), and update Supabase Auth redirect URL allowlist.

### Dependencies
`OWNER-001` owner decision.

### Verification
HTTPS access on custom domains with valid SSL certificates.

---

## AUD-014 — Admin Delete PINs Not Yet Configured in Live Schema

Severity: LOW  
Priority: P2  
Category: Security / Operational Readiness  
Status: CONFIRMED  
Effort: SMALL  

### Location
`k2_private.staff_delete_credentials`, `src/views/admin/DeleteProductsModal.jsx`

### Problem
`delete_products_with_pin_v2` is deployed and active, but the live table currently has zero configured PINs. Any attempt to delete a product fails closed.

### Why It Matters
Admins cannot delete erroneous/test products until they set up their Delete PIN in Staff & Roles.

### Recommended Action
Document in Admin SOP that Admins must first set a 6-digit Delete PIN in `Staff & Roles` before executing product deletions.

### Dependencies
None.

### Verification
Admin sets PIN, and `delete_products_with_pin_v2` successfully validates PIN and deletes an eligible zero-stock test product.

---

## AUD-015 — Missing Automated Periodic Database Backup Schedule (`MAP-022`)

Severity: MEDIUM  
Priority: P2  
Category: Security / Observability  
Status: CONFIRMED  
Effort: MEDIUM  

### Location
`DATABASE_BACKUP_AND_RESTORE_RUNBOOK.md`, `scripts/rehearse-database-backup-restore.mjs`

### Problem
Backup encryption and restore logic (`rehearse-database-backup-restore.mjs`) is implemented and tested locally (pg_dump -> AES-256-GCM -> pg_restore), but there is no automated recurring cron or external storage destination configured for production backups.

### Why It Matters
If a disaster occurs on the managed database, recovery relies solely on Supabase point-in-time recovery without an independent off-site encrypted backup.

### Recommended Action
Configure automated off-site encrypted database backup export script on a secure scheduled runner with retention policy.

### Dependencies
MAP-022.

### Verification
Automated test restore from scheduled backup artifact in isolated environment.

---

## AUD-016 — Wholesale Intake Lacks Automated Email Notification to Staff

Severity: LOW  
Priority: P3  
Category: Functional / Integration  
Status: CONFIRMED  
Effort: SMALL  

### Location
`src/views/Wholesale.jsx`, `prepared-api/storefront/wholesale-inquiry.js`

### Problem
Wholesale inquiry captures structured business data into `wholesale_inquiries` table, but staff must manually check the Admin Customers/Inquiries section; no automated webhook/email notification alerts staff of new B2B leads.

### Why It Matters
Potential delay in responding to high-value wholesale accounts.

### Recommended Action
Add a secure Edge Function trigger or transactional email notification (via Resend/SendGrid) when a new wholesale inquiry is submitted.

### Dependencies
External email provider credentials.

### Verification
Submitting wholesale inquiry triggers alert to configured staff email.

---

## AUD-017 — Anonymous Insertion to `error_reports` Unbounded on Live Database

Severity: MEDIUM  
Priority: P1  
Category: Security  
Status: CONFIRMED  
Effort: SMALL  

### Location
`error_reports` table / `20260724_error_reports.sql`

### Problem
The live `error_reports` table permits anonymous `INSERT` without rate limiting or Turnstile verification.

### Why It Matters
A malicious actor could flood `error_reports` with junk data, exhausting database table storage.

### Recommended Action
Retire the unused direct browser insert boundary. Admin errors already emit only
fixed classifications through the protected Admin BFF; Storefront failures stay
redacted/local unless a separately justified, challenged and rate-bounded server
intake is approved. Apply the prepared MAP-017 revoke/policy migration only in
the backup-gated coordinated cutover.

### Dependencies
AUD-001 (MAP-017).

### Verification
Locally, the prepared migration applies and replays successfully; 100 direct
anonymous attempts and 100 direct authenticated attempts retain zero rows. The
same rollback-only behavior test proves staff-authenticated reads remain allowed
and authenticated non-staff reads remain hidden. Production remains unremediated
until a separately backup-gated application and live privilege/policy inspection
prove the revoke.

---

## AUD-018 — Lack of User-Facing Order Cancellation/Return Self-Service (By Design)

Severity: INFO  
Priority: P4  
Category: Documentation / UX  
Status: CONFIRMED  
Effort: SMALL  

### Location
`K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md` (Section 15), `src/views/GuestMessages.jsx`

### Problem
K2 does not provide automated self-service returns/cancellations; all exceptions are handled via direct staff-customer conversation.

### Why It Matters
Users expecting Amazon-style 1-click returns might be confused without explicit UX guidance.

### Recommended Action
Add explicit UX copy in order confirmation and guest chat clarifying that all changes and questions are handled directly with our team via messaging.

### Dependencies
None.

### Verification
Clear copy visible on order confirmation and guest conversation screen.
