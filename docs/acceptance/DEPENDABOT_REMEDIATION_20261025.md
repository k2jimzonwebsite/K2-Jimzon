# Dependabot remediation — 25 October 2026

MAP-021 / IDEA-20261025-01. The owner requests Dependabot fixes through developer GitHub access and explicitly authorizes merging and deploying verified fixes. Initial PR18/19 remediation is verified live. Newly generated PR27 is a separate unfinished qualification within the same MAP item; it is not deployed.

## Verified initial release

PR18 was updated through a normal merge and fast-forward push, preserving production source and the original bot history. Qualified head: `d88d985015b7286805fd94bbdb81016aed1c11af`. Exact-head CI [40156205765](https://github.com/k2jimzonwebsite/K2-Jimzon/actions/runs/40156205765) passes both jobs, including configured target builds, the complete acceptance suite and isolated PostgreSQL rehearsals. Both Vercel previews pass. Independent review found no actionable issues and confirmed every non-Motion lock entry equals PR19.

[PR18](https://github.com/k2jimzonwebsite/K2-Jimzon/pull/18) merged at `280efb49a7d142ad05ab5c9ea7c8389150f374c3` on 25 October at 03:12:10 UTC. Its tree and the qualified head both equal `25dac25228927e6c0d15cb128f28798d6b6f3f0b`. PR19 closed automatically at 03:14:50 UTC after its compatible updates were incorporated; a later close command only confirmed its already-closed state.

| Package | Before | Verified live after PR18 |
| --- | --- | --- |
| Motion | 13.1.1 | 14.0.0 |
| framer-motion / motion-dom / motion-utils | 13.1.1 / 13.1.1 / 13.0.0 | 14.0.0 each |
| @react-three/fiber | 9.8.1 | 9.8.2 |
| @supabase/supabase-js | 2.117.2 | 2.118.0 |
| react / react-dom | 19.3.0 | 19.3.1 |
| @playwright/test / playwright | 1.63.0 | 1.64.1 |
| vite | 8.2.4 | 8.3.5 |

Exact versions: `dependabot-20261025/versions.json`. Clean npm ci, valid peers, unchanged license/install-script policy (20 direct / 246 locked / 2 reviewed scripts), npm audit zero known vulnerabilities, 22 SDK/auth tests, 11 workflow-map tests, 10 focused shopper tests, final development verification and independent review pass. The single local complete release run reaches all 1,552 browser cases, API checks, Vercel-output packaging checks and both target builds without a failed group. Storefront JS is 147.75/150.50 kB gzip, CSS 29.99/30.00; Admin application is 226.68/300.00 kB minified. The detached completion watcher could not recover the original aggregate process exit code (`release-exit.json` contains null); do not describe that field as zero. Complete command coverage is retained in `release.log` and corroborated by successful exact-head CI. No redundant aggregate rerun is required.

The old PR18 failure was an outdated 375px workflow overflow case, not compilation or public API incompatibility. That exact case passes on unchanged current production before upgrading and afterward. An isolated Motion14.3.1 candidate was rejected at 151.43/150.50 kB; no threshold was changed. Both its failure and the accepted 14.0.0 measurements are retained.

## Hosted acceptance and recovery

Both separate Vercel artifacts are observed through the existing signed-in K2 owner browser, not the unavailable connector:

| Artifact | Ready production deployment | Source | Canonical host |
| --- | --- | --- | --- |
| Storefront | `dpl_AU8WxKyc32ArBtQvxQnWEBV3zwB8` | `280efb49a7d142ad05ab5c9ea7c8389150f374c3` | www.k2jimzon.com |
| Admin | `dpl_9tpfVLXGE6a8Jnm2787FVzY6JMea` | same exact source | admin.k2jimzon.com |

Both hosts return HTTP200 and the correct target markers. HSTS, nosniff, frame denial and referrer policy pass; Report-Only CSP exactly matches each checked-in Vercel contract. The initial probe incorrectly expected enforced CSP and is preserved as `initial-csp-probe.json`; the corrected source-contract check passes without changing headers. This is not a CSP-enforcement claim.

Actual English and Italian pistachio search each finds the same five listings; partial001173 finds Siciliani Crunchy alone. A single jar is added to the local browser basket and reaches the live review form at PHP499. Actual390px dark/light checkout each has one static inline help opener, zero overlap with the 301x52 submit control (x37,y696.21875) and document width375<=390. Enter opens help, Escape closes it and returns focus to the opener. No contact details, CAPTCHA completion, chat message, order, payment or receipt was submitted. The jar was removed, cart0 and dark theme restored. Actual authenticated Admin renders196 records,130active,66drafts and273 displayed units (not a physical count); a dedicated375px workflow map loads with document width360 and no document overflow. Four-skill inspection of saved actual captures passes.

Fresh read-only K2 identity/readiness immediately before merge passes exact project `pixplcjqivlfflickobf`:9verified/2owner/3connector/0failed. The owner environment command runs from the original checkout; its reported branch is not the dependency branch. Actual dependency branch/head/tree are independently pinned above. Script-unreached connector/provider states are not claimed observed. No SQL, provider/security setting, token scope, product, price, stock or customer record changed.

Rollback baselines on original source `b3f9dc67437bc3a351a5a3dd4ddc94df36a3168b`: Storefront `dpl_6TqmsnFVYUjPR8gFfzAUDvergvAA`, Admin `dpl_Di4RUvqvTAdqvqj98V49CajQywDh`. Prefer a qualified revert of only manifest/lock changes, or the corresponding previous per-project deployment. Preserve subsequent canonical data and pending commands; never restore a stale database or replay product/SQL installation. Generated historical test captures remain unstaged.

## Access and monitoring boundary

GitHub CLI account EdgerzXc has pull/push/triage and no admin/maintain. The alerts endpoint returns403 and explicitly reports alerts disabled. This is not an observed empty alert list, and npm audit0 is not evidence that ongoing GitHub monitoring is enabled. Owner-controlled alert enablement remains in MAP-021. No owner GitHub credential, permission expansion, vulnerability dismissal or monitoring weakening was used.

## Newly generated PR27 — unfinished

After PR18 merged, Dependabot opened [PR27](https://github.com/k2jimzonwebsite/K2-Jimzon/pull/27), coherent Motion14.0.0→14.5.0 lockfile update, head `7fdc88632400938cd2fe0c12007fb7020a6608ce`. CI40157503292 fails Storefront landing budget at153.49/150.50 kB JS,29.98/30.00 CSS; Admin preview and critical SQL pass. Preserve its failed evidence and existing live14.0.0. ACCEPT/MERGE this follow-up into the same MAP-021 dependency slice; the owner's verified-fixes release authorization applies, but no unchecked update is merged.

The landing already uses slim Motion entries. Investigate the smallest behavior-preserving import correction, including compile-time exclusion of development-only catalog fixtures while retaining the existing synchronous LazyMotion provider. Preserve gestures/layout that need domMax, existing behavior, brand, reduced motion, accessibility and all budget/security thresholds. Objective acceptance: exact upgraded lockfile, unchanged budgets, focused actual animation/cart/chat/keyboard/reflow tests, final development once, independent review, complete release coverage/exact-head CI, fresh K2 read-only gates and both hosted artifacts after any second promotion. Until then PR27 and alert monitoring remain explicitly unfinished in the sole active MAP item.

Primary compatibility references: [React upgrade guide](https://motion.dev/docs/react-upgrade-guide), [changelog](https://motion.dev/changelog?type=major), [bundle-size guide](https://motion.dev/docs/react-reduce-bundle-size). Slim m supports the same declarative components through LazyMotion; domAnimation supplies animation/exit/tap/hover/focus, while drag/layout require domMax. ui-ux-pro-max, impeccable, design-taste-frontend, emil-design-eng, Superpowers verification/debugging and Andrej Karpathy preserve current surfaces while qualifying dependency behavior. No redesign is proposed.

PR27 diagnostic update: the root GlobeCmsProvider is the actual remaining legacy-catalog consumer. A StoreContext compile-time guard experiment makes no emitted-byte difference and is discarded. Accepted smallest correction moves the unchanged provider to its already deferred GlobeSection consumer (reusing an outer provider in combined mode) and extracts the identical peso formatter for eager price labels. No catalog, globe mapping, review source, animation feature, first-paint text or security policy is replaced. A network regression must fail before and pass after, alongside unchanged build budgets.

## PR27 continuation — prepared, local gates passed

This chat continues the exact prior candidate in isolated branch `codex/dependabot-continuation`, preserving the earlier checkout. The GitHub connector currently identifies as k2jimzonwebsite; Git CLI identity/access is checked separately. Vercel connector now observes the two existing K2 projects, so prior connector-unavailable wording is historical. No account/permission or provider settings were changed.

The production Storefront root no longer imports GlobeCmsProvider. Its existing deferred GlobeSection supplies that provider only when absent, reusing the combined development root context. Three eager price consumers use identical `src/lib/formatMoney.js`; the legacy export stays compatible. Globe curation, remote review truth, loading/error/empty behavior and every Motion feature remain unchanged.

Failing-first module-network regression and subsequent four passing Motion cases, ten shopper cases, clean npm ci/audit0, valid npm peers, fresh four-case Motion rerun and final `npm run verify:development` exit0 are retained under `dependabot-20261025/motion145/`. Existing unchanged landing budget passes142.55/150.50kB JS and29.98/30.00kB CSS. Independent review has no Critical/Important issues; mechanical design detector returns an empty finding array. Source hashes normalize CRLF only. This is local evidence, not a deployed claim.

Next: complete `npm run verify:release` once, exact updated PR27 CI/previews, fresh owner-environment read-only identity/readiness, then authorized merge and both actual production artifacts/hosts. Recovery before merge is a scoped revert of this provider/formatter/test slice; after merge revert the same PR source or select the prior per-project deployment, preserving all canonical data and pending requests. GitHub alert monitoring remains separately owner-controlled.

### Preserved failed aggregate and focused correction

The single full local release invocation on c2bcfadd exits1 at an obsolete source-text expectation requiring the public provider in StorefrontApp. All other1117 shared cases, preceding Node/SQL rehearsals and product-family/category stages pass. Exact initial log and exit1 are preserved. Only that test now follows the deferred public provider location, preserving every secure Admin/lazy-Supabase assertion and asserting no eager root provider. Focused rerun1/1, final development0 and independent follow-up review pass. No application source change. Resume only unrun release stages after test:base; exact revised-head CI still runs the complete configured suite. Do not describe this as an original clean aggregate0.
