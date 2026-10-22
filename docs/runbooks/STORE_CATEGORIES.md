# Store categories

Owner: MAP-023 / IDEA-20261022-01. Source implementation is locally verified; production release and genuine staff acceptance are separate actions.

The store category is the customer-facing shelf saved on each product as `subcategory`. If blank, the storefront uses the canonical category name. Canonical `category_id` remains the authority for operational category policy and family eligibility. A store category edit never changes that ID, stock, lots, pricing, human review, lifecycle, Website assignment or publication.

Home, Catalog and Footer use one shared category/count list derived from the current Website-listed products. Sold-out listings remain discoverable for Pasabuy. Drafts, other-channel products and empty category names do not create public shelves. A successfully refreshed catalog clears obsolete category URL filters to All; failed or stale reads do not decide that a shelf has disappeared. A configured empty database never falls back to demo products, even during local development.

## Staff workflow

1. Open Inventory and use search, stock filters or **Store category filter**. **No custom store category** shows products without an explicit shelf label; a canonical default can still exist.
2. Select individual products or **Select visible**. Selections from earlier filters remain selected until cleared; check the total and review the product list before applying.
3. Choose **Set store category**. Select an existing suggestion or type a new name of up to 120 characters. `All` and `Uncategorised` are reserved. Existing names are reused without introducing capitalization variants.
4. Review the SKU list and destination, then choose **Apply to N products**. Each SKU uses a fresh Product Master read and the existing signed, versioned save. The patch contains only `subcategory`; each write has its own audit/receipt. The batch is deliberately not atomic.
5. Check **saved**, **already assigned** and **remaining**. The list identifies saved rows. A failure or uncertain result stops further writes. A rate limit or session refusal also stops the batch; nothing skips the refused row.

Keep the panel open during saving. Closing/reloading the page stops unsent rows. An unconfirmed write retains the original account, literal request, version and idempotency key in the existing pending product decision store. Close the panel and choose **Review pending product decision**, then retry the original request. Do not invent another request to resolve an unknown outcome. If that save is proven not applied, use the existing latest-product review. Refresh and explicitly select the remaining products for another batch. Never infer that unsent products were updated.

New category names become reusable through actual product assignment. A name assigned only to Drafts stays private until an eligible product is separately listed. Removing the last listed product from a shelf removes that shelf from public navigation after refresh. Categories do not supply any stock or publication authority.

## Verification and recovery

`npm run test:store-categories` runs pure category/batch checks plus actual-component Chromium journeys against synthetic data. The fresh read-only inventory audit, focused regression results, screenshots and development-gate receipt live in `docs/acceptance/CATEGORY_ALIGNMENT_20261022.md`.

Source rollback removes only the scoped category resolver, bulk dialog, category wiring/filter, Admin category-name projection and associated tests/configuration. Preserve existing Product Master recovery and all pending original requests. If staff have subsequently applied labels, correct them from fresh current versions through normal Admin; a source rollback does not revert stored labels. No stock, database restore or provider rollback is required by this source change.
