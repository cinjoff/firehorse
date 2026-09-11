# Research: Session Audit and Agent Tooling Efficiency

Status: Draft  
Date: 2026-05-20  
Scope: Pi sessions across all recent projects, with focused examples from `firehorse` and `platform` workspaces.

## Purpose

This document pauses implementation and records evidence about how the current Pi tooling ecosystem is intended to be used, where the tools overlap, where they do not overlap, and which observed session patterns suggest inefficient or incorrect usage.

The immediate product goal is to design a reusable **Session Audit** capability before changing Firehorse package behavior. The audit should continuously improve Firehorse-authored workflows, skills, and agent roles by measuring actual tool usage in Pi session history.

This is research, not a runtime design. Firehorse's Definition Format remains declarative authoring metadata plus Markdown instructions, not a runtime, prompt loader, provider transport, slash-command implementation, hook, or autonomous execution engine (`docs/FIREHORSE-DEFINITION-FORMAT.md`, lines 3-5).

## Research method

Sources used:

- Firecrawl scrapes saved under `.firecrawl/session-audit-research/`:
  - `context-mode-github.md`
  - `pi-lens-github.md`
  - `pi-agent-memory-github.md`
  - `pi-subagents-github.md`
  - `bun-installation.md`
- Local installed package docs and skills under `node_modules/`.
- Cloned upstream repositories for source-code citations:
  - `mksglu/context-mode` at `4dcbd45144b2a7fb60907ec7983c6acaaef51d6b`
  - `apmantza/pi-lens` at `f92635138b3a71a1ae3da4be259a274db301b6ff`
  - `ArtemisAI/pi-mem` at `6b0c958379c3e922a3ab25d156ab2530e878036b`
  - `nicobailon/pi-subagents` at `e99bf5b84dc543012e2e4dee2478d6f914a37b27`
- Pi session transcripts under `~/.pi/agent/sessions/`.
- Firehorse local guidance, especially `packages/firehorse-claude/guidance/claude-mem-preamble.md` and `packages/firehorse-pi/skills/firehorse-setup/SKILL.md`.

## Executive findings

1. **context-mode is materially useful, but only when treated as a data-processing and indexing layer.** It is not a substitute for semantic code tools. Official docs position it around sandboxed execution, context savings, FTS5/BM25 indexing, and `ctx_stats`; they claim full-session reductions such as 315 KB of raw output becoming 5.4 KB and show tool-level examples such as `ctx_execute_file` keeping raw file content out of context.

2. **Bun should become a Firehorse setup check and recommended dependency.** context-mode explicitly auto-detects Bun for 3-5x faster JS/TS execution. The local machine already has Bun `1.3.11` installed at `/Users/konstantin/.bun/bin/bun`. Firehorse should verify this in setup/check mode and offer an installation/repair path. Whether it is hard-required or recommended remains an implementation decision, but the evidence supports making it part of setup health.

3. **pi-lens owns live code intelligence.** LSP navigation, diagnostics, and ast-grep are the right tools for current-code structure, references, diagnostics, and semantic replacements. Using context-mode or raw grep for those questions is usually an anti-pattern unless the task is explicitly batch analysis over large outputs.

4. **pi-memory owns prior-session knowledge, not current-code navigation.** It captures observations, injects relevant context, and shares memory across engines for the same project. It also exposes smart code tools, but Firehorse should treat those as memory/code-recall helpers, not as a replacement for pi-lens on the current working tree.

5. **Memory project scoping is the highest-risk correctness issue.** Firehorse already says memory searches must be scoped to the canonical repository project name, not a Superset/git worktree directory. The live `$CMEM firehorse` context supplied during this research injected 50 observations, read 18,915 tokens, offered access to 101,654 tokens of past work, and included platform-domain observations under a Firehorse context. That violates the intended Firehorse preamble and should be a Session Audit finding.

6. **Subagent status polling is the clearest observed token sink.** pi-subagents docs explicitly say background runs are detached and, if the parent has nothing useful to do, it should end the turn instead of running sleep or status-polling loops. Firehorse session evidence showed 1,701 status calls out of 1,797 subagent calls in one workspace corpus.

