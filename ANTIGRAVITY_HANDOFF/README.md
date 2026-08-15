# Antigravity / Codex Handoff Relay

This folder carries implementation evidence between Antigravity/Gemini and
Codex. It is not a roadmap or backlog. `../MASTER_ACTION_PLAN.md` alone controls
scope, order, dependencies, and completion.

## Exchange protocol

1. For the current owner-authorized full local/prepared one-shot, send the text
   in `PROMPT_TO_SEND.md`; it directs Antigravity to execute every phase in
   `LARGE_GOAL_PROMPT.md` without shortening or reinterpreting it. For a future
   ordinary run, replace `CURRENT_TASK.md` with one eligible MAP item first.
2. Antigravity reads `../ANTIGRAVITY_GEMINI_MASTER_INSTRUCTION.md`, then
   `CURRENT_TASK.md`.
3. Antigravity preserves unrelated user changes and implements either the one
   authorized MAP item or, when the large prompt is selected, its sequential
   dependency-gated phases.
4. For the large run, Antigravity writes every required phase checkpoint, then
   replaces `LATEST_REPORT.md` with one complete 14-section evidence report. It
   may set an item only to `Ready for independent verification` when justified.
5. Antigravity does not delete MAP items or write a final Codex verdict.
6. Codex independently inspects the diff, schema/provider truth, permissions,
   tests, builds, operational behavior, and documentation, then writes
   `CODEX_REVIEW.md`.
7. Failed verification returns precise corrections through `CODEX_REVIEW.md`.
   Verified work is reconciled into the authoritative records and the completed
   MAP item is deleted by Codex in the same verified change.

Reports must never contain secrets, tokens, passwords, private customer data,
raw provider payloads, or unsupported claims of deployment or live behavior.
