# Firehorse

Firehorse is a cross-provider agent workflow framework centered on user-facing workflows rather than isolated skills.

## Language

**Workflow**:
A user-facing end-to-end capability that coordinates supporting capabilities to achieve an outcome.
_Avoid_: Composite skill, command, recipe

**Ideation Station**:
A planned canonical Firehorse Workflow that gathers curated external signals, analyzes their relevance to a chosen anchor such as a repository, project, or topic, and produces idea-oriented synthesis artifacts. It is experimental but should still be authored through the Firehorse Definition Format. It is repeatable and may be invoked by external schedulers, but it is not a standalone skill, scheduler, crawler runtime, or background daemon. Its run modes include anchor initialization, anchor recalibration, signal capture, signal interpretation, digest generation, full digest runs, follow-up review, and depth choices such as light, standard, deep, and anchor-research runs. It may express specialist role coordination as provider-neutral Orchestration Intent rather than provider-specific subagent mechanics.
_Avoid_: Skill, autonomous runtime, news scraper, telemetry system, Firehorse-only workflow

**Ideation Anchor**:
The repository, project, topic, or durable interest that an Ideation Station uses as its primary relevance lens. An Ideation Anchor should be understood structurally through systems thinking, big-picture pattern recognition, and explicit research or grilling before external signals are scored against it.
_Avoid_: Keyword, search query, news category, source list

**Anchor Model**:
A structured understanding of an Ideation Anchor, including its key systems, tensions, adjacent domains, design philosophies, recurring patterns, and open questions. It guides which signals matter and how they relate to the anchor. It is created or recalibrated before recurring Ideation Station digest runs. Routine digest runs propose Anchor Model changes but do not mutate it automatically; user-approved recalibration updates it.
_Avoid_: Topic summary, keyword taxonomy, generic background research

**Ideation Workspace**:
A user-visible artifact location for an Ideation Station's Anchor Model, non-secret source configuration, signal records, and digest outputs. For repository or project anchors, the recommended location is a project-owned path such as `docs/ideation/`; for topic anchors, it may be a user-chosen workspace folder. It is not hidden Firehorse runtime storage. Ideation Station v1 is curated-source first: users declare where to look before the workflow augments or discovers additional sources. Source configuration may name access methods but must not store tokens, cookies, API keys, or private account data. Private or semi-private curated sources are allowed only when user-provided tooling already has access; resulting artifacts should preserve visibility metadata and warn before writing private excerpts into public or repo-committed paths.
_Avoid_: Hidden cache, runtime persistence, telemetry store, credential store, generated mirror

**Ideation Signal**:
An attributable external observation that may matter to an Ideation Anchor, such as an issue, comment, video segment, article excerpt, repository change, or community discussion. It preserves provenance and is evaluated against the Anchor Model across evolving qualitative axes rather than reduced to a single importance score at first. Ideation Signals are gathered through source-specific strategies for curated queues, repository activity, community discussions, reference material, code patterns, and trend scans rather than one generic scrape-everything bucket. Prior signal records and digests in the Ideation Workspace provide the visible novelty baseline for classifying new captures as new, reinforcing, variant, renewed, duplicate, or low-novelty signals.
_Avoid_: Generic search result, unsourced idea, digest section

**Signal Capture**:
The Ideation Station phase that preserves what was actually observed from sources with provenance and minimal interpretation. Capture uses source-specific extraction protocols so important metadata is not flattened into a generic text blob.
_Avoid_: Synthesis, editorial summary, unsupported inference

**Signal Interpretation**:
The Ideation Station phase that relates captured signals to the Anchor Model, including patterns, emotions, tensions, assumptions, implications, and possible follow-up work.
_Avoid_: Raw scrape, source capture, provenance record

**Signal Energy**:
The emotional, motivational, and social force carried by an Ideation Signal, such as frustration, longing, confusion, excitement, exhaustion, care, conviction, or repeated community resonance. Signal Energy is a qualitative interpretation axis, not proof by itself.
_Avoid_: Truth score, sentiment-only label, popularity contest

