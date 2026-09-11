# PRD: Firehorse Pi Claude-Mem Wrapper

Status: Draft — grilled, implementation issues published  
Publication: GitHub Issues #26-#32 published from this Planning Workspace  
Primary owner: Firehorse Pi distribution

## Problem Statement

Firehorse currently gets Pi memory through a bundled upstream `pi-agent-memory` package and a separate Firehorse worker helper. That gave Pi sessions basic cross-session recall, but the surface is too rigid for Firehorse's intended memory workflow:

- Pi exposes only `memory_recall(query, limit)`, while claude-mem's best-practice worker-mode workflow is progressive discovery: `search` for compact IDs, `timeline` for surrounding context, then `get_observations` for selected full details.
- Project identity must be Firehorse-aware. Superset and generated worktree paths are not reliable memory namespaces, and the canonical project may be recorded in `.firehorse/manifest.json`.
- Firehorse has two overlapping memory concerns today: upstream `pi-agent-memory` owns Pi capture/injection/search, while `firehorse-claude-mem-worker` starts/checks the claude-mem worker. This is confusing and makes it hard to evolve the tool surface.
- A previous self-adapted claude-mem MCP bridge exposed the desired tools, but it was external to the Firehorse Pi package and duplicated Pi-native code-intelligence surfaces.

Firehorse needs a first-party Pi extension that is still a thin claude-mem wrapper: use the existing claude-mem worker and database, respect claude-mem settings and existing Claude memories, expose the powerful progressive-search tools to Pi, and resolve memory project IDs from Firehorse setup metadata when available.

## Why Now

Recent setup work introduced `.firehorse/manifest.json` and `memory.project` into the Firehorse Setup Manifest. At the same time, the active Pi memory setup showed duplication between upstream `pi-agent-memory`, Firehorse's worker helper, and a removed self-adapted MCP surface. This is the right time to consolidate memory behavior before more Firehorse skills/workflows depend on the memory tool names and project-scoping contract.

## Research Summary

### ArtemisAI/pi-mem change set over claude-mem

Source: <https://github.com/thedotmack/claude-mem/compare/main...ArtemisAI:pi-mem:main>

The ArtemisAI fork is intentionally small. It adds a `pi-agent/` package around claude-mem rather than replacing claude-mem internals:

- `pi-agent/extensions/pi-mem.ts` — a Pi extension derived from `claude-mem/openclaw/src/index.ts`.
- `pi-agent/skills/mem-search/SKILL.md` — guidance for using the `memory_recall` tool.
- `pi-agent/package.json` — package name `pi-agent-memory`, version `0.3.4`, `pi-package` metadata, peer dependencies on Pi packages, and AGPL license metadata.
- `pi-agent/README.md` and top-level README/i18n updates — document Pi install and architecture.

Motivation inferred from the diff: adapt an existing proven claude-mem integration pattern (OpenClaw) to Pi's event model, while sharing the same claude-mem worker database across Claude Code, OpenClaw, Pi, and other engines.

### Upstream pi-mem lifecycle

The upstream Pi extension maps Pi events onto claude-mem worker HTTP endpoints:

- Discover worker host/port from `CLAUDE_MEM_HOST` / `CLAUDE_MEM_PORT`, then `CLAUDE_MEM_DATA_DIR || ~/.claude-mem` `settings.json` values `CLAUDE_MEM_WORKER_HOST` / `CLAUDE_MEM_WORKER_PORT`, then default `127.0.0.1:37777`.
- `session_start`: initialize local state, derive project name, create `contentSessionId`, and persist that state into the Pi session with `appendEntry`.
- `before_agent_start`: `POST /api/sessions/init` with `contentSessionId`, `project`, prompt, and `platformSource`. The prompt matters because claude-mem uses it for privacy/filtering before observations are processed.
- `context`: `GET /api/context/inject?projects=<project>` and append the returned memory block to model context under `<pi-mem-context>`.
- `tool_result`: skip memory tools, truncate large tool responses, then fire-and-forget `POST /api/sessions/observations` with tool name/input/output, cwd, and `platformSource`.
- `agent_end`: `POST /api/sessions/summarize`, then delayed `POST /api/sessions/complete` so in-flight observations can land.
- `session_compact`: preserve the same `contentSessionId`; reinjection happens on later context events.
- `session_shutdown`: clear local state.
- Tool `memory_recall`: `GET /api/search?query=<query>&limit=<limit>&project=<project>`.
- Command `/memory-status`: `GET /api/health`.

