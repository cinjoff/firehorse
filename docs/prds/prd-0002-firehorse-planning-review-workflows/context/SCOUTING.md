# Scouting Context

## Sources

- `docs/prds/prd-0002-firehorse-planning-review-workflows/context/FIREHORSE_COMMON_ARTIFACTS.md`
- `docs/prds/prd-0002-firehorse-planning-review-workflows/context/UPSTREAM_INVENTORY_AND_SYNERGIES.md`
- `docs/PROJECT.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/prds/prd-0001-firehorse-definition-format-and-projection/FIREHORSE-DEFINITION-FORMAT.md` (PRD-0001 appendix; current summary is in `docs/ARCHITECTURE.md`)
- GitHub Issues/Projects for roadmap, requirements, and active tracking state
- Existing canonical definitions under `packages/firehorse-core/definitions/`
- Definition parser/projection tooling under `packages/firehorse-core/src/definitions/` and `scripts/definitions.ts`

## Current Firehorse definition model

- Firehorse-authored artifacts are canonical Markdown-with-frontmatter Definition Files under `packages/firehorse-core/definitions/{workflows,skills,agents}/`.
- Supported first-party definition kinds are `workflow`, `skill`, and `agent-role`.
- Workflows project to Pi prompt templates and Claude commands as user-facing generated mirrors.
- Skills project to Pi and Claude skill directories.
- Agent roles project to top-level provider-native agent surfaces without a `horse-` prefix; Pi sync is handled by setup/distribution guidance.
- Workflow and skill generated mirrors use `horse-<id>` native names and provenance metadata with source SHA-256 hashes; Agent Role mirrors use plain provider-native names with compact provenance.
- `scripts/definitions.ts` owns filesystem writes, manifest updates, stale generated mirror removal, and check/write modes.

## Existing canonical examples and patterns

- `fix-bug` is the current bug-fix workflow and replaces the historical `diagnose-fix` public surface without a generated alias.
- `create-plan`, `plan-review`, `build`, `review-code`, `ship`, `new-project`, and `update-upstreams` are current checked-in Workflow definition patterns.
- `feedback-loop` and `verification-contract` are current Firehorse-authored reusable skills.
- `reviewer`, `plan-reviewer`, and `worker` are current canonical Agent Role definitions. The earlier `diagnostic-reviewer` and planned `code-reviewer` names are superseded by the generic `reviewer` direction.

## Integration points for this PRD

- Add or rename canonical definition files only under `packages/firehorse-core/definitions/`.
- Regenerate provider mirrors with `pnpm definitions:write`.
- Validate freshness with `pnpm definitions:check` and typecheck/build commands as appropriate.
- Update tests in `packages/firehorse-core/src/definitions/definitions.test.ts` and CLI tests if generated paths/manifests change.
- Update docs/examples that still present `diagnose-fix` as the primary example.

## Upstream and bundled capability inventory

Firehorse bundles or mirrors capabilities that can support the new workflows without becoming canonical runtime dependencies:

- `context-mode`: large-output/file/web processing and searchable context preservation.
- `pi-lens`: LSP diagnostics/navigation and AST-aware search/replace.
- `pi-subagents`: provider-native scout/researcher/reviewer/worker delegation.
- `pi-agent-memory` / `claude-mem`: cross-session memory recall.
- `pi-web-access` / `librarian`: web/library research fallback for Pi.
- Firecrawl skill: preferred web/research mechanism when available.
- Matt Pocock skills: `grill-with-docs`, `to-prd`, `to-issues`, `tdd`, `diagnose`.
- `shadcn` and `impeccable`: UI-specific planning/build support when relevant.
- `pi-mcp-adapter`: GitHub/Superset/external MCP bridge when configured.

## Key constraints

- No Firehorse runtime, prompt loader, provider transport, hook behavior, autonomous execution loop, or schema change in this pass.
- Provider-specific orchestration belongs in projection notes or distribution guidance, not canonical Workflow semantics.
- Upstream skills remain upstream-shaped. Firehorse workflows may reference them as ingredients but remain the source of truth for artifact contracts.
- Generated mirrors must remain checked in, self-contained, and not hand-edited.
