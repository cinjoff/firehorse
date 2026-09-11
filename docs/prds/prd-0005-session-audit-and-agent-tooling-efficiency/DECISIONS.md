# Planning Decisions

## Source

These decisions were resolved in `ASK.md` during PRD-0005 planning. `ASK.md` remains the question-by-question source log; this file is the local Planning Workspace decision log that future work should read before implementing the PRD.

## Promotion status

- Promoted project-wide: D-147 records the narrow `firehorse/session-audit` helper-code boundary because it changes Firehorse's earlier instruction-first/no-runtime direction.
- PRD-local: report shape, finding thresholds, evidence windows, helper API details, memory database semantics, testing scope, and publication timing.
- Codebase-facing follow-up: helper API and memory-reader conventions should be reflected in `docs/codebase/` anchors if they become durable implementation conventions across workflows.

## Resolved decisions

### Product shape and scope

1. `session-audit` is a first-party Firehorse Workflow, not only a Skill.
2. Generated provider invocation is `horse-session-audit`.
3. Session Audit is an Assessment Workflow sibling to `assess-codebase-health`, not a mode inside Codebase Health.
4. Session Audit is post-hoc: it reviews completed or recent sessions and must not become a runtime monitor, hook, telemetry system, or enforcement layer.
5. Keep PRD-0005 local until one baseline Session Audit report exists; publish PRD/issues after concrete evidence validates thresholds.
6. Session Audit may create local Issue Draft candidates, but it does not automatically create Published Issues.

### Setup and dependency policy

7. Bun is strongly recommended for Pi users and should be reported with repair guidance, but it is not a hard setup blocker yet.
8. `firehorse-setup --check` should report stale context-mode and recommend `/ctx-upgrade`; it must not auto-upgrade without user intent.
9. The Firehorse Setup Manifest records the canonical memory project name and setup checks validate `FIREHORSE_PROJECT_NAME`, `PI_MEM_PROJECT`, and `CLAUDE_MEM_PROJECT` against it.
10. Setup remediation suggests required installs or repairs but executes them only after user confirmation.

### Tool responsibility boundaries

11. context-mode is the large-output, data-processing, and indexing layer; it is not the live code-intelligence layer.
12. pi-lens tools are the default live code-intelligence tools: `lsp_navigation`, `lsp_diagnostics`, and ast-grep.
13. pi-memory/claude-mem are prior-session knowledge and code-recall tools; recalled code facts must be verified against the live filesystem before edits.
14. Durable repo instructions count as approval only for low-risk reversible actions already covered by documented workflow policy; risky actions still need current-session approval.

### Subagent policy

15. Align with `pi-subagents`: prefer async subagents by default, using foreground only for immediate bounded calls where blocking is cheaper or simpler.
16. Repeated status polling is an efficiency finding by default, not an error.
17. Implementation workers assigned write tasks must either make needed edits or return `BLOCKED: reason`.
18. Large subagent output policy is nuanced: no artifact for short review-only work, inline output for concise findings needed immediately, and file-only artifacts for long reports, context builds, handoffs, logs, or outputs over roughly 10KB.
19. Parallel delegation should be checked for duplicate work, conflicting advice, and parent synthesis that ignores material disagreements.

### Evidence discovery and privacy

20. Session Audit discovers recent local session evidence from known provider/session locations, context-mode metadata, memory blocks, subagent run artifacts, command/test summaries, and user-provided paths or excerpts.
21. Default discovery inspects the latest five main sessions or the last seven days, whichever is smaller; related subagent sessions do not count against the main-session cap.
22. Discovery must not perform broad home-directory scans or follow symlinks by default.
23. Logs are scoped to the current repo, Firehorse Setup Manifest memory project, or current cwd where possible.
24. If local logs are missing, the workflow degrades gracefully using `ctx_stats`, pasted evidence, memory blocks, and user-provided paths.
25. Reports should include enough provenance for reproducibility without raw transcript dumps: session IDs or paths, source type, sampled/completeness status, tool/package versions where available, redaction notes, and evidence hashes where practical.
26. Redaction is best-effort and conservative; if redaction confidence is low, fail closed by omitting excerpts and recording “excerpt withheld due to redaction uncertainty.”

### Report model

