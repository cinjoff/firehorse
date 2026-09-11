# Skills framework discussion synthesis

**Meeting:** Superset, Pi, and Codebase Architecture — workflow design with agent orchestration
**Date:** May 14
**Participant:** Konstantin
**Purpose of this document:** extract the concepts, ideas, gaps, open questions, and todos from the transcript into one durable planning artifact.

> Current Firehorse constraint: this is a design and planning document. Firehorse still has no custom skill runtime, command layer, prompt loader, or execution loop. Anything below that implies composite skills, loops, or automation should be treated as future workflow design until explicitly scoped.

## 1. Executive synthesis

The discussion converged on Firehorse as an opinionated, cross-provider skills and orchestration layer that turns separate agent capabilities into end-to-end workflows.

The desired system is not “a pile of skills.” It should provide a small number of memorable workflows — for example `plan work`, `build`, `diagnose`, `architecture review`, `design pass`, and `handoff` — that internally coordinate curated skills, tools, subagents, memory, and project documents.

The major design themes are:

1. **Superset as workspace control plane.** Use named Git worktrees and sessions to isolate parallel work, start provider sessions, attach setup scripts, and eventually map GitHub/Linear issues to executable workspaces.
2. **Pi as customizable harness.** Pi is valuable because the system prompt, tools, hooks, UI, extensions, and subagent orchestration can be customized instead of being fixed by one provider.
3. **Cross-provider by default.** Firehorse should avoid locking the framework to Pi, Codex, Claude, or a specific model. Provider-specific behavior belongs in provider adapters or distribution packages.
4. **Workflow composition over raw skills.** Matt Pocock’s skills, Impeccable, pi-subagents, pi-lens, context-mode, pi-web-access, Firecrawl, and future memory should be composed into workflows aligned with user intent.
5. **Long-lived project knowledge anchors.** A project needs durable documents for vision, product direction, design language, architecture, conventions, decisions, research landscapes, and code maps. PRDs are finite slices, not the whole product memory.
6. **Research-first planning.** Before grilling, PRD creation, or implementation, agents need strong domain, product, technical, and library research. Different research phases need different prompts and tool access.
7. **Code intelligence for AI-native development.** AST search, LSP navigation, diagnostics, code maps, and architecture reviews should reduce hallucinated structure and prevent shallow or inconsistent code.
8. **Agent orchestration with feedback.** Chains, parallel fan-out, forked context, background execution, and intercom-style status reporting are core to reliable subagent work.
9. **Human gates before autonomy.** The individual workflow steps should be proven first. Autonomous loops such as “pick next issue and build overnight” come later.

## 2. Key concepts and vocabulary

### Workspace and orchestration concepts

- **Superset:** local workspace manager/control plane for many repositories, branches, sessions, and worktrees.
- **Workspace / worktree:** named isolated Git worktree backed by its own full project folder. Enables parallel feature work without switching one working tree between branches.
- **Forked workspace:** a new worktree created from another in-progress worktree, useful when a branch becomes a starting point for another branch of work.
- **Session:** an agent session attached to a worktree. Multiple sessions can operate against the same branch/files while retaining separate model context.
- **Setup script:** per-worktree setup automation that installs dependencies and prepares the project for running.
- **Remote / hosted workspace:** Superset’s emerging ability to host worktrees elsewhere and run scheduled/remote tasks.
- **Task source:** GitHub issue, Linear issue, or human prompt used to initialize a workspace/session.

### Provider and harness concepts

- **Provider:** model/backend family such as Claude, Codex, local models, or future vendors.
- **Harness:** the interactive coding-agent shell. Claude Code and Pi are harnesses; Pi is more customizable.
- **Adapter discipline:** provider-specific behavior stays inside provider adapters or distribution packages.
- **Model per role:** different subagents can use different models and effort levels. Research and planning may deserve high effort; small implementation or checking tasks may use cheaper/local models.
- **Local model path:** future exploration target for lower-cost subagent work, especially on stronger local hardware.

### Skill and workflow concepts

