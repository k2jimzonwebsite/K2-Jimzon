# Account mobile, category controls and footer

Owner: MAP-019 / IDEA-20261029-02, -03 and -04. Status: locally prepared and verified; no new source publication or deployment. Production remains at `cabace48`. The owner confirmed this exact design scope; the older approval to release `cabace48` and receipt-only feature pushes does not approve this new runtime slice.

The reported account defect was discoverability: the owner's actual signed-in Chrome account showed an empty address book and **Add delivery address** opened the existing phone field. No personal details were entered or saved. A read-only exact-K2 metadata check matched the installed settings/address helper and writer hashes. No database, Auth, SMS or privacy activation was needed.

| Before | After | Why |
| --- | --- | --- |
| Empty account settings hide delivery mobile behind Add delivery address | Existing first-address editor opens once, with the label Mobile number | Make recipient name, mobile and address entry immediately discoverable |
| Store-category assignment requires selecting products in Grid | Visible Create store category in Grid and Sheet, plus a Sheet category cell action | Make the same product-backed category workflow available in both modes |
| Footer categories occupy one long column and use buttons | Shared categories have native catalog links in a responsive two/four-column region with Browse all products | Improve scanability, direct links and the empty-catalog destination |

Account entry preserves Cancel/reopen, same-account drafts, account-keyed remounts, existing required contact validation, exact pending requests and saved/default address behavior. It performs no automatic save and adds no separate profile-phone authority or name suggestions. Delivery mobile is a fulfillment contact, separate from verified sign-in identity.

Store categories remain `products.subcategory`, falling back to canonical operational category names. There is no empty-category registry. Creation means assigning a label to at least one explicitly chosen product through the existing signed, versioned Product Master command. The patch contains only `subcategory`; fresh per-product reads, sequential saves, actor/role guards and original uncertain-request recovery remain. Sheet uses the same recovery hook and pending-decision dialog as Grid. Brand and operational `category_id` references retain protected Grid Edit guidance; no anonymous reference transport is enabled.

Home, Catalog and Footer already derive their public list from Website-listed products. A category appears after the normal successful catalog refresh when an assigned product is publicly listed. Draft-only categories stay private; removing the last listed assignment removes the public category on refresh. Sold-out listings remain discoverable for Pasabuy. Creating a category does not publish a product, assign Website, supply stock or change an order. Footer links preserve ordinary in-page navigation and native modified-click/new-tab URLs. The existing business contacts, marketplace links, policies, payment wording, K2 tokens and canvas are retained.

## Evidence

All commands ran against local synthetic fixtures. Logs are in `docs/acceptance/account-category-footer-20261029/`; source and log hashes are in the JSON receipt.

- Account discovery regression: two failed baseline cases; four focused cases passed after the fix.
- Account/wholesale suite: 57 passed, two intentionally skipped; one obsolete final-empty-state assertion failed. The corrected focused removal check passed, proving the new blank editor and zero resurrected address cards after reload. Reconciled coverage: 58 passed, two skipped. The remaining passing cases were not repeated.
- `npm run test:store-categories`: four pure behavior checks and all 35 browser cases passed. Covers Grid/Sheet creation, unchanged stock/price/publication, private Drafts, category refresh/native links, read-only access, partial batches, exact retry after reload and phone/desktop reflow.
- `npx playwright test --config=playwright.sheet-reference.config.js tests/admin-secure-sheet-reference.spec.js`: two passed. The first launch collided with the account fixture's shared port and ran no cases; the sequential rerun passed with no anonymous taxonomy calls.
- `npm run verify:development`: exit 0, including 148 privacy/address checks, source/security boundaries, secret scanning and import integrity. Run once after final application edits.
- `npm --ignore-scripts run build:storefront` and `build:admin`: both exit 0 with boundary, budget and built-secret checks. The already-passing development lifecycle was not repeated. Storefront landing JS 147.64/150.50 kB gzip; CSS 29.82/30.00 kB. Admin 227.46/300.00 kB minified. These are current owner-environment builds, not an exact committed-source archive or new hosted artifact.
- Independent read-only review against `82e48ffb`: no Critical, Important or confirmed Minor findings; `git diff --check` passed.

Fixture corrections are retained honestly: importing Sheet added CommonJS dependencies to the isolated category fixture, requiring its existing Vite prebundle to include `papaparse` and `react-barcode`; the first apparent category red run had a module-load error and is not behavioral proof. A corrected released-source comparison separately proves the four missing category/footer capabilities. The first implementation check caught a stale Grid state setter and an incorrect search-input test role; both were corrected before the final passing suite. No product boundary or timeout was weakened. Private baseline tooling substituted only the four released source modules and never rewrote working application files; its first launch needed an explicit repository cwd.

One bounded combined visual pass inspected account 375/1440, Sheet category dialog 375/1440 and footer light/dark 375/1440 captures in `docs/design-checkpoints/20261029-account-category-footer/`. Labels, close/apply actions, long category wrapping, 44px targets and horizontal bounds passed. No new motion or redesign was introduced. Captures contain fabricated fixture data and do not establish real-host save acceptance.

## Remaining action and recovery

MAP-019 owns exact source publication/main release authorization, the release gate immediately before an approved promotion, both separate production artifacts, canonical-host checks and the owner's actual address save/reload/default-checkout acceptance without order submission. No new SQL/provider or customer/category record was written. Existing customer-deletion work remains suspended. Preserve the owner's signed-in Chrome tab and cart.

Before publication, revert only the six application files and scoped tests/records in this slice. After a future release, restore each artifact to the separately recorded `cabace48` production deployment by a scoped release decision; never restore the database or replay business operations. Existing pending requests must survive. If staff later change category labels, correct those through fresh normal Admin decisions; a source rollback does not revert stored assignments.