### Claude-mem progressive discovery tools

The claude-mem MCP server defines the worker-mode pattern Firehorse wants Pi to expose:

1. `search(query, limit, project, type, obs_type, dateStart, dateEnd, offset, orderBy)` → worker `GET /api/search`; returns compact indexed results with IDs.
2. `timeline(anchor, query, depth_before, depth_after, project)` → worker `GET /api/timeline`; returns context around an observation ID or query-selected anchor.
3. `get_observations(ids, ...)` → worker `POST /api/observations/batch`; returns full details only after IDs are filtered.

The MCP server's built-in guidance says to always follow this 3-layer workflow because it can save roughly 10x context versus fetching full details first.

### Same-session injected-context evidence

During this PRD session, the active upstream memory injection repeatedly emitted `<pi-mem-context>` blocks whose header/footer advertised stale names such as `get_observations([IDs])`, `mem-search skill`, and `memory_recall`, even after Firehorse resolved the `mem_` tool naming decision. Later blocks also summarized the current decision incorrectly as "Firehorse memory tools use `mem_` prefix; deprecated `memory_recall` compatibility alias," ended with "Access ... via get_observations([IDs]) or mem-search skill," included observation `8222` titled "Upstream memory injection emitting stale tool names during this PRD session," and continued to advertise stale access instructions after official claude-mem docs were checked. A later 8:55p block repeated the stale access footer, included observation `8197` with the wrong compatibility-alias wording, and showed unrelated finance-operations observations (`8226`, `8230`, `8236`, `8237`) inside the `firehorse` project. A 9:09p block repeated the stale footer again, showed the stream had grown to 50 observations and 20,577 read tokens, and recorded observation `8248` for PRD inconsistency plus `8249` for aligning injection defaults. A 9:10p block still repeated the stale footer, reported 50 observations / 20,646 read tokens / 114,056 work tokens / 82% savings, added observation `8251` for the newly captured injection issue evidence, and included observation `8252` about removing a local worktree package from Pi agent configuration. A 9:14p block still repeated the stale footer, reported 50 observations / 20,052 read tokens / 110,562 work tokens / 82% savings, and added observation `8259` for formalizing Batch 7 decisions. A 9:17p block still repeated the stale footer, reported 50 observations / 19,871 read tokens / 123,936 work tokens / 84% savings, and added observations `8260`, `8262`, and `8263` about PRD consistency scans and finalizing worker auto-start retirement. A 9:20p block still repeated the stale footer, reported 50 observations / 19,634 read tokens / 123,879 work tokens / 84% savings, and included session-audit/working-directory observations (`8266`-`8272`) unrelated to the wrapper implementation details. A 9:24p block still repeated the stale footer, reported 50 observations / 19,672 read tokens / 108,910 work tokens / 82% savings, showed continued drift into PRD-0005/session-audit and setup/package observations (`8266`-`8288`), and added observation `8288` clarifying that `claude-mem` bundling needs separate evaluation. A 9:26p block still repeated the stale footer, reported 50 observations / 19,635 read tokens / 100,709 work tokens / 81% savings, and showed the injected stream had shifted almost entirely into PRD-0005/session-audit issue-draft observations (`8289`-`8294`) while still ending with stale `get_observations([IDs])` / `mem-search skill` access instructions. A 9:27p block still repeated the stale footer, reported 50 observations / 19,705 read tokens / 103,064 work tokens / 81% savings, and added PRD-0006 issue-creation observations `8295` and `8297` while continuing to include PRD-0005 issue-draft observations and stale access instructions. A later 9:27p block still repeated the stale footer, reported 50 observations / 19,533 read tokens / 100,981 work tokens / 81% savings, added observation `8298` clarifying that memory-runtime repairs belong in PRD-0006 rather than expanding PRD-0005, and ended with "Access 101k tokens of past work via get_observations([IDs]) or mem-search skill." A 9:33p block still repeated the stale footer, reported 50 observations / 18,918 read tokens / 102,517 work tokens / 82% savings, and showed PRD-0006 issue publication observations mixed with Pi documentation and unrelated PRD-0005/session-audit observations. The wrapper must treat worker context as historical memory content and surround it with Firehorse-owned current instructions rather than trusting upstream injected guidance verbatim; same-project memory can still contain content-domain bleed that belongs in Session Audit or a future memory-quality workflow.

