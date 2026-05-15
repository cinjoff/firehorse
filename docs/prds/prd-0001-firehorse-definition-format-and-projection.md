# PRD: Firehorse Definition Format and Projection Generator

Published issue: https://github.com/cinjoff/firehorse/issues/2

## Problem Statement

Firehorse has converged on workflows as its user-facing abstraction, but the repository still lacks a canonical definition format that can express Firehorse-authored workflows, reusable skills, and agent roles once and project them into Pi and Claude without drift. Today, upstream skills can be mirrored, but Firehorse-authored workflows would have to be hand-authored separately per distribution, which risks inconsistent behavior, stale provider manifests, and ambiguous boundaries between workflows, skills, agent roles, and runtime execution.

The project also needs a safe path for later workflows such as `horse-new-project` and `horse-map-codebase` without prematurely adding a runtime, prompt loader, command layer, provider transport, or autonomous execution engine.

## Solution

Implement the Firehorse Definition Format as a declarative, schema-validated authoring model in `firehorse-core`. Canonical Firehorse-authored definitions will live under `packages/firehorse-core/definitions/`, use Markdown with frontmatter, and be validated by a gray-matter parser plus Zod schema.

Add pure projection helpers in `firehorse-core` and repository scripts that generate checked-in provider-native mirrors for Pi and Claude. The generated mirrors will include provenance and source hashes, update package-local and repo-root manifests, and fail validation when stale or hand-edited incorrectly. The first complete fixture will be `diagnose-fix`, supported by a Firehorse-authored `feedback-loop` skill, a `diagnostic-reviewer` agent role, and the upstream `mattpocock-skills` `diagnose` skill.

`horse-new-project` and `horse-map-codebase` are not part of this first implementation slice. Their settled behavior should be documented and preserved as future consumers of the definition/projection system.

## User Stories

1. As a Firehorse maintainer, I want one canonical definition for each Firehorse-authored workflow, so that Pi and Claude behavior do not drift.
2. As a Firehorse maintainer, I want workflows, skills, and agent roles to have distinct schemas and body templates, so that each concept keeps its own boundary.
3. As a Firehorse maintainer, I want upstream skills to remain upstream-shaped, so that upstream updates remain cheap and auditable.
4. As a Firehorse maintainer, I want Firehorse-authored skills to use a strict reusable instruction contract, so that workflows can depend on them consistently.
5. As a Firehorse maintainer, I want agent-role frontmatter to use the documented pi-subagents field set plus Firehorse metadata, so that roles are complete in one place and adapters can filter unsupported fields.
6. As a Firehorse maintainer, I want definition IDs to be globally unique and path-validated, so that references and generated native names are stable.
7. As a Firehorse maintainer, I want definition IDs to be treated as stable public API, so that renames require explicit aliases or deprecations.
8. As a Firehorse maintainer, I want each definition to declare a schema version, so that future format changes are explicit.
9. As a Firehorse maintainer, I want provider-neutral capability requirements, so that definitions can state what they need without hard-coding provider matrices.
10. As a Firehorse maintainer, I want extension-friendly capability values, so that MCP and provider-specific capabilities can be represented without schema churn.
11. As a Firehorse maintainer, I want workflow definitions to reference supporting skills, agent roles, and upstream skills through structured fields, so that dependencies can be validated.
12. As a Firehorse maintainer, I want upstream skill references to use structured `upstream` and `id` fields, so that references are clearer than colon strings or paths.
13. As a Firehorse maintainer, I want Markdown body sections to be validated by kind, so that instruction structure remains predictable for agents.
14. As a Firehorse maintainer, I want the first fixture to include a real workflow, skill, agent role, and upstream skill reference, so that the format is proven end-to-end.
15. As a Firehorse maintainer, I want generated mirrors to contain rendered instructions rather than runtime references, so that installed Pi and Claude packages are self-contained.
16. As a Firehorse maintainer, I want generated mirrors to include provenance and hashes, so that stale or manually edited files can be detected.
17. As a Firehorse maintainer, I want projection generation to update package-local and repo-root manifests, so that generated resources are discoverable from every install path.
18. As a Firehorse maintainer, I want write mode and check mode, so that authors can regenerate mirrors while CI can fail on stale output.
19. As a Firehorse maintainer, I want projection file writes to overwrite or delete only files with valid Firehorse provenance, so that hand-authored provider files are protected.
20. As a Firehorse maintainer, I want generated manifest entries sorted deterministically, so that diffs remain reviewable.
21. As a Firehorse maintainer, I want Phase 2 to avoid runtime execution behavior, so that the format can land without violating current project boundaries.
22. As a future Firehorse workflow author, I want `horse-new-project` and `horse-map-codebase` decisions preserved, so that they can later be implemented using the canonical format rather than one-off provider-native files.
23. As a future Firehorse user, I want workflow invocation names to use the `horse-` prefix while canonical IDs stay unprefixed, so that provider-native names avoid collisions without polluting the source model.
24. As a future Firehorse user, I want Pi prompt templates and Claude commands generated from workflows, so that workflows are invoked through native user-facing surfaces.
25. As a future Firehorse user, I want skills and agent roles generated into their matching provider surfaces, so that supporting capabilities remain separate from user-facing workflows.

