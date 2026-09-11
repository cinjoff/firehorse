# PRD: Firehorse Planning, Build, Review, and Fix Workflows

Status: Published  
Published issue: https://github.com/cinjoff/firehorse/issues/11

## Problem Statement

Firehorse has a canonical definition/projection system, but it currently only proves the model with a small diagnostic workflow and supporting artifacts. The project needs a coherent first-party workflow suite for planning work, reviewing plans, implementing issue-sized slices, reviewing code, and fixing bugs.

Legacy FHHS workflows contain useful planning and verification patterns, but porting them literally would violate Firehorse's current boundaries by importing provider-specific runtime behavior, autonomous execution loops, and GSD-shaped state mutation. Firehorse needs to reauthor the valuable patterns as static, provider-neutral Workflow definitions with generated Pi/Claude mirrors and clear artifact contracts.

## Solution

Add a first-party Firehorse workflow suite in canonical definitions:

- `create-plan` — create a Planning Workspace, gather context, run batched docs-backed grilling, produce a PRD Draft, optionally run/recommend plan review, and prepare issue drafts/publication.
- `plan-review` — adversarially review a PRD/plan before issue breakdown or implementation, using product, technical, and execution perspectives.
- `build` — implement one issue-sized vertical slice by default, using TDD when feasible and recording evidence.
- `review-code` — review a diff, issue-sized change, or holistic workstream against Verification Contracts and quality gates without patching by default.
- `fix-bug` — replace `diagnose-fix` with a root-cause-first bug-fix workflow that requires a regression loop before mutation.

Add supporting canonical artifacts:

- `verification-contract` Skill — reusable rules for expected behaviors, required artifacts, acceptance checks, dependencies, and downstream gates.
- `plan-reviewer` Agent Role — product, technical, and execution review perspectives for plan review.
- `code-reviewer` Agent Role — renamed/reworked reviewer role for `review-code` with multiple review focuses.

The implementation remains definition/projection-only: no runtime, no autonomous chain, no provider transport, and no schema changes.

## User Stories

1. As a Firehorse user, I want to create a structured plan from an ask, so that future work starts from evidence rather than chat memory.
2. As a Firehorse user, I want planning research and scouting written to files, so that the main context window stays small and handoffs remain durable.
3. As a Firehorse user, I want memory findings recorded even when empty, so that later agents know memory was checked.
4. As a Firehorse user, I want external research to use the best available provider tools, so that plans can incorporate current library/domain evidence.
5. As a Firehorse user, I want the grilling phase to batch independent questions, so that planning is faster without losing decision quality.
6. As a Firehorse user, I want decisions written as they are made, so that the PRD and issue drafts preserve the actual rationale.
7. As a Firehorse user, I want a PRD Draft in a numbered Planning Workspace, so that related artifacts stay together.
8. As a Firehorse user, I want issue drafts to derive from the PRD Draft, so that implementation tickets trace back to product intent.
9. As a Firehorse user, I want parent and child GitHub issues created in dependency order, so that implementation dependencies are visible in the tracker.
10. As a Firehorse maintainer, I want FHHS-inspired workflows reauthored as first-party Firehorse Workflows, so that Firehorse remains the source of truth.
11. As a Firehorse maintainer, I want provider-specific orchestration only in projection notes, so that canonical definitions stay provider-neutral.
12. As a Firehorse maintainer, I want Verification Contracts instead of vague must-haves, so that build and review workflows have a concrete gate.
13. As a Firehorse maintainer, I want plan review to be adversarial but provider-neutral, so that PRDs are challenged without importing CEO/CTO terminology.
14. As a Firehorse maintainer, I want `build` to default to one vertical slice, so that AFK agents can implement focused, testable work.
15. As a Firehorse maintainer, I want `review-code` to review without patching by default, so that review remains a trustworthy gate.
16. As a Firehorse maintainer, I want `fix-bug` to replace `diagnose-fix`, so that bug fixing has a clearer public invocation.
17. As a future workflow author, I want these workflows to use the existing Definition Format v1, so that no schema migration is needed.
18. As a future workflow author, I want generated mirrors regenerated from canonical definitions, so that Pi and Claude stay aligned.

## Implementation Decisions

