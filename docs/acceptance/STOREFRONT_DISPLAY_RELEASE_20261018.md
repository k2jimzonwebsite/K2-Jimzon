FULL RELEASE GATE PASSED —1464Playwright cases,15resumed stages terminal0, Vercel output packaging and both separate artifact boundaries/budgets/secret checks pass. Exact machine-readable evidence: STOREFRONT_DISPLAY_RELEASE_20261018.json. Owner-authorized source push/promotion is next; no production release claimed yet. Historical in-progress prose below is superseded for local gate only.

# Approved release execution

Owner explicitly answered “Release the verified display fixes.” Isolated production-base checkout contains the approved eight source/test files, with CRLF-only normalization verified. Full release gate is currently running before any push. Existing separate Admin/storefront projects remain targets. No inventory, SQL, provider-setting or credential change. Prior prepared-only evidence follows; real deployment receipt will supersede it. Owning MAP-023 remains active for physical inventory work.

# Storefront display correction — local acceptance, 18 October2026

MAP-023 /IDEA-20261018-02, merged with existing catalog correction IDEA-20261018-01. Owner goal remains production-ready inventory with available facts. This slice corrects observed display defects; no production code release or inventory change is claimed.

| Before | Prepared correction | Why |
| --- | --- | --- |
| Actual public Combino shows1000(Bag), schema weight has unitless name1000 | Shared canonical grams formatter renders1kg(Bag) in both visible rows; schema value1000/unitCodeGRM | Both presentations state the same stored physical mass, preserving decimal precision |
| Invalid/blank weights can render as content | Omit unknown, nonpositive and malformed weights | Do not invent specifications |
| Transparent PRIMARY shows the AFTER scene through its canvas; labels imply packaging contents | Existing prepared solid backing and Base product/After use labels | Separate authentic pack pixels from illustrative serving scene |
| ProductVisual/featured/gallery media use multiply blending | Remove image/video blend classes; retain original source colors | Real blue bag became nearly black in dark mode |
| Gallery uses cover for portrait packaging | Contain the complete portrait image | Preserve top/bottom seal and printed1kg label |

Root cause evidence: normal Admin explicitly defines net_weight as grams; actual ProductPassport render1000(Bag), schema{name:1000}, and malformed-weight assertions fail3/3 before change. PHOTO_BLEND_RED.json plus browser assertion shows mixBlendMode multiply/opacity1/filter none before correction. No provider/read/write or new canonical data logic was introduced.

Focused node command `node --test tests/product-net-weight.test.mjs` passes3/3 after correction. It renders the actual ProductPassport and exercises exact/decimal/numeric-string and absent/invalid weights plus structured data. Final `npm run verify:development` exits0:87session/recovery checks,32readiness contracts, remaining security/import checks pass,2617file secret scan clean. Exact retained logs: weight-tests-final.log and development-final.log. Gate reruns followed newly discovered functional source edits, not documentation changes.

Compiled Storefront Vite build succeeds (1128modules; existing3Dchunk size warning remains). Isolated outputs/.../compiled-storefront served only on127.0.0.1:5297 and read the real anonymous public catalog. No cart/order/message/payment command was submitted. Phone390x844 and desktop1440x900 in both themes: both images decode, both weight rows1kg(Bag), schema1000GRM, document width equals client width375/1425, slider backings opaque, image normal/opacity1/filter none. Earlier keyboard ArrowLeft58→52 passes unchanged handler. Final gallery click proves actual image object-fit contain, normal blending, complete decode and parent opacity1. Evidence: COMPILED_WEIGHT_SLIDER_FINAL.json, GALLERY_FIDELITY_VERIFICATION.json, four final-compiled screenshots, compiled-final-gallery.png. Desktop-dark/phone-light images visually inspected; no physical-touch/full-accessibility claim. Final image/video/featured no-blend consistency and gallery contain follow-up compiled separately, with focused gallery verification; four-variant evidence concerns unchanged primary slider/weight paths. No indefinite cosmetic QA loop.

All four mandatory design skills applied with K2 identity retained. Refinement only: no new font, palette, motion, layout world, price, stock or physical claim. Existing screenshots/current product were visual authority. Impeccable context resolved existing brand/web PRODUCT.md and DESIGN.md, no surface brief. Existing prebuild scripts reuse security contracts; no new package dependency.

Exact bounded8-file candidate relative to current production base44d793a34b7d871f4577e291bcda3f407b920aa8: DISPLAY_RELEASE_CANDIDATE.json and STOREFRONT_DISPLAY_RELEASE_CANDIDATE.patch, SHA256 5d9815f3fd2d7e6a17fcdbc81930039a5f5aae9563fdf30e721b2e98f9820365. Includes six existing source files plus net-weight helper and focused test. Reverse apply check passes against current selected files; unrelated dirty work is excluded. No commit/push/merge/Vercel deployment occurred.

Remaining in MAP-023: owner explicit live-promotion authorization, then isolated candidate application/full release gate/separate production artifact verification; never ship the entire dirty worktree accidentally. Staff package/price/taxonomy/expiry/unit review and canonical receiving remain separate; unknown facts stay blank under owner direction. Existing live Combino remains349PHP/10bags/3lots. Full inventory readiness remains unproven.

Recovery before release: inverse only the eight-file patch after checking current pins; preserve unrelated edits and all production data. After authorized deployment, normal prior-artifact rollback requires the deployment receipt; no database rollback belongs to this source-only patch. Never restore generated packaging as authentic.


Durable source-release visual witnesses are committed at docs/evidence/20261018-display-release/prepared-desktop-dark.png, prepared-phone-light.png and prepared-browser-checks.json. These are LOCAL COMPILED prior witnesses; live evidence remains required after promotion. Source patch includes only approved8app/testfiles; supporting rulebook/SystemBrain/MAP/idea/design/acceptance/evidence records accompany it for traceability.
