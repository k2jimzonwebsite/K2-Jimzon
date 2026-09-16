# Evidence: Product-Led Storefront and Curated Related Provisions (MAP-023/027 I-009)

Date: 2026-09-15
Author: Antigravity
Authoritative Spec: `MASTER_ACTION_PLAN.md` (Item I-009), `PRODUCT.md`, `DESIGN.md`.

## 1. Problem & Architectural Rationale

Previously, every single product detail page (`MasterProduct.jsx`) rendered `<CatalogGrid />` at the bottom, repeating the entire 50+ item catalog, search inputs, category pills, and sorting controls beneath individual product specifications. On mobile viewports, this buried product context under excessive scrolling depth. Furthermore, `CatalogGrid.jsx` used a breakpoint of `min-[420px]:grid-cols-2`, forcing all standard phone viewports (375px - 414px) into a single tall column (`grid-cols-1`) where each card stretched to the full screen width.

## 2. Changes Made

### A. Curated Related Provisions (`src/views/MasterProduct.jsx`)
- Replaced the undifferentiated `<CatalogGrid />` with a lightweight, contextual `RelatedProducts` component.
- Dynamically selects up to 4 related products from `listedProducts` prioritizing the same pantry category or subcategory, excluding the active product.
- Implemented a responsive 2-column mobile layout (`grid grid-cols-1 gap-4 min-[370px]:grid-cols-2 md:grid-cols-4`).
- Provided a prominent, accessible direct link: "Browse full catalog" with `ArrowIcon` and $\ge 44$px touch target (`min-h-11`), navigating cleanly to `/catalog`.
- Removed `import CatalogGrid` from `MasterProduct.jsx`, reducing code weight and eliminating unnecessary re-renders.

### B. Mobile Catalog Scanning Density (`src/components/CatalogGrid.jsx`)
- Lowered the 2-column breakpoint from `min-[420px]` to `min-[370px]`.
- Allows standard mobile devices (375px iPhone, 390px iPhone, 412px Android) to browse the catalog in a balanced 2-column grid, doubling product scan density while preserving legible typography and $\ge 44\times 44$px touch targets (`ProductCard` action buttons).

## 3. Verification & Evidence

1. **Contract Tests**:
   - `tests/storefront-truth-contract.spec.js`: 14/14 PASS.
   - `npm run test:contracts`: 627/627 contract tests PASS + 8/8 selling surface journey tests PASS.
2. **Storefront Recovery Suite**:
   - `tests/storefront-recovery-ui.spec.js`: 10/10 PASS.
3. **Production Builds & Budgets**:
   - `npm run build:storefront`:
     - Landing JS: 149.74 kB / 150.50 kB gzip budget (PASS)
     - Landing CSS: 27.80 kB / 30.00 kB gzip budget (PASS)
     - Clean secret scan (0 secrets)
   - `npm run build:admin`:
     - Admin application chunk: 191.12 kB / 300.00 kB minified budget (PASS)
     - Clean secret scan (0 secrets)
4. **Visual Evidence Artifacts**:
   - `desktop-product-related.png`: Desktop product detail page with curated related provisions and browse catalog link.
   - `mobile-product-related.png`: 375×812 viewport showing clean 2-column related provisions layout.
   - `mobile-catalog-2col.png`: 375×812 viewport showing dense, readable 2-column catalog browsing.
