# PRD: Session Audit and Agent Tooling Efficiency

Status: Draft — local review ready  
Publication: Deferred until the helper-backed baseline and issue set are explicitly approved for publication  
Baseline: Manual pre-helper learnings are incorporated; helper-backed baseline remains the implementation target

## Problem Statement

Firehorse users rely on increasingly capable agent workflows, but completed sessions can silently waste context, use the wrong tool family, inherit noisy memory, poll subagents inefficiently, lose important context during compaction or handoff, skip verification, mutate systems beyond approval boundaries, or miss setup problems that degrade future work. These failures are hard to see from a normal final answer because the visible output often hides the cost of broad memory injection, raw command output, repeated status checks, weak code-intelligence orchestration, dropped decisions, missing post-change checks, or unsafe side effects.

The current Firehorse surface includes strong Workflows, Skills, Agent Roles, setup checks, memory guidance, context-mode, pi-lens, and pi-subagents. However, there is no first-party Assessment Workflow that reviews Session Evidence after the fact and turns agent-tooling problems into durable, evidence-backed findings. The result is that tool misuse and memory bleed can repeat across sessions without becoming actionable setup fixes, workflow guidance, or Issue Drafts.

## Solution

Add a first-party Firehorse `session-audit` Workflow, generated as `horse-session-audit`, as a sibling Assessment Workflow to `assess-codebase-health`.

Session Audit reviews recent Session Evidence from known local provider/session locations, with Pi JSONL session files under `~/.pi/agent/sessions/--<cwd with / replaced by ->--/*.jsonl` as the primary evidence source for Pi sessions. It also uses context-mode statistics, memory injection blocks, same-session pi-memory/claude-mem observations, subagent summaries, command/test summaries, compaction/handoff summaries, approval-sensitive tool activity, and user-provided transcript excerpts or log paths. It writes immutable per-run reports under `docs/audits/session-audit/YYYY-MM-DD-HHMM-<repoName>.md` using frontmatter metadata, metrics, findings, redaction notes, evidence, recommendations, positive patterns, and issue-draft candidates.

The workflow reuses the Codebase Health finding pattern where it fits: stable finding IDs/fingerprints, severity, evidence, recommendation, status, confidence, and optional Issue Draft links. Session Audit remains separate from Codebase Health because it audits session/tooling behavior rather than codebase structure, but it may feed Codebase Health or a follow-up Planning Workspace when findings identify durable repo setup or workflow-health problems.

Session Audit should evaluate outcome quality and safety as well as efficiency. A low-token session that ships wrong work, skips tests after edits, loses a decision during compaction, leaks sensitive excerpts, or performs tracker/environment mutations without approval is still a bad session. Reports should also record what went well so the workflow reinforces effective tool use rather than only producing negative findings.

The first implementation should define the canonical Workflow, generated provider mirrors, and a narrow deterministic helper layer for evidence discovery and metric extraction before publishing GitHub issues. A baseline Session Audit report should then be run against this planning session and recent local main sessions, starting from actual Pi JSONL session history rather than memory summaries, to validate thresholds and provide concrete evidence for the issue set.

## User Stories