**Ideation Digest**:
A curated human-readable synthesis produced from Ideation Signals and an Anchor Model. It may use an editorial or newspaper-like presentation, but remains distinct from the underlying signal records. Important evidentiary claims in a digest should cite the Ideation Signals they synthesize, with careful redaction or visibility handling for private and semi-private sources. Each digest should reflect on source coverage and bias so its synthesis does not appear more representative than the checked sources justify.
_Avoid_: Signal record, raw scrape, source ledger, uncited vibes journalism

**Ideation Follow-up Queue**:
A user-visible artifact that captures possible next actions emerging from Signal Interpretation, such as watch questions, research leads, PRD candidates, issue candidates, prototype candidates, source-list changes, and low-signal themes to keep watching or dismiss. It captures inspiration and possible next steps, not binding commitments; PRDs, issues, and project decisions require explicit follow-on workflows or user decisions. High-interest but under-evidenced signals become bounded research leads unless the user explicitly chooses a deeper research mode.
_Avoid_: Mandatory task list, GitHub issue, digest section, hidden backlog, project commitment

**Signal-to-Idea Pipeline**:
The Ideation Station interpretation path from Captured Signal to Interpreted Signal, Pattern, Insight, Follow-up Candidate, and optional handoff to another workflow such as PRD drafting, issue creation, prototyping, or deeper research.
_Avoid_: Automatic commitment, task conversion, unstructured inspiration dump

**Skill**:
A reusable instruction or capability ingredient that can support one or more workflows.
_Avoid_: Workflow, command

**Agent Role**:
A reusable specialist role that may be projected into provider-native agent or subagent mechanisms.
_Avoid_: Persona, bot; use "subagent" only for provider/runtime-specific implementations

**Firehorse Definition Format**:
The declarative cross-provider authoring model for Firehorse-authored workflows and their supporting ingredients.
_Avoid_: Capability format, skill format, command format, execution graph

**Upstream Skill**:
A skill imported from another project and preserved as external source material rather than reauthored as a Firehorse-native workflow.
_Avoid_: Firehorse workflow, first-party skill

**Firehorse-authored Skill**:
A skill authored directly in the Firehorse Definition Format and governed by Firehorse's strict skill template.
_Avoid_: Upstream Skill, mirrored skill

**Orchestration Intent**:
A provider-neutral description of how a workflow should coordinate work across phases, roles, gates, or parallel efforts.
_Avoid_: Pi chain, saved chain, intercom recipe, execution graph

**Definition File**:
A Markdown file with frontmatter that contains one canonical Firehorse definition and whose path matches its declared ID.
_Avoid_: YAML definition, TypeScript definition object, registry entry

**Definition ID**:
A globally unique identifier for a Firehorse-authored definition.
_Avoid_: Kind-scoped ID, path-only ID, type-prefixed ID

**Definition Body**:
The structured Markdown portion of a Definition File that carries instruction-heavy guidance.
_Avoid_: Freeform notes, YAML-only contract

**Capability Requirement**:
A provider-neutral `requires` or `optional` declaration that states what a definition needs from tools, orchestration, modalities, or environment using documented common values plus extension-prefixed values.
_Avoid_: Provider compatibility matrix, projection note only, arbitrary unscoped strings

**Definition Schema**:
The gray-matter-parsed, Zod-backed TypeScript schema, parser, and validator for Firehorse Definition Files.
_Avoid_: Runtime loader, execution engine, prompt loader

**Projection Generator**:
Build-time code that turns canonical Firehorse Definition Files into provider-native generated mirrors and supports write/check modes.
_Avoid_: Runtime loader, manual port, execution engine

**Generated Mirror**:
A checked-in provider-native file produced from a canonical source file, marked with source provenance and a SHA-256 source content hash, exposed through manifests, and not hand-edited. Workflow and skill Generated Mirrors live under provider-native `firehorse/` generated-content folders and use `horse-` names; Agent Role mirrors use plain provider-native names at top-level provider agent paths and may intentionally overwrite provider-native agent files.
_Avoid_: Hand-authored adapter copy, runtime-generated file

**Schema Version**:
A required integer Definition File frontmatter field, starting at `1`, that identifies which Firehorse Definition Schema version validates the file.
_Avoid_: Package-version inference, semver schema string, optional format version

**Upstream Skill Reference**:
A structured reference to an imported upstream skill using separate `upstream` and `id` fields.
_Avoid_: Colon-delimited string, filesystem path reference