### Firehorse-specific constraints

- The memory project name must not be derived from Superset/Conductor worktree path basenames.
- The Firehorse Setup Manifest may provide `memory.project`; otherwise `github.repo` and `project.name` are useful fallbacks.
- `PI_MEM_PROJECT`, `CLAUDE_MEM_PROJECT`, and `FIREHORSE_PROJECT_NAME` remain non-secret process/session variables, but a user-global `~/.config/firehorse/memory.env` should not be the source of truth for project identity.
- Firehorse should not expose claude-mem smart code tools in Pi; Pi already has `pi-lens`, LSP navigation, and ast-grep for current code intelligence.
- Firehorse should not reintroduce the removed external claude-mem MCP bridge. The wrapper should be a Pi extension inside `firehorse-pi`.
- ArtemisAI `pi-mem.ts` is an AGPL-licensed behavioral reference, not source to copy into Firehorse's MIT codebase; implementation should be clean-room-style from claude-mem HTTP contracts and Pi docs.

## Goals

1. Ship a first-party Firehorse Pi extension that wraps the existing claude-mem worker and database.
2. Expose Pi tools for the progressive claude-mem memory workflow: compact search, timeline expansion, and batched full observation fetch.
3. Preserve automatic memory capture and default automatic context injection capped to 20 observations so Pi sessions contribute to and benefit from correctly project-scoped Claude memories without unbounded context growth.
4. Resolve project identity from Firehorse Setup Manifest data when available, falling back to side-effect-free repo metadata and then explicit env.
5. Discover and use the existing claude-mem worker/settings instead of creating a separate worker/database.
6. Replace Firehorse's direct exposure of upstream `pi-agent-memory` with Firehorse-owned extension and skill/workflow guidance.
7. Keep the implementation adapter-shaped and Pi-specific; do not add a Firehorse memory runtime or provider transport.

## Non-Goals

- Do not implement a new memory database, embedding store, worker, or summarization engine.
- Do not fork or rewrite claude-mem internals.
- Do not re-add the old external claude-mem MCP bridge.
- Do not expose claude-mem smart code search/outline/unfold tools in Pi.
- Do not expose server-beta manual write/generation tools such as `observation_add`, `observation_record_event`, or generation/status tools in v1.
- Do not copy AGPL `pi-agent-memory` implementation code into Firehorse; reimplement the behavior from documented contracts and local Pi extension APIs.
- Do not use user-global `~/.config/firehorse/memory.env` as authoritative project identity.
- Do not add a generalized Firehorse workflow runtime, prompt loader, autonomous execution loop, or telemetry system.

## Proposed Solution

Add a Firehorse-owned Pi extension, `firehorse-mem.ts`, in `packages/firehorse-pi/extensions/`.

The extension should reimplement the relevant upstream `pi-mem.ts` behavior from claude-mem HTTP contracts and Pi docs, fold in Firehorse-specific project resolution, and expose a richer tool surface:

1. **Worker discovery**
   - Read host/port from claude-mem env and settings using the same precedence as upstream pi-mem.
   - Check canonical `/api/health` and report status through `/mem-status`. The OpenClaw docs describe a worker-health status command, and the corresponding integration source calls `/api/health`; do not add an undocumented `/health` fallback unless future claude-mem docs support it.
   - Use the existing claude-mem worker and database. Do not auto-start a bundled worker from Firehorse; report missing/unreachable worker setup through `/mem-status` and setup docs.

2. **Project resolution**
   - Resolve a canonical memory project once during module load and again on `session_start` with `ctx.cwd`.
   - Proposed order:
     1. `.firehorse/manifest.json` `memory.project`
     2. `.firehorse/manifest.json` `github.repo`
     3. `.firehorse/manifest.json` `project.name`
     4. GitHub remote repo name from local git config, side-effect-free
     5. existing explicit env (`FIREHORSE_PROJECT_NAME`, `CLAUDE_MEM_PROJECT`, `PI_MEM_PROJECT`) as fallback, unless an explicit override such as `FIREHORSE_MEMORY_PROJECT_OVERRIDE=1` is set
   - Set process-local `FIREHORSE_PROJECT_NAME`, `CLAUDE_MEM_PROJECT`, and `PI_MEM_PROJECT` to the resolved value so worker requests, child tools, and subagents agree.