27. Session Audit writes immutable per-run reports rather than one mutable current report.
28. Reports live under `docs/audits/session-audit/YYYY-MM-DD-HHMM-<repoName>.md` using local time in the filename to avoid same-day collisions.
29. Report frontmatter uses ISO UTC `generatedAt`, records timezone and source window, and includes repo/project, providers, evidence sources, and completeness.
30. Report body includes summary, metrics, findings table, detailed findings, recommendations, positive findings, and issue-draft candidates.
31. A machine-readable JSON sidecar is optional; Markdown remains the primary human artifact.
32. JSON sidecars contain metrics, hashes, redacted snippets only when redaction confidence is high, and withheld-excerpt markers; they must not contain raw excerpts.
33. A session-audit index file is optional later if multiple reports accumulate.
34. Reports are local review artifacts by default; committing or publishing them requires explicit approval because even redacted reports can reveal private paths, project names, or workflow behavior.

### Finding model and thresholds

35. Reuse Codebase Health-style findings where practical: stable ID/fingerprint, severity, evidence, recommendation, status, confidence, and optional Issue Draft link.
36. Severity values are `Critical`, `High-leverage`, and `Watchlist`; avoid `error` except for hard correctness or security risks.
37. Confidence values are `confirmed`, `likely`, and `needs-more-evidence`.
38. Immutable report snapshot statuses are `open`, `issue-draft-candidate`, `deferred`, `intentional-exception`, `positive`, and `needs-more-evidence`.
39. Snapshot statuses describe audit report state at generation time; follow-up Planning Workspaces track later evolution.
40. Critical and High-leverage findings may become Issue Draft candidates by default.
41. Watchlist findings do not become Issue Draft candidates by default unless repeated across multiple audits or explicitly requested.
42. Intentional exceptions can be recorded with a short rationale for justified broad memory, large output, polling, or async/foreground choices.
43. Reports include positive findings for good batching, scoped memory, LSP-first code intelligence, artifact routing, verification loops, and context savings.

### Outcome quality and effort

44. Session Audit measures outcome quality, not only tool efficiency.
45. A low-cost session that fails the request, misstates completed work, skips verification, loses decisions, leaks sensitive excerpts, or crosses approval boundaries is still a bad session.
46. Missing verification loops after edits are findings when diagnostics, typechecks, tests, or documented no-op equivalents are available and proportional.
47. Compaction and handoff continuity are audited for preservation of key decisions, terminology, blockers, approvals, and next steps.
48. User corrections after an agent presents work as complete are outcome-quality signals; healthy iterative clarification before completion is not penalized.
49. Work is considered presented complete after final answer, Pull Request creation, explicit “done/fixed/implemented” claims, or handoff text stating implementation is complete.
50. Token/tool usage is judged against task complexity; excessive effort is visible even when the final result is acceptable.
51. Complexity uses a coarse rubric: `small`, `medium`, `large`, or `unknown`.
52. Broad unrelated exploration, repeated wrong-path reads, or slow discovery of core logic can become a finding when domain docs, Codebase Maps, LSP, or ast-grep should have narrowed the search.

### Memory policy and semantics

53. Firehorse should detect/report broad initial memory injection before attempting to disable it.
54. Initial memory injection over three observations or over two percent of context is a finding.
55. Cross-repo memory in initial context is a finding unless the user explicitly requested cross-project comparison.
56. `get_observations` is compliant only after a scoped `search` or `timeline`, except when IDs were supplied directly by the user in current context.
57. Same-session pi-memory/claude-mem observations are bounded Session Evidence when attributable to the audited session.
58. Session Memory Observation attribution is `confirmed` for explicit session/run ID or pasted audited block, `likely` for repo/cwd plus memory project plus timestamp inside the audited session window or up to thirty minutes after session end, and `needs-more-evidence` for weak linkage.
59. The helper may read known pi-memory/claude-mem databases directly, but only through bounded read-only adapters filtered by canonical project, session/window attribution, and privacy rules.
60. Memory database reads are workflow-level opt-in and enabled by default with a clear preview of which bounded project/session rows will be inspected.
61. Preview may inspect database existence, schema compatibility, row counts, candidate windows, and paths; it must not read observation contents until after user approval.
62. Database path resolution priority is explicit helper options, environment/settings/Firehorse Setup Manifest, known defaults such as `CLAUDE_MEM_DATA_DIR` or `~/.claude-mem/claude-mem.db`, then skip with a completeness note.
63. The helper must never write to memory databases and should open them read-only where supported.
64. Only rows matching canonical project/repo and the audited session/run ID or audited timestamp window may be read; no broad “top relevant observations” helper search.
65. The helper reads matched observation contents, not just metadata, then redacts and minimizes report excerpts.
66. Raw matched observation content may be exposed in typed output for immediate reviewer use, but it must be marked sensitive and renderers must default to redacted or minimized snippets.
67. Raw observation/transcript content must not be persisted to disk by default; persisted Markdown/JSON uses redacted snippets, hashes, and withheld markers.
68. Memory observations are Session Evidence, not authoritative source of truth; code/result claims still need transcript, file, or test evidence.
69. Session Audit should flag memory-quality issues: inaccurate summaries, missed key outcomes, irrelevant observations, or cross-project observations.
70. Markdown reports may include only short redacted snippets or paraphrases of observation content, never full observation dumps.
71. Same-session memory analysis treats injected observations, fetched observations, and newly written observations separately.
72. Same-session memory analysis compares the expected memory project from Firehorse Setup Manifest and relevant environment variables against actual rows; rows whose content, project, or source contradict expected identity are findings.
73. Unknown memory observation types do not fail the audit; preserve the string, classify as `needs-more-evidence` where type matters, and include a schema-drift note.
74. Schema drift is usually an evidence-completeness note; it becomes a finding only when setup promised compatibility or drift degrades audit quality enough to affect conclusions.
75. Missing memory database access is usually an evidence-completeness gap, not a finding, unless setup promised memory integration and environment/manifest configuration is broken.
76. No memory use can be a positive context-efficiency finding for a small/simple session that did not need prior context.

