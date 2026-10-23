# Cabinet production release — 23 October2026

MAP-023 / IDEA-20261023-02. The owner approved publishing PR23 after gates pass and explicitly chose removing the two decorative hover ticks during its bounded production correction, PR24. The Cabinet is live and verified. This completes the Cabinet slice;103Draft listing holds and broader operational acceptance remain in MAP-023.

## Released artifacts

Qualified head:fa6a578b5f28f7cf5ff924673b30fd5da97a6d29. Production merge:3975f2fd9ed4f833f07f72e4768b6fa977f161e9. The runtime, test and workflow Git objects match the qualified head. PR24 merged23October2026 at04:20:16UTC.

| Artifact | Deployment | Verified host |
| --- | --- | --- |
| Storefront | dpl_GAy5LLMp9EEZWUWfVaXppDirULbD — READY, exact production source | www.k2jimzon.com / k2jimzon.com aliases; HTTP200 storefront marker |
| Admin | dpl_Ti8CP9nvmNPSd2xv4S7JJynQ8f89 — READY, exact production source | admin.k2jimzon.com alias; HTTP200 admin marker |

Actual production budget: JS150.42/150.50kB and CSS29.98/30.00kB gzip. Limits remain unchanged. No database, product, price, stock, publication, credentials or provider configuration write occurred.

## Verified behavior

- Real storefront at1280px: two602.5px cards within1217px rail; all15 categories/counts plus Pasabuy preserved, totaling93published products. Native mouse drag changes rail0→615 without navigation. A subsequent intentional Beverages click opens /catalog?category=Beverages with the selected filter and one Bellarum Orzo result.
- Real storefront at375px: two158px cards within328px rail. Document/client width360px (375px viewport includes scrollbar), so no horizontal page overflow. Next changes rail0→340 and enables Previous. Keyboard End reaches2380 with Next disabled; Home restores the start. Card text, hints and44px controls remain readable above bottom navigation.
- Actual signed-in Admin reload retains inventory:196total products,93active,103Drafts,273available units. No edit dialog, selection or pending business command is left open.
- Native touch/vertical page scroll, hybrid-input recovery, blur cleanup, normal/reduced motion,320/375/768/1440, light/dark and long-name behavior pass the26 category browser fixture cases.375px hosted proof is browser emulation, not physical-device touch acceptance.

## Qualification and preserved failures

PR23 merged409dbcd after its reviewed-head CI retry and local release coverage. Its Admin deployment reached READY, but storefront dpl_CJxW7P35K5VcgPS9MpVHToU2v5kL failed JS150.55/150.50 (CSS29.98 passed). Prior storefront continued serving. The failed build is retained in failed-production-build.json.

Public production configuration reproduces150.58kB locally, versus148.56 for the unconfigured build. Duplicate control mapping saved no bytes and was reverted. Direct category rendering and shared equivalent pointer-finish cleanup preserve content and recovery; useId and badges remain. Owner-selected removal of the two incidental hover-tick spans yields configured local JS150.46/150.50 and CSS29.99/30.00. Hosted corrected preview also passed; final production measured150.42/29.98.

CI now enables the public K2 URL and guest/customer switches only in its storefront build. The first correction release invocation at842bdbc stopped after1104 passing base checks because an older contract banned VITE_SUPABASE_URL anywhere in the workflow. Final test correction scopes that ban to acceptance and adds a regression rejecting those flags in every non-storefront-build step, including Admin and all fixtures. All13 focused contract checks pass. Obsolete CI39897758175 was canceled after diagnosis.

A later local invocation mistakenly exported production flags across inactive-commerce fixtures. Families/categories/base1106/moderation4/orientation12 passed; buyer/smoke failed under that incorrect invocation. The owned process tree was stopped. All23 affected buyer/smoke checks pass with their intended fixture settings. The unrun remainder then progressed through mobile/motion/theme9, recovery29, Admin42+8+5, payment47, Inbox, product management, Website assignment and owner-count checks without a reported failure. It was stopped as redundant after exact-head CI finished the complete acceptance command successfully. These failed/interrupted local aggregates are not described as exit0.

Final qualification is reconciled evidence: CI39898140906 SUCCESS on exactfa6a578 (both SQL and build-and-smoke jobs), including the complete npm-test command and both isolated production builds; local Build Output packaging3/3, CI contract13/13, final development exit0, category26/26, configured budget pass, and independent reviews without Critical/Important findings. Fresh owner-environment preflight confirms exactK2pixplcjqivlfflickobf; readiness reports9verified/2owner/3connector-unreached/0blocked. The connector exclusions and broader owner acceptance remain excluded, not silently promoted to observed evidence.

## Evidence and recovery

Companion folder cabinet-production-20261023 contains source/log hashes and Git objects (qualification.json), exact premerge/merge receipts, production metadata/build messages (production.json), host markers, preflight/readiness logs, actual desktop/mobile geometry, mouse-drag/mobile-control receipts, selected Beverages result and genuine Admin inventory summary. live-mobile-375.png and live-desktop.png show actual production; files named preview show earlier hosted preview only. Full private invocation logs remain .tools/cabinet-release-20261023 in the managed release worktree.

Rollback: preserve prior pack-size sourcea3982419dcd87f20d19433dbc503adcb31e81869, storefront dpl_GX28e64ScRgGjhX5UhDLFXtZc1Mm and Admin dpl_BCxbUMzAZSVxEDgYSm16vVxSMMHL. Restore only intended source/artifacts if needed; preserve all current catalog and stock history. No SQL replay or product snapshot restore belongs to this UI rollback.

Completed Cabinet action is removed from MAP-023 in the same receipt change. Exact next operational work remains the existing MAP-023 per-SKU evidence/human-review/publication and real order/payment/fulfillment acceptance. Unmatched identity, unsupported prices and held media stay held. Receipt-only changes require no application rerun or new deployment.