- **Primitive skill:** one focused capability, usually upstream-owned or distribution-owned.
- **Composite workflow:** a user-facing workflow that orchestrates multiple primitive skills and agents.
- **Static upstream mirror:** pinned upstream skill/agent source copied into Firehorse and mirrored into Pi/Claude distributions.
- **Opinionated curation:** Firehorse should expose a curated set of capabilities so the user does not need to understand every bundled package.
- **Human-in-the-loop gate:** explicit review step before publishing issues, building, merging, or running longer autonomous loops.

### Agent-role concepts

- **Context builder:** packages relevant conversation, code, requirements, and docs for another agent.
- **Scout:** explores the codebase and produces a concise structural brief.
- **Researcher:** researches external domain/product/technical context.
- **Librarian:** researches open-source libraries using source-code evidence and links.
- **Planner:** turns requirements, context, and research into an implementation plan.
- **Oracle:** checks consistency, decisions, constraints, drift, and hidden contradictions.
- **Worker / builder:** implements a bounded slice, ideally test-first.
- **Reviewer:** checks quality, architecture, tests, and goal achievement.
- **Merger / finisher:** prepares integration, validates, and resolves final state.
- **Supervisor:** main agent that owns decisions, delegates, monitors status, and handles human interaction.

### Memory and knowledge concepts

- **Context optimization:** keeping large tool outputs out of model context while making them searchable.
- **Session memory:** transient session history and search/index state.
- **Learned memory:** extracted learnings from conversations and tool calls, ideally searchable semantically and textually.
- **Long-lived anchor document:** durable project document that must influence future planning and execution.
- **Freshness loop:** process for updating anchor documents as conventions, decisions, architecture, and product direction evolve.

## 3. Proposed long-lived project knowledge model

The transcript repeatedly distinguishes project-level knowledge from PRD-level knowledge. PRDs are scoped, finite feature documents. A mature project also needs persistent anchors that every future PRD and implementation can consult.

### Candidate anchor documents

| Anchor                         | Purpose                                                                        | Notes                                                |
| ------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `PROJECT.md` or equivalent     | Vision, audience, problem, success criteria, current product direction         | Not a PRD; should survive many PRDs.                 |
| `CONTEXT.md`                   | Domain language, ubiquitous terms, entities, user mental model                 | Aligns with Matt Pocock’s language-first workflow.   |
| `DESIGN.md`                    | Brand, UX principles, typography, colors, voice, interaction principles        | Impeccable can produce or refresh this.              |
| `ARCHITECTURE.md`              | System boundaries, modules, major flows, diagrams, integration points          | Should guide code scouting and implementation.       |
| `CONVENTIONS.md`               | Naming, folder structure, module patterns, testing conventions, error handling | Prevents agents from copying inconsistent examples.  |
| `DECISIONS.md` / ADRs          | Binding decisions and rationale                                                | Must be consulted by Oracle/reviewer.                |
| `RESEARCH/*.md`                | Market landscapes, competitor analysis, technical research, white papers       | Provides broad direction for multiple PRDs.          |
| `CODEMAP.md` or generated maps | Current codebase structure, seams, hotspots, module responsibilities           | Could be produced by a future map-codebase workflow. |
| `ISSUES.md` / tracker state    | Dependency graph and execution ordering                                        | May live in GitHub/Linear instead of repo files.     |

### Design principle

Every workflow should know which anchors it must load:

- Product planning loads vision, context, design, decisions, and relevant research.
- Architecture work loads context, architecture, conventions, decisions, code maps, and diagnostics.
- UI work loads design, UX principles, current component system, and visual research.
- Implementation loads the PRD/issue, current code scout brief, conventions, architecture, tests, and relevant decisions.

## 4. Proposed end-to-end workflow model

### 4.1 First-time setup and readiness

Goal: make Firehorse usable in the current orchestrator/provider environment.

Possible steps:

1. Detect environment: Superset, Conductor, terminal, tmux, provider harness.
2. Run explicit setup skill, not automatic mutation.
3. Configure optional Superset MCP integration safely.
4. Confirm bundled Pi packages and provider-specific distribution content are available.
5. Run context/tool diagnostics.
6. Record setup state and next recommended workflow.

Primary capabilities:

- `firehorse-setup`
- context-mode diagnostics
- Superset detection/MCP config
- package update checks

### 4.2 Orient in a project / map codebase

Goal: build reliable project understanding before planning or implementation.

