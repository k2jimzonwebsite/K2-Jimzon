# Current Admin and storefront release — 14 October 2026

Owner request: verify newer Admin/storefront commits, fix concrete defects and publish to GitHub and Vercel. IDEA-20261014-02 is accepted into MAP-025. MAP-018 is closed; its signer/coordinator/rehearsal work is retired. Current source branch: codex/dummy-production-acceptance, starting HEAD70a59797,115commits ahead of production b6ef5863308e60caa4d9b16da3978c5a8f50f37a.

## Changes and reason

- Restore Website-action keyboard focus to the visible same-SKU button after a mobile/desktop breakpoint change; keep its compact visual label and consistent accessible name. Correct conditional React hook order in ProductAiEnrichmentModal; clear product/open-cycle state and ignore stale asynchronous completions. Share a cache key based on the actual bounded product facts. Verify cache reuse with an over500-character description.
- Accepted description/search keywords/storage/usage suggestions populate the canonical Product Master editor. Public catalog photos are references, separately assigned through Photos. No external image URL is falsely counted as a saved master field.
- Normalize numeric net weight to a string with grams before Gemini validation; send bounded existing description and forbid invented package preparation/storage/opened shelf life. Accept reference-photo URLs only from the exact HTTPS Open Food Facts image host.
- Preserve new manual listing/cards/storefront layouts. Restore the12px Admin text floor, wrap helper navigation on phones, preserve human review and inactive-host fallback. Correct FAQ button semantics, accordion labels,44px targets and reduced-motion behavior.
- Keep expanded FAQ categories while correcting claims about marketplace synchronization, payment, freshness, delivery/flight timing and wholesale reservation to match current operations.
- Remove superseded execution-history/completed records from the active MAP; preserve the Single Master Inventory standing rule. Include the existing read-only readiness classifier and its permission fixture because tracked readiness code already imports them; this is publication of a required dependency, not resumed MAP-018 work.

## Evidence and limits

- New browser regression reproduced the hook crash before repair. Final focused local journey passes opening/reopening, matching cache reuse,375/1440overflow checks, explicit field deselection and accepted-field handoff into the actual canonical editor (intercepted synthetic API).
- Initial focused contracts:149passed/7failed; five failures were sandbox-blocked loopback HTTP and then pass5/5 with actual local HTTP access. Photo/copy contracts were corrected; subsequent28focused checks pass.
- First complete release gate:1098passed/3failed in base suite; failures were the new undersized Admin text, lost manual-handoff wording and Single Master Inventory ID removed during MAP cleanup. All three corrected;44affected contract checks pass. Second release invocation passes1101base checks and4mobile moderation checks, then its Vite orientation server stalls with file watching. Exact owned PID1992 is stopped; existing K2_ACCEPTANCE_NO_WATCH=true permits immediate focused orientation startup. Affected suites were resumed rather than repeating passing unaffected checks; the final coverage matrix below owns current evidence. The historical npm aggregate invocations exited1 and are retained honestly.
- Final development verification passes after the typography/cache/responsive-focus changes (53Admin checks, source boundaries/secret scan/import integrity green). `git diff --check` passes.
- Read-only K2 identity confirms pixplcjqivlfflickobf; readiness reports7verified/2owner/3script-unreached/0failed, latest installation20261013110000,0products/0lots. This does not authorize SQL, import or inventory creation.
- Correct K2 Vercel dashboard is observed under k2jimzonwebsite. Storefront rollback deployment HCUnL6rSxj9ayVZCzMv3SUtYPzr1; Admin rollback deployment AKmVJ82fMzrhwp2fi3aQZSexm5ao, both production main/b6ef586. Admin K2_ADMIN_BFF_ENABLED=false and VITE_ADMIN_BFF_ENABLED=false. GEMINI_API_KEY name present; its value is not accessed. Flags/credentials are unchanged. AI paid-provider execution and authenticated production staff journeys are not proved by synthetic tests.
- Independent review dispatch failed twice at model capacity. Primary source review, focused runtime evidence and release gate are the available review evidence; no independent approval is claimed.

Logs: `.tools/release-gate-20261014.log`, `.tools/release-gate-final-20261014.log`, `.tools/release-development-final-20261014.log`. Screenshots: `docs/design-checkpoints/20261014-release/listing-optimizer-375.png` and `listing-optimizer-1440.png` (synthetic fixture).


## Final local release coverage

All constituents of verify:release are qualified on the current app source. The aggregate command was resumed through its constituent suites after concrete failures; no claim is made that the historical aggregate invocation returned0. Passing unaffected suites were reused per owner cadence. Later source changes were limited to opted-in responsive Website focus restoration; final affected Admin contracts/browser journeys, development gate and Admin build pass.

