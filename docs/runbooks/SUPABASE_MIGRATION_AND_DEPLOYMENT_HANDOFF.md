# K2 Jimzon — Supabase Remote Migration & Vercel Deployment Handoff Runbook

**Audience:** Secondary AI agent, system administrator, or developer executing remote Supabase database migrations and verifying production Vercel deployments.  
**Created:** 16 September 2026  
**Governing Rule:** `AGENTS.md` and `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md`. Zero unverified claims; all migrations must have preflight checks, idempotent replay capability, postflight verification, and rollback scripts.

---

## 1. Account Routing & Authority Matrix

| Layer | Environment | Account / Identity | Authority & Action |
|---|---|---|---|
| **Database** | Supabase Production | `k2jimzonwebsite@gmail.com` | **Remote SQL Execution:** Run SQL migrations in Supabase SQL Editor or via Supabase CLI. Never run using developer personal accounts. |
| **Code / VCS** | GitHub Repository | `k2jimzonwebsite/K2-Jimzon` (dev: `jerzelguerra26@gmail.com`) | **Code Push:** Developer commits and pushes verified changes to `main` on GitHub. |
| **Hosting** | Vercel Production | Git-linked to `main` | **Automatic CI / CD:** Deploys separate production artifacts for Storefront (`www.k2jimzon.com`) and Admin BOS (`admin.k2jimzon.com`). |

> [!NOTE]
> **Owner-Authorized Production Database Execution (16 September 2026):** Per explicit owner instruction in session, the primary assistant connected directly to production Supabase (`pixplcjqivlfflickobf`) via the Supabase Management API. Migrations adding `order_requests.payment_evidence jsonb` and upgrading `public.submit_order_request_v2` to support `('Live', 'Active', 'Unlisted')` and upfront automated shipping quotation parameters (`p_shipping_amount`, `p_shipping_quote_status`) were executed, verified with live dry run `WEB-D48394A695`, and are permanently active in production.

---

## 2. Order of Operations

Follow this exact sequence to ensure zero-downtime and state consistency:

```
[1. Preflight Check] ──> [2. Apply Supabase Migrations in Order] ──> [3. Verify Database Objects]
                                                                            │
[5. Post-Deploy Sanity Checks] <── [4. User Pushes to GitHub (Vercel CI)] <───┘
```

---

## 3. Supabase Remote Migration Sequence

Execute the following migrations **in this exact sequence** via the Supabase SQL Editor (logged into `k2jimzonwebsite@gmail.com`):

### Migration 1: Confirmation Stock Commitment
- **File:** `supabase/migrations/20260912_confirmation_stock_commitment.sql`
- **Purpose:** MAP-023 / I-001: First confirmation deducts owned stock once while preserving physical custody. Adds `committed_at` and `commit_cause` columns and creates `commit_order_request_stock_v1`.
- **Preflight Check (run before applying):**
  ```sql
  select column_name from information_schema.columns 
  where table_name = 'inventory_reservations' and column_name in ('committed_at', 'commit_cause');
  ```
- **Execution:** Copy and run the complete contents of `supabase/migrations/20260912_confirmation_stock_commitment.sql`.
- **Postflight Verification:**
  ```sql
  select to_regprocedure('public.commit_order_request_stock_v1(uuid,text,text)');
  ```
- **Rollback (if needed):**
  - Use `supabase/confirmation_stock_commitment_rollback.sql`.

---

### Migration 2: Guest Order Conversation Seed
- **File:** `supabase/migrations/20260912_guest_order_conversation_seed.sql`
- **Purpose:** MAP-019 / Queue Item 11: Seeds an initial unread message referencing the order upon guest order/pasabuy submission so the customer and staff never encounter an empty conversation thread.
- **Preflight Check:**
  ```sql
  select to_regprocedure('public.submit_guest_order_v1(bigint,uuid,text,text,text,text)');
  ```
- **Execution:** Copy and run the complete contents of `supabase/migrations/20260912_guest_order_conversation_seed.sql`.
- **Postflight Verification:**
  ```sql
  select proname, prosrc from pg_proc where proname = 'submit_guest_order_v1' and prosrc like '%guest-order-seed:%';
  ```

---

### Migration 3: Payment & Handover Commitment Lifecycle
- **File:** `supabase/migrations/20260913_payment_handover_commitment.sql`
- **Purpose:** Composes signed payment verification, confirmation, packing lot allocation, handover, and refund reconciliation to maintain atomic stock balances across all order lifecycle states.
- **Preflight Check:**
  ```sql
  select to_regprocedure('public.set_order_request_payment_status(uuid,text,text)');
  ```
- **Execution:** Copy and run the complete contents of `supabase/migrations/20260913_payment_handover_commitment.sql`.
- **Postflight Verification:**
  ```sql
  select proname from pg_proc where proname in ('set_order_request_payment_status', 'fulfill_order_request');
  ```

---

### Migration 4: Structured Manual Payment Evidence Record
- **File:** `supabase/migrations/20260916_structured_payment_evidence.sql`
- **Purpose:** AUD-OPS-001 / MAP-023 §16: Adds `payment_evidence jsonb` to `order_requests`. Enforces validation on payment method (`gcash`, `bank_transfer`, `maya`, `cash`, `other`), amount, reference, and strict separation of duties (verifier $\ne$ submitter).
- **Preflight Check:**
  ```sql
  select column_name from information_schema.columns 
  where table_name = 'order_requests' and column_name = 'payment_evidence';
  ```
  *(Expected: empty before applying)*
