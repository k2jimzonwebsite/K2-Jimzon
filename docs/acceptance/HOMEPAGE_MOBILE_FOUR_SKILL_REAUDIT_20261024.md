# Current homepage four-skill re-audit — 24 October 2026

Owning MAP-023 / IDEA-20261024-02. Owner requested verification of what exists now using all four required design skills. Audit only; no application,photo,data,provider,branch push or deployment change.

## Current source versus live

Local candidate: ca0f27cd3bc17d88c2c7386e12dc45a1271d8826 on codex/mobile-homepage-fixes. Every recorded application/test/config SHA-256 matches qualification.json; no source drift was found.

Actual canonical www.k2jimzon.com still resolves to READY dpl_AeFYdfXiD8uARk7oY8gvvkrbCXB2, source da2872816b83d79d55abc951f3e25aa8d067e214. Fresh normal-browser375x812 dark inspection confirms the old layout: primary CTA y732.406–780.406, mobile navigation starts y751.406,29px overlap; preview image width85.328px; hero1664.813px tall; Monthly Cargo Flights badge still computes rgb(252,251,249). The local corrections are not deployed. Initial dark theme preserved and temporary viewport reset. No Admin write or catalog publication decision was made.

## Four-skill council

| Skill | Before / live older source | Current local candidate | Audit conclusion |
| --- | --- | --- | --- |
| UI/UX Pro Max | Shopping action is partly hidden by navigation; map control targets/labels are tiny. | Fresh fixture checks pass CTA/nav/chat bounds,44px native controls,larger usable image areas and keyboard shopping. | Original reachability/control findings pass locally; full screen-reader and physical-device touch are unverified. |
| Impeccable | Five decorative white badges break the dark canvas; dense route micro-labels consume space. | Decorative transit strips removed,existing theme tokens/wood canvas preserved,short route label and reduced introductory density. | Original theme/composition defects addressed locally. Source-photo whites are not classified as UI token regressions. |
| Design Taste Frontend | Three cramped cards,fragmented short labels and inconsistent photo prominence. | Two visible cards in a native rail,whole-name wrapping,larger photos,compact serif heading and intentional name/price layout; desktop character retained. | Hierarchy improved. Two nonblocking H04 follow-ups remain: rail discovery and source-photo framing consistency. |
| Emil Design Engineering | Floating chat obscures content; SVG waypoints lack a practical keyboard path; mobile layout inherits display density. | In-flow homepage chat,named native route buttons,keyboard selection,stable theme/layout behavior and reduced-motion-aware entry. | Interaction changes pass the inspected scope. Native physical touch and all-device gesture behavior are not established by viewport emulation. |

No P0/P1 issue was newly found in the inspected local candidate. This is bounded audit evidence,not a whole-product or WCAG-conformance certification.

## Remaining nonblocking observations

- P2 / H04 native-rail discovery: src/components/home/Hero.css:14 provides two complete visible cards in horizontal overflow; Hero.jsx:62 adds no explicit next/previous control,partial third-card peek or swipe cue. Keyboard focus reaches the third card in the fresh tests,so this is discoverability rather than failed navigation. A quiet visual cue/peek could improve it without restoring word clutter. This is a refinement of existing IDEA-20261024-02/H04,not a new active feature or release prerequisite.
- P2 / H04 source-photo framing: approved source photos contain different scene/transparent whitespace,so equal CSS boxes still show subjects at different apparent scales. Existing cached-photo light/dark captures demonstrate the difference. The padding defect is corrected; this remaining source quality concern needs item-specific media review if pursued. Preserve actual colors,labels and assigned SKU identities; do not infer permission for replacements,background removal or merging similar-looking products. This remains a qualified source observation outside the current release queue.

## Fresh and reused verification

Fresh npx playwright test --config=playwright.selling.config.js tests/homepage-mobile-fixes.spec.js exits0/11 cases:320/375/430/768/1440 both themes plus200% text/ordinary motion. Controls are exercised through actual Home components and intercepted test catalog calls; no external business write. Source detector on Hero.jsx/Hero.css/FlightMap.jsx/NewArrivals.jsx/StorefrontChatButton.jsx/Home.jsx returns[]/exit0. A first attempt to write the detector output under the managed worktree was refused by its read-only sandbox; the permitted managed-worktree call then succeeded. That path-access failure is not an application failure. Empty source-pattern findings do not replace rendered review.

The current source exactly matches the earlier passing14 homepage/hero+7 readability checks,development0,configured Storefront build150.17/150.50JS and29.97/30.00CSS,and separate Admin compile/boundary/budget/secrets. Those unaffected gates were reused rather than rerun. No complete release gate or deployment was requested/performed in this audit. Actual physical-device touch,full AT,live fixed-page acceptance and comprehensive performance profiling remain unverified.

Fresh synthetic320 light and prior unchanged-source cached-photo375 dark captures were visually inspected. Existing recorded light/dark/desktop captures remain applicable by source identity. The real-media captures are local intercepted fixtures using unchanged audited photo bytes and fixture stock/prices; they are not current live product or stock evidence.

Provisional bounded scores: accessibility3/4,responsive3/4,theming3/4,implementation integrity3/4,performance3/4 from retained build evidence only,total15/20. Network/Core Web Vitals and physical input were not profiled; this score describes only the inspected presentation scope. Preserve16px body text,44px controls,visible focus,canonical facts,the existing brand register and unchanged bundle limits.

## Records, next action and recovery

Fresh logs: docs/acceptance/homepage-mobile-fixes-20261024/audit-recheck.log and audit-detector-recheck.json. Prior qualification/source hashes/design rationale: HOMEPAGE_MOBILE_FIXES_20261024.md and homepage-mobile-fixes-20261024/qualification.json. MAP-023 remains the sole active queue. Next required action remains an explicit release request followed by a scoped current-main candidate,one complete verify:release/required CI and separate artifact/actual-host acceptance. Optional rail/media observations above are qualified/deferred and do not silently create another implementation batch.

Recommended optional commands if those refinements are later requested: $impeccable adapt for the rail cue,$impeccable polish for final consistent presentation; no photo mutation follows from this audit. Documentation-only recovery corrects this scoped receipt if invalidated. Runtime recovery remains the named UI/test/config rollback in the implementation receipt; no database/product snapshot restore. No code or deployment changed during this re-audit.
