# Barcode assisted listing & Gemini provider integration: local preparation

Owner request: staff scan the package barcode, obtain public product suggestions, then prepare SEO listing text and optional generated images. Staff must also be able to upload their own storefront photos. The owner confirmed two complementary AI workflows:
1. **Way 1 (Quick Draft at Step 1):** Suggest instant public SEO copy (card description, SEO title, meta description, keywords) from public Open Food Facts grocery details via Google Gemini free-tier before packaging photos are taken.
2. **Way 2 (Deep Intake Analysis at Step 3):** The separate, inactive paid OpenAI adapter can generate full product research content (`k2.product-content.v3`) from uploaded packaging evidence photos (`PRIMARY`, `BACK`, `BARCODE`) after OWNER-007 approval. Gemini free tier does not receive these photos.

The existing `InventoryGrid` Photos action opens `PhotoManagerModal` and its upload fields for primary, after-use and up to five supporting storefront photos. The upload uses the protected media API when Admin BFF is active, or the current transitional staff Storage path when it is off. Intake photos are private evidence and are never published automatically. The intake and Photos copy now explains the staff upload choice after Draft. This is a local UI clarification, not a new image generator or a verified live upload.

Changed source:
- `server/admin-bff/barcode-catalog.js`: Fixed read-only Open Food Facts lookup with check digit, 5s timeout, rate shield, and no image imports.
- `prepared-api/admin/product-intake/barcode-lookup.js`: Protected Admin route for barcode lookup.
- `server/admin-bff/gemini-public-draft.js` and its route: Gemini free-tier public catalog SEO suggestions, with a 5 req/min route shield, strict JSON schema and character limits. Never transmits private data or package photos.
- `prepared-api/admin/product-intake/public-seo-draft.js`: Protected Admin route for public SEO suggestions.
- `server/admin-bff/intake-ai-provider.js`: Antigravity's Gemini-first package-photo path was removed during review because it conflicted with the owner's public-details-only choice. The existing paid OpenAI adapter remains inactive.
- `src/services/adminBffService.js`: Added client helpers `lookupProductBarcodeBff` and `publicSeoDraftBff`.
- `src/views/admin/ProductIntakeSessionModal.jsx`: Step 1 barcode catalog display, staff confirmation checkbox, and "Suggest SEO from public details" review text panel.
- `tests/barcode-catalog-lookup.spec.js`: 3 tests for grocery lookup, check digit validation, and error boundaries.
- `tests/gemini-public-draft.spec.js`: 3 tests for Gemini public-only input, output schema validation, and server-only key boundary.
- `tests/intake-ai-provider.spec.js`: Existing paid-adapter checks plus a new regression that proves a free Gemini key cannot receive package evidence.
- `tests/intake-ai-ui.spec.js`: 21 tests covering barcode catalog UI, Gemini public draft review, photo evidence retention, and staff-governed Draft creation.

Verification on 24 September 2026:
- `npx playwright test --config=playwright.api.config.js tests/intake-ai-provider.spec.js tests/gemini-public-draft.spec.js tests/barcode-catalog-lookup.spec.js tests/security-surface-inventory.spec.js`: 30 passed after the privacy correction.
- After the staff-photo copy clarification and test fixture correction, `npx playwright test --config=playwright.api.config.js tests/intake-ai-provider.spec.js`: 20 passed, including the Gemini/private-photo separation case.
- `npx playwright test --config=playwright.intake-ai.config.js tests/intake-ai-ui.spec.js --grep "fresh public SEO data"`: 1 passed with browser launch permitted outside the sandbox. It covers a changed public quantity after staff confirmation. The first run was blocked by Chromium `spawn EPERM` in the sandbox, and an ordinary load-event wait hung on a dependent resource; the focused case uses response-commit navigation and then waits for the relevant UI. This does not constitute a full repeat of the intake suite.
- `npx playwright test --config=playwright.intake-ai.config.js`: 21 passed across all intake UI steps, including phone fixtures and Gemini review cards.
- Final `npm run verify:development`: exit 0 after a fixture string that resembled a secret was corrected; secret scanner passed (1,626 files checked, 0 leaks), environment boundaries clean, dependency policies satisfied, and import integrity verified.
- Final `npm run build:admin`: exit 0; separate Admin artifact budget passed at 217.34 kB / 300.00 kB minified (59.08 kB gzip).
- After the catalog-change guard, `npm run verify:development` exited 0 and `npm run build:admin` exited 0 again. The Admin artifact remained within budget at 217.34 kB / 300.00 kB minified (59.08 kB gzip). The official Gemini model and `responseFormat` fields were checked against current Google API documentation; no billable provider request was made.
- After switching the public-only request to Gemini 3.5 Flash-Lite, `npx playwright test --config=playwright.api.config.js tests/gemini-public-draft.spec.js` passed 3/3 and the final `npm run verify:development` exited 0. No new Admin UI edit followed the passing Admin build.
- `git diff --check`: clean formatting.

