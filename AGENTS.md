# K2 Jimzon repository working rules

Before planning or implementing project work, read:

1. `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md`
2. `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md`
3. `MASTER_ACTION_PLAN.md`
4. `docs/PROJECT_MAP.md` and `docs/ARCHITECTURE.md` (for structural boundaries)

`MASTER_ACTION_PLAN.md` is the only active backlog. Do not create a competing
roadmap, TODO list, or implementation plan in another file.

## Mandatory skill routing

- Start every task with the installed `using-superpowers` skill so the agent
  checks the available skill catalog before responding, planning, inspecting,
  implementing, reviewing, or asking a blocking question.
- Invoke every installed skill that is genuinely applicable to the task. Use
  process skills before implementation/domain skills, and follow every selected
  `SKILL.md` completely. A task being small, familiar, or urgent is not a reason
  to skip an applicable skill.
- Use the broader Superpowers skill family whenever one of its process skills
  matches the work, including brainstorming, planning, debugging, testing,
  verification, review, or completion workflows.
- For every task that writes, reviews, refactors, or fixes code, invoke the
  installed `andrej-karpathy` skill (or `karpathy-guidelines` if that is the
  equivalent name exposed by the active harness) after the applicable process
  skills. Surface assumptions and tradeoffs, prefer the smallest sufficient
  solution, keep every changed line traceable to the request, and define
  objective verification before treating the work as complete.
- Do not invoke unrelated skills merely to create the appearance of rigor. If a
  requested or necessary skill is missing or blocked, state that fact, use the
  safest relevant fallback, and record any unfinished consequence in the active
  MAP item.
- Announce selected skills and why they apply before the skills cause task
  actions. Skill output never overrides owner requirements, operational truth,
  security/data integrity, repository authority, or the MAP dependency order.

For every new idea:

1. Capture it in `K2 Jimzon - Brain/FUTURE_IDEAS.md`.
2. Audit it using the Master Action Plan gate.
3. Reject, merge, defer outside the active queue, or accept it into the Master
   Action Plan.
4. Implement accepted work in dependency order.
5. Verify the complete operational behavior.
6. Update the appropriate rulebook, System Brain, design, migration, test, and
   runbook records.
7. Delete the completed MAP item in the same change. Do not keep completed items
   or a Done section in the Master Action Plan.

## Mandatory work documentation and traceability

No material work is complete until its future maintainer can determine what was
requested, what changed, why it changed, what evidence passed, what remains
unverified, and where the next required action lives.

- Before implementation, give every new idea a permanent ID in
  `K2 Jimzon - Brain/FUTURE_IDEAS.md`, audit it, and preserve its outcome in the
  idea decision register. Never silently implement an untracked idea.
- During unfinished work, keep status, dependencies, discoveries, prepared-only
  artifacts, blockers, and recovery instructions inside the owning active MAP
  item. Never use chat history, memory, or an untracked scratch list as the only
  record of remaining work.
- After every material code, schema, configuration, provider, security, data,
  workflow, or design change, update all authoritative records affected by it:
  the operations rulebook for required behavior; System Brain for verified
  current behavior; the active MAP item for remaining work; and the applicable
  design, migration, test, acceptance, runbook, and owner-decision records.
- Documentation must distinguish target behavior, locally prepared work,
  passing local evidence, permanently applied provider/database state, deployed
  behavior, and verified real-host/end-to-end behavior. Never collapse these
  states into a generic "done" claim.
- Every handoff must name the owning MAP item, changed files or systems,
  verification commands/results, unresolved risks, rollback or recovery path,
  and exact next action. Failed or partial work stays visible in the MAP rather
  than disappearing from the record.
- Completed work is removed from the MAP only after its verified behavior and
  evidence are written to the correct durable records. Git history is the
  completion archive; the System Brain and runbooks remain the readable current
  reference.

Never describe a rulebook target, mock, fixture, external connector, message,
payment, metric, or deployment as live without end-to-end evidence.

Keep the admin and storefront as separate production artifacts and Vercel
projects. Never place service-role keys, marketplace secrets, or refresh tokens
in browser code or `VITE_` variables.

The product goal is a user-ready storefront plus a user-ready staff Admin BOS
that owns canonical operations and can accept future channel adapters without
forking inventory, orders, customers, or reporting truth.

## Mandatory design-skill combination

For every task that changes or reviews visible UI, interaction, responsive
behavior, typography, color, motion, navigation, forms, tables, charts, loading,
empty, or error states, the primary agent must use all four skills:

1. `ui-ux-pro-max`
2. `impeccable`
3. `design-taste-frontend`
4. `emil-design-eng`

All four must be invoked together for qualifying work; using one, two, or three
does not satisfy the design gate. For non-visual backend, database,
infrastructure, or documentation-only work, use the applicable specialist skills
without forcing the four design skills.

Read and preserve `PRODUCT.md`, `DESIGN.md`, the current surface, and the K2
operations rulebook before making design choices. For storefront work use the
brand register; for admin/dashboard/tool work use the product register. Do not
replace K2's established design logic merely because a skill proposes another
style.

Resolve conflicts in this order: user requirements and operational truth,
security/data integrity, accessibility, existing K2 identity, mobile usability
and performance, then optional aesthetics. Storefront keeps its luxury wood
canvas and editorial voice. Admin design prioritizes readable density, fast
navigation, complete states, clear next actions, and recoverable staff workflows.
Motion must have an operational or explanatory purpose, must respect reduced
motion, and must not slow frequent or keyboard-driven staff actions.
