# Guided manual intake pilot — IDEA-20260907-03

Owner approved task-first teaching and one-step guidance. Owning backlog:
MAP-028 I-016 / MAP-023. Local uncommitted implementation; not deployed.

| Before | After | Why |
| --- | --- | --- |
| Procedure retrieval only | Learn task and launch guided intake | Start from an outcome. |
| Instructions separate from the form | Current instruction inside intake | Keep help available while working. |
| Broad workspace link | Focus-only stable step target | Find the control without executing it. |
| ARIA-disabled field still received focus | Unavailable targets show a blocker; actual focus is checked | Help must respect the form's availability state. |
| Unclear boundary after Draft | Optional stock/publication decisions labelled | Do not imply mandatory or automatic changes. |

The four design skills guided contextual disclosure, readable text and 44px
controls while preserving the established product register. PRODUCT.md and
DESIGN.md unchanged. No paid calls, production data, SQL or provider activation.

Changed: staffProcedureRegistry, new IntakeStepGuide, ProductIntakeSessionModal,
AdminAiCopilotModal, Admin and InventoryGrid launch wiring, two test files and
authoritative idea/MAP/rulebook/System Brain/project-map records.

Evidence:

- New contract failed before walkthrough data existed; six workflow-guide-truth
  tests now pass with playwright.api.config.js.
- New inline-help assertion failed before implementation; the phone intake
  test then passed, including focus, offline recovery and server-step resume.
- `npm run test:admin-ui`: 33 passed. New task entry test covers Learn, launch,
  inline guidance, focus-only behavior, missing target error and phone overflow.
- `npm run build:admin`: passed security, import, isolated artifact and secret
  checks; Admin entry 194.94 kB against 300 kB budget.
- Screenshot-only adjustment captures viewport instead of the very tall
  underlying inventory page. Images use fabricated fixture records only.

Limits: pilot is not a complete replacement for the three existing guide entry
points. Other procedures/maps remain reference-only. No automatic canonical
completion verification exists. All seven stage targets need full rendered
coverage; current focused journeys cover identity/evidence, missing target,
resume and offline. Image review still hands off to the existing product-media
workflow; exact image-return targeting and representative staff acceptance remain
in MAP. Do not claim the entire approved guide design is finished.

Recovery: revert only the scoped pilot patch; no database rollback. Next release
requires review and deployment evidence; current tests do not prove live use.

Continuation, 7 September: the identity-stage browser test failed because an
ARIA-disabled field received focus with no blocker. The fix additionally checks
native disabled, inert, hidden and CSS visibility states, then verifies focus
acquisition before scrolling. Tests restore each field state and verify focus
and cleared error. The first sandbox browser attempt did not reach assertions;
the approved run produced the expected red assertion. No permissions changed.

Fresh final evidence: 34/34 Admin browser tests passed (57.4s), 6/6 guide
contracts passed, and Admin build/security/boundary/budget checks passed
(195.85 kB / 300 kB entry). One earlier aggregate was interrupted when the
shared test server was stopped: 28 passed, 6 failed; the complete fresh-server
rerun above supersedes that infrastructure failure. Mobile blocker screenshot
was visually inspected. Diff check passed; PRODUCT.md/DESIGN.md stayed unchanged.