1. As a Firehorse user, I want to run `horse-session-audit`, so that I can understand how efficiently recent agent sessions used the available tooling.
2. As a Firehorse user, I want Session Audit to find recent local session logs itself, so that I do not need to manually locate every transcript.
3. As a Firehorse user, I want Session Audit to inspect the latest five main sessions or last seven days, so that the report focuses on recent behavior without over-scanning history.
4. As a Firehorse user, I want subagent sessions related to those main sessions included as evidence, so that delegated work is not invisible.
5. As a Firehorse user, I want Session Audit to avoid broad home-directory scans, so that private unrelated files are not swept into the audit.
6. As a Firehorse user, I want Session Audit to minimize raw transcript publication, so that the report preserves privacy while still explaining findings.
7. As a Firehorse user, I want Session Audit to unfold enough transcript detail when needed, so that findings are based on deep understanding rather than shallow metrics.
8. As a Firehorse user, I want reports to identify evidence sources, timestamps, repo/project names, providers, and completeness, so that I can judge trustworthiness.
9. As a Firehorse user, I want findings to state confidence as confirmed, likely, or needs-more-evidence, so that I know how strongly to act.
10. As a Firehorse user, I want memory injection volume measured, so that broad initial memory context does not silently consume my context budget.
11. As a Firehorse user, I want cross-repo memory bleed detected, so that unrelated observations do not steer my session.
12. As a Firehorse user, I want unscoped memory detail fetches flagged, so that agents follow the intended search/timeline/filter workflow before loading full observations.
13. As a Firehorse user, I want context-mode misuse detected, so that large logs, test output, and command output are processed without flooding chat context.
14. As a Firehorse user, I want underuse of `ctx_batch_execute` detected, so that related commands and searches are batched instead of repeated inefficiently.
15. As a Firehorse user, I want context-mode kept out of live code intelligence, so that code navigation uses the right semantic tools.
16. As a Firehorse user, I want LSP navigation to lead live code intelligence, so that definitions, references, hovers, and call hierarchy use IDE-grade evidence.
17. As a Firehorse user, I want LSP diagnostics and ast-grep used for their strengths, so that diagnostics and semantic code pattern searches are accurate.
18. As a Firehorse user, I want memory smart tools treated as prior-session recall rather than authoritative current-code inspection, so that stale code facts are verified before edits.
19. As a Firehorse user, I want repeated subagent status polling reported as an efficiency finding, so that agents learn to use completion events, control notifications, or end the turn while waiting.
20. As a Firehorse user, I want async/foreground mismatches reported, so that subagent orchestration follows the pi-subagents model without unnecessary blocking.
21. As a Firehorse user, I want implementation workers to actually make needed changes or return `BLOCKED: reason`, so that delegated implementation work does not become unproductive advice.
22. As a Firehorse user, I want large subagent outputs routed to artifacts when appropriate, so that reports and handoffs do not flood the parent session.
23. As a Firehorse user, I want setup problems such as stale context-mode, missing Bun, or mismatched memory project variables surfaced, so that I can repair the environment.
24. As a Firehorse user, I want setup remediation to require confirmation, so that Session Audit never installs or changes things without approval.
25. As a Firehorse user, I want audit reports to use Critical, High-leverage, and Watchlist severity, so that they align with Codebase Health terminology.
26. As a Firehorse user, I want Session Audit to avoid calling every inefficiency an error, so that findings encourage practical improvement rather than false alarm fatigue.
27. As a Firehorse user, I want immutable per-run reports, so that each audit remains an evidence snapshot.
28. As a Firehorse user, I want an optional index only after multiple reports accumulate, so that v1 stays lightweight.
29. As a Firehorse user, I want Session Audit to propose Issue Draft candidates, so that durable fixes can become planned work.
30. As a Firehorse user, I want Issue Drafts stored in a follow-up Planning Workspace, so that audit remediation follows existing Firehorse planning conventions.
31. As a Firehorse user, I want Published Issues created only after approval, so that GitHub remains under my control.
32. As a Firehorse maintainer, I want `session-audit` represented as a Firehorse Definition File, so that Pi and Claude mirrors are generated from the same source.
33. As a Firehorse maintainer, I want generated provider mirrors to be deterministic and provenance-marked, so that users can trust the installed `horse-session-audit` surface.
34. As a Firehorse maintainer, I want the workflow to remain instruction-first rather than a runtime monitor, so that Firehorse does not add telemetry or a new execution engine.
35. As a Firehorse maintainer, I want the first baseline report produced before publishing the issue set, so that thresholds and examples are evidence-backed.
36. As a Firehorse maintainer, I want Firehorse Setup Manifest memory project data reused by setup checks, so that Superset and generated worktrees do not cause memory namespace drift.
37. As a Firehorse maintainer, I want the report model to be compatible with Codebase Health, so that assessment workflows feel coherent without collapsing into one workflow.
38. As a Pi user, I want Session Audit to understand context-mode, pi-lens, pi-memory, and pi-subagents responsibilities, so that Pi sessions are reviewed against Pi-native best practice.
39. As a Claude user, I want Session Audit to respect the Firehorse claude-mem preamble, so that Claude memory usage is evaluated against the same project-scoped rules.
40. As a future agent, I want a clear Session Audit artifact contract, so that I can implement, validate, and hand off audit work without rediscovering the decisions.
41. As a Firehorse user, I want Session Audit to check whether the session actually satisfied the user's request, so that tool efficiency is not mistaken for good outcomes.
42. As a Firehorse user, I want Session Audit to flag edited-code sessions that skipped reasonable post-change diagnostics or tests, so that regressions are less likely to slip through.
43. As a Firehorse user, I want Session Audit to detect compaction or handoff loss, so that important decisions, terminology, blockers, and next steps are preserved across long sessions.
44. As a Firehorse user, I want Session Audit to flag approval-boundary risks, so that publishing issues, destructive shell commands, installs/upgrades, secrets/config changes, and other risky mutations happen only after clear user approval.
45. As a Firehorse user, I want Session Audit excerpts to pass a privacy redaction check, so that tokens, customer data, account identifiers, emails, environment variables, and sensitive infrastructure names are not casually copied into reports.
46. As a Firehorse user, I want audit evidence to include reproducibility metadata such as session IDs or paths, generated-at time, tool versions, evidence hashes where practical, and redaction notes, so that findings can be trusted without republishing raw transcripts.
47. As a Firehorse user, I want intentional exceptions to be recorded with rationale, so that justified broad memory, large output, polling, or foreground/async choices do not become noisy false positives.
48. As a Firehorse maintainer, I want Session Audit to compare behavior against installed tool versions and current local guidance where available, so that reports do not rely on stale remembered best practices.
49. As a Firehorse user, I want duplicate subagent work and conflicting subagent advice detected, so that parallel delegation does not waste tokens or produce incoherent synthesis.
50. As a Firehorse user, I want reports to include positive findings, so that good batching, LSP-first navigation, artifact routing, verification loops, and context savings are reinforced.
51. As a Firehorse user, I want post-delivery correction loops detected, so that sessions where the user had to repeatedly steer or correct completed work are treated as outcome-quality signals.
52. As a Firehorse user, I want token and tool usage judged against task complexity, so that excessive effort is visible even when the final answer is acceptable.
53. As a Firehorse user, I want relevant-code discovery wandering detected, so that broad exploration, repeated wrong-path reads, or slow identification of the core logic can become codebase-map, workflow, or guidance improvements.
54. As a Firehorse maintainer, I want deterministic helper code for evidence discovery and metric extraction, so that repeatable parts of Session Audit do not depend only on ad hoc agent judgement.
55. As a Firehorse user, I want pi-memory/claude-mem observations attributable to the audited sessions included as evidence, so that the audit can compare what memory injected, fetched, and later recorded about the session.
56. As a Pi user, I want Session Audit to treat Pi JSONL session files as primary evidence, so that reports do not rely on memory summaries instead of actual session history.
57. As a Firehorse user, I want active-session audits to record a snapshot cutoff, entry count, file metadata, and source priority, so that reports do not chase a moving target indefinitely.
58. As a Firehorse user, I want Session Audit to report when the audit itself misses a key evidence source and is corrected by the user, so that audit quality improves before issues are published.
59. As a Firehorse maintainer, I want same-session memory feedback loops distinguished from independent evidence, so that newly written observations about the audit do not incorrectly validate the audit's own findings.
60. As a Firehorse user, I want memory content/source-domain mismatch detected even when the memory project name matches, so that unrelated work does not pollute the session just because it was stored under the same project.
61. As a Firehorse maintainer, I want memory-provider package/tool provenance reported, so that setup findings target the active bundled/global package, extension, or MCP surface and do not diagnose the wrong installation path or wrong active memory implementation.
62. As a Firehorse user, I want setup/version findings to distinguish latest available versions, manifests, lockfiles, active installed modules, bundled distribution state, and direct dependency patches, so that remediation status is not inferred from a single source.
63. As a Firehorse maintainer, I want repeated memory-injection events, distinct observation evidence, and injected wrapper guidance reported separately, so that repeated `$CMEM` blocks and stale tool instructions do not inflate or distort findings.

