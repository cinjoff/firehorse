# Code Context

Snapshot note: this context was gathered before PRD-0002 consolidated
`diagnose-fix` into `fix-bug`, before stale `horse-diagnose-fix` /
`horse-diagnostic-reviewer` mirrors were removed, and before D-136 retired
repo-local `.planning/` and root `context-gather/`. References to those names
below are historical evidence from the source snapshot, not current targets to
recreate.

## Files Retrieved

1. `docs/FIREHORSE-DEFINITION-FORMAT.md` (lines 1-130, 134-418) - canonical format, examples, generated mirror contract, deferred boundaries.
2. `docs/ARCHITECTURE.md` (lines 1-108, 141-248) - definitions vs runtime architecture, distribution adapters, upstream-skill model.
3. Retired local roadmap notes captured before GitHub tracking migration - active Phase 2 acceptance criteria and later runtime boundary.
4. Retired local requirements notes captured before GitHub tracking migration - REQ-05 definition/generator requirements and REQ-09 future workflow requirements.
5. `docs/DECISIONS.md` (former local decision log, lines 881-1040 in the source snapshot) - generated mirror, projection, manifest, and typecheck decisions D-46..D-55.
6. Historical `packages/firehorse-core/definitions/workflows/diagnose-fix.md` (lines 1-96 in the source snapshot) - original first workflow pattern; current public equivalent is `fix-bug`.
7. `packages/firehorse-core/definitions/workflows/update-upstreams.md` (lines 1-99) - second workflow/common maintainer pattern.
8. `packages/firehorse-core/definitions/skills/feedback-loop.md` (lines 1-74) - first reusable Firehorse skill pattern.
9. Historical `packages/firehorse-core/definitions/agent-roles/diagnostic-reviewer.md` (lines 1-92 in the source snapshot) - original first Firehorse agent-role pattern; later role work is moving toward current reviewer roles.
10. `packages/firehorse-core/src/definitions/types.ts` (lines 1-295) - Zod schemas, types, required sections.
11. `packages/firehorse-core/src/definitions/parser.ts` (lines 1-147) - gray-matter parser, path/section/deprecation validation, source hash.
12. `packages/firehorse-core/src/definitions/validation.ts` (lines 1-152) - cross-definition validation and upstream reference checks.
13. `packages/firehorse-core/src/definitions/projection.ts` (lines 1-333) - Pi/Claude projection functions and generated provenance.
14. `packages/firehorse-core/src/definitions/manifests.ts` (lines 1-79) - generated manifest entry derivation/merge.
15. `packages/firehorse-core/src/definitions/index.ts` (lines 1-5) - public definition API barrel.
16. `scripts/definitions.ts` (lines 1-353) - repo write/check CLI and safe generated-file/manifest sync.
17. `packages/firehorse-core/src/definitions/definitions.test.ts` (lines 1-347) - schema, parser, projection, manifest tests.
18. `packages/firehorse-core/src/definitions/definitions-cli.test.ts` (lines 1-340) - CLI check/write/stale safety tests.
19. `package.json` (lines 1-111), `packages/firehorse-pi/package.json` (lines 1-180), `packages/firehorse-claude/.claude-plugin/plugin.json` (lines 1-59) - current exposed generated mirrors and commands/scripts.
20. Historical generated mirror samples: `packages/firehorse-pi/prompts/firehorse/horse-diagnose-fix.md` (lines 1-70 in the source snapshot), `packages/firehorse-claude/commands/firehorse/horse-update-upstreams.md` (lines 1-70), `packages/firehorse-pi/agents/firehorse/horse-diagnostic-reviewer.md` (lines 1-80 in the source snapshot), `packages/firehorse-claude/agents/firehorse/horse-diagnostic-reviewer.md` (lines 1-80 in the source snapshot) - provider-native generated output shape before PRD-0002 cleanup.
21. `packages/firehorse-pi/skills/firehorse-setup/SKILL.md` (lines 21-23, 96-106, 274-300) - Pi agent-role sync constraint.

## Key Code

```ts
// packages/firehorse-core/src/definitions/types.ts:5-12
export const definitionKinds = ["workflow", "skill", "agent-role"] as const;
export const definitionKindDirectories = {
  workflow: "workflows",
  skill: "skills",
  "agent-role": "agent-roles",
} as const;
```

