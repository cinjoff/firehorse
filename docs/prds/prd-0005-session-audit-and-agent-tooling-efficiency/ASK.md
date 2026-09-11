# ASK: Session Audit and Agent Tooling Efficiency

Status: Draft  
Date: 2026-05-20

Use this file to resolve decisions in batches after reviewing `context/RESEARCH.md`.

## Batch A — setup and dependency policy

1. Should Bun be a hard Firehorse setup requirement for Pi users, or a strongly recommended dependency with a warning/repair path?
   - Resolved: strongly recommended in `--check`, with repair instructions in full setup, not hard-blocking until we see failures without it.
2. Should `firehorse-setup` check context-mode version freshness and recommend `/ctx-upgrade` when outdated?
   - Resolved: yes, read-only warning in `--check`; never auto-upgrade without user intent.
3. Should setup verify `FIREHORSE_PROJECT_NAME`, `PI_MEM_PROJECT`, and `CLAUDE_MEM_PROJECT` all equal repoName?
   - Resolved: yes. The canonical memory project name should be recorded in the Firehorse Setup Manifest and reused to validate these environment variables, so setup checks do not rely on worktree paths or repeated inference.

## Batch B — memory policy

1. Should Firehorse attempt to disable broad initial pi-memory injection, or only detect/report it in Session Audit?
   - Resolved: detect/report first; open upstream/tooling issues for configurable injection limits after audit evidence is stable.
2. What is the acceptable initial memory budget?
   - Resolved: max 3 observations and max 2% of context; exceeding either threshold is a finding.
3. Should cross-repo memory in initial context be treated as an error by default?
   - Resolved: yes, unless the user explicitly requested cross-project comparison.
4. Should `get_observations` be considered compliant only after a scoped `search` or `timeline`?
   - Resolved: yes; allow exceptions only when the IDs are already present in current user-provided context.

## Batch C — tool responsibility boundaries

1. Should Session Audit classify context-mode as a large-output/data-processing layer, not a code-intelligence layer?
   - Resolved: yes. context-mode is the large-output/data-processing/indexing layer, not the live code-intelligence layer.
2. Should pi-lens be the default for live code intelligence and diagnostics?
   - Resolved: yes. `lsp_navigation`, `lsp_diagnostics`, and ast-grep should handle current-code semantic tasks.
3. Should pi-memory smart tools be treated as prior-session/code-recall tools rather than authoritative current-code tools?
   - Resolved: yes. pi-memory is for prior-session knowledge/code recall; verify recalled code facts against the live filesystem before edits.

## Batch D — subagent policy

1. Should Firehorse canonical agents prefer foreground subagents by default?
   - Resolved: no. Align with `pi-subagents`: prefer async by default. Use foreground only for truly immediate, bounded calls where blocking is cheaper or simpler.
2. What should trigger a status-polling-loop finding?
   - Resolved: repeated status polling is an efficiency finding, not an error severity by default. The audit should look for ways to reduce polling frequency, end the turn while waiting, use completion events, or use control notifications more efficiently.
3. Should implementation workers be required to either edit files or return `BLOCKED: reason`?
   - Resolved: yes.
4. Should large subagent outputs default to `outputMode: "file-only"`?
   - Resolved: no blanket default. Use `output: false` for short review-only subagents where no artifact is needed; use inline output for concise findings the parent must immediately synthesize; use `output: "<path>"` plus `outputMode: "file-only"` for long reports, research/context builds, handoffs, logs, or expected outputs over roughly 10KB.

## Batch E — product shape

1. Should Session Audit be a Skill only, or also a Workflow that can create issues from findings?
   - Resolved: Session Audit is a Workflow because it is a user-facing end-to-end capability. It may reference supporting skills or templates, but the canonical Firehorse surface should be a Workflow.
2. Where should audit outputs live?
   - Resolved: Session Audit belongs to the same assessment-workflow family as `assess-codebase-health`, but remains a sibling workflow rather than a mode inside it. Reusable audit runs should write under `docs/audits/session-audit/YYYY-MM-DD-HHMM-<repoName>.md`; PRD research stays under `docs/prds/`.
3. Should this research become PRD #0005 and be published to GitHub Issues now?
   - Resolved: keep local until one baseline Session Audit report is generated, then publish the PRD/issue set with concrete evidence and thresholds.