3. **Lifecycle bridge**
   - Keep upstream lifecycle semantics: session init, optional tightly capped context injection, observation capture, summarization, completion, compaction preservation, and shutdown cleanup.
   - Wrap worker context with Firehorse-owned headers/footers that advertise the `mem_` tools and mark the 3-layer workflow as IMPORTANT; do not mutate stored observations.
   - Use `platformSource: "firehorse-pi"` for captured Pi observations so provenance is clear while cross-engine search remains project-scoped.
   - Skip all Firehorse/claude-mem memory tools during `tool_result` capture to avoid recursive memory observations.

4. **Tool surface**
   - Register `mem_`-prefixed Pi tools to avoid generic collisions while keeping names short:
     - `mem_search`
     - `mem_timeline`
     - `mem_get_observations`
   - Do not keep `memory_recall` as a compatibility alias; Firehorse skills/workflows should use progressive discovery through `mem_search`, `mem_timeline`, and `mem_get_observations`.
   - All tools should default `project` to the resolved Firehorse memory project; deliberate cross-project lookup is allowed only by passing an explicit `project` parameter.
   - Tool descriptions and prompt snippets should encode the 3-layer workflow directly.
   - Injected memory context, status output, and skills must not advertise stale upstream names such as `get_observations([IDs])`, `mem-search skill`, or `memory_recall`.

5. **Skill/workflow guidance**
   - Replace upstream `mem-search` with a Firehorse-owned `mem` skill that says:
     1. search compact IDs first;
     2. use timeline for context around likely matches;
     3. fetch full observations only for filtered IDs;
     4. summarize at most a few relevant prior-context bullets;
     5. verify any code claims against the live filesystem/LSP before edits.

## Functional Requirements

### Worker discovery and status

- Read `CLAUDE_MEM_HOST` / `CLAUDE_MEM_PORT` first.
- Also support `CLAUDE_MEM_WORKER_HOST` / `CLAUDE_MEM_WORKER_PORT` for compatibility.
- Read `CLAUDE_MEM_DATA_DIR || ~/.claude-mem` `settings.json` for worker host/port when env is missing.
- Default to `127.0.0.1:37777`.
- Provide `/mem-status` showing `/api/health` worker status, resolved project, current content session ID, discovery source, and last injection project/count/size/limit metadata.
- If `/api/health` is not reachable, report that the claude-mem worker is missing/unreachable and tell the user to install/start claude-mem; do not auto-install or auto-start it.

### Memory capture and injection

- Initialize a `contentSessionId` at session start.
- Register the prompt with `/api/sessions/init` before capture is expected to matter.
- Keep memory capture on by default, with `FIREHORSE_MEM_CAPTURE=0` as the opt-out.
- Keep prior-context injection via `/api/context/inject?projects=<project>` enabled by default with a 20-observation cap.
- When context is injected, wrap it in `<firehorse-mem-context>` rather than upstream `<pi-mem-context>`.
- Rewrite injected-context headers/footers to Firehorse-owned wording while preserving observation content.
- Include an IMPORTANT 3-layer reminder in injected context: `mem_search` for compact IDs, `mem_timeline` for surrounding context, then `mem_get_observations` for selected full details.
- State that memory may be stale and code/project claims must be verified against live files/docs before edits.
- Control automatic injection with `FIREHORSE_MEM_INJECT=0|1`, `FIREHORSE_MEM_INJECT_MAX_OBSERVATIONS` defaulting to `20`, and optional `FIREHORSE_MEM_INJECT_MAX_TOKENS`.
- Make progressive manual search through `mem_` tools the preferred path for large recall.
- Capture non-memory tool results through `/api/sessions/observations` with truncation and fire-and-forget behavior.
- Rely on claude-mem prompt/session privacy filtering plus Firehorse memory-tool skip rules and response truncation; do not add a semantic privacy filter in v1.
- Summarize and complete sessions through claude-mem worker endpoints at agent end.

### Progressive memory tools

