# K2 Jimzon Future Ideas Intake

**Purpose:** durable intake and decision register for new ideas without becoming
a competing implementation backlog.

**Active implementation authority:** `../MASTER_ACTION_PLAN.md`

**Current pending intake:** empty

This is not a roadmap or backlog. An idea stays here only until it is audited
against the operations rulebook, current System Brain, actual code/data,
dependencies, risks, and existing Master Action Plan.

## Lifecycle

1. Capture the idea below with a permanent ID, without claiming it is approved
   or live.
2. Audit it using the gate in `../MASTER_ACTION_PLAN.md`.
3. Choose one outcome:
   - **Reject:** remove it from Pending idea intake and record the ID and reason
     in the Idea decision register.
   - **Duplicate/merge:** merge necessary scope into an existing MAP item, then
     replace the intake entry with a decision-register row naming that item.
   - **Unavailable dependency:** mark it Deferred in the decision register and
     name the System Brain limitation or Master Action Plan constraint that must
     change before re-audit.
   - **Accepted:** create or update a MAP item with objective completion checks,
     then replace the intake entry with a decision-register row naming that item.
4. Never implement directly from this file.

No idea ID is erased from this file after audit. The full wording may be reduced
to a concise decision row because Git preserves the original entry, but the ID,
outcome, destination, and reason remain searchable here.

The former multichannel control-center idea was audited into MAP-009 through
MAP-011. The former product-transformation idea was audited into MAP-002. Their
full earlier wording remains recoverable in Git history; only the actionable,
still-needed scope remains in the Master Action Plan.

On 14 August 2026, the multichannel messaging/inventory and inventory-custody
truth idea was captured, audited, and merged into MAP-023. The audit found that
the canonical models exist, but external messaging/stock adapters and a complete
receiver-confirmed custody history remain unfinished. This inbox is therefore
still empty; the accepted scope lives only in `../MASTER_ACTION_PLAN.md`.

On 21 August 2026, IDEA-20260821-01 captured a broad web-architecture and
production-readiness checklist covering scale, reliability, security, delivery,
data, observability, and incident practices. It was audited against K2's actual
Vercel/Supabase architecture and the active launch queue. Necessary launch scope
was merged into MAP-020 through MAP-025; connector-only patterns remain
conditional; and infrastructure intended for independently operated distributed
systems was rejected for the first launch. This inbox remains empty.

Also on 21 August 2026, IDEA-20260821-02 captured an Excel-compatible Sheet Mode
export, offline edit, preview, and safe re-import workflow. The audit found that
the current Admin can import insert-only Draft product CSV rows but cannot export
the current sheet or safely update existing records, while inventory spreadsheet
overwrites would violate lot, reservation, expiry, custody, and audit invariants.
The accepted catalog round-trip and separately controlled inventory-
reconciliation scope was merged into MAP-023. This inbox remains empty.

## Idea decision register

This is a decision index, not a backlog. Only Accepted scope listed in the
Master Action Plan is authorized for implementation.

| Idea | Outcome | Destination or reason |
| --- | --- | --- |
| Legacy multichannel control-center idea | Merged | Historical MAP-009 through MAP-011; original wording remains in Git history |
| Legacy product-transformation idea | Merged | Historical MAP-002; original wording remains in Git history |
| IDEA-20260814-05 | Merged | Remaining messaging, channel-stock, and custody-truth scope is in MAP-023 |
| IDEA-20260821-01 | Merged in part / rejected in part | Necessary launch scope is in MAP-020 through MAP-025; unjustified first-launch distributed infrastructure was rejected |
| IDEA-20260821-02 | Merged | Controlled catalog spreadsheet round trip and inventory-reconciliation scope is in MAP-023 |
| IDEA-20260824-01 | Accepted and completed | Added Necessary, Active, Future, and Done navigation to the MAP, an explicit active count, and this durable idea-decision register; no unfinished scope remains |
| IDEA-20260824-02 | Accepted and completed | `AGENTS.md` now requires Superpowers-first skill routing, every applicable specialist skill, the four-skill UI/UX gate, and durable documentation/handoff traceability; no unfinished scope remains |
| IDEA-20260824-03 | Accepted and completed | Installed `karpathy-guidelines` from `multica-ai/andrej-karpathy-skills` to the user-level Codex skills directory and added it to `AGENTS.md` for all code writing, review, refactoring, and fixing tasks; installed `SKILL.md` SHA-256 is `6E22CC54CB02A5E98AE42D06D9D7292DB0C1B43894831B32879BEB0166B2AEA7` |

## Pending idea intake

No pending ideas.

When the owner raises an idea, add it here immediately using the next dated ID.
Do not wait for the audit before capturing it.

### New idea template

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
