# Current Task — MAP-021 remaining unblocked storefront scope

**Set 25 August 2026. One run, two queue items, nothing else.**

Implement queue items **1 and 2** from the "Unblocked execution queue" section of
`MASTER_ACTION_PLAN.md`. They belong to MAP-021, they are the lowest-numbered
unblocked work, they share one surface (the storefront bundle), and both have
objective completion checks.

## Item 1 — Consolidate the duplicate product detail view

`src/StorefrontApp.jsx` registers both `ProductDetail` (key `product`) and
`MasterProduct` (key `master_product`). No `setView` call site anywhere in the
codebase reaches `product`, so `src/views/ProductDetail.jsx` compiles to an
unreachable 13.68 kB chunk. Consolidate onto `MasterProduct.jsx`, then delete
`ProductDetail.jsx` along with its lazy import and its registration.

Before deleting, confirm `MasterProduct.jsx` covers every capability
`ProductDetail.jsx` had. If it does not, port the missing behaviour first and say
so in the report. Do not delete a file whose behaviour has not been accounted for.

**Completion check:** `npm run build:storefront` emits no `ProductDetail-*.js`
chunk; `npm run test:smoke` stays 8/8; opening a product from catalog still
renders full detail on mobile and desktop widths.

## Item 2 — Defer the Three.js globe until it is needed

`GlobeSection` is lazy-loaded, but `src/views/Home.jsx` renders it directly, so
its 903.44 kB / 244.43 kB gzip chunk — the largest artifact in the storefront
build — begins downloading on landing. Mount it behind an `IntersectionObserver`
so the chunk is requested only when the user scrolls near it.

Keep the existing `ErrorBoundary` and the `GlobeSectionUnavailable` fallback.
Respect `prefers-reduced-motion`. Reserve layout space so deferring the mount
does not introduce a layout shift.

**Completion check:** on first paint of `/`, no network request for the Globe
chunk; the chunk loads after scrolling toward the section; `npm run test:smoke`
stays 8/8; no new cumulative layout shift at 375px and 1440px.

## Required verification before reporting

Run and report exact exit codes and counts:

```
npm run prebuild
npm run build:storefront
npm run build:admin
npm run test:contracts
npm run test:smoke
```

`test:contracts` must remain at **181 passing** or higher. Any drop is a
regression you must fix, not report around.

## Hard limits for this run

Do not start queue items 3 through 8. Do not touch the database, migrations,
providers, DNS, or deployment. Do not push, merge, or deploy. Do not delete or
reorder any MAP item, and do not mark MAP-021 complete — MAP-021 has other scope
beyond these two items. Set the item state to
`Ready for independent verification` and return the report.

`MASTER_ACTION_PLAN.md` remains the only backlog and the only source of scope
and order.
