# PRD: Codebase Health Workflow and Startup Surfacing

Status: Draft

## Problem Statement

Firehorse users want continuous improvement of their codebases without having to remember to manually run architecture audits, codebase mapping, memory searches, and cleanup-ticket creation. Today, Firehorse has strong planning/build/review/fix workflows, but it does not maintain a fresh, durable view of codebase health or surface architectural debt at the moments when it would help most.

The user wants a workflow that combines codebase maps, code intelligence evidence, architecture-review guidance, and memory observations to identify health risks such as architecture friction, convention drift, code smells, technical debt, and recurring implementation problems. The result should be mostly invisible when everything is healthy, but useful when the codebase health report is stale or contains actionable findings.

## Solution

Add a first-party Firehorse `assess-codebase-health` Workflow and provider-specific startup surfacing hooks.

The workflow creates and maintains the current Codebase Health Report at `docs/codebase/health.md`. It consumes or refreshes Codebase Maps when available, gathers provider-appropriate code intelligence evidence, confirms memory-derived claims against current code, runs architecture-health review using the bundled Matt Pocock `improve-codebase-architecture` skill, and writes semi-structured findings with stable IDs, severity, lifecycle status, evidence, and links to local Issue Drafts or GitHub tickets.

The workflow automatically creates local cleanup Issue Drafts for Critical and High-leverage findings in a normal Planning Workspace, then asks whether to publish all, publish a subset, or defer publication. Watchlist findings stay visible in the report and startup summaries but do not create drafts automatically.

Provider-specific session-start hooks are installed as distribution-owned startup surfacing mechanisms. They are enabled by default but bounded and non-invasive: they read existing metadata, compare lightweight local freshness signals, summarize stale reports or notable findings, and suggest `horse-assess-codebase-health`. They do not perform deep analysis, do not hit GitHub, and must never break session startup.

## User Stories

1. As a Firehorse user, I want a current Codebase Health Report, so that I can understand architectural health without manually re-auditing the repository.
2. As a Firehorse user, I want startup checks to stay silent when the report is fresh and healthy, so that Firehorse does not add noise to every session.
3. As a Firehorse user, I want stale health reports to be surfaced on session start, so that I know when the durable codebase view needs refreshing.
4. As a Firehorse user, I want startup surfacing to be lightweight, so that opening a session does not trigger expensive scans.
5. As a Firehorse user, I want a suggested `horse-assess-codebase-health` command when a report is stale, so that I can refresh health context intentionally.
6. As a Firehorse user, I want Critical and High-leverage findings to become local Issue Drafts automatically, so that actionable cleanup work is ready to review.
7. As a Firehorse user, I want Watchlist findings to stay visible without creating drafts, so that the workflow does not flood my workspace with low-urgency cleanup tickets.
8. As a Firehorse user, I want to choose whether to publish all, some, or none of the generated cleanup drafts, so that GitHub remains under my control.
9. As a Firehorse user, I want health findings to include evidence and links, so that I can trust why a cleanup draft exists.
10. As a Firehorse user, I want resolved findings removed from the current report, so that local health artifacts do not grow indefinitely.
11. As a Firehorse user, I want accepted debt to stop nagging me unless assumptions change, so that deliberate trade-offs stay quiet.
12. As a Firehorse user, I want health findings that conflict with project decisions or ADRs to be framed as decision-revisit candidates, so that the workflow does not fight settled architectural choices.
13. As a Firehorse user, I want memory observations to be considered but verified against current code, so that stale memory does not create false cleanup work.
14. As a Firehorse user, I want `create-plan` to read health findings as Gathered Context, so that new feature planning accounts for nearby architecture debt.
15. As a Firehorse user, I want `build` and `review-code` to update resolved health findings when appropriate, so that the health report stays aligned with implementation progress.
16. As a Pi user, I want the workflow to use Pi-native capabilities such as `pi-lens`, LSP diagnostics, ast-grep, and Pi-native memory tools, so that the Pi projection is strong in its target environment.
17. As a Claude user, I want the workflow to use Claude-native memory, code tools, skills, and agents, so that the Claude projection is strong without depending on Pi-specific tools.
18. As a Firehorse maintainer, I want the canonical workflow to remain a declarative Definition File, so that the existing projection system remains the source of truth for provider mirrors.
19. As a Firehorse maintainer, I want provider-specific hooks to be hand-authored distribution code, so that hooks do not become Generated Mirrors or an implicit Firehorse runtime.
20. As a Firehorse maintainer, I want shared freshness/report parsing logic to be pure and provider-neutral, so that Pi and Claude hooks behave consistently without adding a runtime.
21. As a Firehorse maintainer, I want startup hooks to have environment flags and timeout controls, so that users can disable or bound them.
22. As a Firehorse maintainer, I want tests around report parsing and freshness behavior, so that startup surfacing remains safe and deterministic.