7. **The right next artifact is a Session Audit research-to-skill plan, not runtime code.** Firehorse can ship instruction-only guidance and setup checks; upstream tool changes should be issue-backed after audit data confirms them.

## Evidence from official docs and source

### context-mode

Official positioning:

- context-mode claims the core problem is context saving, showing a full-session example of 315 KB becoming 5.4 KB: <https://github.com/mksglu/context-mode/blob/4dcbd45144b2a7fb60907ec7983c6acaaef51d6b/README.md#L39-L42>
- Tool table shows `ctx_batch_execute`, `ctx_execute`, `ctx_execute_file`, `ctx_index`, `ctx_search`, and `ctx_fetch_and_index`, with example context savings: <https://github.com/mksglu/context-mode/blob/4dcbd45144b2a7fb60907ec7983c6acaaef51d6b/README.md#L992-L995>
- `ctx_execute` runs in an isolated subprocess and only stdout enters conversation context; raw logs/API responses/snapshots stay in the sandbox: <https://github.com/mksglu/context-mode/blob/4dcbd45144b2a7fb60907ec7983c6acaaef51d6b/README.md#L1007-L1010>
- Bun is auto-detected for 3-5x faster JS/TS execution: <https://github.com/mksglu/context-mode/blob/4dcbd45144b2a7fb60907ec7983c6acaaef51d6b/README.md#L1007-L1010>
- If output exceeds 5 KB and an `intent` is provided, context-mode indexes the full output and returns only matching sections plus searchable terms: <https://github.com/mksglu/context-mode/blob/4dcbd45144b2a7fb60907ec7983c6acaaef51d6b/README.md#L1011-L1014>
- The knowledge base uses SQLite FTS5, BM25 ranking, Porter stemming, and title/heading weighting: <https://github.com/mksglu/context-mode/blob/4dcbd45144b2a7fb60907ec7983c6acaaef51d6b/README.md#L1015-L1018>
- `ctx_stats` reports context savings, call counts, tokens consumed, and savings ratio: <https://github.com/mksglu/context-mode/blob/4dcbd45144b2a7fb60907ec7983c6acaaef51d6b/README.md#L297-L302>

Current-session evidence:

- `ctx_stats` reported 93.1M tokens saved, 355 MB kept out of the conversation, 46 calls, and 100% reduction for this research session.
- The same stats output also showed context-mode version `v1.0.135` with an update available to `v1.0.146`; setup/audit should surface outdated versions.

Interpretation:

- context-mode is efficient when it replaces raw transcript output with computed findings or indexed snippets.
- context-mode becomes inefficient when scripts print raw data, when agents repeatedly search the same index with slightly different queries, or when it is used as a replacement for semantic code tools.

### Pi session storage

Official positioning:

- Pi auto-saves conversations to `~/.pi/agent/sessions/`, organized by working directory (`docs/sessions.md`).
- Session files are JSONL trees at `~/.pi/agent/sessions/--<path with / replaced by ->--/<timestamp>_<uuid>.jsonl` (`docs/session-format.md`).
- Session entries include a header with `cwd` and session ID, message entries with user/assistant/tool-result roles, tool calls, usage/cost, compaction entries, custom messages, labels, model changes, and branch summaries (`docs/session-format.md`).
- Related subagent/delegated runs may appear as nested JSONL files under a main session directory, such as `<main-session>/<run-group>/run-*/session.jsonl`, and should be treated as related Session Evidence without counting against the main-session cap.

Observed Firehorse session storage evidence:

- The current repository's Pi session directory is `~/.pi/agent/sessions/--Users-konstantin-.superset-worktrees-8f947b3b-ae15-42eb-a902-dbe4dcc4fd93-workflows-shared-adapters--`.
- That directory currently contains 23 direct main session JSONL files and 13 nested/subagent-like JSONL files.
- The latest five direct main sessions aggregate to 2,431 JSONL lines, 13,764,628 bytes, 49 user messages, 1,078 assistant messages, 1,267 tool results, 134,704,804 token-accounting total, estimated cost `$119.86`, 3 compactions, and 12 custom messages.
- Latest-five top tool calls: `subagent:416`, `read:283`, `plugin_claude_mem_mcp_search_get_observations:159`, `ctx_execute:122`, `edit:106`, `ctx_batch_execute:47`, `ctx_search:31`, `write:27`, `ctx_execute_file:23`, `bash:20`, `ast_grep_replace:11`, `ctx_index:8`.
- The current PRD-0005 issue-drafting/audit session file is `2026-05-21T15-24-01-930Z_019e4b22-f20a-7a6f-af15-1df7b9a6c0da.jsonl`, session ID `019e4b22-f20a-7a6f-af15-1df7b9a6c0da`, with 107 lines, 850,425 bytes, 3 user messages, 44 assistant messages, 56 tool results, 2,778,416 token-accounting total, estimated cost `$4.18`, and top tools `write`, `ctx_batch_execute`, `ctx_execute_file`, `ctx_index`, `ctx_execute`, `bash`, `ctx_search`, and `read`.