```ts
// packages/firehorse-core/src/definitions/projection.ts:49-55
export function nativeName(id: string): string {
  return `horse-${id}`;
}

export function projectDefinitions(definitions, options = {}) { ... }
```

```ts
// scripts/definitions.ts:44-51
const definitions = await loadDefinitions();
assertValidDefinitionSet(definitions, { knownUpstreamSkills: await loadKnownUpstreamSkills() });
const generatedFiles = projectDefinitions(definitions, { repoRoot });
const fileResult = await syncGeneratedFiles(generatedFiles, mode);
const manifestResult = await syncManifests(generatedFiles, mode);
```

## 1. Current definition/adapters model

1. Canonical first-party Firehorse artifacts are Markdown files with YAML frontmatter under `packages/firehorse-core/definitions/{workflows,skills,agent-roles}/`; the format is declarative authoring metadata plus instructions, not runtime code (`docs/FIREHORSE-DEFINITION-FORMAT.md:1-13`, `docs/ARCHITECTURE.md:32-53`).
2. Supported definition kinds are exactly `workflow`, `skill`, and `agent-role`; IDs are slug-like and path-validated by kind directory/filename (`packages/firehorse-core/src/definitions/types.ts:5-17`, `packages/firehorse-core/src/definitions/parser.ts:72-90`).
3. Common frontmatter is `schemaVersion: 1`, `id`, `kind`, `title`, `description`, optional `aliases`, `deprecated`, `replacedBy`, `requires`, and `optional` (`docs/FIREHORSE-DEFINITION-FORMAT.md:18-33`, `packages/firehorse-core/src/definitions/types.ts:118-127`).
4. Kind-specific frontmatter: workflows add `argumentHint`, `supportingSkills`, `agentRoles`, `upstreamSkills`; Firehorse skills add `license`/`compatibility`; agent roles use a `pi-subagents`-based field set such as `name`, `tools`, `model`, `thinking`, `inheritProjectContext`, `defaultReads`, etc. (`docs/FIREHORSE-DEFINITION-FORMAT.md:37-101`, `packages/firehorse-core/src/definitions/types.ts:129-181`).
5. Required Markdown body sections are enforced per kind: workflow operational contract, skill reusable-instruction contract, and agent-role role contract (`packages/firehorse-core/src/definitions/types.ts:243-271`).
6. Parsing uses `gray-matter` + Zod, then validates path/ID, required sections, deprecation consistency, and records SHA-256 source content (`packages/firehorse-core/src/definitions/parser.ts:23-68`, `packages/firehorse-core/src/definitions/parser.ts:93-143`).
7. Set validation enforces globally unique IDs, alias/replacement validity, workflow reference existence/kind, known upstream skill references, and `agent-role` `name === id` before provider prefixes are added (`packages/firehorse-core/src/definitions/validation.ts:13-72`, `packages/firehorse-core/src/definitions/validation.ts:91-146`).
8. Projection is pure core logic: workflow -> Pi prompt + Claude command; skill -> Pi/Claude `SKILL.md`; agent-role -> Pi sync artifact + Claude agent (`packages/firehorse-core/src/definitions/projection.ts:13-260`).
9. Generated native names use `horse-<id>` and generated files include machine frontmatter plus visible HTML provenance with source path, kind, ID, schema version, and source SHA (`packages/firehorse-core/src/definitions/projection.ts:49-55`, `packages/firehorse-core/src/definitions/projection.ts:262-291`).
10. Manifest generation derives Pi root/package skills/prompts and Claude commands/skills/agents, then merges only entries under generated prefixes (`packages/firehorse-core/src/definitions/manifests.ts:13-79`).
11. `scripts/definitions.ts` is the repo mutator: it loads canonical defs, loads known upstream skills from `UPSTREAM.json`, projects files, updates root/Pi/Claude manifests, refuses unprovenanced targets, and removes only stale generated files with valid provenance (`scripts/definitions.ts:31-51`, `scripts/definitions.ts:115-195`, `scripts/definitions.ts:221-306`).

## 2. Historical patterns from `diagnose-fix` / current patterns from `update-upstreams`

