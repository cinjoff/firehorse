# Planning Decisions

## Source

These decisions were resolved during a `grill-with-docs` planning session about continuous codebase improvement and then recorded as binding project decision D-137 in `docs/DECISIONS.md`.

## Resolved decisions

1. Codebase health is a first-party Firehorse **Workflow**, not merely a hook or standalone skill.
2. The canonical Workflow ID is `assess-codebase-health` and the provider-native invocation is `horse-assess-codebase-health`.
3. `assess-codebase-health` is separate from future `map-codebase`.
4. `assess-codebase-health` consumes or refreshes Codebase Maps when possible; if maps are unavailable or stale and cannot be refreshed, it proceeds only with an explicit caveat.
5. The workflow writes the current Codebase Health Report to `docs/codebase/health.md`.
6. The initial artifact model keeps only the current Codebase Health Report; archived health-run snapshots are out of scope.
7. The Codebase Health Report is semi-structured Markdown with YAML frontmatter for machine-readable freshness metadata.
8. The report includes stable finding IDs or fingerprints so repeated assessments update findings instead of duplicating them.
9. Finding severities are `Critical`, `High-leverage`, and `Watchlist`.
10. Finding lifecycle statuses include `open`, `drafted`, `published`, `accepted-debt`, `ignored`, `decision-revisit`, and `resolved`.
11. Resolved findings are removed from the current report once tracker state or verification evidence confirms closure.
12. The report links local Issue Drafts, Published Issues, and GitHub ticket URLs while findings are active.
13. The report does not include a single numeric health score; it reports freshness, finding counts by severity/status, top findings, and trend prose where useful.
14. The report records freshness metadata including generated time, source commit, meaningful-change policy, Codebase Map freshness used, tools used, memory status/query timestamp, and tracker-status last checked timestamp.
15. The default stale threshold is 24 hours.
16. Meaningful codebase changes also make the report stale.
17. Freshness policy is project/provider-aware and configurable, not hard-coded to this repository's generated-file rules.
18. Optional project-local freshness configuration lives at `docs/codebase/health-policy.json`.
19. If no policy file exists, defaults are used.
20. Session-start health behavior is implemented as explicitly scoped provider-specific hooks, not as a generalized Firehorse runtime.
21. Hooks are enabled by default after installing Firehorse because they are silent when fresh/healthy and can be disabled by environment flags.
22. Hooks run only inside recognizable project repositories with a writable `docs/` area or equivalent Project Anchor location.
23. Hooks run on startup/new/resume-style session starts.
24. Hooks skip reload.
25. Hooks normally skip fork unless the report is missing or stale and the fork is long-lived.
26. Hooks are bounded and non-invasive: they read metadata, compare lightweight freshness signals, and summarize existing findings.
27. Hooks may run bounded local commands such as `git rev-parse HEAD` and `git diff --name-only`.
28. Hooks do not perform network calls and do not hit GitHub by default.
29. Hooks do not auto-run deep analysis; they suggest `horse-assess-codebase-health`.
30. Hooks are silent when the report is fresh and has no notable findings.
31. Hooks surface stale reports and notable Critical/High-leverage/Watchlist findings with short provider-native messages.
32. Hooks throttle repeated notifications for the same stale state or finding fingerprint, normally once per 24 hours per project unless a Critical finding warrants surfacing sooner.
33. Hook environment controls include `FIREHORSE_SKIP_CODEBASE_HEALTH_CHECK`, `FIREHORSE_CODEBASE_HEALTH_CHECK_TIMEOUT_MS`, and `FIREHORSE_CODEBASE_HEALTH_STALE_HOURS`.
34. Pi hook implementation is hand-authored distribution code under `packages/firehorse-pi/extensions/`.
35. Claude hook implementation is hand-authored distribution code under `packages/firehorse-claude/hooks/`.
36. Hook implementations are not Generated Mirrors.
37. Pi and Claude hook UX can differ provider-natively: Pi can use extension notifications, while Claude can emit hook system messages/additional context.
38. The Pi projection should strongly use expected Pi-native capabilities such as `pi-lens`, LSP diagnostics, ast-grep, lens findings when available, and Pi-native memory tooling.
39. The Pi projection may rely on the bundled Matt Pocock `improve-codebase-architecture` skill as an expected architecture-review ingredient.
40. The Claude projection should strongly use Claude-native memory, code tools, skills, and agents rather than Pi-specific tools.
41. Memory is evidence, not source of truth.
42. Memory unavailability is noted as missing evidence, not a hard workflow failure.
43. Memory-derived findings must be confirmed against current code before becoming candidate work.
44. Health reports cite memory observations by ID/title and summarized claim rather than dumping raw memory contents.
45. Critical and High-leverage findings automatically create local cleanup Issue Drafts.
46. Watchlist findings appear in the report and startup summaries but do not automatically create Issue Drafts.
47. Health-generated cleanup Issue Drafts live in a normal Planning Workspace, not beside the health report.
48. `assess-codebase-health` creates one Planning Workspace per health run when generating cleanup drafts.
49. Publishing UX offers publishing all drafts, choosing a subset, or deferring all publication.
50. The workflow asks for confirmation before publishing GitHub issues.
51. Health findings become a separate cleanup plan by default unless they directly block the current feature or bug workflow.
52. `create-plan` reads the Codebase Health Report as Gathered Context and warns when a planned feature touches an area with known health debt.
53. `build` and `review-code` may perform targeted health-report updates after resolving a health finding, including updating tracker status or removing resolved findings, without rerunning full health assessment.
54. Published health findings retain tracker links while active, and the report reflects tracker status when a Published Issue exists.
55. Startup does not query GitHub by default; workflows already operating on issues refresh tracker status.
56. Accepted-debt findings require a recorded reason and stop startup nagging unless assumptions change, touched files change substantially, related work touches the area, or the user explicitly asks for reassessment.
57. Findings that conflict with Project Decisions or ADRs become `decision-revisit` candidates instead of ordinary refactor drafts.
58. Architecture-oriented drafts respect `improve-codebase-architecture`: they frame exploratory deepening opportunities with evidence and candidate seams, but do not prescribe final interfaces unless the user has already approved that design direction.
59. The workflow should use shared pure/read-only helper code in `firehorse-core` for report parsing and freshness logic if doing so remains provider-neutral and does not create a runtime.
60. Hook failures are swallowed/silent by default and must never break session startup.
61. Implementation should include the canonical workflow definition, generated Pi/Claude mirrors, Pi extension, Claude hook script and hook registration, helper tests where feasible, and validation through `definitions:check` and package typechecking.