- `mem_search` parameters should mirror claude-mem MCP search exactly: `query`, `limit`, `project`, `type`, `obs_type`, `dateStart`, `dateEnd`, `offset`, `orderBy`; default `limit` to `20`.
- `mem_timeline` parameters should mirror claude-mem MCP timeline exactly: `anchor`, `query`, `depth_before`, `depth_after`, `project`.
- `mem_get_observations` should batch IDs through `/api/observations/batch`, require `ids`, and cap batches to 10 IDs by default.
- Do not hard-block `mem_get_observations` when no prior `mem_search` was seen in the same session; IDs may come from pasted context, timeline output, or the user.
- Preserve claude-mem worker output mostly raw, adding only wrapper error messages, project/default metadata, and output caps.
- Cap memory tool output with `FIREHORSE_MEM_TOOL_MAX_CHARS`, defaulting to a generous but bounded value while preserving worker formatting up to the cap.
- Tool descriptions must guide agents to avoid full-detail fetches before filtering.
- Expose raw worker-context diagnostics through a user command such as `/mem-status --raw-context` or a future `/mem-debug`, not as a model tool.

### Project identity

- Resolve project identity without shelling out, writing files, or hitting the network.
- Prefer checked-in manifest data over path basenames and over normal env fallback values.
- Do not infer from Superset worktree path segments except as diagnostics.
- Make project source visible in status/debug output.
- Keep env changes process-local.

### Packaging and migration

- Remove `./node_modules/pi-agent-memory/extensions` from the Firehorse Pi manifest once the Firehorse extension replaces it.
- Remove `./node_modules/pi-agent-memory/skills/mem-search` from the Firehorse Pi skill manifest and replace it with Firehorse-owned `./skills/firehorse/mem` guidance.
- Remove `pi-agent-memory` from `dependencies` and `bundledDependencies` when no Firehorse code imports it; do not keep it as a fallback because duplicate wrappers can double-record observations and conflict on project identity.
- Remove `claude-mem` bundling unless implementation proves Firehorse imports worker scripts. If the wrapper only talks to an existing worker, document `claude-mem` installation/status instead of bundling worker scripts.
- Retire `firehorse-claude-mem-worker.ts` because Firehorse no longer owns worker startup.
- Update `THIRD_PARTY_NOTICES.md`, update manifests, release notes, and run upstream checks after dependency changes.

## User Stories

1. As a Pi user, I want Firehorse to use my existing claude-mem worker/database so my Claude and Pi memories are shared.
2. As a Pi user, I want Firehorse to resolve the memory project from `.firehorse/manifest.json` when present so generated worktree paths do not split memory.
3. As a Pi user, I want compact memory search before full observation fetches so prior context does not flood the session.
4. As a Pi user, I want to inspect timeline context around a memory hit before deciding whether to load details.
5. As a Pi user, I want batched full observation fetches by ID when I have filtered candidates.
6. As a Firehorse maintainer, I want memory tool names owned by Firehorse so skills/workflows can rely on a stable Pi surface.
7. As a Firehorse maintainer, I want memory capture to continue working without exposing upstream `pi-agent-memory` directly.
8. As a Firehorse maintainer, I want setup/status output to identify the active worker, project, and memory surface.
9. As a Firehorse maintainer, I want code-intelligence guidance to stay with Pi-native LSP/ast-grep tools, not memory smart tools.

## Acceptance Criteria

- Firehorse Pi registers progressive claude-mem tools in Pi through `firehorse-mem.ts`, without the old MCP bridge.
- The tools call the existing claude-mem worker endpoints and work with existing claude-mem observations.
- Project defaults come from Firehorse manifest/repo metadata and are visible in status output.
- Memory capture uses claude-mem session endpoints by default and can be disabled with `FIREHORSE_MEM_CAPTURE=0`; context injection is enabled by default with a 20-observation cap.
- Firehorse no longer exposes upstream `pi-agent-memory` extension/skill paths in its Pi manifests.
- Firehorse-owned `mem` skill/workflow guidance references the new tools and the 3-layer workflow.
- Injected memory context, status text, and skills do not advertise stale `get_observations` / `mem-search` names without the `mem_` prefix.
- Injected memory context uses Firehorse-owned headers/footers, includes an IMPORTANT 3-layer reminder, and warns that memory may be stale.
- Typecheck passes for `packages/firehorse-pi` extensions.
- Setup docs describe worker discovery, project resolution, missing-worker remediation, and migration from upstream `memory_recall` to the `mem_` progressive discovery tools.
- Release notes explicitly announce that `memory_recall` is removed and replaced by `mem_search` → `mem_timeline` → `mem_get_observations`.

## Risks and Open Questions for Grilling

