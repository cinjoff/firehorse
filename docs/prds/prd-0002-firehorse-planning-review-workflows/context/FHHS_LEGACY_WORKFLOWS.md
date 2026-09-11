# Research: Legacy FHHS workflows for Firehorse transfer

Snapshot note: this research describes legacy FHHS behavior and some Firehorse
comparison state as observed before D-136 retired repo-local `.planning/`. Treat
`.planning/` compatibility questions below as historical; current Firehorse
planning artifacts live under `docs/prds/` and GitHub Issues/Projects.

## Summary

The legacy `cinjoff/fhhs-skills` repository is a Claude Code-first, all-in-one workflow plugin whose canonical skill source is `.claude/skills/`, with generated pi.dev and Codex adapters. Its most transferable ideas are not the runtime mechanics, but the static workflow contracts: explicit planning artifacts, `must_haves` traceability, pre-build plan review, wave/task schemas, verification gates, and evidence-before-claim review/fix discipline. Firehorse can adopt these as provider-neutral definition procedures, capability declarations, and artifact schemas now; subagent fanout, `gsd-tools`, memory calls, commits, auto mode, and test/build execution should remain deferred runtime/provider behavior under Firehorse's current no-runtime constraint.

## Source links and file paths inspected

Primary repository source:

- Repository README: <https://github.com/cinjoff/fhhs-skills>
- Claude plugin manifest: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude-plugin/plugin.json>
- Package manifest for adapters: <https://github.com/cinjoff/fhhs-skills/blob/main/package.json>
- pi adapter mapping: <https://github.com/cinjoff/fhhs-skills/blob/main/.pi/README.md>
- Codex adapter mapping: <https://github.com/cinjoff/fhhs-skills/blob/main/.codex/README.md>
- `/fh:plan-work`: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/SKILL.md>
- `/fh:plan-review`: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-review/SKILL.md>
- `/fh:build`: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/build/SKILL.md>
- `/fh:review`: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/review/SKILL.md>
- `/fh:fix`: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/fix/SKILL.md>
- Plan format reference: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/references/plan-format.md>
- Plan-check protocol: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/references/plan-check-protocol.md>
- Spec creation process: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/references/spec-creation-process.md>
- Research protocol: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/references/research-protocol.md>
- Workflow matrix: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/references/workflow-matrix.md>
- Build quality gate: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/build/references/quality-gate.md>
- Build task-state protocol: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/build/references/task-state-protocol.md>
- Build wave execution details: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/build/references/wave-execution.md>
- Fix debugging protocol: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/fix/references/debugging-protocol.md>
- Fix verification checklist: <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/fix/references/verification-checklist.md>

Firehorse comparison sources:

- Project guidance: `/Users/konstantin/.superset/worktrees/8f947b3b-ae15-42eb-a902-dbe4dcc4fd93/workflows-shared-adapters/AGENTS.md`
- Architecture: `/Users/konstantin/.superset/worktrees/8f947b3b-ae15-42eb-a902-dbe4dcc4fd93/workflows-shared-adapters/docs/ARCHITECTURE.md`

Note: I found no `.claude/skills/plan-revew/SKILL.md` path in the cloned repo; the source uses `.claude/skills/plan-review/SKILL.md` and the pi/Codex adapters map to `fh-plan-review`.

## Findings

