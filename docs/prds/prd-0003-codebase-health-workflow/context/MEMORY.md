# Memory Findings

## Scope

Memory was consulted through the injected pi-mem context and prior fetched observations during the planning session. The relevant prior work confirms that codebase-health design decisions were already discussed and then refined into durable project decisions.

## Relevant observations

- `6806` — Codebase Health Report and Planning Workspace structure defined.
  - Confirms `docs/codebase/health.md` as a durable Project Anchor with freshness metadata.
  - Confirms Planning Workspace artifacts should hold context, decisions, PRDs, and issue drafts.
- `6821` — Continuous Codebase Health Monitoring Workflow.
  - Captures original goal: combine code mapping, architecture review, lens findings, and memory observations for continuous improvement.
- `6822` / `6832` / `6837` / `6851` — Codebase-health design refinements.
  - Confirm separate `assess-codebase-health` workflow, local Issue Drafts, 24-hour freshness, watchlist behavior, stable finding IDs, lifecycle statuses, configurable freshness, accepted-debt behavior, tracker links, and targeted updates from build/review workflows.
- `6823` — Architecture-review integration.
  - Confirms the bundled Matt Pocock `improve-codebase-architecture` skill is an expected ingredient.
- `6860` / `6862` — Finalized design with provider hooks.
  - Confirms full implementation includes canonical workflow, provider projections, and explicitly scoped provider-specific session-start hooks.
- `6864` / `6865` — Pi hook feasibility.
  - Confirms Pi has `session_start` events and `ctx.ui.notify()`/dialog APIs for lightweight health surfacing.
- `6866` / `6867` — Claude/Pi hook implementation patterns.
  - Confirms Firehorse already has update-check hook patterns using bounded startup work, file-based cache/state, environment flags, and Claude `SessionStart` command hooks.
- `6960` / `6968` / `6978` — Definition/projection boundaries.
  - Confirms Firehorse Definition Format remains declarative and generated mirrors are not hand-edited.
  - Confirms validation pipeline currently checks definitions and mirrors.
  - Confirms Claude-specific behavior belongs in `packages/firehorse-claude/`.
- `7032` / `7033` — Decision log structure.
  - Confirms `docs/DECISIONS.md` is the append-only durable decision log.

## Memory-derived constraints

- Memory observations are evidence, not source of truth.
- Memory-derived health findings must be confirmed against current code before becoming candidate work.
- Health reports should cite observation IDs/titles and summarized claims rather than dumping raw memory contents.
- Missing memory is a caveat, not a hard workflow failure.

## Current planning output

This Planning Workspace incorporates the above memory into the PRD and into `docs/DECISIONS.md` as D-137.
