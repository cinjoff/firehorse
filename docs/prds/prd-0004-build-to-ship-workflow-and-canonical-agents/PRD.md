# PRD: Build-to-Ship Workflow and Canonical Agents

Status: Published  
Published issue: https://github.com/cinjoff/firehorse/issues/18

## Problem Statement

Firehorse now has first-party planning, build, review, and fix workflows, but the end-to-end path from an Agent-Ready Issue to a released change is still fragmented. The `build` workflow references TDD, but it does not yet fully coordinate a canonical worker role, issue status movement in GitHub Projects, review gates, and release handoff. Firehorse also configures provider-native agents, but those agents are not all authored from one visible canonical source.

Users need a coherent build-to-ship lifecycle: start from a GitHub issue, move it into progress, implement with Matt Pocock-style TDD using a bounded worker, review the result, create a linked pull request, merge with the repository's release policy, update changelog material, tag/release, and verify issue/project status. Maintainers need the underlying agent prompts to come from canonical Firehorse definitions rather than scattered provider-native files.

## Solution

Plan and implement a sliced Firehorse initiative that combines canonical Agent Role projection, `worker` ownership, `build` workflow improvements, a new `ship` workflow, setup manifest validation, and `new-project` GitHub setup.

Canonical Agent Role sources will live under `packages/firehorse-core/definitions/agents/` using Definition Format v1 with `kind: agent-role`. They will generate to top-level provider-native agent paths without a `horse-` prefix, with compact frontmatter provenance only. Existing provider-native agent files such as `worker.md`, `reviewer.md`, and `planner.md` should be overwritten from canonical sources with minimal initial behavior changes, then evolved deliberately.

The `build` workflow will use the canonical `worker` role for bounded implementation cycles, apply TDD when feasible, manually move scoped Published Issues to In Progress using `gh`, and require a `reviewer` gate for non-trivial changes. The `ship` workflow will turn accepted changes into a pull request, link solved issues, prefer squash merge for issue-sized slices, update Keep a Changelog-style release notes, create a release, and verify linked issues are closed and Done where possible.

The setup runtime remains narrow: it validates `.firehorse/manifest.json` on session start when Firehorse markers exist, stays read-only and silent when healthy, and records GitHub repository, Tracker Project, field/status, and label expectations. The planned `new-project` workflow will create or configure GitHub repositories, Tracker Projects, statuses, and labels, then write the setup manifest.

## User Stories

1. As a Firehorse user, I want canonical provider agents to behave consistently across Pi and Claude, so that build/review behavior does not drift by provider.
2. As a Firehorse maintainer, I want Agent Role sources under `definitions/agents/`, so that workflows, skills, and agents share one Definition Format source tree.
3. As a Firehorse user, I want normal agent names like `worker` and `reviewer`, so that Firehorse controls the agents I already invoke instead of creating shadow `horse-*` agents.
4. As a Firehorse maintainer, I want generated agent provenance to be compact, so that provenance does not distract the agent from its working instructions.
5. As a Firehorse user, I want `worker` seeded from the current/upstream behavior, so that migration does not reinvent useful existing instructions.
6. As a Firehorse user, I want `build` to start from an Agent-Ready Published Issue, so that implementation does not drift from the tracker.
7. As a Firehorse user, I want `build` to move the issue to In Progress, so that GitHub Projects reflects active work.
8. As a Firehorse user, I want `build` to use one-test-at-a-time TDD when feasible, so that implementation proceeds in safe vertical slices.
9. As a Firehorse user, I want `build` to name an alternate feedback loop when tests are not feasible, so that validation is never implicit.
10. As a Firehorse user, I want code review integrated before completion, so that non-trivial changes get a review gate.
11. As a Firehorse user, I want `ship` to create a PR that links solved issues, so that GitHub can close issues and update project state.
12. As a Firehorse user, I want `ship` to prefer squash merge for issue-sized slices, so that history stays clean by default.
13. As a Firehorse user, I want `ship` to always create a release with changelog notes, so that shipped work has a durable release artifact.
14. As a Firehorse user, I want `ship` to verify issue/project status after merge, so that automation gaps are visible and repairable.
15. As a Firehorse user, I want `new-project` to create or verify a GitHub Project with the expected statuses, so that new repos are ready for the build-to-ship lifecycle.
16. As a Firehorse maintainer, I want setup validation to run only in Firehorse-enabled repos, so that unrelated repos are not surprised.
17. As a Firehorse maintainer, I want setup runtime to remain narrow and read-only by default, so that it does not become a workflow execution engine.

