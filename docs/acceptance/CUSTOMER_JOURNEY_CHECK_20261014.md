# Customer cart, chat and payment journey — 14 October 2026

Owner request: check the complete customer journey from adding a product and speaking to staff through checkout, payment selection, order-linked conversation, private receipt upload and staff review. Owning item: MAP-023; decision register: IDEA-20261014-03. MAP-018 stays closed.

## Production adapter installed after explicit approval

14 October 2026 / IDEA-20261014-03 / MAP-023: owner-approved order-chat/private-receipt adapter is permanently installed on K2 pixplcjqivlfflickobf. Exact approved SQL3562559e5b72bf0a8bd1dc69cedabf6e23a2dc574e2e01518031c16187a8658c and installed body match; postgres owner, SECURITY DEFINER, empty search_path, anon execute true, PUBLIC/authenticated execute false. Production rollback-only compile/null-grant denial passed. Metadata-only postflight reconciled after function-executing read-only request HTTP400; apply was not repeated. Orders/messages/proofs remain0. BFF flags and live catalog unchanged; real buyer/staff acceptance not claimed. Receipt: docs/acceptance/CUSTOMER_ORDER_CHAT_APPLIED_20261014.json. Next is reviewed BFF activation under MAP-020 and designated real product/customer/staff acceptance; MAP-018 stays closed.

The code change remains on feature commit5bebe15 and is not a new production source promotion. The exact approved SQL was executed once; the new function is installed outside the historical installation ledger. Existing source snapshots expecting24anon grants must account for this approved25th function rather than reapply the installer. Latest pre-apply identity/readiness and backup/restore gates passed; no credentials or flags changed.

## Fix prepared and verified locally

The owner subsequently requested implementation. Confirmation now embeds the existing OrderConversation for BFF orders using their public reference and HttpOnly guest grant. Its read/message/receipt operations use one scoped BFF route; no order key or private bytes are returned to the browser. Receipt upload remains gated by a fresh final charge and payment instructions. Staff use the existing private proof table and review/download RPCs. Choosing/uploading proof never marks funds verified. Failed conversation reads have an explicit retry action; pending instructions explain when upload becomes available.

The additive migration `supabase/migrations/20261014_guest_order_conversation.sql` installs only `public.guest_order_conversation_v1(bigint,uuid,text,text,text,text,text)`, available to anon solely through valid signatures and matching active order/conversation grants. It resolves the canonical order and delegates to the existing chat/proof operations. A signed SHA-256 digest binds the separately transported proof bytes, preserving the existing small signed-payload limit. The one proof route accepts a bounded 3 MB file; other JSON routes retain their 24 KB limit. Rollback drops only this adapter function and retains all orders/messages/proofs. No new order/payment/proof table, service-role credential or signer system is introduced.

Prepared SQL SHA-256: `3562559e5b72bf0a8bd1dc69cedabf6e23a2dc574e2e01518031c16187a8658c`. Recovery SQL SHA-256: `1b606b4eca3009d8c4e50392747c56a15440758953377b54e1ed5b37b0f674ae`.

Fresh verification:

- New transport regression first failed 404; both checkout journeys first failed because the embedded conversation was absent. They pass after repair. Selling suite 6/6 passes; final GCash/MariBank connected journeys 2/2 pass with chat, proof payload, pending-funds notice, mobile overflow, history/reload, and another authorized order in the status list. Direct legacy regression 2/2 passes. Screens: `docs/design-checkpoints/20261014-customer-order/gcash-375.png` and `maribank-375.png` (synthetic buyers/proofs).
- 32 transport/security source cases qualified: initial run 31/32 with the new documented route count missing; the affected 5-case rerun passes after updating both architecture registers to 21 prepared routes. Proof transport over 24 KB passes; maximum 3 MB file validation also passes. Sensitive native fields are explicitly stripped.
- Five relevant recovery cases qualified: initial run 4/5; the fifth assertion ambiguously matched two independent error states after embedding chat. Scoped order-status-error assertions pass on rerun. Pending express remains unpriced, reviewed pickup is required, uncertain order identity is retained, and failed terminal persistence preserves the request.
- `node scripts/test-guest-order-conversation.mjs --baseline` fails for the absent adapter. Final native command passes on dedicated loopback PostgreSQL17.6: real HMAC verifier, missing/unrelated/expired grants, forged/replayed signatures, matching canonical chat, duplicate/message conflict, final-charge and null-payment gates, proof digest, real private storage, unchanged pending payment, AAL2-only retrieval of identical bytes, verified-payment refusal and data-retaining rollback. The fixture adds the installed charge projection to a minimal schema; it is not an exact production-schema or real-host acceptance. Initial Windows server-output handling failures were fixed in the test runner; the owned server is stopped. CI now includes this native check alongside existing critical SQL tests.
- Final development gate passes. The first sandboxed run could not reach its loopback HTTP fixture; the exact affected 2-test case and permitted development gate both pass. Storefront build, target boundary, secret scan and Vercel packaging pass; landing149.03/150.50 KB JS and29.96/30.00 KB CSS gzip. Packaging3/3 passes. Independent source review reports no actionable defect; native/runtime evidence is separate.
- Fresh read-only K2 identity confirms `pixplcjqivlfflickobf`; readiness7verified/2owner/3connector-unreached/0failed. Current backup/restore checks pass. It reports0products/0lots and unverified hosted customer/staff acceptance. It applies nothing.