Interpretation:

- Pi JSONL session files are the primary source of actual session history for Session Audit. Memory observations and pasted `$CMEM` blocks are useful corroborating evidence, but they are not a substitute for parsing Pi session files.
- Session Audit should discover direct main sessions from the cwd-derived Pi session directory, then include nested run/session JSONL files as related subagent evidence.
- Reports should persist aggregate session metadata, session IDs, paths, tool counts, usage metrics, and redaction notes, but not raw message content unless explicitly reviewed and redacted.

### pi-lens

Official positioning:

- On every write/edit, pi-lens runs a language-aware pipeline including secrets scan, formatting/fixes, LSP file sync, dispatch lint, and diagnostics cascade: <https://github.com/apmantza/pi-lens/blob/f92635138b3a71a1ae3da4be259a274db301b6ff/README.md#L12-L15>
- LSP servers are enabled by default and can shut down after 240 seconds of inactivity to free resources: <https://github.com/apmantza/pi-lens/blob/f92635138b3a71a1ae3da4be259a274db301b6ff/README.md#L77-L80>
- Agent LSP tools include `lsp_diagnostics` for files/directories/batches and `lsp_navigation` for definitions, references, hover, workspace symbols, call hierarchy, rename edits, and filtered symbol lookup: <https://github.com/apmantza/pi-lens/blob/f92635138b3a71a1ae3da4be259a274db301b6ff/README.md#L85-L88>
- pi-lens includes ast-grep rules for security, correctness, and smells: <https://github.com/apmantza/pi-lens/blob/f92635138b3a71a1ae3da4be259a274db301b6ff/README.md#L170-L173>
- The LSP skill says to use `lsp_navigation` as primary for code intelligence and `lsp_diagnostics` as primary for proactive type/error checks; do not use grep/glob/ast-grep first for code intelligence or diagnostics: <https://github.com/apmantza/pi-lens/blob/f92635138b3a71a1ae3da4be259a274db301b6ff/skills/lsp-navigation/SKILL.md#L7-L10>

Observed issue:

- In the Amman corpus, a single `lsp_navigation` result was about 279.5 KB. That does not mean LSP is the wrong tool; it means Session Audit should flag broad LSP calls that return too much and recommend narrower operations such as `findSymbol`, path scoping, or structural outlines before broad references.

Interpretation:

- pi-lens should lead for live repository code intelligence.
- context-mode should not be used as generic code search when pi-lens can answer the semantic question.
- ast-grep should be used for structural pattern search/replace, not raw text search.

### pi-agent-memory / claude-mem

Official positioning:

- pi-agent-memory captures observations, injects relevant past observations, exposes `memory_recall`, and shares memory with other engines in the same database: <https://github.com/ArtemisAI/pi-mem/blob/6b0c958379c3e922a3ab25d156ab2530e878036b/pi-agent/README.md#L67-L71>
- `PI_MEM_PROJECT` is the project name for scoping observations; by default it is derived from cwd: <https://github.com/ArtemisAI/pi-mem/blob/6b0c958379c3e922a3ab25d156ab2530e878036b/pi-agent/README.md#L115-L118>
- Cross-engine memory writes to the same `~/.claude-mem/claude-mem.db`, tagged by `platform_source`; context injection returns observations from all engines for the same project by default, and `platformSource` can filter by engine: <https://github.com/ArtemisAI/pi-mem/blob/6b0c958379c3e922a3ab25d156ab2530e878036b/pi-agent/README.md#L130-L133>
- Source code confirms project scoping uses `PI_MEM_PROJECT` when set: <https://github.com/ArtemisAI/pi-mem/blob/6b0c958379c3e922a3ab25d156ab2530e878036b/pi-agent/extensions/pi-mem.ts#L150-L158>
- Source code sends `platformSource: PLATFORM_SOURCE` with worker requests: <https://github.com/ArtemisAI/pi-mem/blob/6b0c958379c3e922a3ab25d156ab2530e878036b/pi-agent/extensions/pi-mem.ts#L211-L214>
- The bundled MCP server tool descriptions include the intended memory workflow: Step 1 `search`, Step 2 `timeline`, Step 3 `get_observations`, with the warning: “Never fetch full details without filtering first”: <https://github.com/ArtemisAI/pi-mem/blob/6b0c958379c3e922a3ab25d156ab2530e878036b/plugin/scripts/mcp-server.cjs#L217>
- The changelog describes smart code exploration tools: `smart_search` returns ranked symbols and can replace Glob/Grep discovery cycles; `smart_outline` returns a structural skeleton of a file; `smart_outline + smart_unfold` is estimated at ~3,100 tokens vs an 8x larger Read path: <https://github.com/ArtemisAI/pi-mem/blob/6b0c958379c3e922a3ab25d156ab2530e878036b/CHANGELOG.md#L472-L481>
- Local `.firecrawl/claude-mem/getting-started.md` documents direct SQLite inspection of `~/.claude-mem/claude-mem.db`, including `sdk_sessions`, `session_summaries`, and `observations`, with example queries for recent sessions, summaries, and observations by `session_id`.
- Local `.firecrawl/claude-mem/getting-started.md` documents processed observation content fields: title, subtitle, narrative, facts, concepts, type, and files.
- Local `.firecrawl/claude-mem/configuration.md` documents `CLAUDE_MEM_DATA_DIR`, the default `~/.claude-mem/claude-mem.db` location, context observation counts, observation type filters (`bugfix`, `feature`, `refactor`, `discovery`, `decision`, `change`), and concept filters (`how-it-works`, `why-it-exists`, `what-changed`, `problem-solution`, `gotcha`, `pattern`, `trade-off`).
- Local `.firecrawl/claude-mem/architecture-hooks.md` documents the main SQLite tables as `sdk_sessions`, `user_prompts`, `observations`, and `session_summaries`.
- Local `.firecrawl/pi-mem-pi-agent-readme.md` confirms Pi writes to the same `~/.claude-mem/claude-mem.db` and tags engine provenance with `platform_source`.

Firehorse local policy:

- Firehorse claude-mem preamble says memory searches must be scoped to the canonical repository project name, not the current Superset/git worktree directory (`packages/firehorse-claude/guidance/claude-mem-preamble.md`, lines 7-8).
- Project-id order starts with `FIREHORSE_PROJECT_NAME`, then `CLAUDE_MEM_PROJECT` (`packages/firehorse-claude/guidance/claude-mem-preamble.md`, lines 10-13).
- Firehorse preamble says to use `smart_outline`, `smart_search`, and `smart_unfold` for structural code exploration when using claude-mem tools (`packages/firehorse-claude/guidance/claude-mem-preamble.md`, lines 57-60).
- Firehorse preamble says to fetch details only for the top 2-3 IDs with `get_observations`, and use `timeline` when temporal context matters (`packages/firehorse-claude/guidance/claude-mem-preamble.md`, lines 70-73).
- Firehorse preamble budgets prior context under 2% of context (`packages/firehorse-claude/guidance/claude-mem-preamble.md`, line 76).
- Firehorse setup already aims to pin claude-mem/pi-agent-memory project id to the canonical repository name so memory persists across Superset and git worktrees (`packages/firehorse-pi/skills/firehorse-setup/SKILL.md`, lines 15-17).

Observed issue:

- The supplied `$CMEM firehorse` block injected 50 observations, read 18,915 tokens, and offered access to 101,654 tokens of past work via `get_observations` / memory search.
- It included platform-domain observations such as platform account termination, checkout service tests, and account service import-style changes under a Firehorse project context. Concrete examples include `7766`, `7771`, `7776`, `7780`, and `7784`.
- This is a high-confidence violation of Firehorse's project scoping intent and the 2% prior-context budget.

