# Prompt to Send to Antigravity

**Current run: MAP-023 queue item 3 — one modal primitive, migrate all 18.
Set 25 August 2026.**

The previous run (queue items 1 and 2) was implemented well and has been
independently verified and merged. Three of its *claims* were corrected on
review — see the correction section at the end of `LATEST_REPORT.md`. Read that
before starting; the evidence rules below exist because of it.

---

Work directly in `C:\Users\jerze\K2 JImzon`.

Read these first, in this order, before editing anything:

1. `AGENTS.md`
2. `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md` — required behaviour
3. `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md` — verified live state
4. `MASTER_ACTION_PLAN.md` — the **Unblocked execution queue** and **MAP-023**
5. `ANTIGRAVITY_GEMINI_MASTER_INSTRUCTION.md` — your execution protocol
6. `ANTIGRAVITY_HANDOFF/CURRENT_TASK.md` — your exact scope for this run
7. `ANTIGRAVITY_HANDOFF/LATEST_REPORT.md` — including the correction section

Implement **only** queue item 3, exactly as specified in `CURRENT_TASK.md`: build
one reviewed modal primitive and migrate all 18 `src/views/admin/*Modal.jsx`
files onto it. Nothing else.

Measured today: only 4 of 18 modals handle `Escape`, 6 declare neither
`role="dialog"` nor `aria-modal`, 2 have no accessible name, and none implement a
focus trap or restore focus on close. `DeleteProductsModal.jsx`, which
permanently deletes products, has none of the three. MAP-018 already established
the right pattern on the Product Intake modal — it just never propagated.

Do not spot-fix individual modals. One primitive, then migrate. Where a modal has
a real reason to opt out of a behaviour, make it an explicit named prop with a
comment explaining why, never a silent omission.

Because this run touches visible UI, apply the mandatory four-skill design rule
in `MASTER_ACTION_PLAN.md`. Respect `prefers-reduced-motion` in any open/close
transition.

**The completion check is a test that enumerates `src/views/admin/*Modal.jsx`
from the filesystem** and asserts each property across every file it finds. Do
not hardcode the list of 18 — a nineteenth modal added later must not be able to
regress this silently.

Run and report exact exit codes and counts for:

```
npm run prebuild
npm run build:storefront
npm run build:admin
npm run test:contracts
npm run test:admin-ui
npm run test:smoke
```

`test:contracts` must stay at **181** or higher, `test:admin-ui` at **15/15**. A
drop is a regression you fix, not something you report around.

**Evidence rules — these are not optional.** Your last report claimed "0px
Cumulative Layout Shift" that was never measured, and included a test whose
post-scroll assertion passed whether or not the feature worked, because the
placeholder rendered the same heading and ARIA region as the real component.

- Do not state a measured result unless you measured it. "Focus is trapped"
  requires a test that tabs and asserts where focus actually landed.
- Before writing any assertion, ask: would this fail if the feature were removed?
  If not, it is not a test.
- Name each test for exactly what it asserts, nothing more.

Do not: start queue items 4 through 8; touch the database, migrations, providers,
DNS, domains, or Auth; push, merge, or deploy; rotate or revoke keys; delete data;
delete or reorder any MAP item; or claim Complete, Done, or launch-ready. MAP-023
has scope well beyond this item — mark queue item 3 done and leave MAP-023
`Queued`.

When an owner, provider, or production gate blocks something, record it and
continue the independent local work. Never bypass or falsely satisfy a gate.

Update the relevant checkpoint under `ANTIGRAVITY_HANDOFF/checkpoints/`,
preserving prior verified entries, and replace
`ANTIGRAVITY_HANDOFF/LATEST_REPORT.md` with the required 14-section report from
the master instruction. Include exact commands, exit codes, assertion counts,
changed files, failures, blockers, evidence levels, and rollback steps.

End your report with exactly:

`No claim above exceeds its evidence.`

Then stop for independent review.
