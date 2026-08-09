# K2 Jimzon multi-channel commerce operations

K2 Jimzon is a React/Vite storefront and operations dashboard for five income channels:

- K2 Jimzon Website
- Shopee
- TikTok Shop
- Lazada
- Italy-to-Philippines Pasabuy

The website and Pasabuy intake can operate before marketplace connectors, a custom domain, or an online payment provider are available. Shopee, TikTok Shop, and Lazada remain explicit catalog/listing channels in the admin, but must stay **Not connected** until their back-end connectors process real data.

## Required reading before changing operational logic

Follow [`K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md`](K2%20Jimzon%20-%20Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md) for required workflow behavior, invariants, state transitions, and implementation order. Use [`K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md`](K2%20Jimzon%20-%20Brain/SYSTEM_BRAIN_CURRENT.md) to determine what is actually implemented today. A rulebook target must not be described as live until it is verified and added to the current-state Brain.

## Current launch behavior

- Checkout creates an **order request**. It does not collect payment or reserve stock.
- Staff confirms an order request through a server-side workflow before stock is reserved.
- Pasabuy creates a persistent request with a customer reference.
- Pasabuy quotes are versioned and store the FX source, capture time, freight assumptions, estimated taxes, handling, landed cost, margin, final price, and validity.
- Supabase Auth identifies staff. PostgreSQL RLS and server functions enforce access; a hidden URL or browser flag is never treated as authorization.
- Marketplace credentials belong only in server-side function secrets. The browser has no credential vault.

## Local setup

```bash
npm install
npm run dev
```

`npm run dev` keeps the combined local workspace for development and automated
tests only. The deployable targets can be run independently:

```bash
npm run dev:storefront
npm run dev:admin
```

Required public client variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Never add a Supabase service-role key or marketplace secret to a `VITE_` variable.

Storefront: `http://localhost:5173/`

Admin: `http://localhost:5174/`

## Separate production deployments

The storefront and admin are two different production artifacts built from the
same reviewed source repository. They must remain separate Vercel projects:

| Vercel project | Environment variable | Artifact |
| --- | --- | --- |
| Storefront | `K2_DEPLOYMENT_TARGET=storefront` | Shopper views only |
| Admin | `K2_DEPLOYMENT_TARGET=admin` | Operations views only |

Both projects may use `npm run build`; the non-public build flag selects the
correct entry. `VITE_IS_ADMIN_DEPLOYMENT=true` remains accepted temporarily for
the existing admin project, but `K2_DEPLOYMENT_TARGET=admin` is the canonical
setting. Existing Vercel project URLs containing `admin` are also recognized as
a safe compatibility fallback. Never configure the admin target on the
storefront project.

The build emits a manifest and fails verification if admin views enter the
storefront artifact or shopper views enter the admin artifact. Supabase Auth,
staff roles, and RLS remain the actual authorization boundary; deployment
separation is an additional layer, not a replacement for database security.

## Database setup

For the existing K2 Supabase project, apply only the consolidated launch migration:

```text
supabase/migrations/20260803_launch_core_stabilization.sql
```

That migration creates the order-request, inventory-balance, Pasabuy, quote-version, event-history, channel-readiness, and tightened RLS contracts used by the current UI.

The three `20260802_*_compatibility_preflight.sql` files were recovery helpers for the earlier failed attempts. Their compatibility work is now included in the consolidated migration, so do not run them again.

After the launch-core migration succeeds, Phase 2 unified-inbox operations are activated with one additional verified migration:

```text
supabase/migrations/20260803_phase_2_unified_inbox.sql
```

Phase 2 adds internal inbox workflow, delivery-state truth, and routes real persisted Pasabuy submissions into the queue. It does not connect WhatsApp, Viber, Meta, Shopee, Lazada, or TikTok messaging APIs.

The deployed project also includes the coupon and consignment scan-event
restoration:

```text
supabase/migrations/20260804_restore_coupons_and_consignment_scanning.sql
```

The operations and security upgrades are recorded in:

```text
supabase/migrations/20260809_operations_hardening.sql
supabase/migrations/20260810_security_boundary_hardening.sql
supabase/migrations/20260810_deprecated_rpc_lockdown.sql
```

All three passed complete `BEGIN … ROLLBACK` validation and were applied to the
current K2jimzon production project through the migration system on 2026-08-10.
They activate exact-lot FEFO, unit packing, custody, consignment, coupon,
delivery, and connector contracts; restrict anonymous execution to the four
reviewed customer-entry RPCs; and disable legacy stock mutation paths. New
environments must apply them in the order shown. Do not rerun the old 1,800-line
launch migration to obtain these changes.

Applying a migration changes the live database. Review it and take a backup before running it in Supabase.

## Verification

```bash
npm run check:imports
npm run build:storefront
npm run build:admin
npm test
```

Passing a local build is not the same as production readiness. Before launch, also verify RLS with anonymous/customer/staff sessions, test the real deployed URLs, enroll staff MFA, and exercise an order request and Pasabuy request against the live database.

## Intentionally deferred

- Online payment gateway and automatic payment verification
- Custom storefront/admin domains
- Shopee, TikTok Shop, and Lazada API credentials/connectors
- Anonymous Pasabuy image uploads
- Paid Supabase or Vercel features

See `LAUNCH_STEP_1.md` for the operational handoff and remaining gates.
