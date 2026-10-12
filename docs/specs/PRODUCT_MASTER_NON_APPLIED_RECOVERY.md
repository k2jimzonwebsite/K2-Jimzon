# Product Master non-applied recovery

Owning backlog: MAP-018 / IDEA-20261012-01, merged into IDEA-20261009-11
and IDEA-20261001-03. Sequential design review APPROVED; this document records the design,
not another implementation queue.

## Owner-confirmed intent

On 12 October 2026 the owner confirmed: confirm a saved change without
duplicating it; allow a fresh decision only after proving the old change never
saved and loading the latest product details; otherwise keep the uncertain
request. Only the original current Admin/SuperAdmin can resolve it. Website
assignment remains a separate decision.

## Constraints and evidence

Use existing actor-scoped literal request/key storage, Web Locks, current
session checks, Product Master GET and signed UPDATE. Preserve the existing
request bounds, role/AAL2/CSRF checks, command rate limits and database deadlines.
No polling, automatic POST retry, new endpoint, SQL or provider change.
The staff action adds at most one exact POST and one current GET invocation (the
existing bounded read retry policy remains), plus session
checks; only one unresolved update per actor remains admitted.

PRODUCT_MASTER_RECOVERY_TRANSPORT_20261012.json pins genuine local Auth,
PostgREST and BFF evidence: completed receipt replay precedes version checking;
repeated exact-key stale refusal for a never-dispatched request produces neither
receipt nor event. A competing receipt insert refuses in-progress. This is local
evidence, not provider or hosted acceptance.

## Approved interaction and data flow

1. Retry the original saved request under its existing matching Web Lock and
   current actor/role checks. Only a resumed PRODUCT_VERSION_CONFLICT establishes
   an in-memory non-applied observation tied to actor scope, key and literal body.
   Keep the saved request intact.
2. Show plain-language refusal evidence and a separate **Review latest product**
   button. This is an explicit staff action. Reload or scope/storage changes
   invalidate the observation; the original request remains saved.
3. The action reacquires the same lock, checks current actor/role and unchanged
   saved evidence, then resends the same literal request/key. A successful receipt
   uses normal acknowledgement; any other unknown or refusal stays held.
4. For the exact version refusal again, read current Product Master. Require the
   exact requested SKU, readable product identity/status/publication and version.
   Recheck current actor/role, component scope and stored key/body before clearing
   that matching pending record. Never clear corrupt or unavailable storage.
5. Return a distinct non-applied outcome and the fresh product/taxonomy read.
   Grid closes the recovery dialog and discards stale editor fields/reason,
   opening the existing editor from the fresh read. Staff explicitly review and
   save a new decision; no old patch is copied or submitted.

## Decision log

| Decision | Alternatives | Rationale |
| --- | --- | --- |
| Reuse the qualified exact command | Leave staff blocked; add receipt endpoint | Avoid a second command/authority implementation and use receipt-before-version semantics already qualified locally. |
| Keep request until explicit action and fresh read | Automatically clear on a refusal | Preserve recovery evidence and ensure staff see current facts before replacement. |
| Ephemeral observation tied to scope/key/body | Add another durable proof format | A reload safely requires rechecking the exact command; pending storage remains the sole durable unknown request. |
| Open editor directly from fresh GET | Reopen stale editor; issue a second unguarded GET | Do not carry old unsaved fields or add a late-response identity race. |
| Invalidate admitted actions with a storage generation and scope guard after each await | Only hide the button when storage changes | Skeptic S1 accepted: remove/restore of equal key/body must not revive an invalidated observation or admitted action. Capture the generation after a fresh hold dispatches its own change event. |
| Distinct nonApplied result and onNotApplied callback | Reuse result.ok/onRecorded | Skeptic S2 accepted: clearing a proven never-applied request is not a recorded save. Existing Save/recorded handling must remain separate. |
| Warn before opening latest details that previous edits/reason will not carry over | Imply interrupted edits reappear | User Advocate A1 accepted. Helper: “Opens the latest product details. Your previous edits and reason will not carry over.” Completion: “Your previous change did not apply. Review the latest details and enter a new reason before saving.” |

Sequential review: Skeptic S1/S2 accepted; Constraint Guardian approved with
existing GET retry clarification; User Advocate A1 accepted; Integrator/Arbiter
APPROVED with no unresolved objections. Approval covers design only, not rendered
implementation, hosted or provider acceptance.

## Required verification

Focused failing-first rendered checks must cover non-applied retry and explicit
fresh editor, unchanged pending bytes until acknowledgement, identical POST
body/key/actor, failed or wrong current reads, current session/role changes,
actor ABA, changed storage/tabs, in-progress/unknown refusals and historical
receipt during reconciliation. Preserve existing recovery regression checks.
Inspect one bounded small-phone/desktop visual batch with keyboard focus,
readable feedback and no new motion, followed by at most one repair confirmation.
Genuine full rendered acceptance, Website and consolidated operational checks
remain MAP-018 after engineering.

## Recovery

Revert only this hook/dialog/Grid/test slice together, preserving the previous
committed recovery foundation and all pending original actor/body/key evidence.
No provider rollback applies. Keep native media40 immutable; do not repeat its
accepted backend transport gate without a relevant source change.

## Local implementation evidence

Implemented and locally verified on12 October. Receipt: ../acceptance/PRODUCT_MASTER_NON_APPLIED_RECOVERY_20261012.json. Final12 focused browser cases and17 existing editor cases pass; final development passes42Admin checks/zero route gaps. Independent final code review approved without Critical/Important findings. The primary inspected375/1440 screenshots. APIs in rendered tests are synthetic; genuine backend media40 remains separate. Full genuine rendered/hosted acceptance remains MAP-018.
