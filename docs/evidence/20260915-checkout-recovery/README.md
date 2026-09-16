# Evidence: Storefront Checkout Recovery and Idempotency Lifecycle (I-004)

Date: 2026-09-15
Author: Antigravity
Finding Addressed:
- **I-004 (P1, MAP-019/023)**: Make failed checkout recoverable after edits, bound idempotency keys strictly to frozen payloads, unlock fieldsets on definite server rejections, provide an accessible secondary action to edit order or contact details, and assign fresh idempotency keys upon order edits.

## 1. Verified Changes

### Idempotency Lifecycle & State Recovery (`src/context/StoreContext.jsx`)
- **Key Binding & Payload Invalidation**: The active idempotency key (`checkoutRequestKeyRef.current`) is strictly bound to the held pending checkout attempt. Modifying cart items or quantities (`addToCart`, `addBundleToCart`, `setQty`) or modifying coupons (`applyCoupon`, `removeCoupon`) invalidates any held checkout payload via `resetPendingCheckout()`, clearing `checkoutPayloadRef.current`, `pendingCheckout`, and resetting `checkoutRequestKeyRef.current = ''`.
- **Definite Server Rejections Unlock Immediately**: In `runPlaceOrderRequest`, server rejections (`result.code?.endsWith('_INVALID')`, `INSUFFICIENT_STOCK`, `CONTACT_REQUIRED`, `BOT_CHALLENGE_REQUIRED`, `INVALID_REQUEST`, `RATE_LIMITED`, `INVALID_OR_INELIGIBLE`) unlock the form immediately on both initial attempts and retries (`resetPendingCheckout()`), removing the previous `!recovering` gate that trapped customers in disabled fieldsets upon retry rejections.
- **Exported Recovery Helper**: `resetPendingCheckout` is exported through the `useStore()` hook so view components can explicitly release held checkout locks.

### Customer Form Recovery & Accessible Action (`src/views/Checkout.jsx`)
- **Preserved Customer Form State**: When an uncertain checkout occurs, entered form details (`name`, `email`, `phone`, `address`, `fulfillmentMethod`, `note`) remain in local component state.
- **Explicit Secondary Action**: When `pendingCheckout` is active, rendered an accessible secondary action: `"Edit order or contact details"` (`min-h-11 w-full px-4 py-2.5 text-sm font-semibold text-navy hover:border-crimson hover:text-crimson focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson`). Clicking this button resets the pending hold and unlocks all fieldsets while preserving customer-entered details.
- **Bot Challenge Renewal**: Reset bot token on every submission attempt and refreshed Turnstile widget key to ensure challenge renewal on retry or resubmission.

### Automated Browser Verification (`tests/storefront-recovery-ui.spec.js`)
Four new Playwright browser tests added to verify recovery under real network conditions:
1. `definite server rejection unlocks form and submits with fresh idempotency key`: Validates that a server validation rejection immediately leaves fieldsets enabled and subsequent submission sends a new idempotency key.
2. `uncertain checkout allows modifying details, preserving entered form content and assigning fresh idempotency key`: Validates that an unconfirmed submission locks fieldsets with held order copy; clicking "Edit order or contact details" preserves all entered fields (`name`, `address`), enables editing, and submits with a fresh idempotency key.
3. `server rejection on retry unlocks form for editing with fresh idempotency key`: Validates that a retry receiving a server rejection unlocks the form rather than locking it permanently.
4. `editing cart quantity after uncertain checkout updates order lines and generates fresh idempotency key`: Validates that updating cart quantities after an unconfirmed submission resets the held order lines, submits the updated line items, and issues a fresh idempotency key.

## 2. Test & Build Execution Evidence

1. `npx playwright test --config=playwright.storefront-recovery.config.js tests/storefront-recovery-ui.spec.js`
   - Result: **14/14 PASS** (all existing and 4 new checkout recovery scenarios pass).
2. `npm run test:contracts`
   - Result: **627/627 PASS** (619 contract tests + 8 selling surfaces e2e tests pass, exit 0).
3. `npm run build:storefront`
   - Result: **PASS**.
   - Landing JS: 149.73 kB / 150.50 kB gzip budget.
   - Landing CSS: 27.80 kB / 30.00 kB gzip budget.
   - 32 manifest modules, 0 secrets.
4. `npm run build:admin`
   - Result: **PASS**.
   - Admin application chunk: 191.12 kB / 300.00 kB minified budget.
   - 40 manifest modules, 0 secrets.

## 3. Scope & State Boundaries
- Verified in local repository code, Playwright browser execution, and production build pipelines.
- Modifies local client state and recovery flows; does not modify remote Supabase database schemas or production BFF deployment status.
