# Planning Decisions

## Source

These decisions were resolved during a `grill-with-docs` planning session after local scouts and legacy workflow research completed.

## Resolved decisions

1. FHHS-inspired plan/build/review/fix capabilities are first-party Firehorse **Workflows**, not a new artifact type.
2. The sequence is several user-invoked Workflows, not one autonomous delivery workflow.
3. Canonical workflow IDs are `create-plan`, `plan-review`, `build`, `review-code`, and `fix-bug`.
4. `fix-bug` replaces/consolidates `diagnose-fix`; no backward-compatible `horse-diagnose-fix` alias is required.
5. `create-plan` produces a **Planning Workspace**, not a root `PLAN.md`.
6. Planning Workspaces live under `docs/prds/prd-000N-<slug>/` and use a sequence number plus slug.
7. Planning Workspace layout is:

   ```text
   docs/prds/prd-000N-<slug>/
     ASK.md
     context/
       RESEARCH.md
       SCOUTING.md
       MEMORY.md
     DECISIONS.md
     PRD.md
     PLAN_REVIEW.md        # only if review ran
     issues/               # issue drafts after issue breakdown
     reviews/              # review artifacts when applicable
   ```

8. `create-plan` gathers context first: repo/docs/code scouting, memory, and conditional external/domain/library research.
9. Context gathering should use parallel file-output scouts/researchers where available; Pi projection should prefer `pi-subagents`, GPT-5.5, low effort, and file outputs.
10. Web research is provider-specific: Firecrawl preferred when available; Pi fallback is `pi-web-access`/`librarian`; Claude fallback is Claude web search.
11. Memory should always be queried and written to `context/MEMORY.md`, even when empty.
12. If `docs/codebase/` is missing or stale, `create-plan` notes the gap but does not create a Codebase Map itself.
13. Batched grilling is preferred for independent questions; switch to one-at-a-time only for dependent decisions.
14. Every resolved planning answer is written to `DECISIONS.md` as it is made.
15. `create-plan` may use upstream `grill-with-docs`, `to-prd`, and `to-issues`, but their outputs must obey the Planning Workspace artifact contract.
16. `create-plan` produces a PRD Draft before issue drafts.
17. `create-plan` recommends a `plan-review` gate before issue breakdown, but it may be skipped for small, high-confidence plans.
18. `plan-review` remains independently invokable.
19. `plan-review` should use Firehorse-neutral adversarial perspectives: product, technical, and execution.
20. `plan-review` is supported by one `plan-reviewer` Agent Role combining those perspectives.
21. Published Issue means GitHub issue, not Superset task.
22. `create-plan` may publish PRD and issue drafts to GitHub without a separate approval gate.
23. GitHub publication order is parent PRD issue first, then child issues in dependency order.
24. Local files should be updated with GitHub links after publication.
25. PRD and issue drafts are Markdown documents with XML-ish structured blocks only for machine-checkable sections.
26. Firehorse uses **Verification Contract** instead of FHHS `must_haves`.
27. Add a Firehorse-authored `verification-contract` Skill to share artifact rules across planning, build, and review workflows.
28. Issue drafts include vertical slice, dependencies, parallelization notes, TDD expectations, and Verification Contract.
29. `build` defaults to one issue-sized vertical slice at a time, not a whole PRD.
30. `build` requires TDD when feasible and uses the upstream Matt `tdd` skill as an ingredient.
31. `build` writes implementation evidence locally, then updates GitHub with concise comments where needed.
32. `review-code` is a no-fix gate by default.
33. `review-code` can review either one issue-sized change or a holistic workstream.
34. `review-code` supports review focuses: correctness/regression, Verification Contract coverage, architecture/maintainability, tests/evidence, docs/generated artifacts.
35. `review-code` writes review artifacts into `reviews/` under a Planning Workspace when one exists; otherwise use `docs/reviews/REVIEW-YYYYMMDD-<slug>.md`.
36. `review-code` uses a `code-reviewer` Agent Role, not the old `diagnostic-reviewer` name.
37. `fix-bug` remains root-cause-first and requires a regression loop before patching.
38. `fix-bug` creates a lightweight bug workspace only for non-trivial bugs.
39. This pass should add canonical definitions only: workflows, `verification-contract` skill, `plan-reviewer`, `code-reviewer`, docs/tests/generated mirrors.
40. No runtime, autonomous loop, provider transport, or Definition Format v1 schema change in this pass.
41. Update docs/examples that still use `diagnose-fix` as the primary example.
42. Do not implement after this PRD draft; the user will clean/compact context first.