4. How should Session Audit relate to Codebase Health findings and issue drafts?
   - Resolved: reuse the Codebase Health report/finding/issue-draft pattern where it fits. Session Audit findings may feed Codebase Health or local Issue Drafts when they identify durable repo setup or workflow-health problems, but the session evidence report remains separate.

## Batch F — report model

1. Should Session Audit write immutable run reports or maintain one current report?
   - Resolved: write immutable per-run reports, not a single mutable `health.md` equivalent. Sessions are evidence snapshots.
2. Should Session Audit maintain an index file?
   - Resolved: optional later. Add `docs/audits/session-audit/README.md` only if multiple reports accumulate; not required for v1.
3. What finding model should Session Audit use?
   - Resolved: reuse Codebase Health-style findings where practical: stable finding ID/fingerprint, severity, evidence, recommendation, status, and optional Issue Draft link.
4. What severity vocabulary should Session Audit use?
   - Resolved: use `Critical`, `High-leverage`, and `Watchlist`, matching Codebase Health. Avoid `error` language except for hard correctness or security risks.

## Batch G — audit inputs and privacy boundary

1. What input sources should Session Audit use?
   - Resolved: Session Audit should discover recent local session logs itself and combine them with `ctx_stats`, memory injection blocks, subagent status/control summaries, command/test summaries, and any user-provided transcript excerpts or log paths.
2. Should Session Audit automatically scan private Pi/Claude session logs?
   - Resolved: yes for recent local session logs within known provider/session locations, as read-only evidence discovery. It should not publish raw transcript content by default, and broad home-directory or unrelated-project scans require explicit user approval.
3. What evidence metadata should Session Audit record?
   - Resolved: each report records evidence source, timestamp, repo/project name, provider/orchestrator if known, and whether evidence was complete or sampled.
4. How should Session Audit express evidence completeness?
   - Resolved: findings must state confidence: `confirmed`, `likely`, or `needs-more-evidence`.

## Batch H — session log discovery rules

1. What discovery scope should Session Audit use?
   - Resolved: search known local provider/session locations only, such as Pi session directories, Claude session directories, context-mode stats/session databases, and subagent run artifacts. Do not perform broad home-directory scans.
2. What default recency window should Session Audit use?
   - Resolved: inspect the latest 5 main sessions or the last 7 days, whichever is smaller. Subagent sessions are included as related evidence when discovered from those main sessions, but they do not count toward the 5-main-session cap.
3. How should Session Audit scope logs to the current project?
   - Resolved: prefer logs whose path or metadata matches the current repo, the Firehorse Setup Manifest memory project, or the current cwd. Unscoped logs are sampled only if clearly recent and likely related.
4. How should Session Audit balance content minimization with deep understanding?
   - Resolved: parse logs with context-mode/file processing and report metrics plus short evidence excerpts rather than raw transcript dumps, but unfold and inspect enough transcript detail to understand causes and avoid lazy surface-level metrics.
5. What should happen when local logs are missing?
   - Resolved: degrade gracefully by using `ctx_stats`, pasted evidence, memory blocks, and user-provided paths; ask the user for paths only when local discovery cannot find enough evidence.

## Batch I — finding categories and thresholds

1. What memory findings should Session Audit detect?
   - Resolved: detect initial memory injection over budget (>3 observations or >2% context), cross-repo memory bleed in initial context, and unscoped detail fetches where `get_observations` was used without prior scoped `search` or `timeline`. Allow exceptions when IDs were supplied directly by the user in current context.
2. What context efficiency findings should Session Audit detect?
   - Resolved: detect raw large-output tool use instead of context-mode, underuse of `ctx_batch_execute` for many related commands/searches, and context-mode use for live code intelligence rather than data processing/indexing.
3. What code intelligence findings should Session Audit detect?
   - Resolved: lead with `lsp_navigation` for live code intelligence, with `lsp_diagnostics` for diagnostics and ast-grep for semantic pattern search/replacement. Use claude-mem/pi-memory according to the Firehorse memory preamble: scoped project identity, small prior-context checks, `search`/`timeline` before `get_observations`, and smart code tools only as scoped exploration/recall that must be verified against live files before edits. context-mode remains for large files, command/test/log output, indexing, and data processing, not code intelligence.