**Definition Alias**:
A frontmatter-declared previous ID for a stable Definition ID.
_Avoid_: Silent rename, changelog-only alias

**Project Anchor**:
A long-lived project knowledge document that survives individual PRDs, issues, and implementation sessions.
_Avoid_: GSD artifact, sprint plan, one-off spec

**Project Decision**:
A project-wide binding decision recorded in `docs/DECISIONS.md`, with rationale and alternatives, that remains authoritative until superseded.
_Avoid_: Planning Decision, codebase-only convention, issue state, PRD checklist item

**Codebase Map**:
A set of Project Anchors that describes the existing codebase's structure, architecture, logic, conventions, tests, integrations, risks, and codebase-facing decisions.
_Avoid_: GSD map, memory cache, one-off audit, planning transcript

**Session Audit**:
A post-hoc review of completed agent sessions that identifies workflow/tooling inefficiencies and correctness risks from session evidence.
_Avoid_: Runtime monitor, telemetry system, hook, enforcement layer

**Session Evidence**:
Artifacts from completed or recent agent sessions used to support Session Audit findings.
_Avoid_: Telemetry stream, monitoring data, private log dump

**Session Outcome**:
The observable result of an agent session relative to the user's request, including completed work, verification, user correction after delivery, relevant-code discovery effort, and final-answer accuracy.
_Avoid_: Quality score, final answer, hidden product correctness

**Session Memory Observation**:
A memory record attributable to an audited session that can be used as Session Evidence.
_Avoid_: Broad memory dump, unrelated prior work, authoritative source of truth

**Assessment Workflow**:
A Workflow that evaluates an existing project or session and produces evidence-backed findings, reports, and optional Issue Drafts.
_Avoid_: Health check, audit mode, runtime monitor

**Starter Template**:
A prebuilt application starting point used to create an initial codebase when the user opts into scaffolding.
_Avoid_: Framework mandate, generated docs, GSD template

**Vertical Slice**:
An independently grabbable issue that delivers a thin, complete path through the product.
_Avoid_: Layer task, component task, horizontal slice

**PRD Draft**:
A local reviewable product-requirements artifact produced before publishing work to an issue tracker.
_Avoid_: Project Anchor, final issue, roadmap

**Issue Draft**:
A local reviewable issue artifact produced from a PRD Draft before creating one or more tracker issues.
_Avoid_: GitHub issue, checklist note, layer task

**Published Issue**:
A GitHub issue created from a PRD Draft or Issue Draft.
_Avoid_: Issue Draft, local task file, plan

**Agent-Ready Issue**:
A Published Issue with clear scope, acceptance criteria, blocking relationships, and enough context for the `build` workflow to start without rediscovery.
_Avoid_: ready label only, vague backlog item, implementation plan

**Tracker Project**:
A GitHub Projects board for one repository that groups Published Issues by workflow status.
_Avoid_: Project Anchor, Planning Workspace, repo, roadmap document

**Tracker Status**:
A status value on a Published Issue inside a Tracker Project, using GitHub Projects Kanban statuses such as Backlog, Ready, In Progress, In Review, and Done.
_Avoid_: triage label, GitHub open/closed state, implementation status prose

**Firehorse Setup Manifest**:
A checked-in, non-secret `.firehorse/manifest.json` file that records project setup expectations such as GitHub owner/repo, canonical memory project name, Tracker Project name and resolved IDs, Tracker Status field/options, label vocabulary, and safe-apply policy for read-only setup validation.
_Avoid_: runtime workflow graph, package manifest, hidden local state

**Planning Workspace**:
A local, numbered workspace under `docs/prds/prd-000N-<slug>/` that collects the ask, gathered context, planning decisions, PRD draft, and issue drafts for one planning effort.
_Avoid_: Project Anchor, runtime state, memory cache

**Gathered Context**:
Evidence assembled before drafting or reviewing a plan.
_Avoid_: Conversation history, memory cache, implementation output

**Planning Decision**:
A resolved answer to a planning question inside one Planning Workspace that the PRD and issue drafts must preserve.
_Avoid_: Project Decision, Codebase Map, ADR, task state

**Verification Contract**:
A structured set of expected behaviors, required artifacts, acceptance checks, and dependencies that future work can be verified against.
_Avoid_: must-haves, vague acceptance notes, implementation checklist