1. **Tool naming:** Resolved to `mem_` prefix (`mem_search`, `mem_timeline`, `mem_get_observations`) rather than generic MCP names or longer `claude_mem_` names.
2. **Compatibility alias:** Resolved: do not keep `memory_recall`; use only `mem_search`, `mem_timeline`, and `mem_get_observations`.
3. **Automatic context injection:** Resolved: capture by default and inject by default with a 20-observation cap; correct project scoping should resolve the observed bleed once released.
4. **Worker startup:** Resolved: the wrapper discovers/reports the existing worker and should not auto-start a bundled worker; retire `firehorse-claude-mem-worker.ts` unless a later PRD explicitly reintroduces worker management.
5. **Platform source:** Resolved: use `platformSource: "firehorse-pi"`.
6. **License/provenance:** Resolved: treat ArtemisAI `pi-mem.ts` as behavioral reference only; reimplement from claude-mem HTTP contracts and Pi docs, and document provenance in PRD/third-party notices.
7. **Project precedence:** Resolved: manifest wins over normal env fallback; explicit override requires an opt-in such as `FIREHORSE_MEMORY_PROJECT_OVERRIDE=1`.
8. **Cross-project search:** Resolved: allow only through an explicit `project` parameter; default remains scoped to the resolved Firehorse project.
9. **Observation capture privacy:** Resolved: rely on claude-mem prompt/session privacy filtering plus Firehorse memory-tool skip rules and truncation; no extra semantic filter in v1.
10. **Status command:** Resolved: use `/mem-status`.
11. **Context injection controls:** Resolved: use `FIREHORSE_MEM_INJECT=0|1`, `FIREHORSE_MEM_INJECT_MAX_OBSERVATIONS` defaulting to `20`, and optional `FIREHORSE_MEM_INJECT_MAX_TOKENS`; default injection is on with the 20-observation cap.
12. **Extension shape:** Resolved: use one primary wrapper extension, `firehorse-mem.ts`, folding in project resolution and retiring `firehorse-memory-project.ts`; retire `firehorse-claude-mem-worker.ts` because Firehorse should rely on an existing claude-mem worker rather than auto-starting one.
13. **Context tag:** Resolved: use `<firehorse-mem-context>`, not `<pi-mem-context>`.
14. **Capture opt-out:** Resolved: capture on by default with `FIREHORSE_MEM_CAPTURE=0` opt-out.
15. **Tool runtime enforcement:** Resolved: do not hard-block `mem_get_observations` when no prior `mem_search` happened; rely on tool descriptions and skills.
16. **Output formatting:** Resolved: preserve claude-mem worker output mostly raw, adding only wrapper errors, project/default metadata, and output caps.
17. **Injected-context rewriting:** Resolved: rewrite/wrap worker context headers and footers with Firehorse-owned guidance; do not mutate stored observations.
18. **Stale observation content:** Resolved: preserve historical observations as-is in v1, but tell agents that memory may be stale and must be verified against live files/docs.
19. **Injected guidance verbosity:** Resolved: include a clearly marked IMPORTANT 3-layer workflow, not only a minimal hint.
20. **Memory-quality findings:** Resolved: stale memory observations and stale injected instructions belong in Session Audit or a future memory-quality workflow, not wrapper-side stored-memory mutation.
21. **Raw worker context debugging:** Resolved: expose through a user command such as `/mem-status --raw-context` or future `/mem-debug`, not as a model tool.
22. **Worker health endpoint:** Resolved: use `/api/health` as canonical; OpenClaw docs describe worker-health status and the integration source calls `/api/health`.
23. **Tool parameter naming:** Resolved: mirror claude-mem MCP parameter names exactly (`obs_type`, `dateStart`, `dateEnd`, `orderBy`, `depth_before`, `depth_after`, `ids`).
24. **Output cap:** Resolved: use `FIREHORSE_MEM_TOOL_MAX_CHARS`, preserving raw worker formatting up to a generous bounded cap.
25. **Skill name:** Resolved: replace upstream `mem-search` with Firehorse-owned `mem` skill.
26. **Server-beta tools:** Resolved: do not expose manual write/generation tools such as `observation_add`, `observation_record_event`, or generation/status tools in v1.
27. **Injection default and cap:** Resolved: default injection to 20 observations; project bleed should be solved by correct project resolution in the new release.
28. **Search default limit:** Resolved: `mem_search` defaults to `limit=20`.
29. **Observation fetch batch cap:** Resolved: cap `mem_get_observations` to 10 IDs by default.
30. **Status injection diagnostics:** Resolved: `/mem-status` shows last injection size/count/project metadata and only dumps raw context with `--raw-context`.
31. **Missing-worker UX:** Resolved: `/mem-status` and setup docs report missing/unreachable claude-mem worker and tell users to install/start claude-mem; Firehorse does not auto-install or auto-start it.
32. **claude-mem bundling:** Resolved: remove `claude-mem` bundling unless implementation proves Firehorse imports worker scripts.
33. **Migration release notes:** Resolved: release notes explicitly announce `memory_recall` removal and replacement with `mem_search` → `mem_timeline` → `mem_get_observations`.
34. **Implementation issue breakdown:** Resolved: create local issue drafts after PRD consistency pass.
35. **PRD status:** Resolved: mark as `Draft — grilled, ready for issue breakdown`.