## Implementation Decisions

- Add canonical Workflow definition `assess-codebase-health` under `packages/firehorse-core/definitions/workflows/`.
- Generate provider-native `horse-assess-codebase-health` mirrors through the existing projection generator.
- Do not hand-edit generated Pi prompts or Claude commands.
- Keep `assess-codebase-health` separate from future `map-codebase`.
- Let `assess-codebase-health` consume or refresh Codebase Maps when available.
- If Codebase Maps are stale or missing and cannot be refreshed, proceed only with an explicit caveat.
- Store the current Codebase Health Report at `docs/codebase/health.md`.
- Use YAML frontmatter in the report for machine-readable metadata.
- Use semi-structured Markdown finding blocks for human-readable evidence and actions.
- Include generated time, source commit, meaningful-change policy, Codebase Map freshness used, tools used, memory status/query timestamp, and tracker-status last checked timestamp in report metadata.
- Do not include a single numeric health score.
- Use finding severities `Critical`, `High-leverage`, and `Watchlist`.
- Use lifecycle statuses `open`, `drafted`, `published`, `accepted-debt`, `ignored`, `decision-revisit`, and `resolved`.
- Use stable IDs or fingerprints to dedupe findings across runs.
- Remove resolved findings from the current report after tracker state or verification evidence confirms closure.
- Link local Issue Drafts, Published Issues, and GitHub ticket URLs while findings are active.
- Add optional project-local policy file `docs/codebase/health-policy.json`.
- Default freshness policy treats the report as stale after 24 hours or meaningful codebase changes.
- Keep freshness policy project/provider-aware and configurable; do not hard-code repository-specific generated-file rules into the canonical workflow.
- Create local cleanup Issue Drafts automatically for Critical and High-leverage findings.
- Do not automatically create Issue Drafts for Watchlist findings.
- Group generated cleanup drafts in one Planning Workspace per health run.
- Ask before publishing GitHub issues and support publishing all, choosing a subset, or deferring all.
- Treat health findings as a separate cleanup plan by default unless they directly block the current feature or bug workflow.
- Respect `improve-codebase-architecture` by framing exploratory deepening opportunities with evidence and candidate seams, not final interfaces, unless the user has already approved the design direction.
- Mark findings that conflict with Project Decisions or ADRs as `decision-revisit` candidates rather than normal refactor drafts.
- Require accepted-debt findings to include a recorded reason.
- Stop nagging about accepted-debt findings unless assumptions change, touched files change substantially, related work touches the area, or the user explicitly asks for reassessment.
- Confirm memory-derived findings against current code before turning them into candidate work.
- Cite memory observations by ID/title and summarized claim rather than dumping raw memory contents.
- Treat memory unavailability as missing evidence, not a hard failure.
- Add a Pi session-start extension under `packages/firehorse-pi/extensions/`.
- Add a Claude hook script under `packages/firehorse-claude/hooks/` and register it in `hooks.json`.
- Keep hook implementations hand-authored distribution code, not Generated Mirrors.
- Enable health hooks by default after installing Firehorse.
- Run hooks only inside recognizable project repositories with a writable `docs/` area or equivalent Project Anchor location.
- Run hooks on startup/new/resume-style session starts, skip reload, and normally skip fork unless the report is missing or stale and the fork is long-lived.
- Let hooks run bounded local commands such as `git rev-parse HEAD` and `git diff --name-only`.
- Forbid network calls and GitHub queries in startup hooks by default.
- Make hooks silent when the report is fresh and has no notable findings.
- Surface stale reports or notable findings with short provider-native messages and suggest `horse-assess-codebase-health`.
- Throttle repeated notifications for the same stale state or finding fingerprint, normally once per 24 hours per project unless Critical findings warrant earlier surfacing.
- Support `FIREHORSE_SKIP_CODEBASE_HEALTH_CHECK`, `FIREHORSE_CODEBASE_HEALTH_CHECK_TIMEOUT_MS`, and `FIREHORSE_CODEBASE_HEALTH_STALE_HOURS`.
- Swallow hook failures by default; hooks must never break session startup.
- Put shared read-only report parsing and freshness evaluation in `firehorse-core` if it remains pure/provider-neutral and does not create runtime behavior.
- Update `create-plan`, `build`, and `review-code` instructions only where needed so they can consume or target-update the health report.

## Testing Decisions

