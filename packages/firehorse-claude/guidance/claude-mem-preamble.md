# claude-mem Preamble for Firehorse Agents

Shared claude-mem usage guidance for Firehorse Claude subagents.

## Project identity

Always scope memory searches to the canonical repository project name, not the
current Superset/git worktree directory.

Project-id order:

1. `FIREHORSE_PROJECT_NAME` from setup / launcher env.
2. `CLAUDE_MEM_PROJECT` from setup / launcher env.
3. If env vars are missing, setup should resolve the repository with:

```sh
gh repo view --json name --jq .name
```

Superset path segments like `~/.superset/worktrees/<project>/...` are diagnostic
hints only.

Do **not** infer from git worktree parent directories or cwd basename for
Conductor/Superset workspaces. Some orchestrators store worktrees outside the
canonical repository root. If env vars are missing and `gh` cannot resolve the
repo, say that setup should pin the project id with `--memory-project <repo>`
instead of guessing.

For this repo shape:

```text
~/.superset/worktrees/firehorse/<owner>/<workspace>
```

use `project: "firehorse"`.

## Core Variant

Use for agents that investigate, plan, review, scout, or build.

### Tool readiness

claude-mem is a Firehorse plugin dependency. If tools are visible in this
subagent, prefer them. If a tool is unavailable, fall back silently to Read /
Grep / Glob and never fail the task solely because memory tools are missing.

Claude Code MCP tool allow-list:

```text
mcp__plugin_claude-mem_mcp-search__*
```

### Codebase navigation

Use smart tools for code exploration before loading full files:

- `smart_outline({ path })` — inspect file structure before reading content.
- `smart_search({ query })` — find symbols, functions, and patterns across the
  codebase.
- `smart_unfold({ path, symbol })` — read one function/class/symbol without
  loading the full file.
- Only use full `Read` when you need surrounding prose or are about to `Edit`.

### Pattern A: Past learnings check

Run near the start of investigative/planning/build tasks:

1. Derive canonical project id using the project identity rules above.
2. `search({ query: "2-3 keywords from task context", project, limit: 10 })`.
3. Scan titles/types first; prioritize `gotcha`, `decision`, and `trade-off`.
4. Fetch details only for the top 2-3 IDs with `get_observations({ ids })`.
5. If temporal context matters, call
   `timeline({ query, project, depth_before: 3, depth_after: 3 })`.
6. Present at most three bullets under `Prior context:` and continue.

Budget: keep this under 2% of context. Skip silently when results are irrelevant.

## Core Variant + Pattern D

Use for agents that produce findings worth remembering, such as reviewers,
workers, scouts, and debuggers.

After the task, include up to three significant reusable findings as tagged
bullets so claude-mem can capture them from the final response:

```text
**[review-learning]** area: pattern found → what worked or what to avoid
**[build-learning]** area: pattern found → what worked or what to avoid
```

Skip trivial findings such as typo fixes or one-off config changes.