- In the historical source snapshot, both workflows used `argumentHint`, provider-neutral `requires`/`optional`, `supportingSkills: feedback-loop`, and `agentRoles: diagnostic-reviewer`; the old `diagnose-fix` also used `upstreamSkills: mattpocock-skills/diagnose` (`diagnose-fix.md:1-28`, `update-upstreams.md:1-24`). Current bug-fix surfaces use `fix-bug` and current reviewer roles instead of recreating `diagnose-fix` / `diagnostic-reviewer`.
- Both workflow bodies kept the exact required section sequence and phrase generated invocation as `horse-<id>` with `$ARGUMENTS` available in provider mirrors (`diagnose-fix.md:30-96` in the historical snapshot, `update-upstreams.md:26-99`).
- The historical `diagnose-fix` pattern is preserved only as evidence for a safe mutation flow: diagnose, establish a feedback loop, patch only when scope and regression loop pass, then review (`diagnose-fix.md:52-91`). The current canonical workflow is `fix-bug`.
- `update-upstreams` remains a current maintainer-batch pattern: start from `pnpm upstreams:check`, mutate sequentially when lockfiles/worktree are shared, run `pnpm upstreams:write-update-manifests` then `pnpm definitions:write`, update docs, and rerun validation (`update-upstreams.md:44-94`).
- Safety gates explicitly reject runtime/loader/provider transport/slash-command/hook/autonomous execution additions in workflow content (`diagnose-fix.md:68-75` in the historical snapshot, `update-upstreams.md:59-69`).
- Reusable common artifacts from the snapshot included `feedback-loop` as a skill and `diagnostic-reviewer` as an agent role; current definitions also include `verification-contract` and current reviewer roles.
- Generated mirrors preserve the canonical body and add only provider frontmatter/provenance. Historical examples included `horse-diagnose-fix`; current examples include `horse-fix-bug` and `horse-update-upstreams`.
- Agent-role projection filters/adapts provider fields; the historical diagnostic-reviewer mirrors demonstrated this shape, while current generated agent mirrors should be read from checked-in canonical definitions and manifests.

## 3. Likely files / integration points for adding or finishing more workflows/common artifacts

- Add or edit canonical sources only in `packages/firehorse-core/definitions/workflows/*.md`, `packages/firehorse-core/definitions/skills/*.md`, and `packages/firehorse-core/definitions/agent-roles/*.md`.
- If new artifacts fit the existing schema, generated adapter mirrors should come from `pnpm definitions:write`, producing/updating:
  - `packages/firehorse-pi/prompts/firehorse/horse-*.md`
  - `packages/firehorse-claude/commands/firehorse/horse-*.md`
  - `packages/firehorse-pi/skills/firehorse/<id>/SKILL.md`
  - `packages/firehorse-claude/skills/firehorse/<id>/SKILL.md`
  - `packages/firehorse-pi/agents/firehorse/horse-*.md`
  - `packages/firehorse-claude/agents/firehorse/horse-*.md`