## Implementation Decisions

- Add canonical Workflow ID `session-audit` and generated invocation `horse-session-audit`.
- Model Session Audit as an Assessment Workflow, sibling to Codebase Health, not as a Skill-only surface and not as a mode inside Codebase Health.
- Keep Session Audit post-hoc. It reviews completed or recent sessions; it is not a runtime monitor, telemetry system, hook, or enforcement layer.
- Use the existing Definition Format and projection generator for provider-native Pi and Claude mirrors.
- Ship narrow deterministic Session Audit helper code for read-only evidence discovery, bounded memory-database inspection, metric extraction, redaction/provenance support, and candidate signal classification where those tasks can be specified precisely.
- Run the baseline report only after a minimal helper slice exists for real discovery, metrics, and redaction primitives, so the baseline validates the design rather than becoming a purely manual report.
- Limit the pre-baseline helper slice to deterministic essentials: evidence discovery preview, report filename/frontmatter generation, redaction and hashing, memory/context database path resolution plus schema preview, and basic metric extraction from explicit pasted blocks/session logs. Advanced finding classification may be deferred until after the baseline if needed.
- Expose a small experimental helper API in v1: `discoverSessionEvidence(options)`, `extractSessionMetrics(sources, options)`, `classifyCandidateFindings(metrics, options)`, `redactEvidenceText(text, options)`, and `renderSessionAuditReport(data)`.
- Mark the `firehorse/session-audit` helper API as experimental until the baseline report and first implementation slices validate the data model.
- The helper may expose raw matched observation content in typed output for reviewer use, but it must mark that content as sensitive; renderers default to redacted or minimized snippets.
- Support these v1 input formats: discoverable Pi JSONL/session logs as primary Pi evidence, Claude JSONL/session logs best-effort, context-mode stats/session DB metadata best-effort, known pi-memory/claude-mem databases through bounded read-only adapters, explicit pasted transcript or memory blocks, and subagent run artifacts linked from main session logs.
- Prefer SQLite access already available through installed claude-mem, context-mode, or Bun runtime facilities before adding any new `firehorse-core` SQLite dependency.
- Preserve Node compatibility by avoiding top-level imports of `bun:sqlite` or any runtime-specific SQLite module; load SQLite adapters optionally/dynamically and return an evidence-completeness gap if no adapter is available.
- Do not support arbitrary chat exports or broad filesystem transcript search in v1.
- Without a committed CLI in v1, generated Workflow instructions may tell the agent to run a small temporary Node/Bun script that imports `firehorse/session-audit`.
- Keep qualitative judgement in the Workflow instructions: the helper should produce structured evidence and candidate findings, not silently decide whether work was good.
- Do not add a new Firehorse runtime, prompt loader, provider transport, autonomous execution loop, hook, or telemetry pipeline; Session Audit helper code must stay a local, explicit, post-hoc analysis aid.
- PRD-0005 owns detection and reporting for memory quality, attribution, provenance, source-domain mismatch, stale injected guidance, and over-budget injection. Replacing or repairing the active memory implementation, tool aliases, injection defaults, query filtering, or source-mixing behavior belongs to PRD-0006 or a separately approved upstream/tooling follow-up.
- Define Session Evidence as artifacts from completed or recent agent sessions, including recent session logs, context-mode statistics, memory injection summaries, same-session pi-memory/claude-mem observations, subagent status/control summaries, command/test summaries, and user-provided transcript excerpts.
- Use source priority when classifying findings: direct session JSONL/log metadata and transcript structure first, then tool result metadata and local artifacts, then memory observations and context-mode aggregate statistics as corroborating evidence. If an audit cannot read the direct session history, it must mark the report partial and must not treat memory observations as a substitute.
- Discover Session Evidence from known local provider/session locations only.
- For Pi sessions, derive the cwd-encoded session directory under `~/.pi/agent/sessions/`, parse direct `*.jsonl` files as main sessions, and parse nested `run-*/session.jsonl` files as related delegated/subagent evidence without counting them against the main-session cap.
- Do not follow symlinks during evidence discovery by default; scan allowlisted known provider/session directories and explicit user-provided paths only.
- Inspect the latest five main sessions or last seven days, whichever is smaller.
- For active sessions, record a snapshot cutoff including session file path or ID, last entry timestamp, entry count, size, and source hash where practical. Subsequent memory injections or session writes are outside the report unless the user explicitly requests a refreshed audit.
- Enforce hard read caps for rows, bytes, excerpts, and session count; when caps are exceeded, sample evidence and mark completeness as partial. Suggested defaults are latest five main sessions or seven days, max 200 memory rows, max 20 snippets, and max 2KB per redacted snippet before truncation.
- Include related subagent sessions discovered from those main sessions without counting them against the five-main-session cap.
- Prefer logs whose path or metadata matches the current repo, the Firehorse Setup Manifest memory project, or the current working directory.
- Sample unscoped logs only when clearly recent and likely related.
- Process logs with context-mode/file-processing patterns and report metrics plus short evidence excerpts rather than dumping raw transcripts.
- Support one staged preview approval per audit run before deep reading: show evidence sources, memory/context database paths, session window, row counts, and privacy caveats, then continue only after user approval. Separate approval per database is not required unless new sources are discovered later.
- Preview may inspect database existence, schema compatibility, row counts, candidate windows, and paths, but must not read observation contents until after approval.
- Do not persist preview output by default. If the audit proceeds, include a preview summary in final report provenance; if the user cancels after preview, write nothing unless explicitly requested.
- Unfold deeper transcript detail when necessary to understand causes and avoid lazy surface-level findings.
- Degrade gracefully when logs are missing by using context-mode statistics, pasted evidence, memory blocks, attributable pi-memory/claude-mem observations, and user-provided paths.
- Write immutable per-run reports rather than a single mutable current report.
- Treat Session Audit reports as local review artifacts by default; committing or publishing them requires explicit approval because even redacted reports may reveal private paths, project names, or workflow behavior.
- Use or create `docs/audits/session-audit/.gitignore` so generated `.md` and `.json` reports are ignored by default; committing a redacted report should require explicit approval and `git add -f`.
- Use timestamped report names with minute precision and repository name to avoid same-day collisions.
- Make an index optional later if multiple Session Audit reports accumulate.
- Report frontmatter should include repo/project, provider or providers, session window, evidence sources, completeness, ISO UTC `generatedAt`, local timezone, source window, and git status metadata where relevant.
- Support partial reports when evidence is incomplete: use `completeness: partial`, list missing sources, and classify affected findings as `likely` or `needs-more-evidence`.
- Report filename timestamps use local time with minute precision; frontmatter uses ISO UTC and records the timezone/source window for reproducibility.
- Report body should include summary, evidence-source priority, snapshot cutoff, metrics, findings table, detailed findings, recommendations, session learnings, and issue-draft candidates.
- Generated provider mirrors must explicitly tell users that `horse-session-audit` may inspect bounded local session logs and memory/context databases.
- Optionally generate a machine-readable JSON sidecar next to the Markdown report for deterministic metrics and future diffing; Markdown remains the primary human artifact, and sidecars must not include raw excerpts.
- Reuse Codebase Health-style findings where practical: stable finding ID or fingerprint, severity, evidence, recommendation, snapshot status, confidence, and optional Issue Draft link.
- Finding fingerprints should be deterministic in v1, using `category + normalized signal key + source project/session + affected tool/family`; do not use embeddings or LLM-generated fingerprints.
- Use severity values `Critical`, `High-leverage`, and `Watchlist`.
- Avoid `error` language except for hard correctness or security risks.
- Use confidence values `confirmed`, `likely`, and `needs-more-evidence`.
- Use snapshot finding statuses in immutable reports: `open`, `issue-draft-candidate`, `deferred`, `intentional-exception`, `positive`, and `needs-more-evidence`. These statuses describe the audit report at generation time; follow-up Planning Workspaces and Published Issues track later state.
- Evaluate whether the session satisfied the user's stated request and whether the final answer accurately represented completed work, verification, blockers, and remaining risks.
- Treat repeated user corrections after an agent says work is complete as a Session Outcome signal, especially when corrections show misunderstood requirements, stale assumptions, or incomplete edits.
- Treat work as presented complete after a final answer, Pull Request creation, explicit “done”, “fixed”, or “implemented” claim, or handoff text stating implementation is complete.
- Judge token and tool usage against the apparent task complexity and available project guidance; excessive effort is an efficiency finding even when the final result is correct, defaulting to Watchlist unless paired with poor outcome, skipped verification, or repeated correction loops.
- Use both absolute excessive-effort guardrails for obvious runaway sessions and relative comparison against task complexity for normal cases.
- Estimate task complexity with a coarse rubric: `small` for docs-only or one narrow file/edit, `medium` for multiple files/tests or moderate debugging, `large` for cross-package, architecture, release, migration, or long-running diagnosis work, and `unknown` when evidence is insufficient.
- Detect relevant-code discovery wandering, such as many broad searches/reads before locating the core logic, repeated exploration of unrelated paths, or failure to use existing codebase maps, LSP, ast-grep, or domain docs to narrow the search.
- Treat normal collaborative clarification and changing requirements differently from post-delivery correction loops; do not penalize healthy iteration before the agent presents work as complete.
- Treat code edits without reasonable post-change diagnostics, typechecks, tests, or documented no-op equivalents as a verification-loop finding when those checks are available and proportional.
- Do not usually classify docs-only planning edits without typecheck/test runs as missing verification; structural checks or review may be enough. Escalate only when generated mirrors, schemas, or referenced docs should have been checked and were not.
- Detect compaction and handoff loss by checking whether key decisions, terminology, blockers, user approvals, and next steps survive summaries and resumed context.
- Detect approval-boundary risks for tracker mutation, package installs/upgrades, destructive shell commands, force pushes, secrets/config changes, environment repairs, and other side effects that should require explicit user confirmation.
- Treat durable repo instructions as approval only for low-risk reversible actions already covered by documented workflow policy; destructive commands, installs/upgrades, force pushes, tracker publication, environment/config repairs, and secrets handling still require current-session approval.
- Run a privacy minimization and redaction pass before writing transcript excerpts; prefer short paraphrased evidence, and redact tokens, credentials, customer data, account identifiers, emails, environment variables, and sensitive infrastructure names where practical.
- If redaction confidence is low, fail closed: include metrics and provenance, omit the excerpt, and note “excerpt withheld due to redaction uncertainty.”
- Do not persist raw observation or transcript content anywhere by default; raw matched content may exist only in process memory or sensitive typed output for immediate review, while persisted Markdown/JSON uses redacted snippets, hashes, and withheld markers.
- Record provenance metadata sufficient for reproducibility without raw transcript publication: session IDs or paths, generated timestamp, evidence source type, sampled/completeness status, tool/package versions where available, memory observation IDs, and evidence hashes where practical.
- Avoid absolute local paths in reports by default; use repo-relative paths where possible, otherwise hash or redact home-directory prefixes. Full absolute paths require explicit approval.
- Cite installed package versions, active package/tool source, MCP or extension config path, and local docs/schema assumptions used for database readers where available, including whether memory functionality comes from a bundled Firehorse dependency, user/global install, or self-adapted MCP surface, plus claude-mem documented tables/fields and observation type vocabulary.
- For setup/version findings, distinguish latest available version, root/package manifests, lockfiles, active installed modules, bundled package metadata, repo/worktree scope, and any direct installed-dependency modifications before declaring remediation complete.
- Hash evidence sources with SHA-256 when practical, using source file content or explicit excerpt text after reading, and store hashes in report metadata without storing full raw source content.
- Compare behavior against the installed tool versions and local guidance available at audit time, and note guidance/version drift when the audit relies on external docs, bundled skills, or remembered policy.
- Allow intentional exceptions to be recorded with a brief rationale so justified broad memory, large output, status polling, or async/foreground choices are not treated as false positives.
- Detect duplicate or overlapping subagent work, unresolved conflicting subagent advice, and parent synthesis that ignores material disagreements.
- Include positive findings for effective tool use, such as good context-mode batching, LSP-first code intelligence, semantic ast-grep usage, file-only artifacts for large outputs, scoped memory recall, and strong verification loops.
- Treat memory injection over budget as more than three observations or more than two percent of context; exceeding either threshold is a finding.
- Incorporate same-session pi-memory/claude-mem observations as bounded Session Evidence when they can be attributed to audited session IDs, timestamps, cwd/repo metadata, memory project names, or explicit pasted blocks.
- Read known pi-memory/claude-mem databases directly when available, but only through bounded read-only adapters that filter by canonical project, audited session/window attribution, and privacy rules.
- Preview the bounded memory databases and row scopes before reading them; memory database reads are enabled by default for Session Audit but should be explicit to the user at workflow time.
- Resolve memory database paths by priority: explicit helper options, environment/settings/Firehorse Setup Manifest where applicable, known defaults such as `CLAUDE_MEM_DATA_DIR` or `~/.claude-mem/claude-mem.db`, then skip with a completeness note if not found.
- Use the documented claude-mem/pi-memory database schema and observation type vocabulary as the reader contract; inspect live tables and columns only to verify compatibility and degrade gracefully when installed schemas drift.
- Leverage documented observation fields such as ID, title, subtitle, narrative, facts, concepts, type, files, session summaries, project, session ID, timestamps, and platform source where available.
- Show memory observation IDs, titles, types, and timestamps as provenance, while redacting or paraphrasing contents.
- Attribute Session Memory Observations with confidence tiers: `confirmed` for explicit session ID, run ID, or pasted block from the audited session; `likely` for repo/cwd plus memory project plus timestamp inside the audited session window or up to thirty minutes after session end; `needs-more-evidence` for project matches with weak timestamp or session linkage. Weak attribution must not create confirmed findings.
- Compare memory observations injected into the session, fetched during the session, and recorded after the session to identify memory bleed, stale assumptions, missing useful learning, repeated irrelevant recall, and whether important outcomes were captured accurately.
- Treat memory block wrapper/header/footer guidance as separate evidence from stored observation content; compare injected tool names and usage instructions against the active Firehorse tool surface and official docs available at audit time.
- Distinguish same-session memory feedback loops from independent evidence. Observations written during the audit about the audit itself can prove that memory learned a correction, but they must not be treated as independent validation of the original session findings.
- Compare the expected memory project from Firehorse Setup Manifest and relevant environment variables against actual memory rows; flag rows whose content, project, or source contradicts the expected project identity.
- Treat project-name match as insufficient on its own: compare content domain, source session, platform source, files, active memory surface, and expected task scope so same-project rows about unrelated products or investigations can still become memory-quality findings.
- Treat memory database observations as Session Evidence, not source of truth; claims about code behavior, edits, tests, or user outcomes still need corroborating transcript, filesystem, or test evidence.
- Detect memory-quality findings when the memory layer records an inaccurate session summary, misses the key outcome, stores irrelevant or cross-project observations, or misclassifies observation types in a way that affects future recall.
- Read observation contents for matched bounded rows, not just metadata, then redact and minimize report excerpts.
- Include memory observation content in Markdown reports only as short redacted snippets or paraphrases; never dump full observations.
- Preserve unknown memory observation type strings, classify type-dependent claims as `needs-more-evidence` where appropriate, and include a schema-drift note rather than failing the audit.
- Treat schema drift as a finding only when setup promised compatibility; otherwise record it as an evidence-completeness note. If installed schema contradicts local documented schema enough to degrade audit quality, classify affected findings as `needs-more-evidence`.
- Treat missing memory database access as an evidence-completeness gap, not a finding, unless setup promised memory integration and environment or manifest configuration is broken.
- Treat absent memory usage as a possible positive context-efficiency finding for small/simple sessions where prior context was unnecessary.
- Do not broaden Session Audit into an unrestricted memory-database audit; same-session memory observation lookup must stay project-scoped, bounded to the audited session window, strictly read-only, documented-schema-backed, schema-drift-tolerant, and redacted like transcript evidence.
- Treat cross-repo memory in initial context as a finding unless the user explicitly requested cross-project comparison.
- Treat active memory detail-fetch tools such as Firehorse `mem_get_observations` or an upstream `get_observations` surface as compliant only after a scoped search or timeline, except when IDs were provided directly by the user in current context.
- Parse structured tool-call fields for deterministic metrics where available, and use heuristic text scanning only for candidate signals such as memory blocks, correction loops, approval language, and redaction patterns.
- Label heuristic-only signals as `likely` or `needs-more-evidence`, not `confirmed`, unless corroborated by structured evidence.
- Evaluate context-mode as the large-output, data-processing, and indexing layer.
- Read context-mode databases narrowly where available for stats/session metadata and per-session content-volume metrics; do not dump indexed document chunks or raw indexed content.
- Evaluate pi-lens as the live-code-intelligence layer, with LSP navigation leading for definitions, references, hover, call hierarchy, and related code navigation.
- Evaluate LSP diagnostics as the diagnostics source and ast-grep as the semantic pattern search/replacement source.
- Evaluate pi-memory and claude-mem as prior-session knowledge and code-recall tools that require project scoping and live filesystem verification before edits.
- Use the Firehorse claude-mem preamble as the normative memory-usage guide: canonical project identity, small prior-context checks, scoped search/timeline before details, and a tight context budget.
- Expose Session Audit in both Pi and Claude provider surfaces in v1, while documenting that Pi evidence support is richer initially and Claude evidence support is best-effort until Claude session evidence is validated.
- Evaluate pi-subagents according to the upstream async-first model: prefer async by default, use foreground only for immediate bounded calls where blocking is cheaper or simpler.
- Treat repeated subagent status polling as an efficiency improvement opportunity, not an error by default.
- Require implementation workers assigned write tasks to make needed edits or return `BLOCKED: reason`.
- Use nuanced subagent output policy: no artifact for short review-only work, inline output for concise findings needed immediately, and file-only artifacts for long reports, context builds, handoffs, logs, or expected outputs over roughly ten kilobytes.
- Update setup guidance/checks so Bun is strongly recommended but not hard-blocking.
- Update setup guidance/checks so stale context-mode is reported with an upgrade recommendation, never auto-upgraded.
- Record the canonical memory project name in the Firehorse Setup Manifest and reuse it to validate `FIREHORSE_PROJECT_NAME`, `PI_MEM_PROJECT`, and `CLAUDE_MEM_PROJECT`.
- Setup remediation should suggest required installs or repairs but execute them only after user confirmation.
- Treat direct edits to installed dependencies such as `node_modules` as ephemeral setup remediation risks unless represented by an upstream release, package-manager patch, or explicitly approved patch workflow.
- When Session Audit creates follow-up Issue Drafts, create a follow-up Planning Workspace, link back to the audit report, and store the drafts there.
- Critical and High-leverage findings may become Issue Draft candidates; Watchlist findings do not by default unless repeated across multiple audits or explicitly requested.
- Do not create Published Issues automatically; publication requires explicit user approval.
- Keep PRD #0005 local until one baseline Session Audit report exists.
- Do not require a clean git tree to generate a Session Audit report. Session Audit is read-only and post-hoc; it may record git status metadata where relevant but should not block on dirty worktrees.
- Allow Session Audit to run outside Firehorse repositories with explicit approval. It can audit any git/current project, but report writing under `docs/audits/session-audit/` should be optional when the repo is not Firehorse-marked.
- Use this live PRD-0005 grilling/planning session as the primary baseline case because it contains repeated memory injections, documentation edits, decision capture, correction loops, and evolving memory relevance.
- The baseline report should include PRD document edits as evidence artifacts, citing file paths and diff summaries rather than full diffs.
- The baseline report should include a small timeline of pasted `$CMEM firehorse` blocks with timestamp, observation count, token count or range, approximate relevance, and representative unrelated/relevant IDs to show memory relevance evolving over the grilling session.
- Detect same-session repeated memory blocks from pasted transcript text; repeated `$CMEM firehorse` blocks are a first-class signal for changing relevance and persistent bleed, but reports must separate injection-event count from distinct observation IDs and repeated observation-set fingerprints.
- Do not add a Session Audit CLI in the first slice; start with the library API and add a CLI later only if the baseline report shows repeated manual friction.
- Ship default thresholds in core and allow callers, tests, and workflow instructions to override them through helper options; do not add a project config file for thresholds in v1.
- Implementation sequence: finish decisions, draft this PRD, implement the tiny helper-first skeleton, add the canonical workflow and generated mirrors, deepen finding classification, run one baseline report, then publish the issue set.
- The first implementation issue should be helper-first but tiny, so the canonical Workflow can reference real helper capabilities without overpromising.
- Split helper primitives from workflow/projection work. The current implementation slice order is: helper skeleton/report primitives; evidence preview and bounded discovery; memory/context database adapters with fixtures; canonical Workflow and generated mirrors; finding categories and candidate classifier; setup guidance updates; baseline report and Issue Draft candidates.
- Generated provider mirrors may land before the full classifier; the Workflow can instruct manual/agent review of helper metrics first, then candidate classification can deepen later.
- Direct database adapters should be separate from generic evidence discovery because they carry distinct privacy, schema, runtime, and fixture-test risks.
- The baseline report remains its own HITL implementation slice and blocks GitHub issue publication.
- Upstream-tooling issues for pi-memory, pi-subagents, context-mode, or related tools should be separate from Firehorse implementation issues and should wait until baseline evidence confirms patterns.
- The baseline report should validate and tune thresholds but should not block defining the workflow from the resolved decisions.