- Validate the new canonical Workflow definition with the existing Definition Format v1 parser.
- Regenerate Pi and Claude mirrors using `pnpm definitions:write`.
- Assert manifests expose `horse-assess-codebase-health`.
- Run `pnpm definitions:check`.
- Add tests for provider-neutral report parsing and freshness evaluation if shared helper code is introduced.
- Add fixture/unit coverage for Claude hook report parsing/freshness behavior where feasible.
- Typecheck the Pi extension.
- Verify startup hooks are no-op/silent when no project root is detected.
- Verify startup hooks are no-op/silent when the report is fresh and has no notable findings.
- Verify startup hooks surface a missing report with a suggestion to run `horse-assess-codebase-health`.
- Verify startup hooks surface a stale report without running deep analysis.
- Verify hooks respect skip and stale-hour environment variables.
- Verify hooks do not perform network/GitHub calls during startup checks.
- Verify helper behavior dedupes/throttles repeated notifications by stale state or finding fingerprint.
- Run `pnpm typecheck` before considering implementation complete.

## Out of Scope

- A generalized Firehorse runtime, prompt loader, provider transport, or autonomous execution loop.
- Deep analysis during session-start hooks.
- Network calls or GitHub status refresh during startup hooks.
- Historical archives for every health run.
- A numeric codebase health score.
- Automatic publication of GitHub issues without user confirmation.
- Automatically creating Issue Drafts for Watchlist findings.
- Implementing the full future `map-codebase` workflow as a prerequisite.
- Hard-coding Firehorse-specific generated-file freshness rules into the canonical workflow.
- Hand-editing generated provider mirrors.

## Verification Contract

<verification_contract>
<expected_behaviors>
<behavior>`horse-assess-codebase-health` is available in Pi and Claude provider surfaces.</behavior>
<behavior>The workflow writes or updates `docs/codebase/health.md` as the current Codebase Health Report.</behavior>
<behavior>The report uses YAML metadata plus semi-structured Markdown findings with stable IDs, severity, status, evidence, and links.</behavior>
<behavior>The workflow creates local Issue Drafts for Critical and High-leverage findings and asks before publishing GitHub issues.</behavior>
<behavior>Watchlist findings appear in the report and startup summaries but do not automatically create Issue Drafts.</behavior>
<behavior>Provider startup hooks only perform lightweight freshness/reporting checks and suggest `horse-assess-codebase-health`.</behavior>
<behavior>Startup hooks do not auto-run deep analysis, call GitHub, or break session startup on failure.</behavior>
<behavior>Pi projection strongly uses Pi-native code intelligence and memory capabilities.</behavior>
<behavior>Claude projection strongly uses Claude-native memory, code tools, skills, and agents.</behavior>
</expected_behaviors>
<required_artifacts>
<artifact>Canonical workflow Definition File for `assess-codebase-health`.</artifact>
<artifact>Generated Pi prompt mirror for `horse-assess-codebase-health`.</artifact>
<artifact>Generated Claude command mirror for `horse-assess-codebase-health`.</artifact>
<artifact>Updated manifests exposing the generated workflow mirrors.</artifact>
<artifact>Pi session-start extension for lightweight codebase-health surfacing.</artifact>
<artifact>Claude SessionStart hook script and hook registration for lightweight codebase-health surfacing.</artifact>
<artifact>Provider-neutral helper code for report parsing/freshness if introduced.</artifact>
<artifact>Tests or fixtures for report parsing/freshness and hook behavior where feasible.</artifact>
</required_artifacts>
<acceptance_checks>
<check>`pnpm definitions:check` passes.</check>
<check>`pnpm typecheck` passes or documents any package-level no-op equivalents.</check>
<check>Generated manifests include `horse-assess-codebase-health`.</check>
<check>Pi extension typechecks.</check>
<check>Claude hook parsing/freshness behavior is covered by tests or fixtures.</check>
<check>Startup hook failure paths are swallowed and do not fail startup.</check>
<check>No Firehorse runtime, prompt loader, provider transport, or autonomous execution loop is added.</check>
</acceptance_checks>
<dependencies>
<dependency>D-137 in `docs/DECISIONS.md`.</dependency>
<dependency>Existing Definition Format v1 and projection generator.</dependency>
<dependency>Existing Planning Workspace conventions from PRD-0002.</dependency>
<dependency>Bundled Matt Pocock `improve-codebase-architecture` skill.</dependency>
<dependency>Firehorse-pi bundled code intelligence and memory tooling.</dependency>
<dependency>Claude plugin hook and memory/tooling capabilities.</dependency>
</dependencies>
</verification_contract>

## Further Notes

This PRD intentionally plans the full implementation including hooks, because the user explicitly rejected a manual-only staged rollout. The guardrail is that hooks remain lightweight and provider-owned, while the deep health assessment remains a user-facing Firehorse Workflow.