4. What subagent findings should Session Audit detect?
   - Resolved: detect repeated status polling as an efficiency improvement opportunity, async/foreground mismatch, implementation workers assigned write tasks that return advice without making needed edits or returning `BLOCKED: reason`, and large output returned inline when an artifact/file-only mode would have been better.
5. What setup findings should Session Audit detect?
   - Resolved: detect missing/stale Bun, stale context-mode, and missing or mismatched Firehorse memory project env vars vs the Firehorse Setup Manifest. Setup remediation should suggest required installs or repairs, but execute them only after user confirmation.

## Batch J — artifact contract and issue draft location

1. What should the canonical workflow ID be?
   - Resolved: canonical workflow ID is `session-audit`; generated provider invocation is `horse-session-audit`.
2. What report filename should Session Audit use?
   - Resolved: write reports as `docs/audits/session-audit/YYYY-MM-DD-HHMM-<repoName>.md` to avoid same-day collisions.
3. What structure should a Session Audit report use?
   - Resolved: frontmatter with repo/project, provider(s), session window, evidence sources, completeness, and generated timestamp; then summary, metrics, findings table, detailed findings, recommendations, and issue-draft candidates.
4. Where should Session Audit issue drafts live?
   - Resolved: follow the Codebase Health pattern. If Session Audit creates Issue Drafts, create a Planning Workspace for the follow-up under `docs/prds/prd-000N-session-audit-followups/`, link back to the audit report, and store issue drafts there.
5. Should Session Audit publish tracker issues automatically?
   - Resolved: no. Reports may propose Issue Drafts; Published Issues require explicit user approval.

## Batch K — baseline audit and implementation next step

1. Should a baseline Session Audit report exist before publishing PRD #0005?
   - Resolved: yes. Run one baseline `session-audit` report against this active planning session before publishing PRD #0005.
2. What should the baseline audit scope include?
   - Resolved: use current session evidence plus discovered recent logs for the latest 5 main sessions or last 7 days, including the repeated `$CMEM` injection blocks as primary evidence.
3. What implementation sequence should this PRD follow?
   - Resolved: finish PRD/ASK decisions; draft `PRD.md`; create canonical `session-audit` Workflow definition; generate and check mirrors; run the baseline audit report; then publish the issue set.
4. Should the baseline report block the workflow definition?
   - Resolved: no. The workflow can be defined from resolved decisions first; the baseline report validates and tunes thresholds before publishing issues.

## Batch L — audit blind spots and quality guardrails

1. Should Session Audit measure outcome quality, or only tool efficiency?
   - Resolved: include outcome quality. A low-cost session that fails the user request, misstates completed work, or leaves unverified regressions is still a poor session.
2. Should Session Audit flag missing verification loops after edits?
   - Resolved: yes, when diagnostics, typechecks, tests, or documented no-op equivalents are available and proportional to the change.
3. Should compaction and handoff continuity be audited?
   - Resolved: yes. Audit should detect whether summaries preserve key decisions, terminology, blockers, approvals, and next steps across compaction/resume/handoff boundaries.
4. Should approval-boundary risks be part of the finding taxonomy?
   - Resolved: yes. Tracker mutation, installs/upgrades, destructive shell commands, force pushes, secrets/config changes, setup repairs, and similar side effects require clear user approval.
5. Should reports run a privacy/redaction pass before publishing excerpts?
   - Resolved: yes. Prefer paraphrased or short evidence, and redact tokens, credentials, customer data, account identifiers, emails, environment variables, and sensitive infrastructure names where practical.
6. What provenance should report evidence include?
   - Resolved: enough reproducibility metadata to trust findings without raw transcript dumps: session IDs or paths, generated timestamp, source type, sampled/completeness status, tool/package versions where available, redaction notes, and evidence hashes where practical.
7. Should Session Audit support intentional exceptions?
   - Resolved: yes. Reports may mark justified broad memory, large output, polling, or async/foreground choices as intentional exceptions with a short rationale.
8. Should Session Audit compare against current installed tool guidance?
   - Resolved: yes. Prefer installed tool versions and local skill guidance where available, and note guidance/version drift when using external docs or remembered policy.
