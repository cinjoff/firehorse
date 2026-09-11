# Planning Decisions

## Source

These decisions were resolved while planning PRD-0004, published as GitHub issue [#18](https://github.com/cinjoff/firehorse/issues/18). Several durable cross-PRD choices were also promoted to root `docs/DECISIONS.md` as D-139 through D-145; this file keeps the PRD-local decision set close to the PRD and child issue drafts.

## Promotion status

- Promoted project-wide: canonical Agent Role ownership, reviewer/code-reviewer consolidation, provider-native agent names, compact provenance, `definitions/agents/` source directory, and combined build-to-ship PRD slicing.
- PRD-local: implementation sequence, child issue slicing, `build`/`ship` behavior details, setup-manifest rollout details, and publication notes.
- Codebase-facing follow-up: projection/generator conventions should be reflected in `docs/codebase/` anchors when a codebase map is created or refreshed.

## Resolved decisions

1. Treat build-to-ship and canonical-agent migration as one PRD with independently grabbable vertical-slice issues.
2. Firehorse owns every Agent Role it exposes, configures, overrides, or relies on in first-party Workflows.
3. Canonical Agent Role sources live under `packages/firehorse-core/definitions/agents/` using Definition Format v1 and `kind: agent-role`.
4. Generate Agent Roles to top-level provider-native agent paths, not provider `agents/firehorse/` paths.
5. Agent Role projections use plain provider-native names without `horse-` prefixes.
6. Agent Role projections use compact frontmatter provenance only, or the smallest additional marker needed for generator safety.
7. Canonical Agent Role sources lead; generated provider-native agent targets may be overwritten and user edits to generated targets are not source of truth.
8. `definitions:write` removes stale provenanced Agent Role mirrors under provider `agents/firehorse/`; `definitions:check` fails if stale mirrors remain.
9. Seed initial canonical generic agents from existing provider or upstream wording where useful, with minimal behavior changes first.
10. Keep `plan-reviewer` distinct from generic `reviewer` for now because plan review includes product, requirements, and execution semantics.
11. The canonical `reviewer` Agent Role subsumes separate `code-reviewer` behavior for code, PR, release, issue/workstream, architecture, tests/evidence, docs, and generated-artifact review.
12. Do not preserve a `code-reviewer` compatibility alias or generated `horse-code-reviewer` surface.
13. Create canonical `worker` before updating `build` to rely on it.
14. `worker` should preserve current/upstream implementation guidance with minimal additions for TDD, scope boundaries, and parent-owned decisions.
15. `build` owns scope, TDD contract, implementation evidence, review gate, and completion.
16. `build` may delegate bounded implementation cycles to `worker` but must not let `worker` silently broaden behavior coverage or scope.
17. `build` moves the scoped Published Issue to In Progress after scope confirmation using `gh`, preferring raw `gh` commands until a Firehorse helper is clearly beneficial.
18. `build` runs or simulates a `reviewer` gate for non-trivial changes before completion.
19. Add first-party `ship` Workflow projected as `horse-ship`.
20. `ship` inventories changed files, solved issues, unrelated changes, and release scope before creating or updating a PR.
21. `ship` uses PR issue links (`Closes #...` for solved issues, `Refs #...` otherwise) as the primary GitHub automation handoff.
22. `ship` prefers squash merge for issue-sized slices unless repository conventions require another method.
23. `ship` creates or updates `CHANGELOG.md` in Keep a Changelog style when no stronger repository convention exists.
24. `ship` decides the version bump from shipped changes, states the rationale, creates a tag/release, and derives release notes from the changelog entry.
25. `ship` verifies linked Published Issues are closed and in Done Tracker Status when possible; it reports or repairs gaps when GitHub automation does not complete the transition.
26. `.firehorse/manifest.json` records human-readable GitHub names and resolved IDs where available, including Tracker Project ID/number and status field/options.
27. `new-project` creates or configures GitHub repositories and writes/updates the Firehorse Setup Manifest.
28. `new-project` creates or reuses a repository-named Tracker Project and ensures expected Status field/options: Backlog, Ready, In Progress, In Review, Done.
29. `new-project` installs or verifies Matt Pocock issue-tracker labels, including `ready-for-agent`.
30. Setup runtime validates read-only on session start only when `.firehorse/manifest.json` exists or Firehorse markers are present.
31. Setup runtime is cheap, silent when healthy, and not a workflow execution engine.
32. Publish child vertical-slice issues in dependency order and retain local drafts under this Planning Workspace's `issues/` directory.
