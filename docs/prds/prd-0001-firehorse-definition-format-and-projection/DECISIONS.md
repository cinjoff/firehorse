# Planning Decisions

## Source

These decisions summarize the PRD-0001 definition-format planning work. The original PRD is historical and still lives at `PRD.md`; this local file keeps the PRD-specific decision set close to the source PRD after the repository moved away from one ever-growing root decision log.

## Promotion status

- Promoted project-wide: Definition Format identity, projection, provenance, generated-mirror safety, and no-runtime boundaries were recorded in root `docs/DECISIONS.md` because they define Firehorse-wide architecture.
- PRD-local: first-fixture details and implementation/testing scope for the original definition-format slice.
- Superseded by later PRDs: the original fixture names `diagnose-fix` and `diagnostic-reviewer` were superseded by PRD-0002/PRD-0004 decisions for `fix-bug` and generic `reviewer`.

## Resolved decisions

1. The authoring model is the **Firehorse Definition Format**, not a skill-only format.
2. Canonical definitions live in `packages/firehorse-core/definitions/` under kind-segregated directories.
3. Definition files are Markdown with frontmatter parsed by gray-matter and validated by Zod.
4. Each definition declares `schemaVersion`, `id`, `kind`, and kind-specific metadata.
5. Definition IDs are globally unique across workflows, skills, and agent roles.
6. Definition ID and directory path must match so renames are intentional.
7. Definition IDs are stable public API; aliases and deprecations live in frontmatter.
8. Firehorse-authored Workflow bodies use a standardized operational contract.
9. Firehorse-authored Skill bodies use a reusable instruction contract.
10. Agent Role bodies use a role contract.
11. Agent Role frontmatter uses the documented `pi-subagents` agent field set as its canonical basis, plus Firehorse metadata.
12. Upstream skills are not normalized into Firehorse-authored strict templates.
13. Workflows reference Firehorse-authored Skills, Agent Roles, and Upstream Skills through structured reference fields.
14. Upstream Skill references use separate `upstream` and `id` fields.
15. Capability requirements use provider-neutral `requires` and `optional` declarations with documented common categories plus extension-prefixed values.
16. Projection logic is pure `firehorse-core` code; repository scripts perform filesystem writes.
17. Generated workflow and skill mirrors use the `horse-<id>` native-name convention.
18. Workflow mirrors target Pi prompt templates and Claude commands.
19. Firehorse-authored skill mirrors target provider skill surfaces.
20. Agent Role mirrors target provider-native agent surfaces.
21. Generated files live under provider-native `firehorse/` folders for workflow and skill mirrors.
22. Generated mirrors include machine-readable provenance, source path, definition ID, and SHA-256 source content hash.
23. Generated mirrors are deterministic and not hand-editable.
24. Projection updates package-local and repo-root manifests.
25. Write mode deletes stale generated mirrors only when valid Firehorse provenance is present.
26. Check mode fails when definitions or generated mirrors are invalid or stale.
27. Root typecheck includes definition validation and generated-mirror freshness checks.
28. The original first fixture included `diagnose-fix`, `feedback-loop`, and `diagnostic-reviewer`; those fixture names are historical and should not be recreated as current public surfaces.
29. `horse-new-project` and `horse-map-codebase` were deferred until the Definition Format generator existed rather than being hand-authored provider-native skills first.
30. No runtime, prompt loader, slash-command runtime, provider transport, execution engine, or autonomous loop was in scope for PRD-0001.