- Manifest exposure is generated into root `package.json` `pi.skills`/`pi.prompts`, `packages/firehorse-pi/package.json` `files`/`pi.skills`/`pi.prompts`, and `packages/firehorse-claude/.claude-plugin/plugin.json` `commands`/`skills`/`agents` (`scripts/definitions.ts:221-306`).
- If schema/frontmatter/required sections change, touch `packages/firehorse-core/src/definitions/types.ts`, then parser/validation/projection/tests as needed.
- If new provider output shape or field adaptation is required, touch `packages/firehorse-core/src/definitions/projection.ts`; if new manifest surfaces are required, touch `manifests.ts` and `scripts/definitions.ts`.
- If a workflow references new upstream skills, ensure `packages/firehorse-core/upstreams/<upstream>/UPSTREAM.json` exposes a matching `skills[].name`, because `scripts/definitions.ts` builds the known set from those manifests (`scripts/definitions.ts:115-137`).
- Tests to update/extend: `packages/firehorse-core/src/definitions/definitions.test.ts` for parser/schema/projection/manifest expectations, and `definitions-cli.test.ts` for generated file/check/write safety.
- Docs/tracking to update only when contracts change: `docs/FIREHORSE-DEFINITION-FORMAT.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, relevant Planning Workspace artifacts under `docs/prds/`, and GitHub Issues/Projects for roadmap or requirements state.
- Pi agent-role runtime availability depends on `firehorse-setup` syncing `packages/firehorse-pi/agents/firehorse/*.md` into the user Pi agent dir; generated package agent files alone are not discovered by `pi-subagents` (`docs/ARCHITECTURE.md:187-192`, `packages/firehorse-pi/skills/firehorse-setup/SKILL.md:274-300`).

## 4. Constraints / non-goals from docs and planning

- Do not add Firehorse runtime loading/execution, prompt assembly beyond static mirrors, provider API transports, slash-command/hook runtime behavior, or autonomous execution loops (`docs/FIREHORSE-DEFINITION-FORMAT.md:5`, `docs/FIREHORSE-DEFINITION-FORMAT.md:408-418`, `docs/DECISIONS.md`).
- Projection functions belong in `firehorse-core`; repo scripts own filesystem writes (`docs/DECISIONS.md`).
- Generated mirrors are checked in, self-contained, and not hand-editable; changes flow through canonical definitions and `definitions:write` (`docs/ARCHITECTURE.md:54-72`, `docs/DECISIONS.md`).
- Projection must not overwrite unprovenanced files and should remove stale files only when valid Firehorse provenance exists (`scripts/definitions.ts:161-195`, `docs/DECISIONS.md`).
- `definitions:check` is non-mutating and root `pnpm typecheck` runs it before package typechecks (`docs/FIREHORSE-DEFINITION-FORMAT.md:112-114`, `package.json:88-99`, `docs/DECISIONS.md`).
- Upstream-originated skills stay upstream-shaped curated ingredients; do not normalize all upstream skills into Firehorse definitions (`docs/ARCHITECTURE.md:141-160`, `docs/DECISIONS.md`).
- Provider-specific mechanisms such as Pi subagent chains/intercom belong in distribution projection notes/adapters, not canonical definition syntax (`docs/ARCHITECTURE.md:100-108`).
- Pi core packages remain peers, not bundled; generated/bundled Pi resources are exposed via explicit manifest allow-lists (`docs/ARCHITECTURE.md:170-221`).
- Definition IDs are stable public API and globally unique; renames require alias/deprecation handling (`docs/ARCHITECTURE.md:41-43`, `docs/ARCHITECTURE.md:69-75`).
- `horse-new-project` and `horse-map-codebase` are named as future consumers, not hand-authored provider-native workflows in the current slice (`docs/FIREHORSE-DEFINITION-FORMAT.md:408-410`, `docs/DECISIONS.md`).

## 5. Remaining clarification questions

1. Which “common artifacts” are in immediate scope: only new canonical workflow/skill/agent-role `.md` definitions, or also updates to hand-authored setup skills/upstream mirrors?
2. Are `horse-new-project` and `horse-map-codebase` now in scope despite being documented as future/deferred consumers, or should current work stay to non-REQ-09 artifacts?
3. Should new workflows reuse only `feedback-loop`, `verification-contract`, and current reviewer roles, or is adding new common skills/agent roles expected in this pass?
4. Are schema changes allowed, or should implementation assume Definition Format v1 is fixed and add only content that passes current schemas?
5. If a new workflow needs upstream skills not already listed in `UPSTREAM.json`, should the implementation update upstream manifests/mirrors or avoid those references until upstream work is separately scoped?
6. Minor docs drift to resolve before editing contracts: `docs/DECISIONS.md` D-40 mentions `When to use` / `Projection notes`, while current docs/schema/tests enforce `Usage` / `Projection Notes` for Firehorse skills (`packages/firehorse-core/src/definitions/types.ts:252-260`, `docs/DECISIONS.md`).

## Architecture

The data flow is: canonical Markdown definition -> `parseDefinitionFile` -> `assertValidDefinitionSet` -> `projectDefinitions` -> generated provider mirrors -> `generatedManifestEntries` -> repo/package manifests. Core owns pure schema/parser/validator/projection APIs; `scripts/definitions.ts` is the only repo writer/checker. Pi and Claude are sibling distributions that receive generated mirrors in their own native directories.

## Start Here

Start with `packages/firehorse-core/definitions/workflows/update-upstreams.md` for the most complete current workflow pattern, then open `packages/firehorse-core/src/definitions/projection.ts` to see exactly how canonical content becomes Pi/Claude artifacts.
