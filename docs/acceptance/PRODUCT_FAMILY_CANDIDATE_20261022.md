# Product family feature candidate —22October2026

Owner: MAP-023 / IDEA-20261021-03. Branch: `codex/inventory-variations`. Base: `a9e369a7a6b7f586f05efaee5ea8d109f64b688b` (remote main rechecked before commit). Worktree: `C:/Users/jerze/.codex/worktrees/inventory-variations/K2 JImzon`.

The accepted family implementation is isolated from the primary checkout's unrelated unreleased work. Shoppers choose real existing SKUs from one explicit family; each SKU keeps its own stock, price, photos, facts, Knowledge, publication and order identity. Staff manage only supported family membership/options through the existing signed, versioned authority.

## Changes and reproduced failures

| Before | Candidate behavior | Evidence |
| --- | --- | --- |
| Authorized family GET succeeds remotely then returns503 because validated skus is out of scope | Handler-scoped validated array reaches enrichment; selected-SKU and empty-family recovery GET return200 | Two new actual-authorization tests fail first, then pass |
| New selected members lose lifecycle/Website labels | Preserve validated status and websiteStatus in the editor | New-member rendered assertion fails first, then passes |
| Family-name matching can hide the searched exact variant behind its sibling | Exact SKU/name, direct facts/options, then family-name-only relevance; retain production sort within each tier and group afterward | First assembled browser run20/21; focused correction2/2 and final23/23 pass |

The candidate adds only family runtime modules, the protected route/service/editor integration, bounded optional public linking, discovery/card/detail/cart/checkout presentation and focused verification. Existing recovery implementation is reused. Progressive search/pagination, card hover imagery, optional audit reasons/status changes, unrelated security UI and Knowledge SEO are excluded. The featured comparison is lazy-loaded to retain the existing landing budget.

Independent final source review: **approved,0Critical/0Important** after all three findings were addressed. This is a bounded local review, not production acceptance.

## Passing local evidence

- `npm run test:product-families`:18Node and23actual-component Chromium tests, exit0; includes375/1440 layouts, keyboard focus/scroll, sparse choices, eligibility, sold-out truth, exact-SKU basket lines, version/lost-reply recovery and lifecycle labels.
- `node --test tests/website-assignment-recovery.test.mjs tests/admin-product-master-actor.test.mjs`:8/8, exit0.
- `npm run verify:development`: once after final source/test edits, exit0. No rerun after documentation.
- `npm --ignore-scripts run build:storefront`: exit0; boundary/secret scan and147.42/150.50kBJS,29.95/30.00kBCSS gzip budget pass.
- `npm --ignore-scripts run build:admin`: exit0; separate boundary/secret scan and226.68/300.00kBminified budget pass.

Logs, SHA256source/evidence pins and warnings: [receipt.json](product-family-candidate-20261022/receipt.json). Current synthetic phone/desktop captures: `docs/design-checkpoints/20261021-product-families/`; both375px editor/options captures visually inspected without overflow. Images are local fixture evidence, not production products or hosted acceptance.

## Installed state, limits and recovery

The owner separately approved and installed the exact migration on22October; retained source SHA256is`e3ffcaa9b9029cb92d3c071c411f6131c67ba8053a4828f99f53b3f9648bb1cb`. It is unchanged and **must not be replayed**. No SQL/provider/business-data operation was performed in this candidate work. Earlier isolated native SQL evidence is reused; the single captured verifier input is included at`docs/acceptance/product-knowledge-install-20261021/live-function-metadata.json`, and the retained local rehearsal expects the existing PostgreSQL17.11runtime at`.tools/postgresql-17.11/runtime/pgsql/bin`. No new SQL rehearsal or live database equivalence is claimed.

This source is locally prepared and verified. Main has not been pushed/merged, no live release gate or promotion ran, and no family rows were assigned. Last retained read-only inventory snapshot remains196SKUs,93Live/Website,103Draft,49lots,273projectedunits and0families. The complete original241lines were accounted for separately; source presence does not resolve missing primary images, identities, selling units/prices, taxonomy, human review or physical stock. No Draft was newly approved or published.

Production promotion requires the explicit owner release request in MASTER_ACTION_PLAN.md, one final release gate, fresh exact-K2 preflight/readiness and verification of both actual production artifacts. Real supported grouping decisions and exact-SKU cart/order/reservation/FEFO acceptance remain in that same MAP item. A token is not authorization.

Recovery before promotion: keep or revert only this feature branch; preserve the primary checkout's unrelated changes. After a separately authorized assignment, use normal versioned ungrouping to remove presentation membership while retaining events/receipts. Never restore old SKU/lot/order rows or replay/drop the installed schema to undo browsing presentation.