Live provider probe on 24 September: a local-key call with public Open Food Facts barcode, name, brand and quantity returned HTTP 400 because `responseFormat.text.mimeType` used `application/json` where the current API requires `APPLICATION_JSON`. The code and mock contract were corrected. Gemini 3.1 Flash-Lite then returned HTTP 503 twice (temporary high demand). The same bounded public-only request to Gemini 3.5 Flash-Lite returned `card_description`, `seo_title`, `meta_description` and three `search_keywords`; the prepared route now targets 3.5. The local key was loaded privately and never printed. These probes did not send package photos, K2 records or customer data. Google references: https://ai.google.dev/api/generate-content (TextResponseFormat enum) and https://ai.google.dev/gemini-api/docs/pricing (3.5 Flash-Lite free tier).

One direct read-only `lookupBarcodeCatalog('3017620422003')` call returned `found` with a matching barcode and nonempty name, brand and quantity. This proves that representative public lookup from the local machine only; it does not prove coverage of K2's actual stock or the protected Admin route on its live host.

Limits: most tests use simulated API responses and isolated local harnesses. The owner added `GEMINI_API_KEY` as a Production Secret in the Admin Vercel project and reports a redeploy; we verified the variable name and Secret type, not an exact deployed source or successful exact-host request. The successful 3.5 probe was local with a public fixture product; no paid provider charge, Supabase migration, or exact-host staff journey was verified. `VITE_ADMIN_BFF_ENABLED` remains OFF in production until MAP-020 cutover. Gemini free tier is restricted to freshly fetched public catalog fields; package photos and private K2 records are not sent. Do not enable the paid path from the Gemini key alone.

Recovery: revert these bounded routes and provider helpers on the feature branch. The existing manual product intake, canonical product records, inventory lots, and publication workflows remain intact and fully functional without AI.

## Manual and automatic listing check, 24 September

- API and product/media contracts: `npm run test:intake-ai` 31/31; `npm run verify:map018-intake` exit 0 (static gate only); targeted Playwright product intake/media contracts 14/14.
- Phone browser fixture: automatic paid-content result through field review and one server Draft, plus confirmed-barcode public Gemini suggestion: 2/2 passed. Manual pasted `k2.product-content.v3` JSON through staff review and one server Draft, with zero generation actions: 1/1 passed. Staff photo upload held assignment until upload completed: 1/1 passed.
- `npm run verify:development` exit 0; `npm run build:admin` exit 0, Admin application 217.34 kB against 300.00 kB minified budget. A stale public SEO fixture was updated to match the exact barcode, name, brand and quantity guard.
- The protected Admin inventory chooser previously labeled a preview-only Smart Paste screen as the main new-product action and called phone intake a Manual Form. It now starts the phone intake as the main new-product action and labels the preview separately. Legacy Admin routing is unchanged.
- All browser API results above were simulated. No actual K2 label, stock, live product insert, live media upload, exact-host Gemini request or publication was exercised. The production Admin BFF is still off. MAP-018 retains those real acceptance tasks; MAP-017/020 gate activation and OWNER-007 gates paid generation.

Rollback: revert the chooser copy/routing and the two test adjustments if necessary; no provider or database state changed in this check. For operational recovery of an intake attempt, reopen the saved intake session and use its exact retry or correction action rather than starting another Draft.
