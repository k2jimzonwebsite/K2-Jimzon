# K2 Jimzon Future Ideas Intake

**Purpose:** temporary inbox for new, unaudited ideas.

**Active implementation authority:** `../MASTER_ACTION_PLAN.md`

**Current intake:** empty

This is not a roadmap or backlog. An idea stays here only until it is audited
against the operations rulebook, current System Brain, actual code/data,
dependencies, risks, and existing Master Action Plan.

## Lifecycle

1. Capture the idea below without claiming it is approved or live.
2. Audit it using the gate in `../MASTER_ACTION_PLAN.md`.
3. Choose one outcome:
   - **Reject:** delete it and record the reason in the relevant discussion/commit.
   - **Duplicate/merge:** merge necessary scope into an existing MAP item, then
     delete the intake entry.
   - **Unavailable dependency:** delete it from this inbox; the known limitation
     remains in the System Brain or Master Action Plan constraints.
   - **Accepted:** create or update a MAP item with objective completion checks,
     then delete the intake entry.
4. Never implement directly from this file.

The former multichannel control-center idea was audited into MAP-009 through
MAP-011. The former product-transformation idea was audited into MAP-002. Their
full earlier wording remains recoverable in Git history; only the actionable,
still-needed scope remains in the Master Action Plan.

On 14 August 2026, the multichannel messaging/inventory and inventory-custody
truth idea was captured, audited, and merged into MAP-023. The audit found that
the canonical models exist, but external messaging/stock adapters and a complete
receiver-confirmed custody history remain unfinished. This inbox is therefore
still empty; the accepted scope lives only in `../MASTER_ACTION_PLAN.md`.

## New idea template

```markdown
### <IDEA-YYYYMMDD-NN> — Short name

**Captured:** YYYY-MM-DD
**Raised by:** person/source
**Problem observed:**
**Desired outcome:**
**Evidence or example:**
**Known dependency:**
**Possible overlap with current behavior/MAP item:**
**Owner decision potentially required:**
```
