# Live buyer journey rehearsal, 24 September 2026

Owner request: use a browser to reenact a buyer choosing a product and delivery. The native desktop browser controller returned `Transport closed`, so the same exact production host was visited with an isolated Playwright Chromium session at 390px mobile and 1280px desktop widths. This is browser observation, not a real purchase.

## Observed path

1. Opened `https://www.k2jimzon.com/catalog`. The page loaded 22 products. Selected the in-stock Barilla Spaghetti N5 listing (₱149, 120 shown available) and opened `/product/barilla-spaghetti`.
2. The product page displayed stock, price, allergen notice, quantity and Add to cart. Added one unit. The basket showed one item, ₱149 subtotal, and a Review order request action.
3. Opened `/checkout`. Metro Manila standard delivery showed ₱95 and total ₱244; express showed ₱150 and total ₱299; pickup showed free delivery and total ₱149. Changing the destination to Visayas showed ₱100 delivery and total ₱249. GCash and MariBank radio choices both responded; Cash on Delivery was not offered.
4. Filled disposable, unsent preview fields, chose MariBank and reviewed the 390px page. The form had no horizontal overflow. A desktop pass reached the same checkout, showed ₱244 and GCash selected, and had no horizontal overflow.
5. With no email or phone, clicking Submit order request displayed “Please enter an email address or mobile number so we can confirm your order.” The browser observed zero write requests. No valid submission, order, payment, courier booking or delivery was performed.

Screenshot: `checkout-390.png` contains no personal details. The last check used a fresh browser context, so the staged basket and preview fields were not retained.

## Findings and boundaries

- The displayed regional fees are consistent with the currently approved automated delivery matrix in the operations rulebook. Initial concern that all delivery must be manually quoted was based on an older rule and is superseded. Courier booking and actual delivery still require staff action.
- Product content: the Barilla page renders “Contains Contains Wheat / Gluten.” This duplicate prefix needs a product-content display review under MAP-018; the physical package and allergen fact were not independently checked.
- Checkout copy: “Choose how you want to pay when your package arrives or before dispatch” is ambiguous beside GCash/MariBank QR methods. Align it with staff-confirmed payment instructions and the currently unavailable Cash on Delivery policy under MAP-023.
- The visible estimated delivery times and “no surprise charges” statement were not proved against a real courier booking. MAP-023 must compare quoted service, accepted amount, carrier cost and customer communication in a real cycle.
- Because no real contact, counted stock, approved recipient transfer or staff review was supplied, the live order write and confirmation, QR handoff, independent funds verification, dispatch and delivery remain unverified. MAP-023/025 own those actions.

Recovery: no production record or provider setting was changed; no rollback is needed. Repeat the real cycle only with an owner-approved product, real customer contact/address and staff review, then keep the resulting order and payment receipts in MAP-023 evidence.
