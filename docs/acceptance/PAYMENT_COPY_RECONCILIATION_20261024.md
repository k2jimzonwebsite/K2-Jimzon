# Payment wording reconciliation — 24 October 2026

MAP-023 / IDEA-20261024-03; continuation of the remaining storefront audit flag. Owner explicitly states payment is now accepted first and directs proceeding with the fix. Source baselinea2f016cd on codex/mobile-homepage-fixes. Continuing authorization covers source fixes,verification,commit and feature-branch push; no main merge,production promotion,provider or business-data write.

## Researched behavior and correction

Existing checkout records an order and selected receiving method; it does not execute a bank/card charge. Confirmation exposes the matching GCash/MariBank QR only for eligible order state,current instructions and a freshly established final charge. Pending/unsafe totals,not-requested instructions,failed reads and verified funds keep payment actions unavailable. OrderConversation separately requires current charge/instructions and submits a private receipt for independent staff funds verification. A receipt cannot mark funds verified. Express delivery still requires the customer's quote acceptance; Pasabuy/wholesale remain quote inquiries. These are source/fixture observations,not real-host transfer acceptance.

| Before | After | Why |
| --- | --- | --- |
| No upfront payment;staff check stock before payment. | GCash/MariBank orders are paid before dispatch;follow current order payment details. | Matches owner policy without inventing automatic checkout charging. |
| Checkout says a ready total produces a QR. | Payment details are shown when available;final-total-only state remains blocked. | Source also requires current instructions and order eligibility. |
| Confirmation says no payment was charged and lists stock review before payment. | Neutral order/payment updates and payment-before-dispatch/receipt-verification steps. | Does not tell an already-paid customer that no payment occurred. |
| Footer,FAQ,product/3D guidance and SEO retain stock-first promises. | Consistent manual QR wording;missing product facts are clarified before ordering. | Shared discovery and help must agree with checkout. |
| Terms ban payment before staff contact;Pasabuy says no upfront payment. | QR payment before dispatch with final-total/recipient checks and funds review;quote inquiries follow accepted terms. | Keeps payment correctness and the distinct inquiry flow. |

Four required design skills apply together:ui-ux-pro-max preserves readable complete instructions and explicit state boundaries;impeccable clarify removes contradictory promises;design-taste-frontend keeps K2's editorial voice and existing layout;emil-design-eng aligns action copy with actual state/recovery. Karpathy scopes the change to strings/comments and existing tests. No handlers,eligibility conditions,receiving files/method IDs,stock/charge calculations,API/provider settings or schema change. Terms' displayed update date is24October2026;privacy/returns provisions remain unchanged.

Changed runtime files: CartDrawer,Footer,ProductKnowledge,FaqSection,ExpressDeliveryApproval,OrderConversation,ShelfProductPanel,site.js,policies.js,storefrontSeoPages.js,Catalog,Checkout,Confirmation,Pasabuy. Existing copy/policy/receipt/smoke tests updated; the existing mobile-audit suite adds two actual-component payment-state journeys. No new payment implementation or dependency.

## Verification

Failing-first existing copy/policy contracts:2expected failures/10passes. Final focused18 cases cover copy/policy contracts,320px checkout/keyboard policies and375px light/dark payment states. New state journeys prove pending total hides QR/receipt;final total plus not_requested still hides both;current instructions expose only the recorded GCash image;verified funds hide payment actions. Existing direct saved-receipt2cases pass,including private receipt submission,stale/review/failed-read rejection and verified-payment hiding. Existing shared readability7pass. Focused launch cart→checkout smoke1pass;initial duplicate header/footer copy locator was correctly scoped to main and retained in the failed log.

Final12copy/policy checks rerun after the final redundant added FAQ sentence was removed. Final development gate and configured Storefront build pass; public K2 URL and guest/account flags supplied. Storefront JS150.50/150.50kB gzip as rounded by the reporter,CSS29.98/30.00;the exact threshold passes unchanged. Earlier150.51 failures are retained. Separate Admin226.68/300,boundary/secrets pass and are reused after the subsequent storefront-only helper/FAQ string shortening. No release gate is run for a feature-branch push.

Independent source review identified one instruction-availability overpromise;it was corrected and the missing final-total-only case added. Other reviewed wording matches the manual flow. No remaining concrete source concern reported. Bounded Impeccable detector returns[];this is not a full accessibility certification. Logs and exact source hashes: payment-copy-reconciliation-20261024/qualification.json and retained logs.

## Remaining acceptance and recovery

This resolves the audit's payment-copy conflict in source. It does not establish actual installed payment-method readiness,receiving-account ownership,a real transfer,staff funds verification or the hosted order journey. Those require genuine controlled acceptance;do not submit test orders/payments to production or mark them passed from fixtures. Physical mobile touch/notch/full assistive-tech and Core Web Vitals also remain unverified. The only old no-upfront phrase retained is “No upfront fee to request” on Pasabuy:it describes requesting a custom quote,not payment for an accepted order. Pending express quotes and unsafe/review-needed totals retain their real transfer safeguards.

MAP-023 owns these remaining real-device/hosted operational checks and separately requested live source release. Source branch predates production's squash merge;prepare any future release candidate against current main before one complete release gate,required CI and separate Storefront/Admin actual-host verification. Recovery reverts only this copy/test/doc slice;never replay stock/order/payment commands or restore a stale database. No main merge/deployment was performed.
