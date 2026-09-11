# Firehorse

Firehorse is a cross-provider agent workflow framework centered on user-facing workflows rather than isolated skills.

## Language

**Workflow**:
A user-facing end-to-end capability that coordinates supporting capabilities to achieve an outcome.
_Avoid_: Composite skill, command, recipe

**Skill**:
A reusable instruction or capability ingredient that can support one or more workflows.
_Avoid_: Workflow, command

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
_Avoid_: Saved chain, execution graph

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
A checked-in provider-native file produced from a canonical Definition File, stored under a provider-native `firehorse/` generated-content folder, named with the `horse-` prefix, marked with source provenance and a SHA-256 source content hash, exposed through manifests, and not hand-edited.
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

**Codebase Map**:
A set of Project Anchors that describes the existing codebase's structure, conventions, tests, integrations, and risks.
_Avoid_: GSD map, memory cache, one-off audit

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
A local reviewable issue artifact produced before creating a tracker issue.
_Avoid_: GitHub issue, checklist note, layer task

**Freshness Metadata**:
Evidence in a generated or mapped document that identifies what source state it reflects.
_Avoid_: Timestamp-only confidence, implicit freshness, memory cache

## Relationships

- The **Firehorse Definition Format** describes Firehorse-authored **Workflows** and **Skills**.
- A **Definition File** is the physical form of one Firehorse-authored **Workflow** or **Skill**.
- A **Definition ID** identifies exactly one Firehorse-authored **Definition File** across all definition kinds and is stable public API.
- A **Definition Alias** preserves continuity when a **Definition ID** is renamed or deprecated.
- A **Definition File** combines frontmatter metadata with a structured **Definition Body**.
- A **Definition File** declares an integer **Schema Version**, starting at `1`.
- A **Definition File** may declare **Capability Requirements** for validation and provider projection.
- The **Definition Schema** validates **Definition Files** without executing workflows or loading provider runtimes.
- The **Projection Generator** produces **Generated Mirrors** for the Claude distribution.
- A **Generated Mirror** is committed, uses a `horse-<id>` native name, and is traceable back to its source **Definition File**.
- A **Generated Mirror** contains rendered instructions, not a runtime reference back to the source **Definition File**.
- A **Generated Mirror** includes a SHA-256 source content hash for freshness checks and is exposed through package-local and repo-root manifests.
- A **Workflow** projects to a Claude command as its primary user-facing **Generated Mirror**.
- The future canonical `new-project` **Workflow** projects to the provider-native `horse-new-project` invocation name.
- The **Projection Generator** updates provider manifests so **Generated Mirrors** are exposed by their distributions.
- A **Project Anchor** captures durable context for future workflows without depending on GSD.
- A **Codebase Map** is stored as `docs/codebase/` **Project Anchors** and can be produced independently of `horse-new-project`.
- A **Codebase Map** includes **Freshness Metadata** such as source commit/hash and timestamp.
- A **Starter Template** may create the first codebase, but product discovery and **Project Anchors** can exist before scaffolding.
- A **Vertical Slice** can become a GitHub issue after product discovery and approval.
- A **PRD Draft** references the high-level **Project Anchor** instead of duplicating it.
- A **PRD Draft** can be broken into one or more **Issue Drafts**.
- An **Issue Draft** may become a tracker issue after approval and should retain the tracker link.
- An **Upstream Skill Reference** points from a Firehorse-authored **Workflow** to an **Upstream Skill** without making that upstream skill the workflow's source of truth.
- A **Firehorse-authored Skill** follows the Firehorse Definition Format; an **Upstream Skill** keeps its upstream-native shape.
- A **Workflow** may reference supporting **Skills** and **Upstream Skills** separately.
- A **Workflow** may declare **Orchestration Intent** without naming provider-specific orchestration features.
- A **Skill** can support multiple **Workflows**.

## Example dialogue

> **Dev:** "Should we expose this as another **Skill**?"
> **Domain expert:** "Only if it is a reusable ingredient. If users invoke it directly to complete a task, it is a **Workflow**."

## Flagged ambiguities