- Canonical Workflow IDs are `create-plan`, `plan-review`, `build`, `review-code`, and `fix-bug`.
- `diagnose-fix` is renamed/replaced by `fix-bug`; do not preserve a generated `horse-diagnose-fix` alias.
- `create-plan` creates `docs/prds/prd-000N-<slug>/` with `ASK.md`, `context/`, `DECISIONS.md`, `PRD.md`, optional `PLAN_REVIEW.md`, and later `issues/`/`reviews/`.
- Planning Workspace numbering follows the existing `prd-0001-*` convention and adds a human-readable slug.
- PRD and issue drafts are Markdown with structured blocks only for machine-checkable sections.
- `create-plan` can use upstream `grill-with-docs`, `to-prd`, and `to-issues`, but it constrains their outputs to the Planning Workspace format.
- `create-plan` may publish to GitHub without a separate approval gate; parent PRD issue is created before child issues.
- `plan-review` is recommended before issue breakdown unless the plan is small and high-confidence.
- `build` implements one issue draft or child Published Issue by default; whole-PRD builds require explicit user request.
- `build` records local evidence before updating GitHub comments with concise summaries and artifact links.
- `review-code` can be issue-scoped or holistic and writes review artifacts to the Planning Workspace when available.
- `review-code` uses a `code-reviewer` Agent Role that can run separate review focuses.
- `fix-bug` is root-cause-first and requires a regression loop before patching.
- `fix-bug` creates a lightweight bug workspace only for non-trivial bugs.
- Firecrawl is preferred for web research where available; Pi fallback is `pi-web-access`/`librarian`; Claude fallback is Claude web search.
- Missing or stale Codebase Maps are noted by `create-plan` but not created by it.

## Testing Decisions

- Update definition parser/projection tests for the renamed workflow and new definitions.
- Assert generated mirrors and manifests include `horse-fix-bug` and no longer include `horse-diagnose-fix`.
- Assert workflow references resolve: supporting skills, agent roles, and upstream skill references.
- Run `pnpm definitions:write` after canonical changes, then `pnpm definitions:check`.
- Run package typecheck/build commands appropriate for the changed definition/projection surface.
- Treat generated mirror diffs as reviewable outputs, not hand-authored sources.

## Out of Scope

- Firehorse runtime execution, prompt loading, autonomous workflow chaining, or provider transport.
- Definition Format v1 schema changes.
- Automatic Superset workspace/agent orchestration as canonical behavior.
- Creating or refreshing Codebase Maps.
- Publishing this PRD or issue drafts in this context-cleanup step.
- Implementing the definitions before the user cleans/compacts context.

## Verification Contract

<verification_contract>
<expected_behaviors>
<behavior>Canonical definitions exist for create-plan, plan-review, build, review-code, and fix-bug.</behavior>
<behavior>fix-bug replaces diagnose-fix in generated provider mirrors without a diagnose-fix alias.</behavior>
<behavior>create-plan defines the Planning Workspace artifact contract and context-window-safe workflow.</behavior>
<behavior>plan-review remains independently invokable while also serving as a create-plan gate.</behavior>
<behavior>build defaults to one issue-sized vertical slice and records implementation evidence.</behavior>
<behavior>review-code is no-fix by default and supports both issue-scoped and holistic review.</behavior>
</expected_behaviors>
<required_artifacts>
<artifact>Canonical workflow Definition Files under packages/firehorse-core/definitions/workflows/.</artifact>
<artifact>Canonical verification-contract Skill Definition File.</artifact>
<artifact>Canonical plan-reviewer and code-reviewer Agent Role Definition Files.</artifact>
<artifact>Regenerated Pi and Claude generated mirrors with provenance.</artifact>
<artifact>Updated docs/examples replacing diagnose-fix with fix-bug where relevant.</artifact>
</required_artifacts>
<acceptance_checks>
<check>pnpm definitions:check passes.</check>
<check>pnpm typecheck passes or documented package-level equivalent passes.</check>
<check>Generated manifests expose new horse-\* surfaces and do not expose stale horse-diagnose-fix.</check>
<check>No runtime, schema, provider transport, or autonomous execution code is added.</check>
</acceptance_checks>
<dependencies>
<dependency>This PRD draft and Planning Workspace decisions.</dependency>
<dependency>Existing Firehorse Definition Format v1 implementation.</dependency>
<dependency>Existing upstream skill manifests for Matt Pocock skills.</dependency>
</dependencies>
</verification_contract>

## Further Notes

Issue drafts should be created after a plan-review pass or after explicitly deciding to skip review because the plan is small and high-confidence. This PRD intentionally stops before issue breakdown because the user requested a context-cleanup handoff before implementation.