1. **FHHS is Claude-first, with generated adapters for pi.dev and Codex.** The Claude plugin manifest points its `skills` field at `./.claude/skills/`, while `package.json` exposes generated pi skills under `.pi/skills`; the generated `.pi/README.md` and `.codex/README.md` both map `/fh:plan-work`, `/fh:plan-review`, `/fh:build`, `/fh:review`, and `/fh:fix` to `.claude/skills/*/SKILL.md`. The README explicitly says `.claude/skills/` is the single source of truth and `.pi/skills/`, `.codex/skills/`, and `.pi/agents/` are generated adapters. [README](https://github.com/cinjoff/fhhs-skills), [plugin.json](https://github.com/cinjoff/fhhs-skills/blob/main/.claude-plugin/plugin.json), [package.json](https://github.com/cinjoff/fhhs-skills/blob/main/package.json), [.pi README](https://github.com/cinjoff/fhhs-skills/blob/main/.pi/README.md), [.codex README](https://github.com/cinjoff/fhhs-skills/blob/main/.codex/README.md)

2. **`/fh:plan-work` is a planning orchestrator, not an implementation command.** It requires a GSD-style `.planning/PROJECT.md`, loads roadmap/state/context, matches the request to a phase, checks dependencies, assesses complexity, optionally decomposes scope into multiple focused plans, runs research when needed, performs mandatory brainstorming, discusses gray areas, locks decisions, derives `must_haves`, optionally creates `SPEC.md`, writes `PLAN.md`, runs plan-check, and hands off to `/fh:plan-review` by default. [plan-work SKILL.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/SKILL.md)

3. **The strongest reusable planning idea is `must_haves` traceability.** `plan-work` derives `must_haves.truths`, `must_haves.artifacts`, and `must_haves.key_links`: truths are observable user-facing outcomes, artifacts list files plus grep-able content markers, and key links state how artifacts connect. The plan-check protocol then requires every truth to map to task `<done>` criteria and every artifact to appear in `files_modified`. This is a compact static contract Firehorse can adopt without a runtime. [plan-work SKILL.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/SKILL.md), [plan-format.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/references/plan-format.md), [plan-check-protocol.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/references/plan-check-protocol.md)

4. **`/fh:plan-work` uses complexity routing to decide how much ceremony to apply.** Simple work can skip research and SPEC creation; medium work gets inline research and streamlined `SPEC.md`; complex work can dispatch a phase researcher and spec architect, use FPF-lite confidence tags, and create a richer spec. The reusable design idea is a static procedure that scales rigor with risk, rather than making every task follow the same heavy path. [plan-work SKILL.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/SKILL.md), [research-protocol.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/references/research-protocol.md), [spec-creation-process.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/references/spec-creation-process.md)

5. **`/fh:plan-review` is a no-code, pre-build stress test.** It explicitly runs between `/fh:plan-work` and `/fh:build`, forbids implementation, evaluates both business alignment and engineering rigor, requires a system audit and a scope challenge, supports three review modes (`SCOPE EXPANSION`, `HOLD SCOPE`, `SCOPE REDUCTION`), and prioritizes failure modes, error/rescue mapping, tests, security, performance, and future maintainability. [plan-review SKILL.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-review/SKILL.md)

6. **The key plan-review transfer is an artifact feedback loop.** Review findings are not merely reported; they are written back into the plan artifacts that build already consumes. Critical gaps become `[review]` entries in `PLAN.md` `must_haves.truths`, required files become `must_haves.artifacts`, missing wiring becomes `must_haves.key_links`, and decisions/deferred ideas go into `CONTEXT.md`. This is highly compatible with Firehorse's static definition/projection model if represented as documented artifact contracts rather than runtime behavior. [plan-review SKILL.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-review/SKILL.md)

7. **`/fh:build` turns a plan into code through waves, task state, subagent prompts, quality gates, and verification.** It locates a plan, loads spec and locked decisions, detects resume state, groups tasks by `wave`, warms shared references once, injects project constraints, dispatches one subagent per task, records `.planning/build/task-*-state.md`, spot-checks task output, runs post-wave structural quality gates, commits once, runs tests/build/lint/coverage, writes a summary, updates state, and persists findings. [build SKILL.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/build/SKILL.md), [task-state-protocol.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/build/references/task-state-protocol.md), [quality-gate.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/build/references/quality-gate.md), [wave-execution.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/build/references/wave-execution.md)

8. **The transferable build ideas are the plan schema and gate taxonomy, not the execution loop.** The `PLAN.md` format contains frontmatter for phase/plan/type/wave/dependencies/files/autonomous/must_haves/spec/requirements and XML-like task bodies with `<read_first>`, `<action>`, `<verify>`, and `<done>`. Firehorse can use those ideas as a definition-side workflow contract. The actual fanout, state-file mutation, commits, test execution, and `gsd-tools` calls are runtime behavior and should not enter Firehorse core now. [plan-format.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/references/plan-format.md), [build SKILL.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/build/SKILL.md)

9. **`/fh:review` is a post-build gate with diff scope, spec verification, goal verification, evidence collection, and next-action routing.** It can operate without `.planning/`, but gets richer if a project exists. It determines diff range, checks runtime errors, optionally uses Codemap and Fallow, runs spec verification for GSD projects, dispatches code-quality and gap-analysis reviewers, conditionally dispatches refinement agents, verifies `must_haves`, runs tests/build/lint, aggregates findings, produces a `PASS/WARN/BLOCK` gate, and routes issues to `/fh:fix`, `/fh:refactor`, or `/fh:plan-work`. [review SKILL.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/review/SKILL.md)

10. **The strongest review transfer is three-level artifact verification.** `review` checks whether artifacts exist, are substantive rather than stubs, and are wired/imported/used. It then spot-checks exports and scans for placeholders, TODOs, hardcoded mock data, empty handlers, and orphaned files. This can become a static review checklist in Firehorse definitions immediately, even before Firehorse can run the checks. [review SKILL.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/review/SKILL.md)

11. **`/fh:fix` is a bug workflow centered on root-cause evidence and TDD.** It requires project planning context, checks freshness, past learnings, runtime errors, and static analysis if available; triages the bug as simple/moderate/parallel/complex; follows a no-fixes-before-root-cause debugging protocol; writes a failing test first; applies a minimal fix; runs a verification gate; searches for recurrence patterns; suggests review; writes summary/state updates; and persists non-trivial fix learnings. [fix SKILL.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/fix/SKILL.md), [debugging-protocol.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/fix/references/debugging-protocol.md), [verification-checklist.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/fix/references/verification-checklist.md)

12. **The fix workflow's most reusable safety gate is evidence-before-claim.** The verification checklist requires the agent to identify the command that proves a claim, run it fresh, read full output and exit code, verify the claim, and only then claim completion. This is a provider-neutral instruction and should fit Firehorse as a static safety gate. [verification-checklist.md](https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/fix/references/verification-checklist.md)

## How the workflows combine

The legacy pipeline is deliberately staged:

1. `/fh:plan-work` creates a scoped, evidence-backed plan and optional spec.
2. `/fh:plan-review` challenges that plan before implementation and feeds findings back into `PLAN.md` and `CONTEXT.md`.
3. `/fh:build` executes the strengthened plan in waves, with task-level context isolation and post-wave quality gates.
4. `/fh:review` verifies the diff against code quality, spec, goals, tests, and runtime signals, then gates promotion.
5. `/fh:fix` handles bugs discovered before or after review using root-cause investigation, TDD, verification, and recurrence search.

The common pattern is: **artifact contract → decision gate → execution or analysis → evidence gate → artifact/memory feedback**. That pattern is more important to Firehorse than the exact FHHS toolchain.

## Fit for Firehorse now vs deferred runtime behavior

### Fits Firehorse definitions now

- Static workflow definitions for plan, plan-review, build, review, and fix using Firehorse's standardized sections: purpose, usage, inputs, outputs, supporting capabilities, orchestration intent, safety gates, procedure, and projection notes. Firehorse architecture already describes this contract for workflow definitions. [Firehorse architecture](../docs/ARCHITECTURE.md)
- Provider-neutral artifact contracts inspired by FHHS: `PLAN.md`, `SPEC.md`, `SUMMARY.md`, `must_haves.truths`, `must_haves.artifacts`, `must_haves.key_links`, task `<read_first>`, `<action>`, `<verify>`, `<done>`, and `PASS/WARN/BLOCK` review gates.
- Safety gates as written instructions: no implementation during plan review, default plan review before build, no fix without root cause, TDD for bug fixes, evidence-before-claim, no auto-fix during review, and artifact existence/substance/wiring checks.
- Capability declarations in definition frontmatter, not runtime calls: optional memory, parallel agents, git, filesystem edits, test/build/lint commands, static analysis, ast-grep, Codemap, Fallow, browser/Playwright, runtime error store.
- Projection notes that explain how a provider may realize the workflow: Claude commands, Pi prompt templates, provider-native agent roles, or static skills. Firehorse's current architecture already says workflow definitions project to Pi prompt templates and Claude commands while provider-specific mechanisms remain projection details. [Firehorse architecture](../docs/ARCHITECTURE.md)
- Provenance-first generated mirrors. FHHS already uses `.claude/skills/` as source and generated pi/Codex adapters; Firehorse has a stronger canonical-source model where `firehorse-core/definitions/` generates provider mirrors with provenance and source hashes. [Firehorse AGENTS](../AGENTS.md), [Firehorse architecture](../docs/ARCHITECTURE.md)

### Should remain deferred runtime/provider behavior

- Subagent fanout (`Agent({...})`), debugger/spec-architect/code-reviewer dispatch, parallel wave execution, and automatic refinement-agent dispatch.
- Runtime memory calls (`ToolSearch`, `claude-mem` `search`, `smart_search`, `smart_outline`, `smart_unfold`, and persistence tags).
- `gsd-tools.cjs` plan verification, state mutation, roadmap updates, decision journal updates, task-state files, resume logic, phase completion, and auto-mode.
- Running shell commands for tests/build/lint/coverage, Codemap, Fallow, ast-grep, Sentry-local queries, commits, PR promotion, or branch merges.
- Any autonomous execution loop such as `/fh:auto` chaining plan → review → build → review.
- Provider-specific command syntax such as `mcp__conductor__AskUserQuestion`, Claude Code `allowed-tools`, or Claude-specific `Agent` calls inside canonical core definitions.

This boundary follows Firehorse's hard rule: **no skill runtime or execution code yet**. Static, pinned upstream skills and build-time projection generators are allowed when scoped, but runtime prompt loading, provider transport, autonomous loops, hooks, and execution code are explicitly out of scope. [Firehorse AGENTS](../AGENTS.md)

## Risks of porting too much FHHS/GSD shape into Firehorse

1. **Violating the no-runtime constraint.** FHHS skills are full operational playbooks that call tools, spawn agents, mutate `.planning/`, run tests, commit, and promote branches. Importing this literally would add a runtime or autonomous execution loop before Firehorse has explicitly scoped one.
2. **Leaking Claude-specific mechanics into core.** FHHS uses Claude Code concepts such as `.claude/skills`, `Agent`, `allowed-tools`, `AskUserQuestion`, and specific MCP tool names. Firehorse core must keep provider-specific details in projections or distribution packages.
3. **Overfitting to GSD project structure.** FHHS assumes `.planning/PROJECT.md`, `ROADMAP.md`, `STATE.md`, phase directories, `CONTEXT.md`, and sometimes `gsd-tools.cjs`. At the time of this research Firehorse still kept `.planning/` lightweight and hand-written; D-136 later retired repo-local `.planning/` entirely in favor of docs anchors and GitHub tracking. Adopting FHHS wholesale would still make Firehorse feel like GSD rather than a cross-provider definition framework.
4. **Dependency sprawl.** FHHS expects or references claude-mem, ast-grep, Fallow, Codemap, Sentry-local, Playwright, Firecrawl, context7, LSP tools, and multiple specialized agents. Firehorse should declare capabilities and optional enhancements, not make these hard requirements in core definitions.
5. **Prompt bulk and brittleness.** FHHS skill files are long, procedural, and tuned to past Claude Code failures. Porting them directly could create large generated mirrors, brittle instructions, and poor cross-provider behavior.
6. **Unsafe autonomy by default.** Build/fix/review include file writes, tests, commits, state updates, and possible promotion. Firehorse should separate static guidance from any future runtime authority model so users know what may change files and when.
7. **Source-of-truth confusion.** FHHS has `.claude/skills/` as canonical and generated pi/Codex adapters. Firehorse's canonical source is `packages/firehorse-core/definitions/`; any port must be reauthored or vendored with provenance rather than copied into provider mirrors by hand.
8. **Naming/API instability.** FHHS names (`fh:*`) and GSD-specific concepts may not match Firehorse's current `horse-<id>` generated native resource naming and stable definition ID requirements.

## Sources

### Kept

- `cinjoff/fhhs-skills` README — establishes plugin scope, pipeline overview, command list, and adapter model. <https://github.com/cinjoff/fhhs-skills>
- `.claude/skills/plan-work/SKILL.md` — primary source for planning phases, complexity routing, `must_haves`, spec creation, plan-check, and handoff. <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-work/SKILL.md>
- `.claude/skills/plan-review/SKILL.md` — primary source for pre-build review posture, modes, artifact feedback, diagrams, and gates. <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/plan-review/SKILL.md>
- `.claude/skills/build/SKILL.md` plus build references — primary source for plan execution, waves, subagent prompt template, task state, quality gates, and verification. <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/build/SKILL.md>
- `.claude/skills/review/SKILL.md` — primary source for diff review, spec/goal verification, three-level artifact checks, evidence collection, and gate decisions. <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/review/SKILL.md>
- `.claude/skills/fix/SKILL.md` plus fix references — primary source for bug triage, debugging protocol, TDD fix, verification, and recurrence search. <https://github.com/cinjoff/fhhs-skills/blob/main/.claude/skills/fix/SKILL.md>
- `.pi/README.md` and `.codex/README.md` — source for generated adapter command mappings. <https://github.com/cinjoff/fhhs-skills/blob/main/.pi/README.md>, <https://github.com/cinjoff/fhhs-skills/blob/main/.codex/README.md>
- Firehorse `AGENTS.md` and `docs/ARCHITECTURE.md` — source for current no-runtime, static definition/projection, provider/orchestrator adapter, and generated-mirror constraints.

### Dropped

- Search result snippets for unrelated skill libraries and marketplaces, including Product Onboarding Guide, TheCraigHewitt/skills, and CodingCossack/agent-skills-library — excluded because they are not primary sources for `cinjoff/fhhs-skills`.
- GitHub profile/search result pages — excluded except as discovery aids because the repository files provided stronger direct evidence.
- Missing path `.claude/skills/plan-revew/SKILL.md` — checked because the task mentioned a possible misspelling, but no such file existed in the cloned source.

## Remaining clarification questions

1. Should Firehorse reauthor these as first-party workflow definitions, or vendor selected FHHS skill text as an upstream with provenance?
2. Which workflow IDs and native names should be exposed first: FHHS-compatible names (`plan-work`, `plan-review`, `build`, `review`, `fix`) or Firehorse-specific `horse-*` names only?
3. Should `PLAN.md`/`SPEC.md`/`must_haves` become formal Firehorse artifact schemas now, or remain recommended workflow prose until runtime is scoped?
4. Historical question: how much `.planning/` compatibility is desired? D-136 answers this for the current repo: repo-local `.planning/` is retired, and adopting phase directories/state files/roadmap semantics remains rejected/deferred unless a future decision explicitly reopens it.
5. Which capabilities should be declared as optional versus required in frontmatter for these workflows: memory, parallel subagents, filesystem writes, git, tests/build/lint, static analysis, browser testing?
6. If future runtime work is approved, should it live in provider distributions (`firehorse-pi`, `firehorse-claude`) first, or in a separate runtime package outside `firehorse-core`?