## Implementation Slices

1. **Research and PRD** — collect upstream diff, claude-mem endpoint/tool contract, Firehorse project identity constraints, and open decisions. This draft is the initial artifact.
2. **Pure helpers** — extract/test worker discovery, project resolution, URL construction, parameter shaping, output truncation, and memory-tool skip detection.
3. **Extension skeleton** — add `firehorse-mem.ts` with `/mem-status` and read-only worker health discovery.
4. **Progressive tools** — register `mem_search`, `mem_timeline`, and `mem_get_observations` with project defaults.
5. **Lifecycle bridge** — port session init/context/tool capture/summarize/complete behavior using Firehorse helpers.
6. **Packaging migration** — remove upstream `pi-agent-memory` exposure/dependency, retire Firehorse worker auto-start helper, and remove `claude-mem` bundling unless scripts are still imported.
7. **Guidance update** — replace upstream `mem-search` with Firehorse `mem` guidance, update setup docs, and add migration release notes.
8. **Validation** — run typecheck, definitions checks if manifests change, and a manual worker-backed smoke test.

## Testing Strategy

- Unit-test pure project resolution against manifest, GitHub remote config, worktree `.git` files, and env fallback fixtures.
- Unit-test worker discovery from env and claude-mem `settings.json` fixtures.
- Unit-test query/body shaping for `/api/search`, `/api/timeline`, and `/api/observations/batch`.
- Unit-test truncation and memory-tool skip logic.
- Unit-test `FIREHORSE_MEM_CAPTURE=0`, `FIREHORSE_MEM_INJECT=0|1`, `FIREHORSE_MEM_INJECT_MAX_OBSERVATIONS`, `FIREHORSE_MEM_INJECT_MAX_TOKENS`, and `FIREHORSE_MEM_TOOL_MAX_CHARS` behavior.
- Test that injected guidance/status/skills use `mem_` names and `<firehorse-mem-context>`, and do not advertise stale `memory_recall`, `mem-search`, `<pi-mem-context>`, or unprefixed `get_observations` instructions.
- Test that injected context preserves raw observation content while replacing headers/footers with the IMPORTANT Firehorse 3-layer workflow and stale-memory verification warning.
- Typecheck Firehorse Pi extensions.
- Add a manual smoke checklist for a running claude-mem worker:
  1. status command sees worker;
  2. `mem_search` returns compact IDs for current project;
  3. `mem_timeline` expands a selected ID;
  4. `mem_get_observations` fetches selected IDs;
  5. a Pi tool result is captured and later appears under the expected project.

## Source References

- ArtemisAI/pi-mem compare diff: <https://github.com/thedotmack/claude-mem/compare/main...ArtemisAI:pi-mem:main>
- ArtemisAI Pi extension source: <https://raw.githubusercontent.com/ArtemisAI/pi-mem/main/pi-agent/extensions/pi-mem.ts>
- ArtemisAI Pi package README: <https://raw.githubusercontent.com/ArtemisAI/pi-mem/main/pi-agent/README.md>
- claude-mem OpenClaw source: <https://raw.githubusercontent.com/thedotmack/claude-mem/main/openclaw/src/index.ts>
- Firehorse setup/memory context: `CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` D-38 and D-138
- Current Firehorse extension references: `packages/firehorse-pi/extensions/firehorse-memory-project.ts`, `packages/firehorse-pi/extensions/firehorse-claude-mem-worker.ts`