**Freshness Metadata**:
Evidence in a generated or mapped document that identifies what source state it reflects.
_Avoid_: Timestamp-only confidence, implicit freshness, memory cache

## Relationships

- The **Firehorse Definition Format** describes Firehorse-authored **Workflows**, **Skills**, and **Agent Roles**.
- A **Definition File** is the physical form of one Firehorse-authored **Workflow**, **Skill**, or **Agent Role**.
- A **Definition ID** identifies exactly one Firehorse-authored **Definition File** across all definition kinds and is stable public API.
- A **Definition Alias** preserves continuity when a **Definition ID** is renamed or deprecated.
- A **Definition File** combines frontmatter metadata with a structured **Definition Body**.
- A **Definition File** declares an integer **Schema Version**, starting at `1`.
- A **Definition File** may declare **Capability Requirements** for validation and provider projection.
- The **Definition Schema** validates **Definition Files** without executing workflows or loading provider runtimes.
- The **Projection Generator** produces **Generated Mirrors** for Pi and Claude distributions.
- A **Generated Mirror** is committed and traceable back to its source **Definition File**. Workflow and Skill mirrors use a `horse-<id>` native name; Agent Role mirrors use plain provider-native `<id>` names at top-level agent paths.
- A **Generated Mirror** contains rendered instructions, not a runtime reference back to the source **Definition File**.
- A **Generated Mirror** includes a SHA-256 source content hash for freshness checks and is exposed through package-local and repo-root manifests.
- A **Workflow** projects to Pi prompt templates and Claude commands as its primary user-facing **Generated Mirrors**.
- The canonical `new-project` **Workflow** projects to the provider-native `horse-new-project` invocation name.
- The canonical `ship` **Workflow** uses the Definition Format/projection path rather than hand-authored provider-only behavior.
- The `ship` **Workflow** turns accepted changes into a Pull Request, links solved **Published Issues**, prefers squash merge, updates release notes, and creates a release artifact.
- When `new-project` defines `docs/DESIGN.md` and the stack uses shadcn/ui, the design anchor feeds a shadcn preset that is initialized or applied through the shadcn CLI before component implementation.
- The **Projection Generator** updates provider manifests so **Generated Mirrors** are exposed by their distributions.
- A **Project Anchor** captures durable context for future workflows without depending on GSD.
- `docs/PROJECT.md` is the evergreen project-level **Project Anchor** for Firehorse.
- `docs/DECISIONS.md` is the append-only log of project-wide **Project Decisions**, not the default store for every planning answer.
- Repository roadmap, requirements, and active state tracking live in GitHub **Published Issues** and **Tracker Projects**, not in local roadmap/state files.
- The `new-project` **Workflow** creates or configures GitHub repositories, writes the **Firehorse Setup Manifest**, creates or reuses a repository-named **Tracker Project**, ensures the expected Tracker Status field/options exist, and installs the Matt Pocock issue-tracker label vocabulary including `ready-for-agent`.
- The **Firehorse Setup Manifest** is validated read-only on session start only when it exists or Firehorse project markers are present; setup checks are cheap, silent when healthy, and mutations require explicit workflows, `firehorse-setup`, or user-approved apply steps.
- A **Firehorse Setup Manifest** is narrow setup/runtime metadata, not a generalized workflow execution engine.
- A **Planning Workspace** under `docs/prds/` captures one PRD-sized planning effort and may include **Gathered Context**, **Planning Decisions**, a **PRD Draft**, optional plan review artifacts, and issue drafts.
- **Planning Decisions** are scoped to one **Planning Workspace**; **Project Decisions** are project-wide and belong in `docs/DECISIONS.md`.
- A **Planning Decision** is promoted to a **Project Decision** only when it applies beyond the owning PRD or changes repository-wide policy.
- A **Planning Decision** is promoted to a **Codebase Map** anchor or codebase ADR when it becomes durable guidance about architecture, structure, logic, conventions, tests, integrations, or risks.
- A **Codebase Map** is stored as `docs/codebase/` **Project Anchors** and can be produced independently of `horse-new-project`.
- A **Codebase Map** includes **Freshness Metadata** such as source commit/hash and timestamp.
- A **Session Audit** is an **Assessment Workflow** that reviews **Session Evidence**, may use **Gathered Context**, and may inform **Issue Drafts** or **Published Issues**, but it is not a runtime enforcement mechanism.
- A **Session Audit** evaluates a **Session Outcome** using **Session Evidence** but does not reduce it to a single numeric score.
- A **Session Memory Observation** can support a **Session Audit** only when it is attributable to the audited session and bounded by the same privacy rules as other **Session Evidence**.
- **Session Evidence** may include recent session logs, context-mode statistics, memory injection summaries, **Session Memory Observations**, subagent status/control summaries, command/test summaries, and user-provided transcript excerpts.
- `assess-codebase-health` and `session-audit` are sibling **Assessment Workflows** with different evidence scopes.
- A **Starter Template** may create the first codebase, but product discovery and **Project Anchors** can exist before scaffolding.
- A **Vertical Slice** can become a **Published Issue** after product discovery and approval.
- A **PRD Draft** references the high-level **Project Anchor** instead of duplicating it.
- A **PRD Draft** can be broken into one or more **Issue Drafts**.
- An **Issue Draft** that derives from a **PRD Draft** lives in that Planning Workspace's `issues/` directory.
- An **Issue Draft** may become a child **Published Issue** and should retain the tracker link.
- A **Tracker Project** is distinct from a **Project Anchor** and exists to track **Published Issues** through **Tracker Statuses**.
- The planned `new-project` **Workflow** creates or reuses a repository-named **Tracker Project** when the repository is GitHub-backed and GitHub access is available.
- The `create-plan` **Workflow** publishes the parent **Published Issue** before child **Published Issues** when publishing is part of the workflow.
- The `create-plan` **Workflow** may publish **PRD Drafts** and **Issue Drafts** as **Published Issues** as part of the workflow.
- The `create-plan` **Workflow** adds newly created **Published Issues** to the repository **Tracker Project** with the initial **Tracker Status** selected by the workflow or issue readiness.
- An **Agent-Ready Issue** is a **Published Issue** that the `build` **Workflow** can safely claim after scope confirmation.
- The `build` **Workflow** may move a **Published Issue** to the In Progress **Tracker Status** using `gh` after scope confirmation, preferring raw `gh` commands until a Firehorse helper is clearly beneficial.
- The `build` **Workflow** should reference the canonical `worker` **Agent Role** for bounded implementation cycles and the canonical `reviewer` **Agent Role** for review gates.
- The `review-code` **Workflow** keeps its workflow ID but should be supported by the canonical `reviewer` **Agent Role** rather than a separate `code-reviewer` role.
- The canonical `reviewer` **Agent Role** should support review focuses such as code, Pull Request/release, issue/workstream, architecture, tests/evidence, docs, and generated artifacts.
- The `plan-reviewer` **Agent Role** remains separate for now because plan review includes product, requirements, and execution semantics beyond generic review.
- The `ship` **Workflow** references the canonical `reviewer` **Agent Role** for PR/release review gates and does not reference `worker` by default.
- The `ship` **Workflow** verifies after merge/release that linked **Published Issues** are closed and in Done **Tracker Status** when possible, reporting or repairing gaps when GitHub automation does not complete the transition.
- The `new-project` **Workflow** and the **Setup Runtime** are separate: the workflow is the user-facing process, while runtime helpers validate and apply setup requirements recorded in the **Firehorse Setup Manifest**.
- An **Upstream Skill Reference** points from a Firehorse-authored **Workflow** to an **Upstream Skill** without making that upstream skill the workflow's source of truth.
- A **Firehorse-authored Skill** follows the Firehorse Definition Format; an **Upstream Skill** keeps its upstream-native shape.
- A **Workflow** may reference supporting **Skills**, **Agent Roles**, and **Upstream Skills** separately.
- An **Agent Role** projects to provider-native agent surfaces, such as top-level Claude agents and Pi subagent files synced by setup.
- Firehorse should own canonical **Agent Role** source files for every agent it exposes, configures, overrides, or relies on in first-party **Workflows**.
- Canonical **Agent Role** source files should live under `packages/firehorse-core/definitions/agents/`, use the same Definition Format v1 shape as other definitions, and generate to the matching provider-native top-level agent paths.
- Current canonical Firehorse-owned **Agent Roles** include `worker`, `reviewer`, and `plan-reviewer`; additional generic provider agent surfaces such as `planner`, `researcher`, `scout`, `oracle`, `context-builder`, and `delegate` may remain upstream/provider-shaped until promoted to canonical **Agent Role** sources.
- Firehorse-owned **Agent Roles** are exposed under provider-native names without a `horse-` prefix, such as `worker`, `reviewer`, and `plan-reviewer`, even though workflow and skill **Generated Mirrors** keep `horse-<id>` names.
- Existing non-`horse-*` provider agent files that become canonical Firehorse-owned **Agent Roles** should be overwritten by canonical projections with minimal behavioral change first, then evolved intentionally.
- **Agent Role** projections should keep provenance minimal and non-intrusive so generated metadata does not materially affect the agent's working instructions.
- `definitions:write` may overwrite existing provider-native agent files from canonical **Agent Role** sources because canonical definitions lead; user edits to generated agent targets are not preserved as the source of truth.
- `definitions:check` should fail, and `definitions:write` should remove, stale provenanced Agent Role mirrors left under provider `agents/firehorse/` paths once top-level Agent Role generation is active.
- Upstream `pi-subagents` agent wording and behavior may seed the first canonical generic **Agent Roles**, but Firehorse-authored definitions become the source of truth.
- Worker-style implementation agents should consolidate under canonical **Agent Role** definitions before provider-specific implementations diverge.
- D-139's direction is that the canonical `reviewer` **Agent Role** subsumes the separate `code-reviewer` role so review behavior stays visible and controlled from one source.
- Firehorse should not preserve a compatibility alias or generated `horse-code-reviewer` surface when replacing `code-reviewer` with `reviewer`; the migration should remove the old role and note the breaking change where appropriate.
- A **Workflow** may declare **Orchestration Intent** without naming provider-specific orchestration features.
- A **Skill** can support multiple **Workflows**.