Interpretation:

- pi-memory should not be treated as an always-load knowledge dump.
- Initial memory injection should be small, repo-scoped, and provenance-aware.
- `get_observations` should be a detail-fetch after scoped `search`/`timeline`, not a broad-loading primitive.
- Cross-project memory should require explicit user intent.
- Session Audit can read bounded same-session memory rows directly from the documented SQLite database schema, including observation contents, as long as access stays read-only, project/session scoped, schema-compatible, and redacted in reports.
- Missing memory database access is an evidence completeness gap unless setup explicitly promised memory integration and the environment or manifest is broken.

### pi-subagents

Official positioning:

- Background runs can be inspected with `subagent({ action: "status" })`: <https://github.com/nicobailon/pi-subagents/blob/e99bf5b84dc543012e2e4dee2478d6f914a37b27/README.md#L149-L152>
- Background runs are detached; if the parent has independent work, it should continue; if it has nothing useful to do until the background result arrives, it should end the turn instead of running sleep or status-polling loops; Pi will deliver completion when finished: <https://github.com/nicobailon/pi-subagents/blob/e99bf5b84dc543012e2e4dee2478d6f914a37b27/README.md#L328-L331>
- For large saved outputs, use `outputMode: "file-only"` with an `output` path so the parent gets only a compact file reference: <https://github.com/nicobailon/pi-subagents/blob/e99bf5b84dc543012e2e4dee2478d6f914a37b27/skills/pi-subagents/SKILL.md#L247-L250>

Observed issue:

- In the Firehorse `workflows-shared-adapters` corpus, there were 1,797 subagent calls; 1,701 were `status` calls. That is 94.6% status polling.
- The top repeated subagent run IDs were polled hundreds of times.
- This contradicts the upstream guidance to end the turn instead of running status-polling loops.

Interpretation:

- Async subagents should be used to unblock parent work, not to create an active polling loop.
- Short/interactive work should remain foreground.
- Long background work should use completion notifications, file-only output, and explicit resume/interrupt only when needed.
- Worker agent prompts should require either changed files or `BLOCKED: reason` for implementation tasks.

## Observed session corpus signals

### Recent all-project corpus

Across a 14-day recent corpus:

- 117 JSONL files
- 15 session directories / project-like groups
- 12,254 assistant turns
- 14,819 tool calls
- 14,806 tool results
- 378 tool errors
- 54.18 MB tool output
- 1,361,262,267 reported total tokens, mostly cache reads
- $1,234.16 reported cost

Top tools by call count:

1. `read`: 4,421
2. `bash`: 2,159
3. `subagent`: 1,839
4. `ctx_execute`: 1,525
5. `edit`: 1,360
6. `plugin_claude_mem_mcp_search_get_observations`: 938
7. `grep`: 549
8. `ctx_batch_execute`: 522
9. `ctx_search`: 352
10. `write`: 267

Top tools by output volume:

1. `read`: 23.99 MB
2. `bash`: 7.51 MB
3. `plugin_claude_mem_mcp_search_get_observations`: 5.19 MB
4. `grep`: 4.60 MB
5. `ctx_batch_execute`: 3.07 MB
6. `ctx_execute`: 2.89 MB
7. `ctx_search`: 2.07 MB
8. `subagent`: 2.06 MB
9. `lsp_navigation`: 1.21 MB

### Firehorse focused corpus

For the Firehorse `workflows-shared-adapters` workspace:

- 31 JSONL files
- 4,768 assistant turns
- 6,028 tool calls
- 6,017 tool results
- 77 tool errors
- 20.54 MB tool output
- 609,253,727 reported total tokens
- $533.27 reported cost
- 14 compactions
- 1,372 `read` calls
- 270 `bash` calls
- 348 edit/write calls
- 1,053 context-mode calls
- 125 lens calls
- 794 memory calls
- 1,797 subagent calls

Subagent details:

- 1,701 / 1,797 subagent calls were `status`.
- The pattern is concentrated in Firehorse sessions; Amman had only 8 subagent calls.
- This is the strongest observed “running in circles” signature.

