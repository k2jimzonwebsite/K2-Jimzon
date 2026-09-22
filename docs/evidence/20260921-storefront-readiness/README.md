# Whole-Storefront human-test preparation

IDEA-20260921-09, started 21 September and continued 22 September. Owning scope: MAP-028 I-015 / MAP-025. This is local code and synthetic verification, not production activation.

| Before | After | Why |
| --- | --- | --- |
| 12–13px labels and 14px fields | 14px compact text, 16px fields/body lists; browser default root font | Readable form information and browser text preferences. |
| Dark text reused button fill colors; light red/green measured 4.32/4.27 against warm surfaces | Separate reading colors in each theme | Preserve button contrast and legible links/status text. |
| Truncated basket product name | Wrapped sans-serif name | Customers can check the exact item. |
| Checkout advertised GCash/Maya/bank together | Staff-confirmed payment wording, including the saved order note | Avoid advertising unapproved receiving methods. |
| Wholesale copy used operational jargon | Shorter inquiry and quote instructions | Explain what the customer does next. |
| Product brief implied connected stock sync | Explicit current launch boundary | Prevent future changes from repeating unsupported capability claims. |

Two isolated typography assessments ran through the impeccable typeset workflow: source-based design assessment and mechanical detector. Detector returned `[]`; manual assessment identified the paragraph-only typography override, short form labels, unrestricted policy measure and truncated basket titles. Changes preserve K2 wood imagery, Fraunces display and Source Sans UI. ENERGY 1 / RHYTHM 2 / MOTION 1; no new decorative assets or animations.

## Verification and boundaries

- Final customer browser run: 15/15 passed using `playwright.selling.config.js` with `storefront-readiness-ui`, `storefront-selling-surfaces`, `storefront-theme` and `hero-enhancement`. Includes 44 route/theme/viewport combinations plus checkout and existing shopping/message/recovery journeys.
- Final `playwright.store-orientation.config.js` regression: 12/12 passed after the shared type/color changes, including pinch, 200% root text, chat and overlay collision checks.
- Final focused sales/tour/release/copy contracts: 38/38 passed. Checkout assertion also checks the saved payment-note wording.
- Final Storefront build passed security, import, artifact and secret gates: gzip JS 150.17/150.50 kB, CSS 29.41/30.00 kB. Existing lazy 3D chunk warning remains non-blocking.
- Final release candidate: one uninterrupted `npm test` passed 1,143 checks. The Storefront and customer-account fixtures now wait for the transformed stylesheet before starting browser assertions, preventing cold Vite startup from consuming a journey timeout.

- Local inventory rehearsal: `npm run rehearse:inventory-readiness` passed. Summary: 3 products, 3 batches, 1 manifest, 28 scan events, 3 inventory events, 25 physical units and 20 sellable units. Includes intake, overpack denial, arrival shortage, expiry quarantine, idempotent receipt, authorized opening balances and direct-write denial.
- Local payment rehearsal: `npm run rehearse:payment-recovery` passed payment recovery and composed signed packing assertions.
- 26 focused payment/inventory/delivery/copy/release contracts passed before the final copy assertion was added; final targeted contract results are recorded below.
- Both rehearsals first failed to start PostgreSQL inside the sandbox; the approved isolated local reruns passed. No production connection or mutation was performed.
- Browser audit covers Home, Catalog, product, Pasabuy, Wholesale, Contact, Privacy, Terms, account entry, messages entry and empty confirmation at 390/1440px in light/dark. It measures fields, labels and accent text against computed ancestor background colors. Background-image pixel contrast, every authenticated account state and physical devices require separate acceptance.
- Initial browser audit reproduced light-mode contrast failures; dark-mode routes passed. Checkout fixture was corrected to click the visible Review order request button instead of the backdrop covered by the phone drawer. Hero test now scopes its repeated Request from Italy label to main content.

## Operational readiness handoff

| Area | Verified here | Gate that stays open in MAP |
| --- | --- | --- |
| Storefront usability | Shared reading fixes and synthetic customer routes | MAP-025: representative customer/staff tasks on exact release and physical phones. |
| Inventory listing | Isolated intake-to-stock rehearsal | MAP-018/023: real counts, lots/expiry, photographs/facts/prices, production activation and publication approval. |
| Manual payment | Isolated evidence/recovery rehearsal and honest checkout wording | MAP-019/023: approved receiving details/reviewers, production workflow and real reconciliation/exception acceptance. |
| Lazada/TikTok | No new connector claim | MAP-026: access qualification, seller authorization, mappings, actual adapters and stock/order/cancellation reconciliation. |

Recovery: compare against `docs/design-checkpoints/20260921-storefront-readiness/` and selectively restore only this slice. Keep the preceding store fixes. Revert corresponding test/copy expectations together. No database rollback applies. Exact next work remains in MASTER_ACTION_PLAN.md, not a second backlog here.