Possible steps:

1. Load existing anchor documents.
2. Run code scout with AST/LSP/search diagnostics.
3. Identify modules, seams, data flows, conventions, and hotspots.
4. Detect inconsistent examples and technical-debt traps.
5. Produce or refresh code map and conventions.
6. Feed resulting brief to planner/reviewer/oracle.

Primary capabilities:

- pi-lens AST search, LSP navigation, diagnostics
- context-mode for large outputs
- scout/context-builder subagents
- future `map-codebase` skill revived from fhhs-skills/GSD reference material
- architecture review and AI-slope detection tools

### 4.3 Product idea to PRD to issues

Goal: convert a vague idea into researched, grilled, reviewed, trackable work.

Possible chain:

1. **Anchor load:** gather project vision, design, context, decisions, architecture, and relevant research.
2. **Pre-grill research:** run high-effort product/domain/market/technical research so the grilling session asks informed questions.
3. **Grill / groom:** challenge assumptions, terminology, scope, alternatives, edge cases, and user value.
4. **PRD draft:** create a finite PRD for the specific product slice.
5. **Human review gate:** user reviews and amends the PRD.
6. **Issue generation:** break the PRD into independent vertical slices with acceptance criteria and dependencies.
7. **Dependency ordering:** analyze the issue graph and identify what can be built first, second, and in parallel.
8. **Publish/sync:** create or update GitHub/Linear issues.

Primary capabilities:

- Matt Pocock `grill-me`, `grill-with-docs`, `to-prd`, `to-issues`
- Firecrawl for broad web research
- pi-web-access and librarian for docs/library research
- researcher subagent variants
- planner/oracle subagents
- GitHub/Linear integration later

### 4.4 Issue execution / build a vertical slice

Goal: build one issue safely with scoped context, tests, review, and minimal drift.

Possible loop per issue:

1. Pick next unblocked issue based on dependency graph.
2. Create or select isolated Superset worktree/session.
3. Load issue, PRD, acceptance criteria, anchors, and relevant decisions.
4. Run code scout for the specific slice.
5. Run execution research if the implementation depends on unknown API/library behavior.
6. Produce an implementation plan.
7. Write behavior-oriented tests first where practical.
8. Implement the smallest vertical slice.
9. Run typecheck/tests/build.
10. Run self-review and Oracle consistency check.
11. Update docs/anchors if decisions or conventions changed.
12. Prepare PR/merge handoff.

Primary capabilities:

- TDD skill
- worker/builder subagent
- reviewer/oracle subagents
- pi-lens refactor/navigation tools
- context-mode output handling
- Superset worktree/session management

### 4.5 Diagnose and fix

Goal: reproduce, minimize, instrument, fix, and regression-test a bug.

Possible steps:

1. Reproduce the issue.
2. Minimize to a failing case.
3. Inspect relevant code with AST/LSP tools.
4. Hypothesize and instrument.
5. Write regression test.
6. Patch.
7. Run checks.
8. Review for architecture drift.

Primary capabilities:

- Matt Pocock `diagnose`
- TDD skill
- pi-lens and diagnostics
- boo-boo/code-quality style review tools, if retained

### 4.6 Architecture improvement

Goal: find and address deepening opportunities without creating incoherent refactors.

Possible steps:

1. Load domain language and decisions.
2. Run codebase scout and diagnostics.
3. Identify shallow modules, tight coupling, duplication, inconsistent conventions, and AI-slope risk.
4. Produce improvement candidates with impact/risk/sequence.
5. Human gate: choose candidate(s).
6. Convert chosen refactor into issue slices.
7. Execute with tests and Oracle checks.
8. Refresh architecture/conventions/code-map anchors.

Primary capabilities:

- Matt Pocock `improve-codebase-architecture`
- pi-lens TDI / code review / design smell tools
- AST/LSP navigation
- mermaid diagrams
- map-codebase workflow

### 4.7 Frontend design and UX pass

Goal: move from generic components to a strong, consistent UI/UX.

Possible steps:

1. Load design anchor, project vision, user personas, and UX principles.
2. Research competitors and relevant interaction patterns.
3. Use shadcn as component baseline where applicable.
4. Generate initial UI or identify target screen/component.
5. Run Impeccable for hierarchy, copy, spacing, motion, interaction, and accessibility.
6. Explore Impeccable live workflow for browser annotation and variant selection.
7. Write selected variants back to code.
8. Validate responsive behavior, accessibility, and product fit.
9. Update design anchor if new patterns become canonical.

Primary capabilities:

- Impeccable
- shadcn skill/tooling
- Firecrawl competitor research
- live browser iteration, if validated

### 4.8 Autonomous execution loop — later

Goal: run a durable objective such as “build this PRD” or “process the issue queue” with minimal supervision.

Possible future loop:

1. Take approved PRD or issue queue.
2. Build dependency graph.
3. Pick next unblocked issue.
4. Create/fork worktree.
5. Execute issue workflow.
6. Review, validate, and report.
7. Pause for human gate or continue based on policy.

Potential technologies:

- Pi Go / Codex Go style durable objective loops
- Superset MCP/CLI for workspace/session creation
- pi-subagents async/background execution
- intercom for subagent-to-supervisor signals
- GitHub/Linear issue state

Risk: this should not be implemented before individual workflow steps are validated.

## 5. Tooling and capability map

| Capability area           | Current / candidate tools                      | Role in the framework                                                |
| ------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| Large output handling     | context-mode                                   | Keep raw outputs out of model context; index/search results.         |
| Session/memory extraction | Claude-mem or similar                          | Extract recurring learnings and decisions; needs integration design. |
| Code intelligence         | pi-lens, AST grep, LSP navigation, diagnostics | Reliable structure-aware code navigation and refactoring.            |
| Web research              | Firecrawl, pi-web-access                       | Broad web/docs/search/scraping.                                      |
| Library research          | librarian                                      | Source-backed open-source library analysis.                          |
| Diagrams                  | pi-mermaid                                     | Architecture/process diagrams in docs and plans.                     |
| Subagents                 | pi-subagents                                   | Chains, parallel fan-out, forked context, async runs, intercom.      |
| MCP                       | pi-mcp-adapter, Superset MCP                   | External integrations and workspace control.                         |
| Product/planning          | Matt Pocock skills                             | Grill, PRD, issues, triage, architecture, TDD, diagnosis.            |
| Frontend/UI               | Impeccable, shadcn                             | Design systems, UI polish, live iteration.                           |
| Release/upstream          | Firehorse release/update scripts               | Track pinned upstream content and Firehorse package versions.        |

## 6. Gaps and unresolved design questions

### 6.1 Long-lived document model is not defined

The transcript identifies the need for durable project anchors, but Firehorse does not yet define:

- canonical file names,
- required vs optional anchors,
- how anchors are discovered,
- which workflows load which anchors,
- how anchors are updated,
- how conflicts between memory, ADRs, PRDs, and current code are resolved.

### 6.2 Memory architecture is unclear

There are at least three memory layers:

1. context-mode searchable command/tool output,
2. Claude-mem-style extracted learnings,
3. durable markdown anchors and ADRs.

Open questions:

- What belongs in memory vs markdown?
- When should a learning be promoted to an anchor document?
- How does the system avoid stale or contradictory memory?
- How does this work cross-provider?
- Does Firehorse need its own memory abstraction later, or only adapters around existing tools?

### 6.3 Agent role boundaries need tightening

The default context-builder appears too broad: it reads code, analyzes requirements, and can also research. The desired system probably needs sharper roles:

- product/domain researcher,
- technical/library researcher,
- code scout,
- context packager,
- planner,
- oracle,
- reviewer,
- worker.

Each role needs a narrow purpose, tool allowlist, model default, and output contract.

### 6.4 Research needs two distinct phases

The discussion identified two research moments:

1. **Before grilling/PRD:** broad, high-effort research to understand the domain, market, competitors, methodologies, and major options.
2. **Before execution:** focused implementation research for exact APIs, libraries, migration strategies, and technical constraints.

These should be different prompts and possibly different agents.

### 6.5 Tool routing and overrides are incomplete

Bundled/default agents may refer to generic `read`, `write`, `web_search`, or `web_fetch`. Firehorse likely wants role-specific replacements:

- context-mode for large output processing,
- pi-lens for code structure,
- librarian for library internals,
- Firecrawl/pi-web-access for serious web research,
- mermaid for diagrams,
- explicit write/edit constraints for safe file mutation.

Need a clear mapping from generic tools to Firehorse-preferred tools per distribution.

### 6.6 Matt Pocock skills need integration strategy

Some Matt skills are interactive and should remain user-facing. Others may become subagent roles or workflow steps.

Open questions:

- Which skills stay as primitive skills?
- Which become subagent prompts?
- Which are only inspiration for Firehorse composites?
- How do we customize without losing upstream updateability?
- How do we expose fewer user-facing names while preserving capability?

### 6.7 Superset automation is promising but unproven

The transcript suggests using Superset MCP/CLI as a middleman to create workspaces/sessions and orchestrate Claude/Pi. This needs validation:

- Can workspaces be created reliably from issues?
- Can setup scripts be standardized?
- How do hosted/remote worktrees handle secrets and dependencies?
- What is the paid-plan boundary?
- How does this interact with provider limitations on programmatic sessions?

### 6.8 Cross-provider parity is hard

Pi supports customizable subagent orchestration, forked context, chains, and intercom. Claude Code has a more rigid subagent model.

Open questions:

- Which workflow semantics are core and provider-neutral?
- Which are Pi-only enhancements?
- What is the Claude fallback for intercom/forked context?
- How do we avoid building the core around Pi-specific mechanics?

### 6.9 Code quality tooling overlaps

The transcript mentions diagnosis, architecture improvement, TDI, boo-boo, design smells, complexity, duplicates, AI-slope, and type coverage.

Need to decide:

- Which tools are retained and exposed?
- Which are internal checks inside broader workflows?
- How do results become actionable issues rather than noisy reports?

### 6.10 Impeccable live workflow needs validation

The live browser annotation and variant flow sounds highly valuable, but still needs hands-on validation against real codebases:

- Does it respect existing component libraries such as shadcn?
- Does it produce maintainable code?
- How does it store selected variants?
- How does it fit into design anchors and review gates?

### 6.11 Issue execution policy is undefined

The desired flow creates issues with behavior and acceptance criteria, not file-path-level instructions. That leaves execution flexibility, but requires strong guardrails:

- dependency graph,
- acceptance criteria,
- reviewer/oracle checks,
- tests,
- branch/worktree isolation,
- merge strategy,
- conflict handling,
- doc updates when conventions change.

### 6.12 Autonomous loops need safety gates

Pi Go / Codex Go / Sandcastle-style loops are attractive, but should wait until the primitives are proven.

Open questions:

- What work can run unattended?
- What always needs a human gate?
- When should the loop pause?
- How are stuck subagents detected?
- How does intercom escalate errors?

## 7. Extracted todos

### P0 — Clarify design before building runtime

- [ ] Define the canonical long-lived anchor document set and file names.
- [ ] Define which workflows load which anchor documents.
- [ ] Decide how PRDs relate to project-level vision, design, research, architecture, conventions, and decisions.
- [ ] Draft the Firehorse workflow taxonomy: small number of user-facing workflows, many internal primitives.
- [ ] Map every bundled primitive skill/tool/subagent to a capability area.
- [ ] Mark which workflow ideas are allowed now as docs/static content vs deferred runtime/automation work.

### P1 — Research and validate upstream primitives

- [ ] Deep-read pi-subagents: agent definitions, chains, parallel fan-out, forked context, async, intercom, saved chains.
- [ ] Deep-read Matt Pocock skills and identify which are interactive, agentifiable, or composite-only.
- [ ] Validate Impeccable live browser/variant workflow on a real local app.
- [ ] Compare context-mode and Claude-mem-style memory: purpose, storage, search, promotion to docs, cross-provider implications.
- [ ] Validate Firecrawl vs pi-web-access vs librarian roles and decide default research routing.
- [ ] Investigate Superset MCP/CLI for workspace/session creation and issue-driven workflows.
- [ ] Investigate Pi Go / Codex Go durable objective loops, but keep implementation deferred.
- [ ] Explore local models for low-cost subagent work.

### P2 — Design Firehorse agent roles

