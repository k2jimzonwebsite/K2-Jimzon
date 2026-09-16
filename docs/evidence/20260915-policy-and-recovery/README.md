# Evidence: Customer Policy and Bounded Error Recovery Verification

Date: 2026-09-15
Author: Antigravity
Findings Addressed:
- **I-010 (P1 recovery / P2 performance)**: Bounded chunk recovery and target-neutral error boundary.
- **I-011 (P1/P2 disclosure & entry points)**: Customer-facing policy and recovery entry points.

## 1. Verified Changes

### I-010: Target-Neutral Error Boundary
- `src/components/ui/ErrorBoundary.jsx`:
  - Renders target-neutral recovery UI with code `UI_SECTION_UNAVAILABLE` and `role="alert"`.
  - Recovery options: "Try this section again" and "Reload page".
  - Neutral copy: "This section stopped loading. Products, cart, and Pasabuy remain available."
  - Touch targets: interactive buttons meet the `>= 44px` minimum (`min-h-11`).
  - No target leakage: shared surfaces never display "Reload Admin".
- `tests/browser-error-safety.spec.js`:
  - Added strict assertions validating target-neutral copy and 44px touch targets.
  - Result: 5/5 tests pass.

### I-011: Customer-Facing Policy and Recovery Entry Points
- `src/data/policies.js`:
  - Authoritative customer-facing policies reflecting exact manual launch operations.
  - Privacy policy: explains exact personal data collected for order/pasabuy fulfillment, manual staff contact via Email/Messenger/Viber, no third-party data selling or tracking cookies.
  - Terms of Service: clarifies direct Italian import nature, manual order request submission without automatic payment collection, staff confirmation before payment, pricing and availability subject to change.
  - Returns & Replacements: explains manual case-by-case inspection, 48-hour reporting window upon delivery for damaged/incorrect/spoiled goods, photographic proof requirement, replacement or credit resolution without false automated SLAs.
- `src/views/Policy.jsx`:
  - Accessible, responsive, mobile-first policy view with tab navigation between Privacy, Terms, and Returns.
  - Mobile touch targets meet `>= 44px` (`min-h-11`).
  - Lazy-loaded in `src/StorefrontApp.jsx` to prevent any landing bundle overhead.
- Route & Deployment Parity:
  - Added `/privacy`, `/terms`, `/returns`, and `/policies` to `src/lib/storefrontRoutes.js` and `STOREFRONT_SPA_PATHS`.
  - Added corresponding rewrites to `vercel.storefront.json`.
  - Added permanent redirect `/wholesale` -> `/trade` and crawler exclusion headers (`noindex, nofollow`) for `/account`, `/messages`, `/checkout`, `/confirmation` in `vercel.storefront.json`.
- Entry Points:
  - `src/components/Footer.jsx`: dedicated accessible buttons to Privacy & Data, Terms of Service, and Returns & Replacements.
  - `src/views/Checkout.jsx`: explicit customer policy notices linking to Privacy and Terms before submission.
  - `src/views/Contact.jsx`: policy reassurance on message submission.
  - `src/views/Pasabuy.jsx`: sourcing terms notice and privacy disclosure.
  - `src/views/Wholesale.jsx`: commercial inquiry terms and data usage disclosure.
- Contract Suite:
  - `tests/storefront-policy-contract.spec.js`: 4/4 passing tests verifying routes, rewrites, policy facts, and footer/form entry points.
  - Added to `npm run test:contracts` in `package.json`.

## 2. Test & Build Execution Evidence

1. `npx playwright test --config=playwright.api.config.js tests/storefront-discovery-contract.spec.js`
   - Result: 16/16 PASS.
2. `npx playwright test --config=playwright.api.config.js tests/storefront-policy-contract.spec.js`
   - Result: 4/4 PASS.
3. `npx playwright test --config=playwright.api.config.js tests/browser-error-safety.spec.js`
   - Result: 5/5 PASS.
4. `npm run build:storefront`
   - Result: PASS.
   - Landing JS: 149.77 kB / 150.50 kB gzip budget.
   - Landing CSS: 27.77 kB / 30.00 kB gzip budget.
   - 32 manifest modules, clean secret scan.
5. `npm run build:admin`
   - Result: PASS.
   - Admin application chunk: 189.73 kB / 300.00 kB minified budget.
   - 40 manifest modules, clean secret scan.
6. `npm run test:contracts`
   - Result: 623/623 API contracts + 8/8 selling surfaces = 631/631 PASS.

## 3. Scope & State Boundaries
- Verified in local repository artifacts and Playwright browser contracts.
- Does not claim deployed production activation or remote database migration.