| Check | Current result | Evidence |
| --- | --- | --- |
| Base source/API/browser acceptance |1101passed |release-gate-publish-20261014.log |
| Mobile/PWA contracts |4passed |same aggregate log |
| Store orientation/readability/overlays |12passed |same aggregate log; orientation focused log |
| Storefront navigation/motion/theme/cart |30passed plus both failed cases now pass individually (32covered) |aggregate log; storefront-focused/contact-focused logs |
| Storefront recovery |29passed |release-test-storefront-recovery-20261014.log |
| Admin navigation and shop stock |41+8passed |release-test-admin-ui-20261014.log |
| Payment/recovery/legacy intake |42+1passed |release-test-payment-ui-20261014.log |
| Inbox |41passed |release-test-inbox-ui-20261014.log |
| Product Master and secure Sheet |56+2passed, composite exit0 |release-master-final-20261014.log |
| Website, batch, optimizer and mobile actions |19passed (includes14Website cases), exit0 |release-admin-final-20261014.log |
| Owner close / customer account / selling / receipt |1/8/14/2passed, each exit0 |corresponding release-test-* logs |
| Workflow API and map |4+11passed, composite exit0; initial isolated timeout did not reproduce |release-workflow-final-20261014.log |
| Intake AI browser |26passed |release-test-intake-ai-ui-20261014.log |
| Final affected source contracts |35passed |admin-dialog/admin-logic/single-master focused command |
| Readiness classifier |13passed |node --test tests/k2-installed-readiness.test.mjs |
| Development and dependency audit |exit0;0vulnerabilities |release-development-complete-20261014.log; dependency-audit log |
| Vercel packaging and Storefront build |exit0; JS148.92/150.50kB gzip, CSS29.96/30.00kB gzip |release-artifacts-20261014.log |
| Final Admin build |exit0;222.41/300.00kB minified; boundary/secret checks pass |release-admin-build-final-20261014.log |

1449release Playwright cases are covered across the named suites (additional Node/package/focused checks listed separately). Source review found no remaining release-blocking issue within this batch. Physical device, real staff/account, actual payment/fulfillment, paid Gemini and inactive BFF acceptance remain unverified. Final375/1440helper captures are inspected and retained; these use synthetic facts and intercepted responses. Existing tests rewrite historical screenshots; only those generated modifications are restored to their original Git bytes before commit, while current release captures are kept separately.

## Publication state and recovery

Published and production verified,14October2026 at16:48Singapore/Manila time. GitHub main is ff41dc92bc3017303be6dd19164d3eea8a2d5d5b, fast-forwarded from b6ef5863. Both GitHub Vercel commit statuses are success. Storefront deployment D9ip2w6eh6utGMMNtU9QwsvjAgSj (k2-jimzon-fae255s1c-k2-jimzon.vercel.app) is Ready/Production/current www.k2jimzon.com on the exact SHA; Admin deployment3yY9qZkM3KeMksWa6bFKbKctDxPV (k2-jimzon-admin-i0b95v6x9-k2-jimzon.vercel.app) is Ready/Production/current admin.k2jimzon.com on the same SHA. Both remote builds took50seconds, queued separately.

Public GET readback passes9/9: Storefront home/catalog/contact200, storefront-target=storefront200, Storefront Admin API404; Admin entry200, admin-target=admin200, opposite Storefront API404 and existing inactive Admin BFF404. Receipts: .tools/release-live-storefront-20261014.json and .tools/release-live-admin-20261014.json. Hydrated live Storefront shows the new story/FAQ/contact content and no arrivals; current signed-in Admin session shows the dashboard and Inventory,0SKUs,Sheet mode off. Both inspected desktop documents fit1280px (scrollWidth1265). No submission, generated AI call or write was performed.

GitHub CI run38537322610: critical-sql-behavior success; build-and-smoke still in progress at final snapshot. This later CI receipt remains MAP-025; no duplicate local acceptance or deployment is needed to record it. This post-publication documentation is retained in the local feature-branch receipt commit so it does not trigger a redundant production build. Published application SHA remains ff41dc92. Exact remaining execution and blockers stay in MAP-025. Preserve existing untracked historical tools/evidence; only the required read-only readiness dependency/fixture are included. No database change, inventory import, credential rotation or BFF activation is included. Recover source by reverting the bounded release-fix commit; recover hosting by promoting each project's prior deployment listed above. Retain saved canonical requests and current database data; do not replay the successful installation.