## Implementation Decisions

- The core format is the Firehorse Definition Format, not a skill-only format.
- Canonical definitions live in `firehorse-core` under kind-segregated directories for workflows, skills, and agent roles.
- Definition files are Markdown with frontmatter parsed by gray-matter and validated by Zod.
- Each definition declares `schemaVersion`, `id`, `kind`, and kind-specific metadata.
- Definition IDs are globally unique across workflows, skills, and agent roles.
- Definition ID and directory path must match.
- Definition IDs are stable public API; aliases and deprecations live in frontmatter.
- Firehorse-authored workflow bodies use the standardized operational contract sections captured in the decision log.
- Firehorse-authored skill bodies use the reusable instruction contract sections captured in the decision log.
- Agent-role bodies use the role contract sections captured in the decision log.
- Agent-role frontmatter keeps the full documented pi-subagents agent frontmatter field set as the canonical basis, plus Firehorse `id` and `kind`.
- Upstream skills are not normalized into Firehorse-authored skills.
- Workflows reference Firehorse-authored skills, agent roles, and upstream skills through structured reference fields.
- Capability requirements use provider-neutral `requires` and `optional` declarations with documented common categories and extension-prefixed values.
- Projection logic lives as pure functions in `firehorse-core`; repository scripts perform filesystem writes.
- Generated mirrors use the `horse-<id>` native name convention.
- Workflow mirrors target Pi prompt templates and Claude commands.
- Firehorse-authored skill mirrors target provider skill surfaces.
- Agent-role mirrors target Claude agents and Pi subagent files synced by explicit setup.
- Generated files live under provider-native `firehorse/` folders.
- Generated mirrors include machine-readable provenance, a visible generated notice, a do-not-edit warning, source definition path, definition ID, and SHA-256 source content hash.
- Generated mirrors are deterministic and not hand-editable.
- Projection updates package-local and repo-root manifests.
- Write mode deletes stale generated mirrors only when valid Firehorse provenance is present.
- Check mode fails when definitions or generated mirrors are invalid or stale.
- Root `typecheck` includes definition validation and generated-mirror freshness checks.
- `docs/FIREHORSE-DEFINITION-FORMAT.md` must include complete canonical examples for `diagnose-fix`, `feedback-loop`, and `diagnostic-reviewer`.
- `horse-new-project` and `horse-map-codebase` should wait for the Definition Format generator rather than being hand-authored provider-native skills first.

## Testing Decisions

- Schema tests should validate required frontmatter fields, schema version handling, kind-specific allowed fields, aliases/deprecations, and actionable error messages.
- Path/ID tests should verify matching IDs, globally unique IDs, and duplicate detection across kinds.
- Body-section tests should verify required Markdown headings for workflow, Firehorse-authored skill, and agent-role definitions.
- Reference tests should verify Firehorse-authored skill references, agent-role references, upstream skill object references, and invalid references.
- Capability tests should verify documented common values, extension-prefixed values, and invalid unscoped values.
- Parser tests should cover gray-matter frontmatter parsing, malformed frontmatter, and body extraction.
- Projection tests should cover Pi workflow prompt output, Claude command output, provider skill output, Claude agent output, Pi agent-role sync output shape, provenance headers, source hashes, and heading preservation.
- Manifest tests should verify generated entries are added to package-local and repo-root manifests, sorted deterministically, and removed when stale generated mirrors are deleted.
- Check/write tests should verify check mode is non-mutating and fails on stale output, while write mode repairs generated mirrors and refuses to overwrite unprovenanced files.
- The first fixture should exercise the complete path from canonical `diagnose-fix`, `feedback-loop`, and `diagnostic-reviewer` definitions to generated Pi/Claude mirrors and manifests.

## Out of Scope

- No Firehorse runtime, prompt loader, slash-command runtime, provider transport, or execution engine.
- No autonomous execution loop.
- No normalization of upstream skills into Firehorse-authored strict definitions.
- No implementation of `horse-new-project` or `horse-map-codebase` in this slice.
- No full skill loader/runtime API; that remains a later phase building on the parser and schema.
- No actual provider API calls for Claude, Codex, or Pi.
- No broad migration of `.pi/gsd/` content.
- No Sentry or observability setup.

## Further Notes

Authoritative decisions are in `.planning/DECISIONS.md`; the handoff summary is at `docs/handoffs/2026-05-15-firehorse-definition-format-grill-handoff.md`.

`docs/SKILLS-FRAMEWORK-DISCUSSION-SYNTHESIS.md` remains useful background, but the decisions captured during the grill supersede it where more specific.

The project currently has no `docs/agents/` setup files. The repository remote is `cinjoff/firehorse`, and GitHub CLI authentication was available during this PRD creation. The `ready-for-agent` label did not exist before publication, so it may need to be created before applying it to the issue.