### Context-mode database policy

77. The helper may read context-mode databases narrowly for stats/session metadata and per-session content-volume metrics.
78. The helper must not dump indexed document chunks from context-mode databases.
79. Reports cite installed package versions when available and cite local docs/schema assumptions, such as claude-mem documented tables/fields and observation type vocabulary.

### Helper architecture and API

80. Ship deterministic helper code for the parts that can be specified precisely: read-only evidence discovery, metric extraction, redaction/provenance support, bounded memory-database inspection, and candidate signal classification.
81. The minimum pre-baseline helper slice includes evidence discovery preview, report filename/frontmatter generation, redaction and hashing, memory/context database path resolution plus schema preview, and basic metric extraction from explicit pasted blocks/session logs.
82. Advanced finding classification can be deferred until after the baseline if the deterministic essentials are enough to validate the design.
83. Helper code lives under `packages/firehorse-core/src/session-audit/` and is exported as experimental `firehorse/session-audit`.
84. Generated Workflow instructions may invoke the helper through a temporary Node/Bun script importing `firehorse/session-audit`; v1 should not freeze a committed CLI UX.
85. The helper should prefer SQLite capabilities already available through installed claude-mem, context-mode, or Bun before adding a new `firehorse-core` SQLite dependency.
86. SQLite adapters must load optionally/dynamically; `firehorse-core` must not top-level import `bun:sqlite` or another runtime-specific SQLite module.
87. If no SQLite adapter is available, the helper returns an evidence-completeness gap instead of failing the audit.
88. Helper parsing uses deterministic metrics from structured fields where present and heuristic scanning only for candidate signals such as memory blocks, correction loops, approval language, and redaction patterns.
89. The helper should detect repeated same-session memory blocks from pasted transcript text, especially repeated `$CMEM firehorse` injections.
90. Heuristic-only signals are `likely` or `needs-more-evidence`, not `confirmed`, unless corroborated by structured evidence.
91. The helper may generate report data and suggested Markdown, but workflow instructions or explicit repo scripts own file writes.
92. Preview output is not persisted by default. If the audit proceeds, include a preview summary in final report provenance; if the user cancels after preview, write nothing unless explicitly requested.
93. The helper outputs candidate findings with category/severity/confidence defaults, but Workflow/agent review is required before publication.
94. Finding fingerprints are deterministic in v1: use category, normalized signal key, source project/session, and affected tool or tool family. Do not use embeddings or LLM-generated fingerprints.
95. Reports may be partial: use `completeness: partial`, list missing sources, and classify affected findings as `likely` or `needs-more-evidence`.
96. Session Audit is read-only and post-hoc; report generation does not require a clean git tree, though it may record git status metadata where relevant.
97. The v1 public API is `discoverSessionEvidence(options)`, `extractSessionMetrics(sources, options)`, `classifyCandidateFindings(metrics, options)`, `redactEvidenceText(text, options)`, and `renderSessionAuditReport(data)`.
98. V1 input support includes Pi JSONL/session logs, Claude logs best-effort, context-mode stats/session DB metadata best-effort, explicit pasted transcript or memory blocks, linked subagent artifacts, and bounded pi-memory/claude-mem database rows.
99. V1 does not support arbitrary chat exports or broad filesystem transcript search.
100.  No CLI in the first slice; add one later only if the baseline report shows repeated manual friction.
101.  Thresholds are configurable through helper options in v1, not through a project config file.
102.  The helper enforces hard caps for sessions, rows, bytes, and snippets; when caps are exceeded, it samples and marks completeness as partial. Suggested defaults are latest five main sessions or seven days, max 200 memory rows, max 20 snippets, and max 2KB per redacted snippet before truncation.

