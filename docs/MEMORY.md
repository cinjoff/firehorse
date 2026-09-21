# Memory

Firehorse recalls past sessions from [claude-mem](https://docs.claude-mem.ai),
a background worker that keeps a SQLite store under `~/.claude-mem` (D-183).
Two halves reach it: claude-mem's hooks capture each session and inject a costed
index at session start, and the `firehorse-recall` skill queries it on purpose
(D-185).

The store is local. The compression that fills it is not. Every observation is
written by a model call, and this repo routes that call through the local
`claude` binary on the plan the session already runs on, so transcript content
reaches Anthropic under your own account. [What leaves the
machine](#what-leaves-the-machine) is the honest version of that sentence.

This page is a runbook first and a reference second. To set it up, start at
[Bring it up](#bring-it-up). To understand a specific behaviour, jump to
[How it works](#how-it-works).

## Bring it up

### Before you start

You need Node 20 or higher and a `claude` binary already signed in, because the
compression provider this repo chose calls it. claude-mem's installer pulls Bun
and uv itself when they are missing; uv is there for the Python that backs
Chroma's embedding service.

### 1. Install the plugin

Firehorse declares claude-mem as a dependency in both
`.claude-plugin/marketplace.json` and
`packages/firehorse-claude/.claude-plugin/plugin.json`, so
`/plugin install firehorse` already pulls it. To install it on its own:

```text
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem
```

Then restart Claude Code.

Take the marketplace route rather than `npx claude-mem install`. The interactive
installer pre-selects CMEM Pro, the hosted observer at cmem.ai, and the
marketplace route runs no picker (D-183).

### 2. Set the provider

Write these two keys into `~/.claude-mem/settings.json`:

```json
{
  "CLAUDE_MEM_PROVIDER": "claude",
  "CLAUDE_MEM_CLAUDE_AUTH_METHOD": "cli"
}
```

That is the Anthropic-plan provider: compression runs on the subscription the
session already bills to, and claude-mem never talks to cmem.ai. The model it
compresses with is `CLAUDE_MEM_MODEL`, `claude-haiku-4-5-20251001` on this
machine.

**`CLAUDE_MEM_CLAUDE_AUTH_METHOD` does not do what its name suggests.** In
13.25.2 the validator accepts `subscription`, `api-key`, `gateway` and `cli`,
and no code branches on any of them. What actually selects the auth path is
`~/.claude-mem/.env`: an `ANTHROPIC_API_KEY` there means api-key, an
`ANTHROPIC_BASE_URL` means gateway, and with neither set it falls through to the
OAuth token in the system keychain, which is what this repo wants. Write the key
for the next reader, then leave `.env` alone.

### 3. Turn telemetry off

claude-mem's PostHog analytics are on by default, and its error tracking sends
redacted error messages and stack traces. D-184 turns both off. Any one of these
is enough, and they are checked in that order:

```sh
DO_NOT_TRACK=1
CLAUDE_MEM_TELEMETRY=0
CLAUDE_MEM_TELEMETRY_ERRORS=0   # error text only, leaves the counters on
```

Or, once:

```sh
npx claude-mem telemetry disable
```

`npx claude-mem telemetry status` reports the current state and which of the
four layers decided it.

Cloud sync stays off (D-184). It is off by default, and enabling it uploads
observation narratives and full prompt text to a cmem.ai account.

**Not applied here yet.** On 2026-09-21 this machine had no
`~/.claude-mem/telemetry.json`, no telemetry key in `~/.claude-mem/settings.json`,
and no `DO_NOT_TRACK` in the session environment, so telemetry was still at its
default, which is on. Ticket
[#292](https://github.com/cinjoff/firehorse/issues/292) ships the installer
change that sets it.

**Chroma's own beacon is already off.** `CLAUDE_MEM_CHROMA_ENABLED` is `true`
and `CLAUDE_MEM_CHROMA_MODE` is `local`, so Chroma runs on `127.0.0.1:8000` as
the vector-search backend. Chroma ships its own `ANONYMIZED_TELEMETRY` beacon,
and claude-mem sets it to `false` in the environment it hands the `uvx`
preflight. Nothing to do here.

### 4. Restart Claude Code

The hooks are registered at session start, so nothing in the three steps above
takes effect in a session that was already running.

## Verify it

Ask the worker first. It answers on loopback, on the port in
`CLAUDE_MEM_WORKER_PORT`, which is `37777` here:

```sh
curl -sS http://127.0.0.1:37777/api/health
```

A healthy worker answers with its own version, its pid, and the provider it
resolved:

```json
{"status":"ok","version":"10.6.2","pid":19843,"initialized":true,"mcpReady":true,
 "ai":{"provider":"claude","authMethod":"Claude Code CLI (subscription billing)"}}
```

Check `version` against the plugin you installed. They disagreed here, and
[the running worker is not the installed
version](#the-running-worker-is-not-the-installed-version) says what that means.

Then confirm this repo's history is addressable. `GET /api/projects` lists every
project key the store holds, and `firehorse` should be one of them:

```sh
curl -sS http://127.0.0.1:37777/api/projects
```

Last, run a search from inside a session. `search(query="<something you know
happened>", project="firehorse", limit=5)` returning a row with a plausible date
proves the MCP tools are registered and reading the same store the worker serves.

## Troubleshooting

### The running worker is not the installed version

Three copies of claude-mem sit in the plugin cache on this machine:

| Path | Version | State |
|---|---|---|
| `~/.claude/plugins/cache/thedotmack/claude-mem/13.25.2` | 13.25.2 | installed, no orphan marker |
| `~/.claude/plugins/cache/thedotmack/claude-mem/10.6.2` | 10.6.2 | `.orphaned_at`, dated 2026-09-11 |
| `~/.claude/plugins/cache/firehorse/claude-mem/13.2.0` | 13.2.0 | `.orphaned_at`, dated 2026-09-11 |

The worker answering on 37777 is the orphaned one. `/api/health` reports
`"version":"10.6.2"` and a `workerPath` under the `10.6.2` directory, pid 19843,
started 2026-09-10 and up about ten days. Nothing restarted it when 13.25.2 was
installed, so an orphaned build keeps serving a store that a newer plugin's
hooks and MCP tools are writing to and reading from.

Treat a version mismatch between `/api/health` and the installed plugin as the
first suspect whenever behaviour does not match the docs, because the docs
describe the version you installed and not the one that is running. Restarting
the worker is the fix and is deliberately not a command on this page; take it
knowingly, because an in-flight compression dies with the process.

### A `Read` is denied with a timeline instead of a file

Working as designed. See [the file read gate](#the-file-read-gate). The deny
decision is shown to you, so you can allow the read when the timeline is not
what you needed.

### A session recalls nothing

Check the worker before anything else, with the `/api/health` call above. The
hooks fail soft, so a worker that is down leaves a session looking completely
normal while capturing and recalling nothing.

If the worker is up, check that the project key is the one you expect.
`GET /api/projects` lists them, and a repo resolves to its parent repository's
basename rather than the worktree's, per [project scoping across
worktrees](#project-scoping-across-worktrees).

### A `CAPTURE_BROKEN` file appears in `~/.claude-mem`

A hook received an empty stdin payload and wrote a marker rather than failing
silently. The one on this machine is dated 2026-05-15 and reads:

```
[bun-runner] empty stdin payload received — issue #2188
  payload byte length: 0
  payload type: null (no data event or stream error)
```

It names an upstream issue and the script that was invoked. It records a
capture that did not happen; it does not stop later captures.

## How it works

### The worker

claude-mem runs one background worker per machine, bound to `127.0.0.1` on
`CLAUDE_MEM_WORKER_PORT`. Its data directory is `CLAUDE_MEM_DATA_DIR`,
`~/.claude-mem` here, holding `claude-mem.db` plus a Chroma directory, logs,
and per-session observer state.

**The worker API has no request authentication, and its loopback bind is the
only defence.** This is verified rather than inferred: `GET /api/health`,
`GET /api/projects`, and `GET /api/version` on `127.0.0.1:37777` all answered
with no credentials of any kind. Anything that can reach the port can read the
store and write to it. Do not forward the port, and do not bind the worker to an
interface other than loopback.

### What leaves the machine

The store is a local SQLite file, and search runs against it. Compression does
not. Each observation is produced by a model call, and under
`CLAUDE_MEM_PROVIDER=claude` with `CLAUDE_MEM_CLAUDE_AUTH_METHOD=cli` that call
goes through the local `claude` binary, billed to the plan the session already
runs on. `/api/health` names it: `"authMethod":"Claude Code CLI (subscription
billing)"`. No third party is added, because the session was already talking to
Anthropic.

Be clear about what that means in practice. The worker re-sends tool
observations for compression out of band, on its own schedule, for sessions that
may already be over. So content from a session you finished this morning can be
sent this afternoon, from a process you are not watching. The plan absorbs the
cost, but the content still moves.

To hold something back entirely, wrap it in `<private>` tags. Claude can use the
content in the current session, and it is not stored as an observation. That is
claude-mem's documented mechanism for it, and it is the one to reach for with
credentials, customer data, or anything you would not want compressed into a
durable note.

### Project scoping across worktrees

**Writes split per worktree. Reads do not.** Those are different answers and the
difference matters, so do not collapse them.

13.25.2 detects a worktree by reading the `.git` file, resolving its `gitdir:`
line, and matching the result against `.git/worktrees/<name>`. When that matches
it returns three things:

```js
{ primary: `${parentProjectName}/${basename(cwd)}`,
  parent:  parentProjectName,
  allProjects: [parentProjectName, primary] }
```

In this worktree `.git` reads
`gitdir: /Users/konstantin/.superset/projects/firehorse/.git/worktrees/emphasized-drill`,
so `primary` is **`firehorse/emphasized-drill`** and `parent` is **`firehorse`**.

New observations are written under `primary`, so each worktree accumulates its
own project. The SessionStart hook injects across `allProjects`, joined and sent
as `?projects=firehorse,firehorse/emphasized-drill`, and the file-context hook
and transcript watcher do the same. So a worktree session still *reads* the
parent repository's history, including the 3,087 observations under `firehorse`
spanning 2026-05-14 to 2026-09-11.

That split is why D-187 adopts the existing store as-is: nothing needs migrating,
because the parent key is already on every read path.

Two consequences worth planning around:

- **`firehorse-recall` writes to `firehorse`, not to `primary`.** The save
  endpoint takes the project explicitly, and a deliberate note belongs to the
  repository rather than to whichever worktree happened to be open. The skill
  hardcodes the parent key for that reason.
- **Worktree directory names here are generated, not chosen.** This workspace is
  `emphasized-drill`; the next one will be another random word pair. Every new
  workspace therefore mints a fresh, meaningless project key that only its own
  sessions write to. They stay readable through the parent, but the project list
  grows names that mean nothing to a reader.

Older claude-mem keyed a worktree as the bare parent name. The worker running on
this machine is 10.6.2 and behaves that way, which is why the store currently
shows 16 clean repo names and no worktree paths. Expect
`firehorse/<worktree>` entries to appear once the installed 13.25.2 is the
version actually running.

### The file read gate

claude-mem registers a `PreToolUse` hook on `Read` that **denies** the read when
the file has prior observations, and returns a timeline of past work on it plus
an escalation ladder. It changes what reading a file means in this repo, so it
is worth understanding before it surprises you.

The gate lets a read through when the file is under 1,500 bytes, when the
project matches `CLAUDE_MEM_EXCLUDED_PROJECTS`, or when the file has no
observations. Otherwise the denial message offers four options, cheapest first:
proceed on the timeline titles alone, `get_observations([IDs])` at roughly 300
tokens each, `smart_outline` or `smart_unfold` at roughly 1k to 2k, or the full
read. The timeline's first line is the current date and time, which is what
makes "these observations are four months old, read the file" a decision you can
take.

Upstream's own numbers: a timeline costs about 370 tokens against 5k to 50k for
a typical source file. Those are claude-mem's figures, not measurements taken
here.

To turn the gate off, remove the entry with the `Read` matcher from
`hooks.PreToolUse` in `~/.claude/settings.json`. For a single file, allow the
denied read when it is presented to you.

### Deliberate recall

claude-mem's MCP tools are the recall surface, and Firehorse writes none of them
(D-185). The ladder is `search` for the index, `timeline` for what surrounded a
hit, `get_observations` for full detail on the hits you chose, and
`get_tool_uses` when a summary is not evidence enough. For code there are
`smart_search`, `smart_outline`, and `smart_unfold`.

Upstream's `mem-search` skill documents how to spend a token budget across them,
and it ships with the version you installed, so it cannot drift from the tools it
describes. `firehorse-recall`
(`packages/firehorse-core/definitions/skills/firehorse-recall.md`) deliberately
does not restate it. What that skill keeps is the repo-specific half: when to
reach for memory, that the repo wins a disagreement with it, reporting recall
with age attached, and the write path.

Writes go to the worker:

```sh
curl -sS -X POST "http://127.0.0.1:37777/api/memory/save" \
  -H 'Content-Type: application/json' \
  -d '{"text":"<the fact>","title":"<short title>","project":"firehorse"}'
```

The body takes `text`, plus optional `title`, `project`, and `metadata`. Because
`project` is explicit, a note written from any worktree lands on the repo's own
history.

claude-mem is a declared dependency in both manifests and baselined in
`upstreams.lock.json`, so the drift check watches its version.

### The old stores

`~/.claude-mem` is reused as-is, at 2.6 GB (D-187). Nothing was reset for the
cutover.

supermemory's stores are kept and frozen, not deleted: `~/.supermemory/data` at
532 MB and `~/.supermemory-claude/credentials.json` at 972 KB. The revisit date is
**2026-12-20**, by which point either something wanted them or nothing did.

Extraction is a compression step, and it compresses wrongly sometimes. A capture
in this store claimed the repo uses Turborepo, which it does not. Where a memory
and the repo disagree, the repo wins.

## Provenance

The wayfinder map
[#282](https://github.com/cinjoff/firehorse/issues/282) and tickets
[#283](https://github.com/cinjoff/firehorse/issues/283) through
[#292](https://github.com/cinjoff/firehorse/issues/292) produced this setup;
D-183 through D-187 record what it decided. Every number, path, and response
body above was observed on 2026-09-21, not assumed, except the two token figures
in [the file read gate](#the-file-read-gate), which are upstream's and are
labelled where they appear.