9. Should duplicate or conflicting subagent work be detected?
   - Resolved: yes. Parallel delegation should be checked for duplicate research, conflicting advice, and parent synthesis that ignores material disagreements.
10. Should reports include positive findings?

- Resolved: yes. Include positive findings for strong batching, scoped memory, LSP-first navigation, artifact routing, verification loops, and context savings so the audit reinforces good behavior.

11. Should user correction after delivery be treated as an outcome-quality signal?

- Resolved: yes. Repeated corrections after an agent presents work as complete should be treated as a signal that requirements, code behavior, or final-answer accuracy may have been misunderstood.

12. Should token/tool usage be judged against the amount of work achieved?

- Resolved: yes. Excessive tokens or tool calls relative to task complexity should be visible even when the final result is acceptable.

13. Should wandering before finding relevant code be audited?

- Resolved: yes. Broad unrelated reads/searches, repeated wrong-path exploration, or slow discovery of core logic should become a finding when better domain docs, codebase maps, LSP, or ast-grep could have narrowed the search.

14. Where should exact live memory-injection evidence live?

- Resolved: keep exact counts, observation IDs, timestamps, and hashes in immutable Session Audit reports. PRDs should use stable ranges/summaries because live memory injection changes as the session continues.

## Batch M — correction loops and excessive effort

1. Should user correction after delivery be treated as an outcome-quality signal?
   - Resolved: yes. Repeated corrections after an agent presents work as complete should be treated as a signal that requirements, code behavior, or final-answer accuracy may have been misunderstood.
2. Should token/tool usage be judged against the amount of work achieved?
   - Resolved: yes. Excessive tokens or tool calls relative to task complexity should be visible even when the final result is acceptable.
3. Should wandering before finding relevant code be audited?
   - Resolved: yes. Broad unrelated reads/searches, repeated wrong-path exploration, or slow discovery of core logic should become a finding when better domain docs, codebase maps, LSP, or ast-grep could have narrowed the search.

## Batch N — helper code and provider parity

1. Should v1 ship analyzer/helper code, or remain instruction-only?
   - Resolved: ship deterministic helper code for the parts that can be specified precisely, including read-only evidence discovery, metric extraction, redaction/provenance support, and candidate signal classification. The Workflow remains responsible for qualitative judgement and report synthesis.
2. Should Session Audit cover Pi and Claude equally in v1?
   - Resolved: expose the workflow in both Pi and Claude, but make Pi evidence support richer in v1 and Claude evidence support best-effort until Claude session evidence has been validated.
3. Should excessive effort be a finding category or only supporting evidence?
   - Resolved: make excessive effort a finding category, defaulting to Watchlist unless paired with poor outcome, skipped verification, or repeated correction loops.
4. Should user correction loops include normal collaboration?
   - Resolved: no. Count corrections after the agent presents work as complete or repeatedly misses already-stated constraints; do not penalize healthy iterative discovery or changing requirements.
5. Should code-discovery wandering trigger repository documentation or codebase-map recommendations?
   - Resolved: yes. Recommend domain-doc, codebase-map, test/example, or LSP/ast-grep workflow guidance improvements depending on the cause.

## Batch O — helper architecture and ADR

1. Where should analyzer/helper code live?
   - Resolved: under `packages/firehorse-core/src/session-audit/`, exported as `firehorse/session-audit`, because evidence discovery and metric extraction are provider-neutral helper logic.
2. Should helper code write reports, or only return structured data?
   - Resolved: helper code may generate report data and suggested Markdown, but repo scripts/workflow instructions own file writes so writes remain explicit and user-visible.
3. Should helper code read private session logs automatically?
   - Resolved: yes, but only from known provider/session locations, read-only, bounded by latest-five/last-seven-days, and with path previews in the report.
4. Should helper code implement redaction deterministically?
   - Resolved: yes, using conservative pattern-based redaction plus report notes that redaction is best-effort.
5. Should helper output include candidate findings or only raw metrics?
   - Resolved: include candidate findings with category/severity/confidence defaults, but require Workflow/agent review before publication.
6. Should exact live `$CMEM` evidence be preserved as pasted excerpts in the baseline report?
   - Resolved: preserve short redacted excerpts plus exact metadata/counts, not full blocks.