## Example dialogue

> **Dev:** "Should we expose this as another **Skill**?"
> **Domain expert:** "Only if it is a reusable ingredient. If users invoke it directly to complete a task, it is a **Workflow**."

## Flagged ambiguities

- "skills framework" can imply a collection of independently invoked skills; resolved: Firehorse is centered on **Workflows**, with **Skills** as supporting ingredients.
- "capability format" conflicts with existing provider/orchestrator capability language; resolved: the authoring model is the **Firehorse Definition Format**.
- The **Firehorse Definition Format** could be mistaken for a runnable workflow graph; resolved: it is declarative authoring metadata, not an execution engine.
- Provider-specific orchestration features such as Pi subagent chains and intercom could leak into canonical definitions; resolved: canonical workflows express **Orchestration Intent**, and distributions decide how to project it.
- Definition storage could be YAML, TypeScript, or a central registry; resolved: each canonical definition is a Markdown-with-frontmatter **Definition File**.
- Definition identity could come from either path or metadata alone; resolved: **Definition File** identity is explicit in frontmatter and must match its path.
- Definition IDs could be scoped by kind or prefixed by kind; resolved: **Definition IDs** are globally unique across Firehorse-authored definitions while `kind` remains separate metadata.
- Definition content could be all frontmatter or mostly prose; resolved: **Definition Files** use frontmatter for identity/projection metadata and a structured **Definition Body** for instruction-heavy guidance.
- Provider capability mismatches could be tracked through a full provider matrix or prose only; resolved: **Definition Files** use provider-neutral `requires` / `optional` **Capability Requirements** plus projection notes for nuance.
- Capability vocabulary could be fully closed or fully open; resolved: Firehorse documents common categories and values while allowing extension-prefixed values such as `mcp:github` or `provider:pi-subagents/intercom`.
- Schema code could be deferred as runtime-like code; resolved: the gray-matter-parsed, Zod-backed **Definition Schema** belongs in Phase 2 because validation is an authoring safeguard, not a runtime or execution engine.
- Upstream skill references could be strings or paths; resolved: **Upstream Skill References** use object references with separate `upstream` and `id` fields.
- Definition aliases could live in a separate registry or changelog only; resolved: **Definition Aliases** live in definition frontmatter.
- Definition projection could be runtime-loaded or manually ported; resolved: the **Projection Generator** creates checked-in **Generated Mirrors** with provenance headers.
- Workflow projection could target Pi skills or Pi prompt templates; resolved: **Workflows** project to Pi prompt templates and Claude commands as user-facing invocation surfaces.
- Generated native names could use raw IDs or a long prefix; resolved: **Generated Mirrors** use `horse-<id>` names while canonical **Definition IDs** stay unprefixed.
- Generated mirrors could be thin references, hand-editable, or manifest-unaware; resolved: **Generated Mirrors** contain full rendered instructions, are edited only through canonical definitions, and are exposed through generated manifest updates.
- Workflow mirrors could inline every supporting skill and role body; resolved: they include structured references and instructions for supporting capabilities without duplicating all supporting bodies.
- Definition IDs could be renamed freely before runtime exists; resolved: **Definition IDs** are stable public API and renames require alias/deprecation handling.
- `horse-new-project` could be mistaken for a canonical prefixed ID; resolved: the planned canonical **Workflow** ID is `new-project`, while `horse-new-project` is the provider-native invocation name.
- Generated file locations could be mixed into top-level provider directories; resolved: Firehorse generated mirrors live under provider-native `firehorse/` folders.
- Generated mirrors could preserve stale deleted definitions; resolved: stale **Generated Mirrors** are removed when their provenance is valid and their source no longer exists.
- Generated mirrors could rewrite canonical headings; resolved: mirrors preserve canonical Markdown headings where possible, with provider-specific frontmatter/provenance wrappers.
- Definition docs could rely on snippets only; resolved: the format docs include full canonical examples for current checked-in definitions such as `fix-bug`, `feedback-loop`, `verification-contract`, `code-reviewer`, and `plan-reviewer`.
- Schema versions could be semver strings or inferred from package versions; resolved: **Schema Version** is a required integer starting at `1`.
- Projection modes could be check-only or write-only; resolved: the **Projection Generator** supports both `definitions:write` and `definitions:check`.
- Source hashes could use git hashes or timestamps; resolved: **Generated Mirrors** use SHA-256 hashes of canonical Definition File content.
- The first bug-fix workflow could port upstream diagnosis instructions wholesale; resolved: `fix-bug` references the upstream `mattpocock-skills` `diagnose` skill via an **Upstream Skill Reference** and remains Firehorse-authored.
- The first bug-fix workflow could patch by default; resolved: `fix-bug` may patch only when the scope is clear and a regression loop exists, otherwise it asks or reports.
- Backward-compatible generated aliases for `diagnose-fix` were considered; resolved: do not preserve the alias, and expose only `fix-bug` going forward.
- New-project anchors could be scattered between root and docs; resolved: **Project Anchors** are written under `docs/`, with codebase anchors grouped under `docs/codebase/`.
- Codebase mapping could be embedded only inside `horse-new-project`; resolved: **Codebase Map** is a reusable project anchor workflow that `horse-new-project` can invoke in brownfield mode.
- Starter scaffolding could overwrite existing repo contents; resolved: **Starter Template** setup must preserve existing files and overlay starter files only with confirmation.
- Codebase anchors could be aspirational placeholders; resolved: `docs/codebase/*` describes actual code and is created only when code exists.
- Issue breakdown could use layer tasks; resolved: product work should be drafted as **Vertical Slices** following the bundled `to-issues` pattern.
- Issue creation could be the first durable handoff artifact; resolved: **PRD Drafts** and **Issue Drafts** are written locally before tracker mutation and retained with tracker links after publishing.
- `docs/PROJECT.md` could be treated like a PRD; resolved: it is the high-level **Project Anchor** that many PRDs reference over time.
- Local roadmap/state/requirements documents could remain the tracker of record; resolved: GitHub **Published Issues** and **Tracker Projects** are the source of truth for roadmap, requirements, and active state.
- Setup validation could be mistaken for a Firehorse workflow runtime; resolved: the narrow setup runtime validates the **Firehorse Setup Manifest** read-only by default and is not a generalized execution engine.
- `context-gather/` could remain a root directory for ad hoc research; resolved: **Gathered Context** belongs inside the relevant **Planning Workspace** under `docs/prds/`.
- Project-wide decisions, PRD-specific decisions, and codebase-facing guidance could be mixed; resolved: **Project Decisions** live in `docs/DECISIONS.md`, **Planning Decisions** live inside the relevant **Planning Workspace**, and durable codebase-facing guidance lives in `docs/codebase/` anchors or codebase ADRs.
- `create-plan` could be read as producing a generic `PLAN.md`; resolved: it creates a **Planning Workspace** with **Gathered Context**, **Planning Decisions**, a **PRD Draft**, and **Issue Drafts**.
- "issue" was used for both a local planning artifact and a GitHub tracker item; resolved: **Issue Draft** is local and reviewable before tracker publication, while **Published Issue** is the GitHub issue.
- Publication approval for `create-plan` was considered; resolved: publishing **PRD Drafts** and **Issue Drafts** as **Published Issues** may happen as part of the workflow without a separate approval gate.
- A mandatory review gate before issue breakdown was considered for every `create-plan` run; resolved: recommend `plan-review` by default, but allow skipping it for small, high-confidence plans.
- **Tracker Status** could be confused with GitHub issue open/closed state or labels; resolved: it means the repository **Tracker Project** status field.
- Superset/Claude/Codex choreography for `create-plan` was considered as canonical behavior; resolved: keep it as provider-specific preferred strategy in projection notes, not required canonical workflow semantics.
- Web research tool preference was considered as canonical behavior; resolved: canonical workflows require suitable web research when needed, while projection notes prefer Firecrawl, then Pi web access or Claude web search by provider.
- Flat PRD and issue draft storage was considered; resolved: `create-plan` writes a numbered **Planning Workspace** directory under `docs/prds/` with `PRD.md`, context artifacts, decisions, and PRD-scoped `issues/` drafts.
- Existing provider-specific worker agents could continue diverging independently; resolved: worker-style implementation behavior should consolidate into canonical **Agent Role** definitions before provider surfaces fork further.
- `ready-for-agent` could be treated as sufficient on its own; resolved: an **Agent-Ready Issue** needs clear scope, acceptance criteria, and blocking relationships, with the label acting only as tracker metadata.
- Generic reviewer and code-reviewer roles could diverge; resolved: the canonical `reviewer` **Agent Role** subsumes `code-reviewer` for code, PR, and workstream review behavior, with no compatibility alias preserved.
- Plan review could also be folded into generic reviewer immediately; resolved: keep `plan-reviewer` separate for now because product and requirements review have distinct semantics.
- Agent projections could use `horse-<id>` names like workflows and skills; resolved: **Agent Roles** keep provider-native names without the `horse-` prefix while Firehorse owns their canonical definitions.
- Canonical Agent Role files could stay under `packages/firehorse-core/definitions/agent-roles/` or move outside `definitions/`; resolved: canonical agent sources live under `packages/firehorse-core/definitions/agents/` and generate to top-level provider agent paths.
- Existing provider-native agents could remain as separate compatibility files; resolved: overwrite them from canonical **Agent Role** projections with minimal behavior changes first, then evolve.
- Generated agent targets could protect user edits like other hand-authored files; resolved: canonical Agent Role sources lead, so provider-native agent targets may be overwritten by generation.
- Codebase docs could silently go stale; resolved: **Codebase Maps** include **Freshness Metadata**.
- "Session Audit" could imply runtime telemetry, hooks, or automatic enforcement; resolved: a **Session Audit** is a post-hoc review of completed agent sessions.
- "Session Audit" could be mistaken for a mode inside `assess-codebase-health`; resolved: `session-audit` is a sibling **Assessment Workflow** that reuses the Codebase Health report/finding pattern for session evidence.
- "subagent" could be confused with canonical **Agent Role**; resolved: Firehorse says **Agent Role** for the canonical concept and uses "subagent" only for provider/runtime-specific mechanisms such as `pi-subagents`.
- Claude has both skills and agents; resolved: Firehorse **Agent Roles** project to Claude agents, not Claude skills.
- Imported skills and first-party workflows have different sources of truth; resolved: **Upstream Skills** keep their upstream-native shape, while Firehorse-authored **Workflows** use the **Firehorse Definition Format**.
- A strict Firehorse skill template could force upstream skill rewrites; resolved: strict templates apply only to **Firehorse-authored Skills**, not **Upstream Skills**.
