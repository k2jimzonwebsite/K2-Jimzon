# Prompt to Send to Antigravity

**Current run: MAP-021 remaining unblocked storefront scope. Set 25 August 2026.**

This replaces the previous large one-shot prompt. That run covered MAP-016
through MAP-025 in a single pass and returned without implementing the requested
scope. The cause was breadth, not process, so this run is deliberately narrow:
two queue items, one surface, objective checks. Deliver these completely rather
than surveying more.

---

Work directly in `C:\Users\jerze\K2 JImzon`.

Read these first, in this order, before editing anything:

1. `AGENTS.md`
2. `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md` — required behaviour
3. `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md` — verified live state
4. `MASTER_ACTION_PLAN.md` — especially the **Unblocked execution queue** section
   and **MAP-021**
5. `ANTIGRAVITY_GEMINI_MASTER_INSTRUCTION.md` — your execution protocol
6. `ANTIGRAVITY_HANDOFF/CURRENT_TASK.md` — your exact scope for this run
7. `ANTIGRAVITY_HANDOFF/CODEX_REVIEW.md` — corrections you must preserve

Implement **only** queue items 1 and 2, exactly as specified in
`CURRENT_TASK.md`: consolidate the duplicate product detail view, and defer the
Three.js globe behind an `IntersectionObserver`. Nothing else.

Both items have objective completion checks. Meet them literally. Before you
delete `ProductDetail.jsx`, confirm `MasterProduct.jsx` covers every capability
it had, and port anything missing first — deleting a file whose behaviour is
unaccounted for is a regression, not a cleanup.

Because this run touches visible UI, apply the mandatory four-skill design rule
in `MASTER_ACTION_PLAN.md`. The globe deferral must not introduce layout shift,
must respect `prefers-reduced-motion`, and must keep the existing
`ErrorBoundary` and `GlobeSectionUnavailable` fallback.

Run and report exact exit codes and counts for:

```
npm run prebuild
npm run build:storefront
npm run build:admin
npm run test:contracts
npm run test:smoke
```

`test:contracts` must stay at **181 passing** or higher. A drop is a regression
you fix, not something you report around. If you cannot make a check pass, say so
plainly and leave the code in a working state rather than forcing a green result.

Do not: start queue items 3 through 8; touch the database, migrations, providers,
DNS, domains, or Auth; push, merge, or deploy; rotate or revoke keys; delete data;
delete or reorder any MAP item; or claim Complete, Done, or launch-ready. MAP-021
has scope beyond these two items and is not finished when they are.

When an owner, provider, or production gate blocks something, record it and
continue the independent local work. Never bypass or falsely satisfy a gate.

Update `ANTIGRAVITY_HANDOFF/checkpoints/05-MAP-020-021-api-upload-build-security.md`
with this run's evidence, preserving prior verified entries, and replace
`ANTIGRAVITY_HANDOFF/LATEST_REPORT.md` with the required 14-section report from
the master instruction. Include exact commands, exit codes, assertion counts,
changed files, failures, blockers, evidence levels, and rollback steps.

Set MAP-021's state to `Ready for independent verification` for these two items
only. Do not delete the MAP entry.

End your report with exactly:

`No claim above exceeds its evidence.`

Then stop for independent review.
