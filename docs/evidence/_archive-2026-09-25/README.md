# Archived evidence papers (2026-09-25)

These August 2026 flat audit papers were moved here during IDEA-20260925-01 docs cleanup. Nothing was deleted. They duplicate dated subfolder evidence and are not referenced by source, tests, or runbooks (verified by repository-wide grep on 2026-09-25).

Two papers stay in `docs/evidence/` root because they are still referenced:
- `MAP_017_EXHAUSTIVE_AUTHORIZATION_AUDIT_2026-08-22.md` (pinned by `tests/schema-truth-tool.spec.js:388`)
- `20260909-map017-followup.md` (cited by the Brain, owner record, and runbook)

## Restore

To restore any paper:

```powershell
git mv docs/evidence/_archive-2026-09-25/<FILE>.md docs/evidence/<FILE>.md
```

Then re-check references with a repository-wide search for the filename before treating it as live documentation again.