### Amman focused corpus

For `/Users/konstantin/conductor/workspaces/platform/amman`:

- 9 JSONL files
- 756 assistant turns
- 1,017 tool calls
- 23 tool errors
- 4.75 MB tool output
- 83,667,202 reported total tokens
- $86.21 reported cost
- 2 compactions

Top tools:

1. `read`: 348
2. `bash`: 203
3. `ctx_execute`: 91
4. `plugin_claude_mem_mcp_search_get_observations`: 83
5. `grep`: 67
6. `edit`: 52
7. `ctx_batch_execute`: 49
8. `lsp_diagnostics`: 26
9. `ctx_execute_file`: 22
10. `ctx_search`: 14

Largest notable output:

- One `lsp_navigation` result around 279.5 KB.
- Several `grep` results around 20-50 KB.

## Tool responsibility model

| Need                                                                                   | Primary tool family                                                                                            | Secondary / fallback                                                 | Anti-pattern                                                                                  |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Analyze session JSONL, logs, test output, git history, API responses, large data files | context-mode (`ctx_execute`, `ctx_execute_file`, `ctx_batch_execute`)                                          | Native shell only when output is guaranteed tiny                     | `read`/`bash` raw output into transcript                                                      |
| Search/index web docs or long Markdown docs                                            | context-mode (`ctx_fetch_and_index`, `ctx_index`, `ctx_search`)                                                | Firecrawl for web acquisition, then index file                       | Passing large content to `ctx_index(content: ...)`                                            |
| Current-code symbol lookup, definitions, references, hover, call hierarchy             | pi-lens `lsp_navigation`                                                                                       | claude-mem `smart_search` only for cross-session/code-recall cases   | grep or context-mode scripts for semantic code intelligence                                   |
| Current-code diagnostics and type/error checks                                         | pi-lens `lsp_diagnostics`                                                                                      | build/typecheck via context-mode when full output must be summarized | running builds via raw bash with huge output                                                  |
| Structural code pattern search/rewrite                                                 | ast-grep tools                                                                                                 | LSP for semantic references; context-mode for bulk metrics           | raw grep for syntax-aware tasks                                                               |
| Prior decisions, gotchas, past work, cross-session memory                              | pi-memory `search` / `timeline` then small `get_observations`                                                  | `memory_recall` for natural lookup                                   | Direct broad `get_observations`, cross-project memory dumps                                   |
| Current-code exploration from previous sessions                                        | pi-memory `smart_search` / `smart_outline` / `smart_unfold` when explicitly recalling remembered code patterns | pi-lens for live working tree                                        | treating memory smart tools as authoritative for current code without checking the filesystem |
| Parallel independent research or implementation                                        | pi-subagents                                                                                                   | foreground subagent for short work                                   | async status polling loops, inherited huge context, inline large outputs                      |

## Anti-pattern taxonomy for Session Audit

### context-mode anti-patterns

- `ctx_execute` or `ctx_batch_execute` prints raw JSON/log/test output instead of findings.
- `ctx_search` is called repeatedly with near-identical queries instead of batching queries.
- `ctx_execute` is used for code navigation that should be `lsp_navigation`, `lsp_diagnostics`, or ast-grep.
- Output exceeds a configured threshold, e.g. 25 KB, without `intent` filtering.
- context-mode is bypassed for commands likely to emit large output.

### pi-lens / ast-grep anti-patterns

- Broad `lsp_navigation` reference/workspace queries return hundreds of KB.
- `lsp_navigation` is called before narrowing by file/symbol when the task could use `documentSymbol`, `findSymbol`, or path scoping.
- Raw grep is used for structural code questions.
- ast-grep replacement is attempted without dry-run/preview when broad.

### pi-memory anti-patterns

- Initial memory injection exceeds budget, e.g. more than 3 observations or more than 2% of context.
- Memory observations are from a different inferred `repoName` than the current session.
- `get_observations` is called without a scoped preceding `search` or `timeline`.
- More than 2-3 observation IDs are fetched for a single memory lookup.
- Same observation IDs are fetched repeatedly in the same session.
- Memory smart tools are used as authoritative current-code inspection without checking live files.

### pi-subagents anti-patterns