7. Should Session Audit create GitHub issues from findings in v1?
   - Resolved: no automatic publishing. It can create Issue Draft candidates; Published Issues require explicit approval.
8. Does adding helper code require a Project Decision entry?
   - Resolved: yes. This changes the earlier instruction-first direction and records the trade-off between deterministic repeatability and avoiding runtime-like code.

## Batch P — helper-code contract

1. What should the helper's public API shape be?
   - Resolved: expose a small v1 API: `discoverSessionEvidence(options)`, `extractSessionMetrics(sources, options)`, `classifyCandidateFindings(metrics, options)`, `redactEvidenceText(text, options)`, and `renderSessionAuditReport(data)`.
2. What input formats must the helper support in v1?
   - Resolved: support discoverable Pi JSONL/session logs, Claude JSONL/session logs best-effort, context-mode stats/session DB metadata best-effort, explicit pasted transcript or memory blocks, and subagent run artifacts linked from main session logs. Do not support arbitrary chat exports or broad filesystem transcript search in v1.
3. Should helper parsing be deep or heuristic?
   - Resolved: use deterministic metrics from structured tool-call fields where present; use heuristic text scanning only for candidate signals like memory blocks, correction loops, approval language, and redaction. Heuristic-only signals should be `likely` or `needs-more-evidence`, not `confirmed`, unless corroborated by structured evidence.
4. Should helper estimate task complexity?
   - Resolved: yes, with a coarse rubric: `small` for docs-only or one narrow file/edit, `medium` for multiple files/tests or moderate debugging, `large` for cross-package, architecture, release, migration, or long-running diagnosis work, and `unknown` when evidence is insufficient.
5. Should helper hash evidence sources?
   - Resolved: yes. SHA-256 source file content or explicit excerpt text after reading, store the hash in report metadata, and do not store full raw content.
6. Should helper expose a CLI now?
   - Resolved: no CLI in the first slice. Start with the library API and add a CLI later only if the baseline report shows repeated manual friction.
7. Should pi-memory/claude-mem observations from audited sessions be incorporated?
   - Resolved: yes. Include attributable same-session memory observations as bounded Session Evidence to compare what memory injected, fetched, and later recorded. Keep lookup project-scoped, bounded to the audited session window, and redacted like transcript evidence.

## Batch Q — publication, sidecars, and safety boundaries

1. Are Session Audit reports committed by default?
   - Resolved: no. Reports are local review artifacts under `docs/audits/session-audit/`; committing or publishing them requires explicit approval because even redacted reports may reveal private paths, project names, or workflow behavior.
2. Should there be a machine-readable sidecar?
   - Resolved: yes, optional. The helper may generate a JSON sidecar next to the Markdown report for deterministic metrics and future diffing, while Markdown remains the primary human artifact.
3. How should same-session memory observations be attributed?
   - Resolved: use confidence tiers. `confirmed` requires explicit session ID, run ID, or pasted block from the audited session. `likely` can use repo/cwd plus memory project plus timestamp inside the audited window. `needs-more-evidence` covers project matches with weak timestamp/session linkage. Weak attribution must not create confirmed findings.
4. Should helper follow symlinks while discovering session evidence?
   - Resolved: no by default. Discovery should scan allowlisted known provider/session directories and explicit user-provided paths only, because symlink following can widen into unrelated private directories.
5. What counts as work presented as complete for correction-loop detection?
   - Resolved: final answer, Pull Request creation, explicit “done/fixed/implemented” claims, or handoff text stating implementation is complete. Corrections before that are normal collaboration unless the agent repeatedly ignored already-stated constraints.
6. Should durable repo instructions count as approval for risky actions?
   - Resolved: only for low-risk reversible actions already covered by documented workflow policy. Destructive shell commands, installs/upgrades, force pushes, tracker publication, environment/config repairs, and secrets handling still require current-session approval.
7. What should happen if redaction confidence is low?
   - Resolved: fail closed. Include metrics/provenance, omit the excerpt, and add “excerpt withheld due to redaction uncertainty.”
8. Should the `firehorse/session-audit` helper API be marked experimental?
   - Resolved: yes. Export it as experimental until the baseline report and first implementation slices validate the data model.

## Batch R — memory retrieval and report lifecycle