- [ ] Define Firehorse-owned subagent roles: context-builder, scout, product researcher, technical researcher, librarian, planner, oracle, worker, reviewer, merger.
- [ ] For each role, define input contract, output artifact, allowed tools, default model/effort, and failure/escalation behavior.
- [ ] Split broad default agents where necessary, especially context-builder vs scout vs researcher.
- [ ] Decide when agents start fresh vs inherit/fork the supervisor context.
- [ ] Define intercom/status expectations for long-running subagents.
- [ ] Define reviewer/oracle acceptance criteria for drift, hidden contradictions, and decision consistency.

### P3 — Design composite workflows

- [ ] Specify `firehorse-plan-work`: anchor load → research → grill → PRD → human gate → issues → dependency plan.
- [ ] Specify `firehorse-build-slice`: issue selection → scout → focused research → plan → TDD → implementation → checks → review.
- [ ] Specify `firehorse-architecture-review`: code map → smells/hotspots → opportunities → issue slices → anchor refresh.
- [ ] Specify `firehorse-fix-bug` (historically discussed as `firehorse-diagnose-fix`): reproduce → minimize → instrument → regression test → patch → review.
- [ ] Specify `firehorse-design-pass`: design anchors → competitor research → shadcn/impeccable → live variants → validation → design-anchor update.
- [ ] Specify `firehorse-handoff`: state, decisions, files, open questions, validation, next prompt.
- [ ] Decide whether user-facing names should stay close to existing `fhhs-skills` names such as `plan work` and `build`.

### P4 — Tool integration design

- [ ] Create a preferred-tool matrix by agent role and workflow.
- [ ] Replace generic web search/fetch assumptions with Firecrawl/pi-web-access/librarian where appropriate.
- [ ] Require pi-lens/AST/LSP for structural code claims and refactors.
- [ ] Require context-mode for large command outputs and logs.
- [ ] Add mermaid diagram generation to architecture and planning workflows.
- [ ] Define safe write/edit policy for subagents.

### P5 — Project memory and freshness

- [ ] Design promotion rules from transient learnings to durable markdown anchors.
- [ ] Define how architecture/conventions/design docs are refreshed after implementation.
- [ ] Define stale-memory detection and conflict resolution.
- [ ] Decide whether Firehorse needs a memory abstraction later or should compose external memory tools.
- [ ] Add “doc update required?” checks to reviewer/oracle flows.

### P6 — Issue and workspace workflow

- [ ] Validate Matt `to-issues` output quality with GitHub issues.
- [ ] Define issue dependency representation and unblocked-issue selection.
- [ ] Decide whether issues should avoid file paths entirely or include optional scouting briefs outside the issue body.
- [ ] Define how Superset workspace names map to issue IDs and PRDs.
- [ ] Define worktree setup scripts and run buttons per project.
- [ ] Define merge/conflict policy for parallel worktrees.

### P7 — Later autonomous execution

- [ ] Only after manual workflow validation, design an unattended issue loop.
- [ ] Define stop/pause/escalation conditions.
- [ ] Define how subagent failures are surfaced to the supervisor.
- [ ] Decide how much autonomy is acceptable before human review.
- [ ] Evaluate hosted Superset workspaces vs local overnight runs.

## 8. Suggested prioritization

1. **Document model first.** Without project anchors, later workflows will lack stable context.
2. **Role model second.** Clear agent boundaries prevent over-broad prompts and tool misuse.
3. **Manual composite specs third.** Specify workflows declaratively before implementing any runtime.
4. **Validate primitives fourth.** Try Matt skills, Impeccable live, pi-subagents, Firecrawl/librarian, and Superset MCP on real tasks.
5. **Automate last.** Only build durable loops once single-step workflows are trusted.

## 9. Concrete near-term next document(s)

This synthesis should probably be followed by smaller, actionable specs:

1. `docs/PROJECT-ANCHORS.md` — canonical long-lived documents and freshness rules.
2. `docs/AGENT-ROLES.md` — role definitions, tools, models, inputs, outputs, escalation.
3. `docs/COMPOSITE-WORKFLOWS.md` — declarative workflow specs for plan/build/diagnose/design/architecture/handoff.
4. `docs/AUTONOMY-LATER.md` — future durable loop design and safety gates.

These should remain design docs until the roadmap explicitly scopes a Firehorse runtime or command layer.