- **Execution:** Copy and run the complete contents of `supabase/migrations/20260916_structured_payment_evidence.sql`.
- **Postflight Verification:**
  ```sql
  select column_name, data_type from information_schema.columns 
  where table_name = 'order_requests' and column_name = 'payment_evidence';
  ```
  *(Expected: 1 row returned with data_type `jsonb`)*

---

### Migration 5: Allow 'Unlisted' Products Ordering (Queue Item 12) — APPLIED TO SUPABASE PRODUCTION
- **File:** `supabase/migrations/20260916_allow_unlisted_product_orders.sql`
- **Purpose:** MAP-023 Queue Item 12: Honours documented meaning of `Unlisted` products ("Hidden from browse — direct link still works"). Updates `submit_order_request_v2` allowlist to `('Live', 'Active', 'Unlisted')`.
- **Status:** **Permanently applied and verified on production Supabase (`pixplcjqivlfflickobf`) on 16 September 2026.** Verified via `pg_proc` check showing `v_product.product_status not in ('Live', 'Active', 'Unlisted')`.
- **Rollback (if needed):**
  - Run `supabase/migrations/20260916_allow_unlisted_product_orders_rollback.sql`.

---

### Migration 6: Automated Delivery Quotation in Order Submission (IDEA-20260916-01) — APPLIED TO SUPABASE PRODUCTION
- **Files:** `supabase/migrations/20260916_automated_delivery_quotation.sql` & production DDL update to `submit_order_request_v2`
- **Purpose:** MAP-023 / MAP-018: Automates Shopee/Lazada-style delivery quotation recording on checkout submission. Updates `submit_order_request_v2` with `(p_shipping_amount, p_shipping_quote_status)`, records `shipping_amount`, sets `shipping_quote_status = 'customer_confirmed'`, sets `delivery_status = 'ready_to_pack'`, timestamps `customer_delivery_confirmed_at = now()`, and includes the shipping fee in `total_amount = subtotal - discount + shipping_amount`.
- **Status:** **Permanently applied and verified on production Supabase (`pixplcjqivlfflickobf`) on 16 September 2026.** Verified via live dry-run test order `WEB-D48394A695` returning `subtotal: 499`, `shipping_amount: 95`, `total_amount: 594`, `delivery_status: ready_to_pack`. Companion `submit_guest_order_v1` migration script remains prepared for guest BFF serverless cutover.
- **Rollback (if needed):**
  - Run `supabase/migrations/20260916_automated_delivery_quotation_rollback.sql`.

---

## 4. GitHub Push & Vercel CI / CD Process

1. **Local Developer Commit & Push:**
   - The user (`jerzelguerra26`) commits all local repository changes:
     ```powershell
     git add -A
     git commit -m "feat(ops): allow unlisted product direct orders, structured payment evidence, and AI prompt studio"
     git push origin main
     ```
2. **GitHub Actions CI:**
   - Verify that the GitHub Actions run triggers and passes:
     - Dependency audit (`npm audit`)
     - Prebuild integrity & secret scan (`npm run prebuild`)
     - Contract tests (`npm run test:contracts`)
     - Isolated Admin build (`npm run build:admin`)
     - Isolated Storefront build (`npm run build:storefront`)
3. **Vercel Automatic Deployments:**
   - Vercel automatically builds and deploys both projects:
     - **Storefront Project:** linked to `https://www.k2jimzon.com`
     - **Admin BOS Project:** linked to `https://admin.k2jimzon.com`

---

## 5. Post-Deployment Verification Checklist

Run these operational checks on the live domains:

### Storefront Checks (`https://www.k2jimzon.com`)
1. **Homepage & Catalog:**
   - Navigate to `https://www.k2jimzon.com/` and `https://www.k2jimzon.com/store`.
   - Confirm HTTP 200 and that provisions render without horizontal overflow on mobile ($375$px - $390$px) and desktop.
2. **Unlisted Product Direct Link Ordering Test:**
   - Navigate directly to an unlisted product URL: `https://www.k2jimzon.com/product/<unlisted-sku>`.
   - Confirm the product details load.
   - Add to cart and proceed to checkout.
   - Verify that order submission succeeds and does **not** return `ORDER_SERVICE_UNAVAILABLE`.
   - Confirm that the unlisted product does **not** appear in the general `/store` browse list.

### Admin BOS Checks (`https://admin.k2jimzon.com`)
1. **Guarded Portal Sign-In:**
   - Navigate to `https://admin.k2jimzon.com/admin-portal-k2-secure`.
   - Confirm HTTP 200 and that the invite-only staff authentication boundary renders.
2. **Operations Hub & Master Workflow Graph:**
   - Sign in with authorized staff credentials.
   - Check `OmniOperationsHub` -> Payment Status update modal:
     - Verify structured payment evidence fields (method, amount, payer, reference, proof URL).
   - Check `MasterWorkflowGraph`:
     - Verify that the AI Prompt Studio card renders with category pills and copy actions.

---

## 6. Emergency Recovery & Rollback Contact

If any migration fails or raises an unhandled exception:
1. **Immediate Action:** Stop migration execution. Do not proceed to subsequent migrations.
2. **Execute Scoped Rollback:** Run the corresponding `*_rollback.sql` script in Supabase SQL Editor.
3. **Vercel Rollback:** If Vercel deployment fails, use Vercel Dashboard to redeploy the previous known-good deployment SHA (`6ad7578235c8a6b16ce42b947028f090f1ae1eb1`).
