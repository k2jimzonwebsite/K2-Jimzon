# Current Task — MAP-023 queue item 3: one modal primitive, then migrate all 18

**Set 25 August 2026. One queue item. Nothing else.**

Queue items 1 and 2 are done and independently verified. This run is queue item
**3** from the "Unblocked execution queue" in `MASTER_ACTION_PLAN.md`.

## The problem, measured

Across the 18 files matching `src/views/admin/*Modal.jsx`, as of 25 August 2026:

- only **4** handle the `Escape` key
- **6** declare neither `role="dialog"` nor `aria-modal`
- **2** expose no accessible name
- **0** implement a focus trap or restore focus to the trigger on close

`DeleteProductsModal.jsx` — the most destructive surface in the product, which
permanently deletes products behind a PIN — has none of the three.

There is no shared modal primitive. Every modal hand-rolls its own shell, which
is why they have drifted apart. MAP-018 already established the correct pattern
on the Product Intake modal; it simply never propagated.

## What to build

**One** reviewed modal primitive, then migrate all 18 onto it. Do not spot-fix
individual modals — that recreates the drift this item exists to remove.

The primitive must provide, for every consumer:

1. `role="dialog"` and `aria-modal="true"`
2. an accessible name, wired via `aria-labelledby` to the modal's own heading
3. initial focus moved into the dialog on open
4. a focus trap — Tab and Shift+Tab cycle within the dialog
5. `Escape` closes, and close is routed through the same handler as the close
   button so both paths behave identically
6. focus restored to the triggering element on close
7. `prefers-reduced-motion` respected in any open/close transition

Where a modal has a genuine reason to opt out of a behaviour — a scanner modal
that must keep camera focus, for example — the opt-out must be an explicit,
named prop with a comment explaining why, not a silent omission.

## Completion check

Write a test that **enumerates** `src/views/admin/*Modal.jsx` from the filesystem
and asserts each property across every file found. Do not hardcode the list of 18
names. The point is that a nineteenth modal added next month cannot regress this
without failing the suite.

The check is 18/18 on each property, or an explicit, commented opt-out.

## Required verification

Report exact exit codes and counts:

```
npm run prebuild
npm run build:storefront
npm run build:admin
npm run test:contracts
npm run test:admin-ui
npm run test:smoke
```

`test:contracts` must stay at **181** or higher and `test:admin-ui` at **15/15**.
A drop is a regression you fix, not something you report around.

## Evidence rules for this run

The last run's report claimed "0px Cumulative Layout Shift" that was never
measured, and shipped a test whose assertion passed whether or not the feature
worked. Both were corrected on review. For this run:

- Do not state a measured result unless you measured it. "Focus is trapped" needs
  a test that tabs and asserts where focus landed, not a claim that a trap was
  added.
- Do not assert on something both the real component and its fallback render. Ask
  of every assertion: would this fail if the feature were removed? If not, it is
  not a test.
- Name each test for exactly what it asserts.

## Hard limits

Do not start queue items 4 through 8. Do not touch the database, migrations,
providers, DNS, or deployment. Do not push, merge, or deploy. Do not delete or
reorder any MAP item. MAP-023 has scope well beyond this item, so do not mark
MAP-023 complete — mark queue item 3 done and leave the item `Queued`.

`MASTER_ACTION_PLAN.md` remains the only backlog and the only source of scope
and order.