- "skills framework" can imply a collection of independently invoked skills; resolved: Firehorse is centered on **Workflows**, with **Skills** as supporting ingredients.
- "capability format" conflicts with existing provider/orchestrator capability language; resolved: the authoring model is the **Firehorse Definition Format**.
- The **Firehorse Definition Format** could be mistaken for a runnable workflow graph; resolved: it is declarative authoring metadata, not an execution engine.
- Provider-specific orchestration features could leak into canonical definitions; resolved: canonical workflows express **Orchestration Intent**, and the distribution decides how to project it.
- Definition storage could be YAML, TypeScript, or a central registry; resolved: each canonical definition is a Markdown-with-frontmatter **Definition File**.
- Definition identity could come from either path or metadata alone; resolved: **Definition File** identity is explicit in frontmatter and must match its path.
- Definition IDs could be scoped by kind or prefixed by kind; resolved: **Definition IDs** are globally unique across Firehorse-authored definitions while `kind` remains separate metadata.
- Definition content could be all frontmatter or mostly prose; resolved: **Definition Files** use frontmatter for identity/projection metadata and a structured **Definition Body** for instruction-heavy guidance.
- Provider capability mismatches could be tracked through a full provider matrix or prose only; resolved: **Definition Files** use provider-neutral `requires` / `optional` **Capability Requirements** plus projection notes for nuance.
- Capability vocabulary could be fully closed or fully open; resolved: Firehorse documents common categories and values while allowing extension-prefixed values such as `mcp:github`.
- Schema code could be deferred as runtime-like code; resolved: the gray-matter-parsed, Zod-backed **Definition Schema** belongs in Phase 2 because validation is an authoring safeguard, not a runtime or execution engine.
- Upstream skill references could be strings or paths; resolved: **Upstream Skill References** use object references with separate `upstream` and `id` fields.
- Definition aliases could live in a separate registry or changelog only; resolved: **Definition Aliases** live in definition frontmatter.
- Definition projection could be runtime-loaded or manually ported; resolved: the **Projection Generator** creates checked-in **Generated Mirrors** with provenance headers.
- Workflow projection could target Claude skills or Claude commands; resolved: **Workflows** project to Claude commands as their user-facing invocation surface.
- Generated native names could use raw IDs or a long prefix; resolved: **Generated Mirrors** use `horse-<id>` names while canonical **Definition IDs** stay unprefixed.
- Generated mirrors could be thin references, hand-editable, or manifest-unaware; resolved: **Generated Mirrors** contain full rendered instructions, are edited only through canonical definitions, and are exposed through generated manifest updates.
- Workflow mirrors could inline every supporting skill body; resolved: they include structured references and instructions for supporting capabilities without duplicating all supporting bodies.
- Definition IDs could be renamed freely before runtime exists; resolved: **Definition IDs** are stable public API and renames require alias/deprecation handling.
- `horse-new-project` could be mistaken for a canonical prefixed ID; resolved: the future canonical **Workflow** ID is `new-project`, while `horse-new-project` is the provider-native invocation name.
- Generated file locations could be mixed into top-level provider directories; resolved: Firehorse generated mirrors live under provider-native `firehorse/` folders.
- Generated mirrors could preserve stale deleted definitions; resolved: stale **Generated Mirrors** are removed when their provenance is valid and their source no longer exists.
- Generated mirrors could rewrite canonical headings; resolved: mirrors preserve canonical Markdown headings where possible, with provider-specific frontmatter/provenance wrappers.
- Schema versions could be semver strings or inferred from package versions; resolved: **Schema Version** is a required integer starting at `1`.
- Projection modes could be check-only or write-only; resolved: the **Projection Generator** supports both `definitions:write` and `definitions:check`.
- Source hashes could use git hashes or timestamps; resolved: **Generated Mirrors** use SHA-256 hashes of canonical Definition File content.
- New-project anchors could be scattered between root and docs; resolved: **Project Anchors** are written under `docs/`, with codebase anchors grouped under `docs/codebase/`.
- Codebase mapping could be embedded only inside `horse-new-project`; resolved: **Codebase Map** is a reusable project anchor workflow that `horse-new-project` can invoke in brownfield mode.
- Starter scaffolding could overwrite existing repo contents; resolved: **Starter Template** setup must preserve existing files and overlay starter files only with confirmation.
- Codebase anchors could be aspirational placeholders; resolved: `docs/codebase/*` describes actual code and is created only when code exists.
- Issue breakdown could use layer tasks; resolved: product work should be drafted as **Vertical Slices** following the bundled `to-issues` pattern.
- Issue creation could be the first durable handoff artifact; resolved: **PRD Drafts** and **Issue Drafts** are written locally before tracker mutation and retained with tracker links after publishing.
- `docs/PROJECT.md` could be treated like a PRD; resolved: it is the high-level **Project Anchor** that many PRDs reference over time.
- Codebase docs could silently go stale; resolved: **Codebase Maps** include **Freshness Metadata**.
- Imported skills and first-party workflows have different sources of truth; resolved: **Upstream Skills** keep their upstream-native shape, while Firehorse-authored **Workflows** use the **Firehorse Definition Format**.
- A strict Firehorse skill template could force upstream skill rewrites; resolved: strict templates apply only to **Firehorse-authored Skills**, not **Upstream Skills**.