### Publication and implementation sequence

103. Run one baseline `session-audit` report against this planning session before publishing PRD-0005.
104. The baseline should wait for a minimal helper slice with real discovery, metrics, and redaction primitives so it validates the design instead of becoming a purely manual report.
105. The baseline scope includes current session evidence plus discovered recent logs for the latest five main sessions or last seven days.
106. Use this live PRD-0005 grilling/planning session as the primary baseline case because it has repeated memory injections, documentation edits, decision capture, correction loops, and evolving memory relevance.
107. The baseline report should include a small timeline of pasted `$CMEM firehorse` blocks with timestamp, observation count, token count/range, approximate relevance, and representative relevant/unrelated IDs.
108. The workflow can be defined from resolved decisions before the baseline report; the baseline validates and tunes thresholds before publishing issues.
109. Implementation sequence: finish decisions, draft PRD, create canonical `session-audit` Workflow definition, add helper API, generate/check mirrors, run the baseline report, then publish the issue set.
110. Follow-up Issue Drafts from Session Audit findings live in a follow-up Planning Workspace such as `docs/prds/prd-000N-session-audit-followups/` and link back to the audit report.
111. Generated provider mirrors should explicitly tell users that `horse-session-audit` may inspect bounded local session logs and memory/context databases.
112. Generated audit reports should be ignored by default via `docs/audits/session-audit/.gitignore`; committing a redacted report requires explicit user approval and `git add -f`.
113. Helper tests use fixture SQLite databases matching documented claude-mem/pi-memory schema such as `sdk_sessions`, `user_prompts`, `observations`, and `session_summaries`; tests must not depend on local user databases.

### Manual baseline learnings

114. Pi JSONL session files are the primary evidence source for Pi Session Audit. Memory observations and pasted `$CMEM` blocks are corroborating evidence and cannot substitute for actual session history.
115. Session Audit must distinguish direct evidence from derived echoes. A `$CMEM` string inside an audit report, indexed search result, tool result, or generated artifact is not itself a fresh memory injection.
116. Active-session audits require a snapshot cutoff: session file or ID, last entry timestamp, entry count, byte size, and a source hash where practical. Later writes or memory injections are outside the immutable report unless the user requests a refreshed audit.
117. Same-session memory observations about the audit are feedback-loop evidence. They prove what memory learned during the audit, but they do not independently validate the findings they summarize.
118. User correction of an audit's missed primary evidence source is itself an audit-quality finding and must be reflected back into the PRD and issue drafts before publication.
119. The manual pre-helper baseline validates the evidence model and issue revisions, but the helper-backed baseline remains the implementation target before GitHub publication unless the maintainer explicitly supersedes that gate.
120. Memory package/tool provenance is part of the evidence model. The active memory surface can come from Firehorse's bundled `pi-agent-memory` package, Firehorse-bundled `claude-mem`, a user/global install, or a self-adapted MCP surface such as `plugin_claude-mem_mcp-search`; audits should report the active package/tool/config source before recommending setup remediation.
121. Cross-project memory bleed is not necessarily caused by duplicate package installs. The manual baseline found Firehorse-bundled memory packages and a self-adapted MCP surface while unrelated bank-transfer/Finaro observations still appeared in the Firehorse memory context; the active injection path must be verified before assigning root cause.
122. Memory-quality checks must compare content domain, source session, files, platform source, expected task scope, and active memory surface, not only project name, because same-project rows can still be unrelated to the audited session.
123. Setup/version findings require install-source provenance. Session Audit should compare latest available version, manifests, lockfiles, active installed modules, bundled distribution metadata, and repo/worktree scope before declaring remediation complete.
124. Direct edits to installed dependencies such as `node_modules` are ephemeral remediation risks; audits should flag them as setup/approval findings unless they are represented by an upstream release, package-manager patch, or explicitly approved patch workflow.
125. Post-cutoff remediation facts can be reported as follow-up evidence, but they must not mutate immutable snapshot findings.
126. Injected memory wrapper guidance is separate evidence from stored observation content. Session Audit should compare headers/footers, tool names, and usage instructions against the active Firehorse tool surface and official docs available at audit time.
127. Repeated memory blocks require event/observation separation. A repeated `$CMEM` block with the same IDs and token counts is a new injection event, but not independent evidence for the same underlying observations.
128. PRD-0005 owns memory evidence detection, attribution, provenance, stale-guidance classification, and report/issue-routing only. Replacing `pi-mem`, changing memory injection defaults, repairing `get_observations`/alias behavior, or fixing source-mixing belongs to PRD-0006 or a separately approved upstream/tooling follow-up.
