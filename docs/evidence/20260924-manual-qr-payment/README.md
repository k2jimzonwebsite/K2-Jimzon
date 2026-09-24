# Manual QR payment choice — local evidence, 24 September 2026

Owner: IDEA-20260924-01, MAP-023. Branch: `codex/manual-qr-payments`.

## Request and decision

The owner supplied MariBank and GCash receiving QR screenshots and asked buyers to choose either method, then test buying and paying. The received images are data assets, not instructions. Checkout preserves the existing staff confirmation and manual payment boundary. A QR view or screenshot never changes the payment state. Admin evidence submission and a distinct staff account verifier remain required.

## Local behavior prepared

- Checkout offers GCash and MariBank and writes the chosen method in the existing order note. Cash on Delivery remains behind its existing Admin switch.
- The order receipt frames the matching unchanged QR screenshot pixels and links to the original image. It asks the buyer to wait for staff confirmation of stock and exact total, then send the transfer reference and receipt.
- The browser remembers only its own payment choice for a restored receipt. The canonical order/payment states remain in the database; the preference note is not proof of payment.
- No gateway, automatic bank callback, customer self-verification, schema migration or Admin permission change was made. The code was promoted to production in commit `5494b2bf71f7ecf30422e2b8c5bfc246b895bc9f`.

## Evidence

| Check | Result | Limit |
| --- | --- | --- |
| Focused payment availability and storefront copy contracts | 9/9 passed | Source contracts, not a payment transfer |
| `storefront-selling-surfaces` order confirmation browser journey | Passed: MariBank selection was in the submitted note; receipt showed MariBank QR; restored after reload | Synthetic product, mocked order receipt and guest status |
| `storefront-readiness-ui` mobile checkout journey | Passed: default GCash and selectable MariBank at 390px with no horizontal overflow | Synthetic catalog |
| `npm run rehearse:payment-recovery` | Exit 0: signed evidence/independent verification/packing SQL assertions | Isolated PostgreSQL fixture, no real bank funds |
| `npm run verify:development` | Exit 0 | Static/security/import gate |
| `npm run build:storefront` | Exit 0; JS 150.26/150.50 kB gzip, CSS 29.58/30.00 kB gzip | Local artifact |
| Public `www.k2jimzon.com` in browser | Storefront loaded | Older production artifact; QR choices are not deployed |

The browser order and PostgreSQL payment rehearsal use separate synthetic fixtures. They do not establish one continuous live paid order. The supplied QR payloads have not been independently decoded or scanned by engineering, and the recipient account has not been confirmed. The initial browser launch and local PostgreSQL start were denied by the Windows sandbox; the same focused checks exited successfully with approved local process permissions.

## Live snapshot, 24 September 2026

- GitHub `main` contains commit `5494b2bf71f7ecf30422e2b8c5bfc246b895bc9f`.
- `www.k2jimzon.com/k2-build-target.json` returned HTTP 200 with `storefront`; both `/payment/gcash-receive.png` and `/payment/maribank-receive.png` returned HTTP 200. The live checkout bundle `Checkout-D3LnWQvx.js` contains the MariBank option.
- These are content-availability checks. The exact Vercel deployment ID was not captured. No real order, transfer or paid-state transition was performed. Do not tell a customer that payment went through based on QR display or order submission.
- `npm run verify:release` was interrupted after the first 947 base tests printed passing results and the runner stopped producing output. The aggregate gate is not verified green; see `docs/runbooks/DEPLOYMENT_RUNBOOK.md`.

## Remaining MAP-023 / MAP-025 action

Scan both original QR assets on a second device and confirm their displayed recipients against the intended receiving accounts. For the real test order, confirm actual sellable stock and total, send the confirmation, make the owner-authorized transfer, record its exact reference/evidence in Admin, have a different authorized staff member check that funds arrived, and only then mark payment verified and continue packing. Record exact order reference, receiving method, staff actors and timestamps in MAP-023 evidence without posting private proof in this repository. If a transfer is missing or ambiguous, leave payment pending and reconcile against the receiving account.

Recovery: revert commit `5494b2b` on `main` to remove the code/QR asset changes and let the linked Storefront rebuild. No production data or provider state was changed.