## Testing Decisions

- Good tests should verify external behavior and artifact contracts rather than implementation details.
- Validate the new canonical Workflow definition with the Definition Format parser and validator.
- Generate Pi and Claude mirrors using the existing definition generator.
- Verify generated manifests expose `horse-session-audit`.
- Verify generated mirrors include provenance and source hash metadata.
- Add or update definition projection tests that assert `session-audit` projects to both provider surfaces.
- Test report filename/frontmatter generation in helper logic; expected behavior is local timestamp plus repository name with minute precision, while frontmatter records ISO UTC `generatedAt`, local timezone, source window, completeness, and relevant git status metadata.
- Test report metadata parsing if a shared report helper is introduced; expected behavior is tolerant reading of frontmatter and finding blocks.
- Test deterministic Session Audit helper code for read-only behavior, stable output shapes, redaction/provenance support, sensitive raw-observation typed output, optional/dynamic SQLite adapters, hard read caps, pre-baseline helper slice boundaries, and candidate signal classification.
- Test the experimental public helper API shape: `discoverSessionEvidence`, `extractSessionMetrics`, `classifyCandidateFindings`, `redactEvidenceText`, and `renderSessionAuditReport`.
- Test v1 input handling for discoverable Pi logs, Claude logs best-effort, context-mode stats metadata best-effort, known pi-memory/claude-mem database adapters, explicit pasted transcript or memory blocks, and linked subagent run artifacts.
- Test Pi JSONL session discovery as a primary evidence path: cwd path encoding, JSONL header parsing, tree `id`/`parentId` entries, user/assistant/toolResult role counts, tool-call counts, usage/cost aggregation, compaction/custom-message entries, direct main sessions, and nested `run-*/session.jsonl` delegated runs.
- Test that arbitrary chat exports and broad filesystem transcript search are not silently included in v1 evidence discovery.
- Test evidence discovery helpers; expected behavior is known provider/session locations only, no default symlink following, latest five main sessions or seven days, related subagent sessions excluded from the main-session cap, and no persistence when preview is cancelled.
- Test active-session snapshot cutoffs so report metadata records file path/session ID, last entry timestamp, entry count, size, and hash where practical, and so later session writes do not silently mutate immutable report conclusions.
- Test that evidence discovery does not perform broad home-directory scans.
- Test that evidence discovery degrades gracefully when no local logs are found.
- Test memory finding classification against fixtures for over-budget injection, cross-repo bleed, unscoped detail fetch, repeated same-session pasted memory blocks with duplicate observation-set fingerprints, stale injected wrapper guidance, and same-session memory observations that were injected, fetched, or recorded after the session.
- Test direct pi-memory/claude-mem database inspection with fixture SQLite databases matching documented claude-mem/pi-memory tables such as `sdk_sessions`, `user_prompts`, `observations`, and `session_summaries`, plus documented observation fields/types; do not depend on real local databases. Real local databases may be used for the manual baseline report only and must never be committed as tests.
- Test direct pi-memory/claude-mem database inspection for read-only behavior, workflow preview data without row-content reads, path-resolution priority, known-path allowlisting, documented-schema field usage, schema-drift-tolerant degradation, project/window filtering, expected-project-vs-actual-row comparison, observation ID/title/type/timestamp provenance, observation-content redaction, missing-access completeness notes, and no unrestricted memory-database audit behavior.
- Test memory-quality findings for inaccurate summaries, missing key outcomes, irrelevant/cross-project observations, same-project content/source-domain mismatch, stale injected memory guidance/tool names, and unknown observation types.
- Test that memory database observations are treated as Session Evidence and require corroboration before code/result claims become confirmed findings.
- Test injected, fetched, and newly written memory observations as separate evidence categories.
- Test absent-memory positive findings for small/simple sessions where prior context was unnecessary.
- Test SQLite access selection so existing claude-mem/context-mode/Bun runtime capabilities are preferred and a new core dependency is not required unless justified.
- Test Session Memory Observation attribution tiers for confirmed, likely, and needs-more-evidence cases, including the thirty-minute post-session attribution window.
- Test context-efficiency finding classification against fixtures for raw large output, repeated unbatched searches, context-mode used for code intelligence, and narrow context-mode database metadata reads that do not expose indexed chunks.
- Test code-intelligence finding classification against fixtures showing LSP-first navigation, ast-grep semantic matching, and memory recall verified against live files.
- Test subagent finding classification against fixtures for repeated status polling, async/foreground mismatch, no-edit worker handoff, and large inline output.
- Test setup finding classification for missing Bun, stale context-mode, manifest/lockfile/active-install/bundled-distribution drift, direct installed-dependency edits, and memory project env/manifest mismatch if setup helper code is modified.
- Test outcome-quality and verification-loop findings against fixtures where edits were made with and without proportional post-change checks, including docs-only planning edits where structural review is sufficient and generated/schema/reference changes where checks are expected.
- Test post-delivery correction-loop findings against fixtures where the user repeatedly corrects completed work versus normal iterative clarification.
- Test audit-quality correction loops where the user points out a missed evidence source, the report records the correction, and PRD/issues are updated before publication.
- Test complete-work detection for final answers, PR creation, explicit done/fixed/implemented claims, and implementation-complete handoffs.
- Test excessive-effort findings against fixtures with task-complexity hints, absolute guardrails, token/tool counts, and available guidance, including `small`, `medium`, `large`, and `unknown` task-complexity cases.
- Test relevant-code discovery wandering against fixtures with broad unrelated exploration versus direct domain-doc/LSP-guided discovery.
- Test compaction/handoff continuity against fixtures where decisions, terminology, blockers, or approvals are preserved or dropped.
- Test approval-boundary findings against fixtures for tracker mutation, destructive shell commands, installs/upgrades, and secrets/config changes with and without explicit approval.
- Test durable repo instruction handling so only low-risk reversible actions can rely on standing policy while risky actions require current-session approval.
- Test report redaction and provenance behavior against fixtures containing sensitive-looking values and evidence source metadata, including absolute-path avoidance, active package/tool-source provenance, MCP config/import source reporting, setup/version-state provenance, and home-directory prefix redaction/hashing.
- Test that raw observation/transcript content is not persisted in Markdown or JSON outputs by default.
- Test that Markdown reports use short redacted snippets or paraphrases for memory observation content and never dump full observations.
- Test that report provenance cites installed package versions and local docs/schema assumptions where available.
- Test low-redaction-confidence behavior so excerpts are withheld while metrics and provenance remain.
- Test SHA-256 evidence hashing for source file content and explicit excerpt text without storing raw transcript content in generated metadata.
- Test non-Firehorse repo audit behavior with explicit approval and optional report writing.
- Test optional JSON sidecar generation and ensure Markdown remains the primary human artifact and sidecars contain no raw excerpts.
- Test default audit-report gitignore behavior for generated `.md` and `.json` reports.
- Test heuristic signal confidence rules so uncorroborated text-only signals do not become `confirmed` findings.
- Test immutable report snapshot statuses and Issue Draft candidate rules, including Critical/High-leverage defaults and Watchlist repeat/explicit-request exceptions.
- Test that reports include a session learnings section when the baseline reveals new evidence-source requirements, source-priority changes, or issue-scope changes.
- Test deterministic finding fingerprint generation from category, normalized signal key, source project/session, and affected tool/family without embeddings or LLM-generated fingerprints.
- Test partial report behavior for incomplete evidence, including missing source lists and downgraded finding confidence.
- Test intentional-exception handling so justified broad memory, large outputs, polling, or async/foreground choices can be recorded without noisy findings.
- Test guidance/version drift handling against fixtures with installed tool version metadata and local skill guidance excerpts.
- Test subagent duplicate-work and conflicting-advice classification against parallel delegation fixtures.
- Test that reports include positive findings when sessions demonstrate effective batching, code intelligence, artifact routing, or verification behavior.
- Typecheck Pi extension changes when setup checks are updated.
- Keep Claude hook/setup script behavior covered by fixture tests where feasible if setup checks are changed there.
- Run `pnpm definitions:check` after generated mirrors are updated.
- Verify generated provider mirrors explicitly mention bounded local session log and memory/context database inspection.
- Run `pnpm typecheck` before implementation is considered complete.
- Produce one baseline Session Audit report before publishing the PRD issue set.

