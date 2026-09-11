# Memory Context

Memory findings are recorded here so the Planning Workspace has stable handoff context even after the conversation is compacted.

## Relevant observations

- `6671` — clarified that FHHS-inspired capabilities are first-party Firehorse Workflows, not a new artifact kind, and upstream skills remain upstream-shaped.
- `6677` — resolved workflow IDs: `create-plan`, `plan-review`, `build`, `review-code`, `fix-bug`.
- `6682` / `6683` — legacy FHHS structure and reusable patterns: staged gates, `must_haves` traceability, artifact feedback loops.
- `6686` — `create-plan` may publish PRD and issue artifacts as Published Issues without a separate approval gate.
- `6694` — `create-plan` recommends a `plan-review` gate before issue breakdown, but can skip it for small high-confidence plans.
- `6698` — Superset/Claude/Codex choreography belongs in provider-specific projection notes, not canonical Workflow semantics.
- `6699` — **Verification Contract** added as the Firehorse replacement for FHHS `must_haves`.
- `6700` — **Published Issue** means GitHub issue, not Superset task.
- `6702` — issue draft structure, `verification-contract` skill, `plan-reviewer` role, upstream planning skill integration, and provider web tool preferences documented.
- `6703` — memory results, Codebase Map gaps, and gathered context are recorded as Planning Workspace artifacts.
- `6705` — `build`, `review-code`, and `fix-bug` behavior defaults documented.
- `6709` — Planning Workspace numbering, Markdown+structured-block artifact format, and review focuses documented.
- `6710` — `review-code` uses a `code-reviewer` Agent Role.
- `6711` — this Planning Workspace was created at `docs/prds/prd-0002-firehorse-planning-review-workflows/`.

## Memory-derived constraints

- Do not implement yet; produce this PRD draft and let the user clean/compact context first.
- Preserve no-runtime/no-schema-change boundaries.
- Treat GitHub as the issue tracker; Superset may orchestrate agents/workspaces but is not the Published Issue target.
- Keep context-gathering file-backed to protect the main context window.
