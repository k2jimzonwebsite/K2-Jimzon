# Agent Orchestration

## Available Agents

Discover agents from the active harness or its configured shared agent catalog.
Do not assume a client-specific path such as `~/.claude/agents/` or
`~/.codex/agents/`.

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code review | After writing code |
| security-reviewer | Security analysis | Before commits |
| build-error-resolver | Fix build errors | When build fails |
| e2e-runner | E2E testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation | Updating docs |
| rust-reviewer | Rust code review | Rust projects |
| harmonyos-app-resolver | HarmonyOS app development | HarmonyOS/ArkTS projects |

## Immediate Agent Usage

When delegation is supported and project-level rules permit it, no additional
user prompt is needed for these in-scope specialists:
1. Complex feature requests - Use **planner** agent
2. Code just written/modified - Use **code-reviewer** agent
3. Bug fix or new feature - Use **tdd-guide** agent
4. Architectural decision - Use **architect** agent

## Parallel Task Execution

Use parallel task execution for independent operations when the active harness
and project-level rules permit it:

```markdown
# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Agent 1: Security analysis of auth module
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utilities

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

## Multi-Perspective Analysis

For complex problems, use split role sub-agents:
- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker

## Portable Skill Routing

- Begin with `using-superpowers` when installed and inspect the active skill
  catalog before planning or acting.
- Invoke every installed skill genuinely required by the task and follow its
  `SKILL.md` completely.
- For code work, use `karpathy-guidelines` or the installed
  `andrej-karpathy` equivalent.
- For visible UI or UX work, use `ui-ux-pro-max`, `impeccable`,
  `design-taste-frontend`, and `emil-design-eng` together when installed.
- Never pretend a missing skill ran. State the gap, use the safest applicable
  fallback, and record any unfinished consequence in the project's canonical
  backlog.

## Documentation and Traceability

Record material work in the project's existing authoritative backlog and docs.
The durable record must identify the request, decisions, changed files or
systems, verification evidence, unresolved risks, rollback or recovery path,
and exact next action. Do not rely on one agent client's chat history or memory
as the only record of work that remains.