## Out of Scope

- Runtime telemetry, continuous monitoring, or automatic enforcement.
- A new Firehorse runtime, prompt loader, provider transport, autonomous execution loop, or generalized hook framework.
- Automatically disabling upstream memory injection before audit evidence stabilizes.
- Fixing or replacing memory retrieval APIs, compatibility aliases, injection defaults, or source-mixing behavior; PRD-0005 detects and reports these problems, while PRD-0006 or a separately approved upstream/tooling follow-up owns remediation.
- Broad home-directory scanning or unrelated-project transcript harvesting.
- Publishing raw transcripts by default.
- Automatic installation, upgrade, repair, or tracker mutation without user confirmation.
- Automatic Published Issue creation from audit findings.
- Merging Session Audit into `assess-codebase-health`.
- Replacing context-mode, pi-lens, pi-memory, claude-mem, or pi-subagents; Session Audit evaluates orchestration of those tools rather than owning their runtimes.
- A single numeric session quality score.
- Watchlist findings automatically becoming Issue Drafts.
- Publishing PRD #0005 before a baseline report exists.

## Verification Contract

<verification_contract>
<expected_behaviors>
<behavior>`horse-session-audit` is available in Pi and Claude provider surfaces.</behavior>
<behavior>The workflow discovers recent Session Evidence from known provider/session locations without broad home-directory scans.</behavior>
<behavior>For Pi sessions, the workflow treats Pi JSONL files under the cwd-encoded `~/.pi/agent/sessions/` directory as primary session-history evidence.</behavior>
<behavior>The workflow inspects the latest five main sessions or last seven days, including related subagent sessions as evidence without counting them as main sessions.</behavior>
<behavior>The workflow writes immutable timestamped Session Audit reports under the agreed audit-report convention as local review artifacts that are not committed or published without explicit approval.</behavior>
<behavior>Reports include frontmatter metadata, evidence-source priority, snapshot cutoff, summary, metrics, findings table, detailed findings, recommendations, session learnings, positive findings, redaction notes, and issue-draft candidates, with optional JSON sidecars for deterministic metrics and no raw excerpts.</behavior>
<behavior>Findings use stable identifiers, Codebase Health-style severity, status, evidence, recommendation, confidence, and optional Issue Draft links.</behavior>
<behavior>Memory, same-session memory observations, memory-quality issues, narrow context-mode database metrics, context efficiency, code intelligence, subagent, setup, outcome quality, post-delivery correction loops, excessive-effort signals, relevant-code discovery wandering, verification-loop, compaction/handoff, approval-boundary, privacy/redaction, and guidance-drift findings are all covered by the workflow instructions.</behavior>
<behavior>Setup remediation is suggested but not executed without user confirmation.</behavior>
<behavior>Issue Drafts, when created, live in a follow-up Planning Workspace linked back to the audit report.</behavior>
<behavior>Published Issues require explicit user approval.</behavior>
<behavior>Reports allow intentional exceptions with rationale and include positive findings when sessions demonstrate strong tool use.</behavior>
</expected_behaviors>
<required_artifacts>
<artifact>Canonical Workflow Definition File for `session-audit`.</artifact>
<artifact>Experimental deterministic Session Audit helper code for read-only evidence discovery, bounded memory-database inspection, metric extraction, redaction/provenance support, and candidate signal classification.</artifact>
<artifact>Audit report ignore policy, such as `docs/audits/session-audit/.gitignore`, so generated reports are local by default.</artifact>
<artifact>Generated Pi prompt mirror for `horse-session-audit`.</artifact>
<artifact>Generated Claude command mirror for `horse-session-audit`.</artifact>
<artifact>Updated generated manifests exposing the new workflow mirrors.</artifact>
<artifact>Updated setup guidance/checks for Bun recommendation, context-mode freshness, and manifest-backed memory project validation.</artifact>
<artifact>One baseline Session Audit report for this planning effort before PRD publication.</artifact>
<artifact>Follow-up Issue Drafts or issue candidates after the baseline report, if findings warrant them.</artifact>
</required_artifacts>
<acceptance_checks>
<check>`pnpm definitions:check` passes.</check>
<check>`pnpm typecheck` passes or documents package-level no-op equivalents.</check>
<check>Generated manifests include `horse-session-audit`.</check>
<check>The generated provider mirrors contain rendered instructions and do not require runtime loading.</check>
<check>The baseline report includes actual Pi JSONL session metadata for this planning session before using memory observations as corroborating evidence.</check>
<check>The baseline report includes the repeated over-budget memory injection evidence from this planning session.</check>
<check>The baseline report classifies findings with severity and confidence rather than raw transcript dumps.</check>
<check>The baseline report includes redaction notes, reproducibility metadata, and any intentional exceptions or states that none were identified.</check>
<check>The baseline report checks outcome quality and verification-loop coverage, not only token/tool efficiency.</check>
<check>No telemetry system, runtime monitor, automatic enforcement hook, broad private-log scanner, unrestricted memory-database audit, default symlink-widened discovery, top-level runtime-specific SQLite import, raw-content persistence, or first-slice Session Audit CLI is added.</check>
</acceptance_checks>
<dependencies>
<dependency>Existing Firehorse Definition Format v1 parser, validator, and projection generator.</dependency>
<dependency>Existing firehorse-core helper/export conventions for deterministic library code.</dependency>
<dependency>Existing Codebase Health Assessment Workflow decisions and finding vocabulary.</dependency>
<dependency>Existing Planning Workspace conventions for follow-up Issue Drafts.</dependency>
<dependency>Firehorse Setup Manifest and setup-check behavior.</dependency>
<dependency>Firehorse claude-mem preamble for scoped memory behavior.</dependency>
<dependency>Bundled context-mode, pi-lens, pi-agent-memory, claude-mem, and pi-subagents guidance.</dependency>
<dependency>Installed tool/package version metadata and local skill guidance available at audit time.</dependency>
</dependencies>
</verification_contract>

## Further Notes

The active planning session already provides baseline evidence: repeated `$CMEM firehorse` injections loaded about fifty observations and roughly fifteen to twenty thousand tokens per injection, while entries repeatedly mixed Firehorse/PRD-0005 observations with unrelated checkout, settlement, account-service, Finaro, production infrastructure, KH refund-block, and SEPA/settlement-cleanup work. Under this PRD's rules, that is a confirmed High-leverage memory finding and a likely cross-repo bleed/noise finding unless explicitly requested. Exact observation IDs, token counts, timestamps, and redaction/provenance notes belong in the immutable baseline Session Audit report rather than this PRD.

This PRD intentionally defers GitHub publication. The next step is to create the canonical `session-audit` Workflow and generate mirrors, then run one baseline Session Audit report and use that report to publish an evidence-backed issue set.
