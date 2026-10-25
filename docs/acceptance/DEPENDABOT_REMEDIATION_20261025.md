# Dependabot remediation — 25 October 2026

MAP-021 / IDEA-20261025-01. Owner explicitly requests inspection/fixes using developer GitHub access, then authorizes merge and deployment of verified changes. Current state: prepared final dependency set, focused checks/release qualification in progress. No production claim yet.

## Scope and authority

GitHub CLI is authenticated as EdgerzXc with pull/push/triage, no admin/maintain. No owner credential, token-scope expansion or security-setting change is used. The Dependabot alerts API returns403 and explicitly says alerts are disabled; this is not an observed empty alert list. Repository security settings are unavailable to this developer. The npm baseline and final audits both report0known vulnerabilities. Those findings do not enable or substitute for ongoing GitHub alert monitoring. Owner-controlled alert enablement remains a separate settings action.

Two open version-update PRs:18Motion13.1.1→14.0.0 (old failed CI38162657623),19seven compatible lockfile updates (current headcd054a55, both CI jobs and previews pass). The old Motion failure is375pxworkflow document overflow, not a compilation/API failure; both old builds passed. The same existing case passes on current production source before any upgrade. Existing main is b3f9dc67, preserving the verified shopper release and all preceding operations.

Apply the exact PR19 compatible lockfile first; unchanged supply-chain policy,22existing SDK/auth/QR/PKCE/session cases and zero-vulnerability audit pass. Then normally merge the old Motion branch into current history (no force push), preserving production code. Motion14.3.1 was an isolated candidate only: targeted build reports151.43/150.50kB landing JS, so it is rejected for this release; limits remain unchanged. The original requested Motion14.0.0 target passes147.75/150.50kB JS and29.99/30.00kB CSS. Its coherent internal packages are resolved in the lockfile. No application source, API, database, provider configuration, product/stock/price or UI redesign is required.

Final exact versions are retained in dependabot-20261025/versions.json. Direct compatible upgrades: fiber9.8.1→9.8.2, Supabase2.117.2→2.118.0, React/ReactDOM19.3.0→19.3.1, Playwright/test1.63.0→1.64.1, Vite8.2.4→8.3.5. Manifest Motion constraint becomes^14.0.0 and lock14.0.0; framer-motion/motion-dom/motion-utils resolve coherently14.0.0. The newer14.3.1 build failure is not hidden or solved by disabling budget tests. It remains evidence for a future independently qualified patch update, not part of these existing PR targets.

## Compatibility and design review

[Motion's official React upgrade guide](https://motion.dev/docs/react-upgrade-guide) states no public React API breaking changes for14, with internal API/versioning changes; [official changelog](https://motion.dev/changelog?type=major) describes stricter internal pinning. Registry peer metadata allows React18/19; Vite8.3.5 requires Node^20.19or≥22.12, met by the Node24 runtime. npm ls reports no invalid peers. Both registry install scripts and license policy stay unchanged. PR19's retained release notes cite primary package releases; no forced peer install, policy exemption or vulnerability dismissal is used.

Superpowers debugging/staged verification, dependency-upgrade and Andrej Karpathy constrain this to manifests/lock and evidence. ui-ux-pro-max, impeccable, design-taste-frontend and emil-design-eng preserve the incumbent storefront wood/editorial identity and Admin operational layout during responsive/motion review. No new page or design system. Existing focused workflow-map and shopper cases verify motion/reduced-motion, keyboard, responsive action clearance and current behavior; screenshots distinguish fixtures from hosted acceptance.

| Before | After target | Why |
| --- | --- | --- |
| Old Motion PR fails an outdated phone overflow case | Current production-based dependency candidate must pass that exact case and current workflow suite | Test actual compatibility instead of treating an old red check as proof of an API defect |
| Compatible package updates and Motion held separately | Verify compatible stage, then the original Motion14.0.0 target with full combined qualification | Preserve dependency isolation and avoid multiple live promotions |
| Motion14.3.1 exceeds the landing budget | Retain the requested14.0.0 version that passes the unchanged limit | No automatic acceptance of a larger unrequested patch candidate |

## Next checks and recovery

Complete focused workflow/shopper evidence, final development once after final edits, independent review and complete release qualification/exact-head CI. Update existing PR18 through a normal fast-forward push of merged history and rewrite its title/body for the full final scope. Merge only after green qualification and fresh read-only exact-K2/zero-failed readiness; verify both separate Vercel projects/custom hosts through the existing owner browser and representative shopper/staff behavior. Supersede PR19 only when its exact equivalent compatible upgrades are included in verified main. No force push, approval bypass, provider token mutation or security-alert dismissal.

Recovery restores only package.json/package-lock.json from b3f9dc67 on a fresh qualified branch, then performs target-specific source rollback. Preserve all canonical data, original dirty workspaces, pending commands and failed/passing receipts. Do not replay SQL/product saves or restore a stale database. Owner's live release approval is recorded in MAP-021; all unfinished execution stays there.


## Final local candidate qualification

Clean npm ci succeeds on the final lockfile. Existing workflow-map11/11 and shopper10/10 pass with matching Playwright1.64.1 Chromium1248. The exact old phone overflow case passes before/after the upgrade; no source/CSS workaround is needed. Four-skill visual inspection of the phone map and dark checkout fixture captures passes (synthetic data/blocked challenge state, not hosted transaction evidence). Final npm run verify:development exits0 after the last dependency edit; unchanged policy reports20direct/246locked/2reviewed install scripts. Final audit0and npm ls complete with no invalid peers. Independent code review confirms non-Motion lock entries exactly match PR19, coherent Motion14.0.0internals, no application/backend/security-policy/budget changes and no actionable findings. Full release qualification and exact-head CI remain pending at this commit.