1. Should `firehorse-core` helper read claude-mem/pi-mem databases directly?
   - Resolved: yes. The helper should read known pi-memory/claude-mem databases directly when available, but only through bounded read-only adapters that filter by project, session/window attribution, and privacy rules. It must not perform unrestricted memory-database audits.
2. What attribution window should count as same-session memory?
   - Resolved: exact session/run ID always counts; otherwise use timestamp between session start and 30 minutes after session end plus repo/cwd/memory-project match.
3. Should immutable reports have lifecycle statuses?
   - Resolved: yes, but statuses are snapshot statuses at generation time, not mutable workflow state. Use `open`, `issue-draft-candidate`, `deferred`, `intentional-exception`, `positive`, and `needs-more-evidence`.
4. Which Session Audit findings become Issue Draft candidates?
   - Resolved: Critical and High-leverage findings may become candidates; Watchlist findings do not by default unless repeated across multiple audits or explicitly requested.
5. Should thresholds be configurable in v1?
   - Resolved: helper options yes, config file no. Ship defaults in core and allow callers/tests/workflow to override thresholds. Add project config later only if repeated need appears.
6. What timestamp convention should reports use?
   - Resolved: frontmatter uses ISO UTC `generatedAt`; filename uses local time per existing PRD convention; frontmatter records timezone and source window.
7. Should JSON sidecars include excerpts?
   - Resolved: no raw excerpts. JSON sidecars contain metrics, hashes, redacted snippets only when redaction confidence is high, and excerpt-withheld markers otherwise.

## Batch S — direct memory database reader boundaries

1. Should Firehorse add a new SQLite dependency to `firehorse-core`?
   - Resolved: not by default. The implementation should first use SQLite capabilities already available through the installed claude-mem/context-mode/Bun environment. Add a new dependency only if the implementation proves the existing runtime facilities cannot provide deterministic read-only access.
2. Should memory database readers be schema-tolerant?
   - Resolved: yes, but not schema-guessing. Use the documented claude-mem/pi-memory schema and observation type vocabulary as the contract, inspect live tables/columns to verify compatibility, and degrade gracefully if the installed schema has drifted.
3. Should database paths be hardcoded?
   - Resolved: no. Use explicit helper options first, then environment/settings/Firehorse Setup Manifest where applicable, then known defaults such as `CLAUDE_MEM_DATA_DIR` or `~/.claude-mem/claude-mem.db`; if not found, skip with a completeness note.
4. Should memory database reads be opt-in?
   - Resolved: yes at workflow level, enabled by default with a clear preview. Session Audit should say which bounded project/session rows it will inspect before reading memory databases.
5. Should helper ever write to memory databases?
   - Resolved: no. Strict read-only; open databases in read-only mode where supported.
6. What rows may be read from memory databases?
   - Resolved: only rows matching canonical memory project/repo and either audited session/run ID or the audited timestamp window from session start through thirty minutes after session end. No broad “top relevant observations” database search in the helper.
7. Should database reader include observation contents or only metadata?
   - Resolved: read observation contents for matched bounded rows, not just metadata. Use documented fields such as title/subtitle/narrative/facts/concepts/type/files/session summaries where available, then redact and minimize excerpts in reports.
8. Should missing database access be a finding?
   - Resolved: usually no. Mark it as an evidence completeness gap, unless setup promised memory integration and environment/manifest configuration is broken.

## Batch T — memory and context database semantics

1. Should memory database observations be treated as authoritative evidence?
   - Resolved: no. Treat them as Session Evidence, not source of truth. They reveal what memory captured, injected, or fetched, but code/result claims still need transcript, file, or test evidence.
2. Should Session Audit flag “memory learned the wrong thing”?
   - Resolved: yes. If the memory database records an inaccurate session summary, misses the key outcome, or stores irrelevant/cross-project observations, that is a memory-quality finding.
3. Should observation content appear in Markdown reports?
   - Resolved: yes, but only as short redacted snippets or paraphrases. The helper may read full matched observation content, but reports must not dump full observations.
4. Should the helper read context-mode databases directly too?
   - Resolved: yes, narrowly. Read stats/session metadata and per-session content-volume metrics where available; do not dump indexed document chunks.
