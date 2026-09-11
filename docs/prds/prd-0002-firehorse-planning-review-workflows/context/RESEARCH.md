# Research Context

## Sources

- `docs/prds/prd-0002-firehorse-planning-review-workflows/context/FHHS_LEGACY_WORKFLOWS.md`
- Legacy `cinjoff/fhhs-skills` workflow findings gathered by researcher subagent
- Current Firehorse architecture, project, decision, and PRD docs for boundary checks

## Legacy FHHS workflow shape

Legacy FHHS used a staged pipeline:

1. `plan-work` created an evidence-backed plan and optional spec.
2. `plan-review` challenged the plan before implementation and fed findings back into planning artifacts.
3. `build` executed the strengthened plan in waves with task-level context isolation and quality gates.
4. `review` verified the diff against code quality, spec, goals, tests, and runtime signals.
5. `fix` handled bugs through root-cause investigation, TDD, verification, and recurrence search.

The reusable pattern is:

> artifact contract → decision gate → execution or analysis → evidence gate → artifact feedback

## Transferable ideas for Firehorse now

- Reauthor the staged workflow sequence as first-party Firehorse Workflows, not vendored FHHS skill text.
- Keep each stage user-invoked and provider-neutral rather than creating one autonomous execution loop.
- Use structured artifact contracts to preserve traceability from planning through implementation and review.
- Replace FHHS `must_haves` with Firehorse **Verification Contract** terminology.
- Keep plan-review adversarial, but use Firehorse-neutral review perspectives rather than CEO/CTO language.
- Require evidence before claims, TDD when feasible, and no-fix review gates by default.
- Use artifact feedback loops: review findings should update local planning/review artifacts and GitHub comments where needed.

## Deferred behavior

The following FHHS behaviors remain out of scope for this pass:

- Runtime subagent fanout as a canonical execution graph.
- Automatic workflow chaining such as plan → review → build → review.
- Provider-specific tool calls in canonical definitions.
- GSD state mutation, task-state files, roadmap automation, commits, branch promotion, or autonomous loops.
- A Firehorse runtime package or shared provider transport.

## Risks to avoid

- Leaking Claude-specific `Agent`, command, or allowed-tool mechanics into core definitions.
- Overfitting Firehorse to GSD/FHHS `.planning` shape.
- Making Firehorse workflows too bulky by copying legacy procedural prompts wholesale.
- Confusing upstream skill sources with first-party Firehorse workflow sources.
- Losing context-window safety by keeping research/scouting only in chat rather than files.
