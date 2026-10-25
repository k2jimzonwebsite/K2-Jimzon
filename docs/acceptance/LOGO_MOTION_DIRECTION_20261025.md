# Logo placement and motion — accepted implementation, 25 October 2026

Owner request: apply the preceding logo placement and motion recommendation. Owning backlog: MAP-028 / IDEA-20261025-05. The owner's “proceed on applying it” accepts source implementation; it does not request a production main release. Branch: codex/logo-motion-direction, based on main 7c764830.

## What changed and why

The header now uses the original cream K2 aircraft badge at 36 px beside the readable K2 Jimzon name. Responsive name sizing preserves the existing compact header and 44 px home control. The footer uses the original standalone globe at 112 × 102 px, plus the existing name and sourcing copy. A noninteractive footer wordmark is now a span instead of an inert button. The large AVAILABLE @ promotional seal is not used as navigation artwork.

The website uses a finite 720 ms sweep along the existing flight curve, followed by a brief aircraft color highlight. The original artwork remains fully intact beneath both overlays. The arrival runs once per document lifetime on the first eligible Home appearance, after artwork loads; ordinary SPA navigation does not replay it. Fine-pointer intent gets a 180 ms highlight. Keyboard focus does not trigger a hover animation. Reduced motion starts and stays resolved; preference changes, hidden/offscreen state and unmount cancel active overlays. Shopping controls never wait for motion. Native Web Animations handles these two effects; no animation dependency or new CSS stylesheet was added. Motionmaxxing informed the brand-specific motif; no separate film was produced or claimed.

The original composite is preserved unedited in logo-motion-20261025/owner-logo-sheet.png (SHA256 8915045eb2afeac0f62a5f857bf1465e359a024fd288293708028676fbc96064). Runtime delivery uses a quality-85 WebP encoding of the same composition, 129,856 bytes, SHA256 b51b870bc89a325226f772b87b5dc177d9d60469058e1af42cc936e961f8cd57. This is compressed raster artwork, not a new vector master. Compact display viewport is 230 × 230 with source offset -756/-725; globe is 320 × 290 at -710/-930. Decorative SVG crops preserve source letterforms. The highlight stencil is measured from source ink at x928–965/y779–818 with luminance threshold210; only the optional color overlay uses it, never the underlying artwork. The selected cream variant works against both K2 themes.

Browser/app PNG icons were captured from the resolved SVG viewport in a headless browser (192/512/180 px); SVG icon wrappers embed the captured PNG and explicitly declare intrinsic sizes. The maskable wrapper keeps the emblem inside an 80% central region. These replace the unrelated legacy K-only icons; manifest filenames and the separate production artifacts stay intact. A generated isolation attempt changed letter proportions and was rejected; none of that output is shipped.

## Verification and corrections

- Failing first: the new rendered 375 px regression failed because the compact mark did not exist.
- An initial 15/16 expanded result found missing explicit SVG intrinsic sizes; focused decode passed after that fix.
- Independent review found that an approximate moving raster cutout left aircraft fragments behind. A measured cutout still exposed background edges. Both were rejected. The final intact-image overlay approach resolves the defect; prior images remain clearly marked rejected.
- Final `npx playwright test tests/brand-logo.spec.js tests/homepage-mobile-fixes.spec.js --config=playwright.selling.config.js`: **33/33 pass**, exit0. Includes 320/375/430/768/1024/1440 light/dark logo layout, reduced motion, finite hover, navigation replay prevention, failed-image readable name, delivery size, icon decoding, existing shopping actions/rail/arrivals and 200% text. Dummy HTTP fixtures and blocked external services make this local behavior evidence, not live inventory/account/provider acceptance. See browser-final.log.
- Final `npm run verify:development`: **exit0**, including security/source/import checks. See development-final.log.
- Final `npm run build:storefront`: **exit0**; boundary/secret checks pass; landing JS128.50/150.50 kB gzip, CSS29.97/30.00. No threshold increase. See storefront-build-final.log.
- Final `npm run build:admin`: **exit0**; separate boundary/secret checks pass; application226.86/300.00 kB minified. See admin-build-final.log.
- Independent follow-up review: no Critical/Important findings. Actual 0/250/500/720 ms captures inspected. Start and end SHA256 are identical: 97ec1fbb94c7422f11821b9f2a260781f26ff66e04025b7587fc3ee0b1210f7a. See motion-*.png. No live/physical-device claim.

The four required design skills, using-superpowers, brainstorming/accepted direction, writing-plans (plan kept only in MAP), Karpathy, TDD, verification, review and branch-completion guidance informed this slice. The approved brief overrides unrelated style defaults. Local screenshots use the hermetic test font/network environment; final hosted font/render and physical device/install acceptance remain separate.

## Handoff and recovery

Changed source: src/components/ui/BrandMark.jsx; Wordmark in bits.jsx; StoreHeader.jsx; Footer.jsx. Assets: public/brand/k2-owner-sheet.webp and existing icon files. Regression: tests/brand-logo.spec.js. Authoritative design/operations/Brain/project boundary records point here.

This receipt documents locally verified feature source. No production main promotion, actual-host verification, real phone/PWA install, database/provider or business-record change is claimed. Existing completed mobile release and separate unfinished SKU work are preserved. MAP-028 owns any remaining exact-host/device acceptance and separately requested release gate/promotion. A layered SVG master and a separate 3–4 second film remain optional future assets, not blockers to this verified raster-based implementation and not new active backlogs.

Rollback: revert only this feature's source, public brand/icons, regression and scoped documentation to the preceding main version. No provider/database rollback applies. Keep unrelated dirty screenshots and SKU work untouched. Before an owner-requested production release, run verify:release once, satisfy current release gates, promote the separate Storefront/Admin artifacts and check their actual hosts. Do not infer a live release from a pushed feature branch or READY Preview.

Publication receipt: source1e127ed3 plus receipt-only049c07ae are pushed to codex/logo-motion-direction; draft PR30 is open at https://github.com/k2jimzonwebsite/K2-Jimzon/pull/30 and attached to this chat. The connected GitHub integration returned403 on PR creation; authenticated repository CLI created the draft successfully. This final publication note/MAP update changes no application input and requires no duplicate build or browser run. Production main remains unchanged.

25 October final release supersedes earlier draft-only state: PR30/ede57563/tree9646be31 is verified live on both separate artifacts and actual hosts; logo/icon assets match qualified source hashes. Full final scope, CI/reconciled release evidence, remaining device/operational limits and recovery: MAIN_CONSOLIDATION_20261025.md.