## Implementation Decisions

- Treat this as one PRD with separately grabbable vertical slices.
- Keep Agent Role definitions in `packages/firehorse-core/definitions/agents/` using Definition Format v1 and `kind: agent-role`.
- Generate Agent Roles to top-level provider-native agent paths:
  - Claude: `packages/firehorse-claude/agents/<id>.md`
  - Pi sync/package source: top-level package-owned agent files such as `packages/firehorse-pi/agents/<id>.md`
- Do not generate Agent Role mirrors under provider `agents/firehorse/` paths.
- `definitions:write` removes stale provenanced Agent Role mirrors under provider `agents/firehorse/` paths.
- `definitions:check` fails when stale provenanced Agent Role mirrors remain.
- Agent Role projections use plain provider-native names without `horse-` prefixes.
- Agent Role projections use compact frontmatter provenance only, or the smallest additional marker needed for generator safety.
- Canonical Agent Role sources lead; generated provider-native agent targets may be overwritten and user edits to targets are not preserved as source of truth.
- Seed initial canonical generic agents from existing provider/upstream wording where useful.
- Keep `plan-reviewer` as a distinct Agent Role; do not fold it into `reviewer` in this PRD.
- Keep `review-code` as the workflow ID, supported by the canonical `reviewer` role.
- Do not preserve a `code-reviewer` compatibility alias or generated `horse-code-reviewer` surface.
- Create canonical `worker` before updating `build` to rely on it.
- `worker` should preserve current/upstream implementation guidance with minimal additions for TDD, scope boundaries, and parent-owned decisions.
- `build` owns scope, TDD contract, implementation evidence, review gate, and completion.
- `build` may delegate bounded implementation cycles to `worker` but must not let `worker` silently broaden behavior coverage or scope.
- `build` moves the scoped Published Issue to In Progress after scope confirmation using `gh`, preferring raw `gh` commands until a Firehorse helper is clearly beneficial.
- `build` runs or simulates a `reviewer` gate for non-trivial changes before completion.
- `ship` is a first-party workflow projected as `horse-ship`.
- `ship` inventories changed files, solved issues, unrelated changes, and release scope before creating/updating a PR.
- `ship` uses PR issue links (`Closes #...` for solved issues, `Refs #...` otherwise) as the primary GitHub automation handoff.
- `ship` prefers squash merge for issue-sized slices unless repository conventions require another method.
- `ship` creates or updates `CHANGELOG.md` in Keep a Changelog style when no stronger repository convention exists.
- `ship` decides the version bump from shipped changes, states the rationale, creates a tag/release, and derives release notes from the changelog entry.
- `ship` verifies linked Published Issues are closed and in Done Tracker Status when possible; it reports or repairs gaps when GitHub automation does not complete the transition.
- `.firehorse/manifest.json` records both human-readable GitHub names and resolved IDs where available, including Tracker Project ID/number and status field/options.
- `new-project` creates or configures GitHub repositories and writes/updates the Firehorse Setup Manifest.
- `new-project` creates or reuses a repository-named Tracker Project and ensures the expected Status field/options exist: Backlog, Ready, In Progress, In Review, Done.
- `new-project` installs or verifies Matt Pocock issue-tracker labels, including `ready-for-agent`.
- Setup runtime validates read-only on session start only when `.firehorse/manifest.json` exists or Firehorse markers are present.
- Setup runtime is cheap, silent when healthy, and not a workflow execution engine.

## Published Vertical Slices

Child vertical-slice issues were drafted locally in this Planning Workspace's `issues/` directory and published to GitHub in dependency order:

1. **Agent projection layout** — [#19](https://github.com/cinjoff/firehorse/issues/19), local draft: `issues/issue-0008-agent-projection-layout-for-canonical-agent-roles.md`
   - Move current Agent Role sources from `definitions/agent-roles/` to `definitions/agents/`.
   - Generate top-level provider-native agent files.
   - Remove stale provenanced provider `agents/firehorse/` agent mirrors.
   - Update manifests, setup docs, tests, and Definition Format docs.
   - Status: first implementation slice; `ready-for-agent`.

2. **Canonical worker role** — [#20](https://github.com/cinjoff/firehorse/issues/20), local draft: `issues/issue-0009-create-canonical-worker-agent-role.md`
   - Add `worker` under `definitions/agents/` seeded from current provider/upstream worker wording.
   - Preserve current behavior with minimal additions for TDD discipline, scope boundaries, and parent-owned decisions.
   - Generate provider-native `worker.md` surfaces.
   - Blocked by: [#19](https://github.com/cinjoff/firehorse/issues/19).

3. **Build workflow TDD/GitHub status update** — [#21](https://github.com/cinjoff/firehorse/issues/21), local draft: `issues/issue-0010-update-build-workflow-for-tdd-worker-reviewer-and-github-status.md`
   - Update `build` to reference `worker` and `reviewer`.
   - Add manual `gh` In Progress transition after scope confirmation.
   - Strengthen TDD/alternate-feedback-loop and review-gate procedure.
   - Blocked by: [#20](https://github.com/cinjoff/firehorse/issues/20).

4. **Ship workflow** — [#22](https://github.com/cinjoff/firehorse/issues/22), local draft: `issues/issue-0011-add-ship-workflow-for-pr-merge-changelog-tag-and-release.md`
   - Add canonical `ship` workflow and generated `horse-ship` surfaces.
   - Implement PR issue linking, review gate, squash-merge preference, changelog/release notes, version bump, tag/release, and post-merge issue/status verification.
   - Blocked by: [#21](https://github.com/cinjoff/firehorse/issues/21).

5. **Setup manifest schema and session-start validation** — [#23](https://github.com/cinjoff/firehorse/issues/23), local draft: `issues/issue-0012-add-firehorse-setup-manifest-schema-and-session-start-validation.md`
   - Add manifest schema/check helpers in core.
   - Record project GitHub names/IDs, Tracker Project IDs, Status field/options, labels, and safe-apply policy.
   - Add provider session-start integration that is read-only, cheap, and silent when healthy.
   - Can proceed after manifest schema design; independent of ship implementation.

6. **New-project GitHub setup** — [#24](https://github.com/cinjoff/firehorse/issues/24), local draft: `issues/issue-0013-add-new-project-github-repository-and-tracker-project-setup.md`
   - Add planned `new-project` workflow and setup helper path for creating/configuring repos.
   - Create/reuse Tracker Project and ensure expected Status field/options and labels.
   - Write/update `.firehorse/manifest.json`.
   - Blocked by: [#23](https://github.com/cinjoff/firehorse/issues/23).

## Testing Decisions

- Add parser/projection tests for `definitions/agents/` source loading.
- Assert Agent Role definitions still validate with Definition Format v1 and `kind: agent-role`.
- Assert Agent Role outputs use top-level provider-native paths and plain names.
- Assert workflows/skills continue to use `horse-<id>` generated names and provider `firehorse/` paths.
- Assert `definitions:write` removes stale provenanced Agent Role mirrors under provider `agents/firehorse/` paths.
- Assert `definitions:check` fails when stale provenanced Agent Role mirrors remain.
- Assert manifests expose top-level provider-native agent files.
- Assert compact Agent Role provenance includes source ID/path/hash without a large HTML banner.
- Assert `build` references `worker` and `reviewer` after the worker slice lands.
- Assert `ship` generated mirrors and manifests are present after the ship slice lands.
- Add tests or fixtures for Firehorse Setup Manifest parsing and setup drift detection.
- Run `pnpm definitions:check` after every definition/projection slice.
- Run `pnpm typecheck` for slices that touch TypeScript runtime or setup code.

## Out of Scope

- A generalized Firehorse workflow execution runtime.
- Provider transport or prompt loading runtime.
- Preserving user edits in generated provider-native Agent Role targets.
- Keeping `code-reviewer` or `horse-code-reviewer` compatibility aliases.
- Folding `plan-reviewer` into `reviewer`.
- Creating child GitHub issues in this PRD publication step.
- Requiring perfect GitHub Projects automation workflows before `new-project` can succeed.
- Replacing raw `gh` usage with Firehorse helpers before helper value is proven.

## Verification Contract

<verification_contract>
<expected_behaviors>
<behavior>Canonical Agent Role source files live under `packages/firehorse-core/definitions/agents/` and validate as Definition Format v1 `agent-role` definitions.</behavior>
<behavior>Agent Role projections generate to top-level provider-native agent paths without `horse-` prefixes.</behavior>
<behavior>Stale provenanced Agent Role mirrors under provider `agents/firehorse/` paths are removed by write mode and rejected by check mode.</behavior>
<behavior>Canonical `worker` exists and preserves current/upstream implementation behavior with minimal TDD and scope-boundary additions.</behavior>
<behavior>`build` uses `worker` for bounded implementation cycles, `reviewer` for review gates, TDD where feasible, and a named alternate feedback loop otherwise.</behavior>
<behavior>`build` moves scoped Published Issues to In Progress using `gh` after scope confirmation.</behavior>
<behavior>`ship` creates/updates PRs with issue links, review gates, squash-merge preference, changelog/release notes, version bump rationale, tag/release creation, and post-merge issue/status verification.</behavior>
<behavior>`new-project` creates/configures GitHub repository setup, Tracker Project fields/statuses, labels, and `.firehorse/manifest.json`.</behavior>
<behavior>Session-start setup validation runs only in Firehorse-enabled repositories, is read-only by default, cheap, and silent when healthy.</behavior>
</expected_behaviors>
<required_artifacts>
<artifact>PRD at `docs/prds/prd-0004-build-to-ship-workflow-and-canonical-agents/PRD.md`.</artifact>
<artifact>Canonical Agent Role definitions under `packages/firehorse-core/definitions/agents/`.</artifact>
<artifact>Top-level generated provider-native Agent Role files in Pi and Claude packages.</artifact>
<artifact>Updated projection generator and manifest handling for Agent Role paths.</artifact>
<artifact>Canonical `worker` Agent Role definition.</artifact>
<artifact>Updated `build` workflow definition and generated mirrors.</artifact>
<artifact>Canonical `ship` workflow definition and generated mirrors.</artifact>
<artifact>Firehorse Setup Manifest schema/check implementation.</artifact>
<artifact>Planned `new-project` workflow and GitHub setup behavior.</artifact>
<artifact>Tests for definitions, projection paths, stale mirror cleanup, setup manifest validation, and changed workflow references.</artifact>
</required_artifacts>
<acceptance_checks>
<check>`pnpm definitions:check` passes after each definition/projection slice.</check>
<check>`pnpm typecheck` passes for slices that touch TypeScript code.</check>
<check>Generated manifests reference top-level provider-native agent files and do not reference stale provider `agents/firehorse/` agent mirrors.</check>
<check>No `code-reviewer` or `horse-code-reviewer` generated compatibility surface remains.</check>
<check>Agent Role provenance is compact and does not include a large HTML banner.</check>
<check>`build` documentation includes TDD feasibility, alternate feedback loop, worker delegation, reviewer gate, and `gh` In Progress transition.</check>
<check>`ship` documentation includes PR issue links, review/CI gate, merge approval, changelog/release notes, version bump, tag/release, and issue/status verification.</check>
<check>Setup runtime remains narrow and does not become a workflow execution engine.</check>
</acceptance_checks>
<dependencies>
<dependency>D-138 setup runtime and manifest boundary.</dependency>
<dependency>D-139 canonical agent-role ownership.</dependency>
<dependency>D-140 no code-reviewer compatibility alias.</dependency>
<dependency>D-142 plain Agent Role names and minimal provenance.</dependency>
<dependency>D-144 Agent Role source directory under `definitions/agents/`.</dependency>
<dependency>D-145 unified PRD and vertical-slice implementation order.</dependency>
<dependency>Existing Definition Format v1 parser/projection generator.</dependency>
<dependency>Existing Matt Pocock `tdd`, `to-issues`, and issue-tracker setup skills.</dependency>
<dependency>GitHub CLI availability for issue/project operations.</dependency>
</dependencies>
</verification_contract>

## Further Notes

The parent PRD issue is [#18](https://github.com/cinjoff/firehorse/issues/18). Child vertical-slice issues [#19](https://github.com/cinjoff/firehorse/issues/19) through [#24](https://github.com/cinjoff/firehorse/issues/24) are published, with local drafts retained under this Planning Workspace's `issues/` directory for handoff/review continuity.