5. Should the report cite the database schema or guidance version used?
   - Resolved: yes. Record installed package version when available and cite local docs/schema assumptions, such as claude-mem documented tables/fields and observation type vocabulary.
6. Should unknown memory observation types fail the audit?
   - Resolved: no. Preserve unknown type strings, classify as `needs-more-evidence` where type matters, and include a schema-drift note.
7. Should same-session memory analysis include injected, fetched, and newly written observations?
   - Resolved: yes. Injected observations show what prior context influenced the session; fetched observations show what details the agent pulled in; newly written observations show what the memory layer learned from the session.
8. Should “memory was absent” ever be positive?
   - Resolved: yes. If the session was small/simple and did not need prior context, no memory use can be a positive context-efficiency finding rather than a gap.

## Batch U — implementation slicing and preview flow

1. Should the baseline audit wait for the helper API?
   - Resolved: yes, but only a minimal helper slice. The baseline should use real discovery, metrics, and redaction primitives so it validates the design rather than becoming a purely manual report.
2. Should helper tests use real local databases?
   - Resolved: no. Use fixture SQLite databases matching the documented claude-mem/pi-memory schema. Real local databases may be used for the manual baseline report only and must never be committed as tests.
3. Should the helper expose raw matched observation content to callers?
   - Resolved: yes in typed output, but mark it sensitive. Renderers must default to redacted or minimized snippets.
4. Should Session Audit support a dry-run or preview phase?
   - Resolved: yes. First show evidence sources, database paths, session window, row counts, and privacy caveats; continue only after user approval.
5. Should generated provider mirrors mention direct database access explicitly?
   - Resolved: yes. Users should know `horse-session-audit` may inspect bounded local session logs and memory/context databases.
6. Should the baseline report include this live grilling session as the primary case?
   - Resolved: yes. It has rich evidence: repeated memory injections, docs edits, decisions, correction loops, and evolving memory relevance.
7. Should same-session memory analysis compare expected memory project against actual rows?
   - Resolved: yes. Use Firehorse Setup Manifest and environment variables as expected project identity, then flag rows whose content, project, or source contradicts that expected identity.

## Batch V — final helper/runtime boundaries

1. Should SQLite access be optional/dynamic to preserve Node compatibility?
   - Resolved: yes. `firehorse-core` must not top-level import `bun:sqlite` or any runtime-specific SQLite module. Use optional/dynamic adapters and return an evidence-completeness gap if unavailable.
2. Should preview read row contents?
   - Resolved: no. Preview may inspect database existence, schema compatibility, row counts, candidate windows, and paths. It should read observation contents only after approval.
3. Should audit reports be git-ignored by default?
   - Resolved: yes. Use or create `docs/audits/session-audit/.gitignore` that ignores generated `.md` and `.json` reports by default, with explicit `git add -f` only when the user approves committing a redacted report.
4. Should helper enforce hard read caps?
   - Resolved: yes. Cap rows, bytes, excerpts, and session count; if exceeded, sample and mark completeness as partial. Suggested defaults: latest 5 main sessions or 7 days, max 200 memory rows, max 20 snippets, and max 2KB per redacted snippet before truncation.
5. Should helper persist raw observation/transcript content anywhere?
   - Resolved: no. Raw matched content may exist in process memory and sensitive typed output for immediate review, but persisted Markdown/JSON defaults to redacted snippets, hashes, and withheld markers.
6. Should baseline show memory relevance evolving over the grilling session?
   - Resolved: yes. Include a small timeline of pasted `$CMEM firehorse` blocks with timestamp, observation count, token count or range, approximate relevance, and representative unrelated/relevant IDs.
7. Should database reader use documented schema fixtures?
   - Resolved: yes. Create fixture SQLite databases matching documented claude-mem/pi-memory tables such as `sdk_sessions`, `user_prompts`, `observations`, and `session_summaries`, plus documented observation fields/types. Tests must not depend on local user databases.
8. Should schema drift become its own finding?
   - Resolved: only if setup promised compatibility. Otherwise it is an evidence-completeness note; if the installed database schema contradicts documented local docs enough to degrade audit quality, classify as `needs-more-evidence`.

## Batch W — minimum helper slice

