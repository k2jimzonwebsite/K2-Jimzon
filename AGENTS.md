# K2 Jimzon repository working rules

Before planning or implementing project work, read:

1. `K2 Jimzon - Brain/OPERATIONS_LOGIC_AND_WORKFLOW.md`
2. `K2 Jimzon - Brain/SYSTEM_BRAIN_CURRENT.md`
3. `MASTER_ACTION_PLAN.md`

`MASTER_ACTION_PLAN.md` is the only active backlog. Do not create a competing
roadmap, TODO list, or implementation plan in another file.

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
