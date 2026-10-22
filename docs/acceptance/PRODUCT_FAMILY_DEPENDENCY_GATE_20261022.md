# Family candidate dependency gate —22October2026

Owner: MAP-023 / IDEA-20261022-03. Draft [PR21](https://github.com/k2jimzonwebsite/K2-Jimzon/pull/21), branch `codex/inventory-variations`; initial source`38fc7a9`.

The first [CI39807735874](https://github.com/k2jimzonwebsite/K2-Jimzon/actions/runs/39807735874) failed its required npm audit before application checks. The unchanged production lockfile contained Vite8.2.2; the local registry audit reproduced one high vulnerable package with six advisories. The separate critical SQL behavior job passed. Neither result is live production acceptance.

Accepted minimal repair: package.json and the lockfile root now require`^8.2.4`; the sole changed locked package is Vite8.2.2→8.2.4 with the official registry integrity. Every transitive version/metadata is retained. No product code, audit threshold, policy exception or CI configuration changed. A transient range resolution selected8.3.5 locally; it was discarded before verification or commit, and the prior lockfile was restored before exact8.2.4 resolution.

The [maintainer advisory](https://github.com/advisories/GHSA-587h-7wmj-h5pm) names8.2.4 as a patched release; [release/changelog](https://github.com/vitejs/vite/releases/tag/v8.2.4) and official npm metadata were checked. This is a development-tool exposure and a demonstrated CI prerequisite, not proof of an exploited production vulnerability.

Fresh patched evidence: npm audit reports **0 vulnerabilities**; dependency policy passes20direct/246locked/2reviewed install scripts. Existing family suite passes18Node/23Chromium. The final development gate for this dependency batch passes once; both artifact boundaries/secret scans and budgets remain147.42kBJS/29.95kBCSS storefront gzip and226.68kBAdmin minified. Logs and exact hashes are in [receipt.json](product-family-candidate-20261022/receipt.json). No further app rerun is needed for documentation.

Independent dependency-diff review approved with0Critical/0Important. Patched-source CI receipt remains pending. Keep PR draft and main unchanged until those pass and the owner explicitly requests source promotion. No production database/provider/family/product decision occurred. All family assignment, held Draft and real-host order/FEFO boundaries remain MAP-023.

Recovery: revert only this dependency patch to the initial source38fc7a9; that restores the known audit failure, so promotion must stay held. Preserve source feature tests/review, primary unrelated work and the already-installed family schema. Never suppress the audit or replay the migration to address this failure.