1. What is the minimum helper slice before the baseline?
   - Resolved: implement only deterministic essentials first: evidence discovery preview, report filename/frontmatter generation, redaction and hashing, memory/context database path resolution plus schema preview, and basic metric extraction from explicit pasted blocks/session logs. Advanced finding classification can be deferred until after the baseline if needed.
2. How does the Workflow call the helper without a CLI?
   - Resolved: generated Workflow instructions may tell the agent to run a small temporary Node/Bun script importing `firehorse/session-audit`. Do not freeze a committed CLI UX in v1.
3. Should preview output itself be persisted?
   - Resolved: no by default. Include preview summary in final report provenance if the audit proceeds. If the user cancels after preview, write nothing unless explicitly requested.
4. Should helper support partial reports when evidence is incomplete?
   - Resolved: yes. Reports may have `completeness: partial`, list missing sources, and classify affected findings as `likely` or `needs-more-evidence`.
5. Should finding fingerprints be deterministic in v1?
   - Resolved: yes. Use a simple deterministic fingerprint from `category + normalized signal key + source project/session + affected tool/family`; do not use embeddings or LLM-generated fingerprints.
6. Should report generation require a clean git tree?
   - Resolved: no. Session Audit is read-only and post-hoc. It may record git status metadata where relevant, but should not block on dirty worktrees.
7. Should the helper detect same-session repeated memory blocks from pasted transcript text?
   - Resolved: yes. Repeated `$CMEM firehorse` blocks in this grilling session show changing relevance and persistent bleed, so pasted transcript/memory-block parsing should detect repeated same-session memory injections.

## Batch X — privacy and report UX

1. Should preview approval be one approval or staged approvals?
   - Resolved: use one staged preview approval per audit run. Preview lists sources, database paths, windows, and counts; user approves continuing. No separate approval per database unless new sources are discovered later.
2. Should reports include absolute local paths?
   - Resolved: avoid by default. Use repo-relative paths where possible; otherwise hash or redact home-directory prefixes. Full absolute paths may appear only with explicit approval.
3. Should memory observation IDs be shown?
   - Resolved: yes. IDs are useful provenance. Show IDs, titles, types, and timestamps, but redact or paraphrase contents.
4. Should Session Audit run outside Firehorse repositories?
   - Resolved: yes, with explicit approval. It can audit any git/current project, but report writing under `docs/audits/...` should be optional if the repo is not Firehorse-marked.
5. Should excessive-effort thresholds be absolute or relative?
   - Resolved: both. Use absolute guardrails for obvious runaway sessions and relative comparison against task complexity for normal cases.
6. Should the baseline report include PRD document edits themselves?
   - Resolved: yes as evidence artifacts, but cite file paths and diff summaries rather than full diffs.
7. Should helper classify docs changed but no validation run as missing verification?
   - Resolved: usually no. Docs-only planning edits can be verified by structural checks/review rather than typecheck/tests. It becomes a finding only if generated mirrors, schema, or referenced docs should have been checked and were not.

## Batch Y — implementation slicing

1. Should the first implementation issue be helper-first or workflow-first?
   - Resolved: helper-first, but tiny. Build the minimal `firehorse/session-audit` helper skeleton before the canonical Workflow so the Workflow can reference real capabilities without overpromising.
2. Should `session-audit` be sliced into more issues than the original seven?
   - Resolved: yes. Helper code changed scope enough that helper primitives should be split from workflow/projection work.
3. Should the baseline report be its own issue?
   - Resolved: yes. It depends on helper and Workflow, and is HITL because it reads local session/memory evidence and validates thresholds.
4. Should direct database adapter be separate from generic evidence discovery?
   - Resolved: yes. It has distinct privacy, schema, and runtime risks and needs fixture database tests.
5. Should generated provider mirrors land before the full classifier?
   - Resolved: yes. The Workflow can instruct manual/agent review of helper metrics first; full candidate classification can deepen later.
6. Should the first baseline block GitHub issue publication?
   - Resolved: yes. Publication waits for the baseline so issues include evidence-backed thresholds and examples.
7. Should upstream-tooling issues be separate from Firehorse implementation issues?
   - Resolved: yes. Firehorse issues come first; upstream pi-memory, pi-subagents, context-mode, or related issues should wait until baseline evidence confirms patterns.
