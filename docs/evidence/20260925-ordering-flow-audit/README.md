# Customer ordering flow audit — 25 September 2026

**Owner request:** Check whether the complete customer ordering logic works before calling both websites production ready. This is a non-mutating audit under MAP-023 and MAP-025, not a launch acceptance or authorization for a real order, payment, database migration, or deployment.

## What was verified

| Boundary | Evidence | Result |
| --- | --- | --- |
| Live buyer entry | On `https://www.k2jimzon.com/catalog`, 22 products rendered. Barilla Spaghetti N5 showed 120 available and ₱149. Adding one changed the cart count to one. The basket displayed the product, quantity and ₱149 subtotal. | Live browser pass for browsing and cart display; physical count unverified. |
| Live checkout | The basket opened `/checkout`; one Barilla item showed ₱149 products + ₱95 Metro Manila delivery = ₱244 total. Metro Manila delivery, express, pickup, GCash and MariBank choices rendered. COD was absent. | Live browser pass for displayed choices and arithmetic. Carrier booking and actual cost unverified. |
| Empty-form guard | Clicking **Submit order request** with the name blank focused the name field and displayed the browser's required-field message. | Validation observed; no valid order was submitted in this audit. |
| Storefront simulated browser checks | `npm run test:selling-surfaces` after allowing Playwright Chromium to launch: **13/13 passed**. Covers product stock/cart cap, checkout QR choices, confirmation, scoped guest messaging and recovery states. First sandboxed attempt failed at browser launch with `spawn EPERM`; that was an environment permission failure, not a failed assertion. | Passing local simulation, not proof of live payment or fulfillment. |
| Payment/staff simulated browser checks | `npm run test:payment-ui`: **36/36 passed**, including structured evidence, independent verification, lost-response recovery and handover states. | Passing local simulation; protected Admin write path and staff roles were not exercised on production. |
| Source/API contracts | Focused Playwright API command covering guest commerce BFF, method availability, purchase hold, confirmation commitment, delivery quotation and conversation seed: **49/49 passed**. `npm run verify:guest-bff` passed and explicitly reports production cutover gated. | Prepared source contracts pass. Some tested signed paths are absent or disabled in production. |
| Checkout copy correction | After the one-line edit, `npx playwright test --config=playwright.api.config.js tests/payment-method-availability-contract.spec.js` passed **6/6**. `npm run verify:development` passed the prebuild security, source and import gates. | Locally prepared and verified; no live deployment. |
| Live database metadata | Read-only production SQL found one `submit_order_request_v2` overload and three `order_requests`, all `submitted` with `payment_status=not_requested`; one payment-status function and a payment-evidence column exist. `submit_guest_order_v1` has no signed guest overload in production. | The current direct request path has database support and stored requests. Row purpose, real customer completion, payment, staff action and fulfillment are not established by these counts. |

## Gaps that prevent a full-order claim

1. The production checkout currently uses the direct order RPC while the signed guest route is prepared but not cut over. The live database lacks `submit_guest_order_v1`; MAP-017/019/020 still own the coordinated migration, permission and preview continuity work.
2. No valid request was placed during this audit. Earlier 24 September live rehearsal also stopped before a valid submission. The existence of three submitted rows does not prove a successful current buyer-to-staff journey, and none is marked paid.
3. No authenticated staff member confirmed a live order, supplied QR instructions, recorded transfer evidence, independently verified receiving-account funds, packed or dispatched from exact lots, or proved the buyer sees the resulting status. MAP-023/025 remain open.
4. The deployed checkout says “Choose how you want to pay when your package arrives or before dispatch,” while the only rendered options are GCash and MariBank QR after staff confirmation and COD is off. The wording could imply cash on delivery. The feature branch now prepares a copy correction: “Select a preferred method. K2 staff will confirm the order and tell you when to pay.” This is not deployed or live acceptance.
5. The displayed delivery service/estimate and ₱95 fee are not evidence of a booked courier or reconciled carrier cost. Physical stock shown as 120 is a database projection, not a certified count.

## Next action and recovery

Codex owns the signed-path preview and current-schema checks under MAP-017/019/020; the prepared checkout copy awaits the next authorized source release. Once owner-verified counted stock and QR recipients exist, Codex can drive the technical live rehearsal; the owner and sister/cousin staff confirm physical goods and recipient identity, and two distinct authorized people submit and independently verify one small real transfer. Record the exact order, stock, status, receipt, dispatch, failure and rollback evidence in MAP-023/025. Do not infer full production readiness from these simulated tests.

No production order, charge, stock write, database change, feature flag, provider setting or deployment was made in this audit. The feature branch remains separate from production `main`. The one-line checkout copy edit can be reverted from Git if it misleads during later testing. If a later cutover fails, use the prepared guest migration rollback and release runbooks after recording the exact failure.