Local implementation is complete; production installation, flags and real transactions remain untouched. MAP-023 owns exact owner authorization/application of the adapter; MAP-020 owns reviewed BFF activation. A code deployment by itself cannot activate this flow. Full source release gates apply only when a new live promotion is requested. No completed item is removed while these live outcomes remain open.

## Initial read-only audit result

The live journey is incomplete. This audit does not claim a real buyer/staff end-to-end acceptance or authorize production data, flags, credentials or SQL changes. Production source remains ff41dc92bc3017303be6dd19164d3eea8a2d5d5b; the working tree has the later documentation-only release receipt.

Observed on www.k2jimzon.com: unfiltered Catalog shows 0 products. Contact's chat drawer opens, but says “Messaging is not available yet”, “Nothing will be sent” and “Messaging is not active in this build yet”. No customer message/order/upload was submitted. The separate contact form creates an email draft; it does not submit an Inbox message.

## Connected source findings

- Cart validates known sellable stock and caps quantity. Current empty live catalog supplies no product for a real purchase test.
- Fresh checkout requires guest BFF plus a reviewed delivery charge. With BFF off, DeliveryEstimate explicitly reports that order requests are inactive, the submit button stays disabled, and the submit handler refuses the request. Do not bypass delivery review to revive the old request transport.
- Successful checkout goes to Confirmation. The old direct-order continuation embeds Your order conversation using the order UUID and checkout access key; it needs no repeated customer identity. After fresh final-charge/payment instructions, the buyer can send a message and upload PNG/JPEG/PDF plus payment reference (up to 3 MB).
- The newer guest BFF branch excludes that OrderConversation component. Confirmation offers View your messages instead; GuestMessages supports text replies only. The client route registry has no buyer receipt-upload endpoint. Thus enabling BFF alone would still omit receipt upload from the new checkout journey. Confirmation also does not automatically open/select the saved order's conversation.
- Staff payment review in OmniOperationsHub lists/downloads private buyer receipts by order, allows use of the stored proof reference, and requires separate receiving-account confirmation. Uploaded evidence is not verified funds. Inbox supports customer-visible Website replies. These screens passed synthetic tests; their real production handoff was not exercised.

Required business sequence: cart → checkout/delivery/payment preference → saved order and its conversation → staff confirms stock/final total/instructions → buyer transfers and uploads proof in that same order conversation → staff independently verifies funds → fulfillment. Choosing a payment method alone must not mark the order paid.

## Focused local evidence

All browser requests below use synthetic local fixtures, not K2 production transactions. K2_ACCEPTANCE_NO_WATCH=true was set. No complete release gate or deployment was repeated.

| Command | Result | Scope |
| --- | --- | --- |
| npx playwright test --config=playwright.order-receipt.config.js --output=.tools/customer-e2e-order-receipt-20261014 | 2 passed | Direct saved-order messaging, private receipt payload, refresh, pending/verified gating |
| npx playwright test --config=playwright.selling.config.js tests/storefront-selling-surfaces.spec.js --output=.tools/customer-e2e-selling-20261014 | 6 passed | Cart stock limits, scoped chat start/reply, GCash/MariBank pickup checkout and QR confirmation, expired access and unknown-route recovery |
| npx playwright test --config=playwright.payment.config.js tests/payment-recovery-ui.spec.js --grep 'submits structured payment evidence\|independent verification displays\|authorized staff can retrieve' --output=.tools/customer-e2e-staff-payment-20261014 | 3 passed | Structured evidence, account-confirmation requirement, private buyer receipt download |
| npx playwright test --config=playwright.inbox.config.js tests/inbox-phase2.spec.js --grep 'virtual-store website chat is unmistakable' --output=.tools/customer-e2e-inbox-20261014 | 1 passed | Customer-visible staff Website reply |

These 12 passing cases cover individual legs across two different checkout modes. They do not prove one connected live order, receipt or staff response, and specifically do not cover the absent BFF upload leg.

## Remaining action and recovery

MAP-023 owns authorization and production installation of the locally qualified adapter above. Review the resulting activation/configuration scope under MAP-020 before real-host acceptance with an owner-designated listed product and test transaction. The implemented adapter reuses existing private proof storage and staff review. No signer/coordinator/rehearsal continuation is required.

The initial audit changed documentation only; the subsequent source fix and additive migration are now prepared locally. Local recovery reverts this source slice. Production adapter rollback drops only the new function, retaining all canonical data; return the source to the previous release if needed. Production applications, inventory and settings are currently unchanged. No real payment was made and no receipt was represented as paid.
