# K2 Jimzon — Audit Action Plan

> **Historical snapshot — not an active plan.** This 25 August audit checklist
> is preserved for provenance and contains superseded counts/states. Execute
> work only from `MASTER_ACTION_PLAN.md`; verify current behavior in
> `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md` and the operations rulebook.

This execution-oriented action plan translates the audit findings into a prioritized, dependency-mapped work checklist.

---

## P0 — Immediate

- [ ] **AUD-001** — Obtain `OWNER-005` recorded authorization and apply `20260812_map017_public_write_boundary_hardening.sql` to close public write exposures on `brands`, `categories`, `warehouses`, `product_drafts`, `products_old`, and enforce `product-images` storage limits.
  - *Dependencies:* `OWNER-005` owner approval.
  - *Verification:* `npm run evidence:map017-anon` returns 14/14 pass.

---

## P1 — Before Further Expansion

- [ ] **AUD-002** — Grant `SELECT` on hardened `v_product_stock_from_batches` to anonymous role to eliminate live storefront HTTP 401 fallback.
  - *Dependencies:* AUD-001.
  - *Verification:* Public query to view returns 200 with batch stock totals.

- [ ] **AUD-006** — Deploy Vercel server environment variables (`K2_ADMIN_BFF_ENABLED=true`, `K2_STOREFRONT_BFF_ENABLED=true`) and activate both BFF routers.
  - *Dependencies:* AUD-001, MAP-018, MAP-019.
  - *Verification:* BFF endpoints respond with 200/404/405/403 rather than direct client bypass.

- [ ] **AUD-007** — Maintain hold on `20260822_catalog_spreadsheet_commit.sql` until Admin BOS UI cutover to `/api/admin/catalog-import/commit` is verified.
  - *Dependencies:* AUD-006.
  - *Verification:* Staff spreadsheet edits route through BFF before table write privileges are revoked.

- [ ] **AUD-013** — Complete production custom domain DNS configuration and update Supabase Auth redirect URLs (`OWNER-001`).
  - *Dependencies:* `OWNER-001` owner decision.
  - *Verification:* HTTPS certificate active and Google OAuth redirects cleanly on custom domain.

- [ ] **AUD-017** — Retire direct browser `error_reports` insertion.
  - *Dependencies:* AUD-001 and the separately authorized MAP-017 production cutover.
  - *Prepared evidence:* the browser reporter already avoids the table; an idempotent migration revokes browser inserts, and a local 100-attempt denial rehearsal retains zero rows.
  - *Verification still required:* permanent live revoke/policy evidence after the named backup/restore gate. No public Storefront telemetry endpoint is introduced.

---

## P2 — Important Improvements

- [ ] **AUD-003** — Implement HTML5 History API URL synchronization for Storefront deep linking and direct page refreshes (`/catalog`, `/product/:sku`, `/pasabuy`, `/checkout`).
  - *Dependencies:* None.
  - *Verification:* Direct navigation and refresh on `/catalog` loads Catalog view.

- [ ] **AUD-004** — Consolidate duplicate product detail views into single canonical component and remove orphaned `ProductDetail.jsx`.
  - *Dependencies:* None.
  - *Verification:* Single canonical product view in `StorefrontApp.jsx` with passing smoke tests.

- [ ] **AUD-005** — Implement IntersectionObserver deferred mounting for Three.js `GlobeSection` on mobile devices.
  - *Dependencies:* None.
  - *Verification:* Initial landing page bundle does not fetch Three.js assets until scrolled into view.

- [ ] **AUD-008** — Maintain explicit schema truth verification (`scripts/schema-truth-core.mjs`) to prevent migration ledger desynchronization.
  - *Dependencies:* None.
  - *Verification:* `npm run audit:schema-truth` passes against live metadata export.

- [ ] **AUD-009** — Add `public/robots.txt` and automated dynamic XML sitemap generation for live catalog products.
  - *Dependencies:* None.
  - *Verification:* Valid `robots.txt` and `sitemap.xml` accessible at root.

- [ ] **AUD-010** — Inject JSON-LD Schema.org `Product` and `Offer` structured data in product detail views.
  - *Dependencies:* None.
  - *Verification:* Google Rich Results test validates structured product metadata.

- [ ] **AUD-014** — Document staff SOP for Admin Delete PIN setup in `Staff & Roles`.
  - *Dependencies:* None.
  - *Verification:* Admin sets PIN and successfully tests product deletion on zero-stock draft.

- [ ] **AUD-015** — Configure automated off-site encrypted database backup schedule with retention policy (`MAP-022`).
  - *Dependencies:* MAP-022.
  - *Verification:* Automated cron backup export verified with local decrypt and restore.

---

## P3 — Cleanup & Optimization

- [ ] **AUD-011** — Modularize `ProductIntakeSessionModal.jsx` (1,147 lines) and `InventoryGrid.jsx` (907 lines) into focused subcomponents under 400 lines.
  - *Dependencies:* None.
  - *Verification:* Component line counts < 400 lines, 100% test pass rate.

- [ ] **AUD-012** — Optimize cold start component mount in `Home.jsx` to eliminate 5-second smoke test timing flakiness.
  - *Dependencies:* None.
  - *Verification:* `npm run test:smoke` passes on first attempt with 0 retries.

- [ ] **AUD-016** — Add secure Edge Function or email notification webhook for incoming wholesale B2B inquiries.
  - *Dependencies:* Transactional email provider credentials.
  - *Verification:* Submitting wholesale form dispatches alert to staff inbox.

---

## P4 — Future Polish

- [ ] **AUD-018** — Add explicit UX copy on order confirmation and guest chat detailing K2's case-by-case direct staff exception workflow.
  - *Dependencies:* None.
  - *Verification:* Copy displayed clearly on confirmation and messaging views.
