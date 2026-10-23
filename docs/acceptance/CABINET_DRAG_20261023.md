# Draggable two-column Cabinet — 23 October2026

MAP-023 / IDEA-20261023-02. The owner supplied a screenshot of the tall three-column Cabinet and asked for left/right dragging and mobile optimization, then explicitly confirmed two cards side by side. This is a local source preparation receipt, not a live release.

| Before | Locally verified after | Why |
| --- | --- | --- |
| One phone column / three desktop columns, all rows exposed. | Two cards side by side at320/375/768/1440; native horizontal strip. | Match the confirmed browsing layout and keep the section compact. |
| No horizontal mouse drag. | Thresholded pointer capture, release-click suppression and fresh gesture recovery. | Dragging must not navigate; deliberate taps/clicks still open exact categories. |
| Long mobile titles have constrained horizontal space. | Stacked icon/text, wrapped title/count/subtitle and full-card touch target. | Keep long actual category names readable without page overflow. |
| No rail controls. |44px previous/next with honest disabled bounds; focusable rail supports arrows/Home/End. | Keyboard and non-drag users retain complete access. |

Decision: native overflow and scroll snapping with small mouse handlers, existing React/Tailwind and incumbent K2 wood/editorial styling. Transform-based carousel/dependency rejected as unnecessary state and gesture complexity; a tall two-column grid would not supply requested horizontal dragging. Existing storeCategories/counts/category query/Pasabuy destinations are retained; no API/data/provider/price/stock/publication change. Native touch preserves vertical page scrolling. No autoplay or decorative motion. Reduced-motion controls are instant; pointer movement does not write React state each frame.

The first actual-page check failed because the rail was absent. Local geometry then exposed browser snap anchoring to initially rendered Pasabuy when async categories prepend; the section resets its initial position when section count changes. Independent review found mouse-drag suppression persisting into a fresh touch gesture. An actual mouse-drag→touch-tap regression failed before the correction and passed afterward. Fresh nonmouse gestures clear stale state; lost capture clears its held pointer and blur releases capture/clears state. The original mouse-release click remains suppressed. Reviewer rechecked and approved with no remaining Critical/Important finding.

Executed evidence:

- Initial focused Cabinet checks12/12 pass; scoped category suite24/24 before hybrid correction.
- Final npm run test:store-categories:26 browser cases pass, plus existing Node category checks. Includes native Chromium touch swipe and vertical page scroll, mouse-versus-click, exact category/Pasabuy destinations, hybrid/blur recovery, keyboard/bounds, empty/single-category, long names, normal/reduced motion and resize.
- Final npm run verify:development: exit0. One later screenshot-only test edit disables transition capture, with its focused check and final development0 retained. No unaffected browser suite/build was repeated for documentation.
- Eight320/375/768/1440 light/dark captures and long-name320light/dark inspected in a bounded initial+confirmation round. The dark long-name transitional frame was recaptured with CSS transitions fast-forwarded. All four required design skills applied; existing identity retained. These are synthetic actual-page fixtures, not hosted or physical-device acceptance.

Source: src/components/home/CategoryTiles.jsx and tests/store-categories-ui.spec.js only. Source base d0421fdf167c1880510537b329245c08a3cf35d1; approved PR22 source has independently promoted at a3982419dcd87f20d19433dbc503adcb31e81869. The Cabinet branch incorporates released main, including receipt-only e8a9833a. The documentation merge preserves both records, and exact component/test Git object hashes match the verified Cabinet commit. Current screenshots and checks are in cabinet-drag-20261023/receipt.json and docs/design-checkpoints/20261023-cabinet/.

Next/recovery lives only MAP-023: reviewed Cabinet PR, explicit Cabinet source-release request, required CI and one release gate before any later promotion, then both separate artifacts and real Cabinet interaction verified. No Cabinet production release is authorized by the earlier PR22 approval. Revert only this component/test slice and matching records to recover; preserve all unrelated dirty files and original pending operational requests. Do not restore product/stock snapshots or replay SQL. Physical-device acceptance remains unverified.

## Performance gate correction

23October2026 / MAP-023 / IDEA-20261023-02 performance correction: PR23 initial CI39893751441 refused CSS30.17/30.00kB. Equivalent local snap/size/scrollbar styles and reused focus/cursor/alignment rules reduce it to29.99/30.00, with JS148.56/150.50; thresholds unchanged. First local30.02 failure preserved. All15Cabinet-focused browser cases and final development0 pass; independent style-delta review approved. The owner approved PR23 after gates pass. Exact revised-head CI and full release coverage remain mandatory before merge. Evidence/source pins: docs/acceptance/CABINET_DRAG_20261023.md. The single release invocation began against85fb455; final style-equivalent source is separately focused-qualified without restarting passing unaffected tests. The completed qualification receipt must distinguish these source states and preserve the failing CI/build logs.


### Cabinet production configuration correction — 23 October2026

MAP-023 / IDEA-20261023-02: PR23 merged409dbcd after final-head CI passed on retry and the local release gate passed. Admin production dpl_CMgfkjebhpMJu26HvvRAxzMb5Phu is READY. Storefront dpl_CJxW7P35K5VcgPS9MpVHToU2v5kL failed JS150.55/150.50kB (CSS29.98/30.00 passed); prior storefront remains live. A local build with the public K2 URL and guest/customer switches enabled reproduces150.58kB, while the unconfigured local build was148.56. CI now tests those public production branches; no secrets or provider settings changed. Duplicate control mapping did not save bytes and was reverted. Category data is rendered directly and lost capture shares the equivalent finish handler; useId, recovery, counts, bounds and destinations remain. Owner explicitly chose removing the two decorative hover ticks; the resulting configured build passes JS150.46/150.50 and CSS29.99/30.00. All26 browser category cases pass. Final development/release/CI and real-host proof remain required; owning next action and rollback stay in MAP-023. No Cabinet production success or data change is claimed.


Final qualification correction: release invocation at842bdbc failed one CI contract after1104 passing base checks because the old assertion banned VITE_SUPABASE_URL anywhere in the workflow. The safeguard now checks the npm-test acceptance step and a new regression requires all public production flags to remain confined to the storefront build, absent from every other step including Admin. All13 focused CI contract checks pass. Obsolete CI39897758175 canceled after diagnosis; its SQL job had passed. A fresh exact-head CI/release qualification is required before promotion. Runtime source is unchanged by this test correction.