- Repeated `status` calls on the same run ID.
- Parent agent waits by polling instead of ending the turn.
- Async run used when foreground execution would have been cheaper.
- Subagent returns large inline output instead of `outputMode: "file-only"`.
- Worker completes an implementation task without changing files or explicitly returning `BLOCKED: reason`.
- Too many forked-context subagents inherit a large parent context.

### Native tool anti-patterns

- `read` used for large-file analysis rather than edit preparation.
- `bash`/`grep` used for broad search with output over threshold.
- `find`/`ls` produce large directory listings instead of summarized scripts.

## Proposed Session Audit metrics

### Corpus identity

Session Audit should be generic across projects. It should group sessions by:

1. `repoName` — primary identity, derived from git remote basename or repository metadata, e.g. `firehorse`.
2. `repoRemote` — secondary provenance, e.g. `cinjoff/firehorse`.
3. `repoRoot`.
4. `cwd` from the session event.
5. Pi session directory name.
6. Memory project label — advisory only, never authoritative.

Selectors:

- `--days <n>`
- `--repo <repoName>`
- `--cwd-substring <text>`
- `--all-projects`
- `--compare-projects`
- `--since <date>`

### Per-corpus metrics

- session count
- assistant turns
- tool calls/results/errors
- compactions
- reported `input`, `output`, `cacheRead`, `cacheWrite`, `totalTokens`, and cost
- tool result bytes by tool
- largest tool results
- tool error clusters
- repeated identical tool calls
- tool-call sequence patterns

### context-mode metrics

- `ctx_*` calls by tool
- `ctx_*` output bytes in transcript
- estimated bytes avoided, where available from `ctx_stats`
- `ctx_search` query repetition
- `ctx_batch_execute` query coverage
- large `ctx_*` result threshold violations
- Bun availability and version
- context-mode version and upgrade availability

### pi-lens metrics

- LSP calls by operation
- diagnostic calls before/after edits
- broad reference/workspace queries and output size
- ast-grep dry-run vs apply counts
- large LSP result threshold violations

### pi-memory metrics

- initial memory observations injected
- initial memory token estimate
- memory project label vs inferred repoName
- cross-repo observation count
- `search`/`timeline`/`get_observations` sequence compliance
- fetched observation IDs per call
- repeated observation ID fetches
- memory smart tool usage vs pi-lens usage

### pi-subagents metrics

- foreground vs background calls
- `status` count per run ID
- status-polling streaks
- async run duration if inferable
- subagent output bytes and inline/file-only mode
- worker implementation success/failure shape
- interruptions/resumes
- subagent context mode (`fresh` vs `fork`)

## Recommended thresholds for first audit pass

These are starting thresholds, not final policy:

- Initial memory injection: warn over 3 observations or 2% of context; error on cross-repo observations unless user requested cross-project recall.
- `get_observations`: warn over 3 IDs; warn if no preceding scoped search/timeline in the last few turns; warn on repeated IDs.
- Subagent status: warn over 3 status calls per run; error on status-polling streaks over 10; flag any run ID with more than 20 status calls.
- Tool output size: warn over 25 KB; error over 100 KB, except explicit file/index workflows.
- `read`: warn when result exceeds 50 KB and file is not being edited.
- `grep`/`bash`: warn when output exceeds 20 KB.
- `lsp_navigation`: warn when output exceeds 50 KB; recommend narrower symbol/path operation.
- context-mode: warn when a `ctx_*` result exceeds 25 KB; recommend `intent`, indexing, or less stdout.

## Implications for Firehorse

### Session Audit as a Firehorse-authored Skill

The first implementation should be an instruction-only **Skill** authored from the Firehorse Definition Format and projected into Pi/Claude mirrors. It should not add runtime code.

Skill responsibilities:

- Explain where Pi session JSONL files live.
- Teach the agent to analyze session corpora with context-mode scripts.
- Define corpus identity rules using repoName as the leading identity.
- Produce a structured audit report with the metrics above.
- Compare observed behavior to the tool responsibility model.
- Generate follow-up issue drafts for Firehorse or upstream tools.

### firehorse-setup additions

Setup/check mode should add non-destructive checks for:

- Bun installed and version visible.
- context-mode installed, version current, and `ctx_doctor`/`ctx_stats` available.
- `FIREHORSE_PROJECT_NAME`, `PI_MEM_PROJECT`, and `CLAUDE_MEM_PROJECT` pinned to repoName.
- `~/.config/firehorse/memory.env` exists, private, and matches repoName when setup has pinned it.
- pi-agent-memory worker health and context injection budget configuration, if the upstream exposes configurable limits.

Open decision: whether Bun is a hard dependency or a strongly recommended setup dependency. Evidence supports at least a setup warning/repair path because context-mode docs explicitly optimize for Bun.

### Agent role / workflow guidance

Canonical agents and workflows should be updated after the research phase to say:

- Use context-mode for large output/data processing.
- Use pi-lens for live code intelligence.
- Use pi-memory for scoped prior-session knowledge only.
- Do not broad-load memory.
- Do not poll async subagents; end the turn and wait for completion when blocked.
- Use `outputMode: "file-only"` for large subagent outputs.
- Implementation workers must edit files or return `BLOCKED: reason`.

### Upstream issues likely needed

After baseline audit, likely upstream issues:

1. **pi-subagents:** expose a watch/delta mode or stronger status-poll guardrails; optionally warn when the same run is polled repeatedly.
2. **pi-memory:** cap or configure initial injection; expose provenance/repo metadata; prevent or flag cross-project observations.
3. **pi-memory:** session-local cache for repeated `get_observations` IDs.
4. **pi-lens:** large-result guardrails or summary mode for broad navigation results.
5. **context-mode:** make Bun/runtime selection visible in stats/doctor and identify scripts that printed too much.

## Proposed work breakdown

### Phase 1 — Complete research baseline

- [ ] Validate this research doc with user feedback.
- [ ] Add any missing official docs/source citations.
- [ ] Decide whether Bun is hard-required or setup-recommended.
- [ ] Decide initial memory injection policy.
- [ ] Decide subagent status threshold policy.

### Phase 2 — Build reusable Session Audit method

- [ ] Draft a canonical Firehorse Skill definition for Session Audit.
- [ ] Define projected Pi/Claude mirrors through existing definitions pipeline.
- [ ] Include a session JSONL analyzer script template in the skill instructions.
- [ ] Include report sections and thresholds.
- [ ] Include evidence comparison against official tool docs.

### Phase 3 — Run first audited baseline

- [ ] Run Session Audit against all recent projects.
- [ ] Run focused comparisons for `firehorse`, `platform`, and at least one unrelated project.
- [ ] Produce a baseline report with top offenders and concrete examples.
- [ ] Separate Firehorse guidance problems from upstream tool problems.

### Phase 4 — Firehorse changes

- [ ] Add/update `firehorse-setup` checks for Bun/context-mode/memory identity.
- [ ] Update canonical agents/workflows with tool allocation guidance.
- [ ] Add or update docs for memory scoping and subagent async behavior.
- [ ] Add tests/projection checks for new Skill surfaces.

### Phase 5 — Upstream/tooling issues

- [ ] File evidence-backed issues for pi-subagents, pi-memory, pi-lens, and possibly context-mode.
- [ ] Link Session Audit output examples, not anecdotes.
- [ ] Track upstream fixes or local Firehorse mitigations.

## Open questions for the next grilling batch

1. Should Bun be a hard setup requirement for Firehorse Pi, or a high-priority recommended dependency with warning/repair path?
2. Should Firehorse attempt to disable broad initial pi-memory injection, or only detect/report when it exceeds budget?
3. What is the acceptable initial memory budget: 3 observations, 2% context, both, or a token cap?
4. Should cross-repo memory be blocked automatically, or only flagged in the audit?
5. Should Firehorse canonical agents prefer foreground subagents by default and require explicit justification for async?
6. What threshold should trigger a “status polling loop” finding: 3, 10, or 20 repeated status checks per run?
7. Should Session Audit be a Skill only, or also a Workflow that can create issues from findings?
8. Should session-audit outputs live under `docs/prds/...`, `docs/handoffs/...`, or a new `docs/audits/...` convention?
9. Should Firehorse preserve this research as PRD #0005 and publish it to GitHub Issues, or keep it as internal planning until the first audit baseline is complete?
