# Session handoff — 7 October 2026

## Goal and authority

Continue the owner's full production-ready storefront, staff Admin BOS, and inventory-listing goal. The goal remains unfinished. This is a frozen handoff snapshot; [MASTER_ACTION_PLAN.md](../MASTER_ACTION_PLAN.md) is the only active backlog. MAP-018 owns the current work; consult its current dependencies and linked MAP items before continuing.

CSV importing is accepted complete by the owner. Reuse its 38/0 receipt; do not restart importer verification. No defensible weighted production-readiness baseline exists, so do not invent a percentage remaining.

## Resume context

- Workspace: `C:\Users\jerze\K2 JImzon`
- Branch: `codex/map017-guest-chat-preview`
- HEAD at handoff: `bf1d879f9175049ef3de7cad0edfa184076cd8f2`
- The checkout has substantial prior modified and untracked work, including prepared SQL, evidence, and `.backups`. Preserve it. Do not reset, clean, or restore whole files to discard a small change.
- Start with installed `using-superpowers`, then applicable process skills. Code work requires `andrej-karpathy`; visible UI work requires all four repository design skills. Impeccable 4.5.0 is already installed, newer than the requested 4.4.0 update. Its stale design context was left untouched.
- Read the operations rulebook, System Brain, MAP, Project Map, and Architecture before implementation. Read PRODUCT.md and DESIGN.md before visual decisions.
- Use the in-app browser for provider inspection as requested. The available Supabase connector targets ScoutIT and must not be used for K2.

## What advanced, and what is still open

| Area | Evidence / state | Limit |
| --- | --- | --- |
| CSV importing | Owner-accepted; existing 38/0 receipt reused | Existing imported Drafts still need a genuine signed path into review/publication |
| Canonical taxonomy review | Local API 67/67, Admin browser 2/2, native 29/29 | Missing live Product Master boundary and empty live taxonomy |
| Category-policy recovery / interrupted install | Local final-14 retry4: native 155/155 and primary audit 257/257 | Narrow recovery evidence; not full package, all-writer, provider, or real-host acceptance |
| Public eligible stock | Local archived 72/0 evidence | Prepared migration not applied to K2 provider |
| Storefront stock-read failure | Local source branch changed; source-contract suite 4/4 passes | Rendered browser regression has no passing receipt; not deployed |

Reuse existing evidence rather than rerunning unaffected suites. The apparent lack of visible production progress reflects the gap between local qualification and provider/real operational acceptance; local passes do not close that gap.

Relevant receipts:

- [Category-policy recovery and interruption](evidence/20261004-category-shelf-life/foundation-qualified-schema-taxonomy-final-14-policy-recovery-interruption-retry4/README.md)
- [Public eligible stock](evidence/20261002-public-eligible-stock/README.md)
- [Catalog spreadsheet runbook](runbooks/CATALOG_SPREADSHEET_RUNBOOK.md)
- [Product intake runbook](runbooks/PRODUCT_INTAKE_RUNBOOK.md)

## Live K2 state observed in the in-app browser

Read-only observations on 6 October against project `pixplcjqivlfflickobf`:

- Latest migration: `20260928092634 order_payment_receipt_chat_20260928`.
- Products: 30 total; 22 Live/published, 3 Draft/unpublished, 5 Discontinued/unpublished.
- Batches 21; inventory balances 29; inventory events 0; product drafts 0; channel listings 0.
- `globe_products=17` is separate CMS configuration, not channel-listing evidence.
- Product Master routine/event boundary absent; brands 0; categories 0.
- Dashboard reported no backups and no connected Supabase GitHub repository. K2 account: `k2jimzonwebsite@gmail.com`.
- Live `get_public_product_stock()` baseline body hash: `009576b4d06b8f2b6853d958361a2136`; it uses compatibility quantity and lacks Website-membership checking. The prepared replacement is `supabase/migrations/20261002035106_public_eligible_website_stock.sql`.

No migration, taxonomy seed, provider setting, physical stock, listing, or deployment was changed. Empty `channel_listings` alone does not establish an empty storefront: the current legacy product query also uses product publication/status.

## Unfinished stock-failure change

Changed locally in this session:

- `src/context/StoreContext.jsx`: if the authoritative batch-stock read fails, keep products discoverable but set `stock_available=null`; no fallback to potentially stale `products.stock_available`.
- `tests/catalog-freshness-contract.spec.js`: assert the unknown-stock branch and absence of row-stock fallback.
- `tests/storefront-recovery-ui.spec.js`: synthetic stock-view 403 with a product-row count of 47, expecting visible product/stale banner, unknown-stock label, disabled add button, and no stale count.

Existing StockPill, ProductCard, and cart guards already handle unknown stock. No new UI styling/markup was introduced.

Verification observed:

```powershell
npx playwright test --config=playwright.api.config.js tests/catalog-freshness-contract.spec.js
```

Result: **4/4 passed, exit 0** after the source change. The targeted contract first failed before the change (TDD red); the later whitespace-sensitive assertion was corrected to a regex.

Rendered regression command:

```powershell
npx playwright test --config=playwright.storefront-recovery.config.js tests/storefront-recovery-ui.spec.js --grep "failed batch-stock read" --output=C:\tmp\k2-storefront-stock-projection-20261006
```

The sandbox Chromium attempt failed with `spawn EPERM` (failure, not a skip). A normal-access attempt using direct `/catalog` navigation timed out at 180 seconds in `page.goto`. The test was revised to the existing product-route/Catalog-breadcrumb pattern. Its last runner handle was subsequently unavailable, with no recovered output artifacts or passing result. **Final rendered outcome remains unverified.** A timed-out sandbox loopback probe is not proof that the server was absent.

## Exact next action and remaining gates

Resume MAP-018 by diagnosing the isolated storefront fixture/Vite navigation and runner lifecycle, then finish the focused rendered stock-read failure/recovery evidence. Preserve the passing four source contracts; do not restart a broad suite to diagnose this failure. Record results and recovery in MAP-018 before claiming completion.

After that, follow the active MAP dependency order for the signed imported-Draft review → canonical taxonomy/SKU → receiving or authorized opening balance → eligible lot → protected publication/Website listing chain. Imported CSV Drafts currently have no intake-session link: `intake_session_create` cannot adopt an existing product, publication requires a genuine session, and `listing_set` does not publish a product. The proposed existing-Draft continuation design still awaits specific owner direction. Never fabricate session IDs, bypass signed commands, or publish through direct SQL.

The current MAP also retains full-package replay/drift/populated recovery, current all-writer concurrency, same-target provider capture/grants/install/recovery, provider HTTP, real-host/end-to-end behavior, actual inventory counts/source facts/media/custody, and human acceptance. Local synthetic quantities are preparation evidence, not real inventory.

Owner-parked `verify:development`, security/private-cleanup checks remain parked after ENOBUFS. Do not restart them for this documentation handoff. Run a complete release gate only immediately before an owner-requested live promotion. Keep storefront and Admin as separate production artifacts/Vercel projects. No main push, live migration, stock write, or deployment is authorized by this handoff.

## Recovery

No provider rollback is needed because no live change occurred. If the new stock-failure approach must be withdrawn, reverse only this session's StoreContext and two test hunks; preserve all other checkout changes. Use the evidence runbooks for disposable-clone recovery, never the original restore/provider. Do not remove MAP-018 while acceptance remains open.

## Paste into the next session

> Continue the full production-ready K2 storefront, Admin BOS, and inventory-listing goal from `docs/SESSION_HANDOFF_20261007_PRODUCTION_INVENTORY.md`. Read repository AGENTS rules and the required authority documents, then use current MASTER_ACTION_PLAN.md as the sole backlog. Preserve the dirty branch and all prepared evidence. CSV importing is owner-accepted complete; reuse existing receipts. First resolve MAP-018's unfinished rendered StoreContext stock-read failure regression; four source-contract tests pass, but browser evidence is unverified. Then continue the signed imported-Draft-to-inventory-to-Website chain in MAP dependency order, respecting the pending existing-Draft design decision. Use the in-app browser for K2 provider inspection. Keep local, provider-applied, deployed, and real-host evidence distinct. Keep owner-parked broad checks parked; no main/live migration/deployment or physical-stock writes without specific authorization.
