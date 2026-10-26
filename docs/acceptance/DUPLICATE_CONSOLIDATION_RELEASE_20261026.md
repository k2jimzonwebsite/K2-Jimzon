# Duplicate correction source release — 26 October 2026

MAP-023 / IDEA-20261025-04 and IDEA-20261026-02. The owner-requested fix is committed, fast-forwarded and pushed to production-linked `main` at `9bbf17693581157c9e6c20c9f749024504deed4a`. Both separate production artifacts are verified Ready on exactly this source and their canonical aliases:

| Artifact | Project | Deployment |
| --- | --- | --- |
| Storefront | k2-jimzon | dpl_Efy3GDJtETsqUzwn3i93qGPsc6td |
| Admin BOS | k2-jimzon-admin | dpl_BvQxwUjFejzhY91aHGLrn5Mkr6eY |

Authenticated Vercel metadata binds each artifact to the exact main SHA and aliases. Canonical hosts return HTTP200, correct isolated build markers, loadable entry assets and existing security headers. Reloaded actual storefront search shows exactly two Borella cards with45/64available. Reloaded authenticated Admin Inventory shows196records/126active/273projectedunits. The full live data/audit/lot result is in [the applied receipt](DUPLICATE_CONSOLIDATION_APPLIED_20261026.md); no additional business decision followed promotion.

The feature branch `codex/borella-duplicate-consolidation` was removed locally and remotely only after its entire history was confirmed in remote main. A separate newly existing Dependabot branch remains outside this duplicate-fix scope; no unmerged dependency work was discarded. Two untracked historical generated screenshot directories remain preserved locally and were excluded from all commits.

Verification: final development and reconciled complete local release coverage are retained in the applied/qualification receipts, including their original failures and passing successors. Independent final review verified bounded product/balance/listing diffs, all196records/49lots/273units and exact durable/raw conservation evidence, with no material findings. Every required pre-push hook passed13unit+7contract+8renderedsecurity cases and import integrity. No clean original aggregate exit0 is claimed.

[GitHub CI40281130698](https://github.com/k2jimzonwebsite/K2-Jimzon/actions/runs/40281130698) is still running after the successful source promotion. Its critical-sql-behavior job passed; build-and-smoke is executing the full acceptance suite and security-check-regression is installing Chromium. This is not a claim that remote CI is green. The remaining receipt-only CI observation is recorded separately in MAP-023; do not repeat the passing local release or replay schema/data commands while awaiting it. This final receipt commit changes no application/runtime inputs and requires no redundant application build or deployment verification.

Recovery: prior source artifacts on main1526ae9e were Storefrontdpl_CHrkUS6jYFY6s46YNTxk2cnjKouW and Admindpl_3XrZkFauy6FwKKc13juXdfrLS2bP. Source/artifact rollback is separate from the already-applied database state. Preserve merge events, original lot IDs and subsequent operations; any data correction requires reviewed forward recovery, never a stale database rewind or original installer replay. Private canonical HTTP evidence is `.tools/duplicate-products-20261026/production-http.json`; the paired JSON preserves sanitized deployment and browser evidence.
