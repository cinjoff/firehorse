# Memory

Firehorse recalls past sessions from a self-hosted supermemory server that runs
entirely on your machine (D-143). Two halves reach it: the supermemory plugin's
hooks capture and inject automatically, and the `firehorse-recall` skill queries
it on purpose (D-144).

Nothing leaves the machine. Embeddings run locally and extraction runs against
a local Ollama model.

This page is a runbook first and a reference second. To set it up, start at
[Bring it up](#bring-it-up). To understand a specific behaviour, jump to
[How it works](#how-it-works).

## Bring it up

### Before you start

You need Node with `npx`, and [Ollama](https://ollama.com) running on
`localhost:11434`. Supermemory's server needs an OpenAI-compatible endpoint for
summaries, chunking, and memory extraction; embeddings need no key and no
endpoint.

### 1. Install the server

The `supermemory` npm package is a launcher only. It fetches the native binary
from `https://supermemory.ai/install`:

```sh
npx -y supermemory@latest local install
```

The binary lands at `~/.supermemory/bin/supermemory-server`, wrapped by
`~/.local/bin/supermemory-server`.

### 2. Install the extraction model

**The model must support tool calling.** A model that does not still returns
HTTP 200 and produces no memories — see
[Extraction fails silently](#extraction-fails-silently).

```sh
ollama pull gpt-oss:20b
```

### 3. Configure the server

Write `~/.supermemory/env`:

```sh
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=gpt-oss:20b
SUPERMEMORY_DATA_DIR=$HOME/.supermemory/data
```

```sh
chmod 600 ~/.supermemory/env
```

### 4. Start the server and keep the key

```sh
supermemory-server
```

It binds **6767** and prints an API key on first boot. Keep that key — the rest
of the setup uses it, and it persists across restarts.

To run it under launchd so it survives reboots, write
`~/Library/LaunchAgents/ai.supermemory.server.plist` with `RunAtLoad` and
`KeepAlive` pointing at `~/.local/bin/supermemory-server`, then:

```sh
launchctl load ~/Library/LaunchAgents/ai.supermemory.server.plist
```

Run it under launchd if you want memory to be reliable. The plugin hooks fail
soft, so with the server down a session looks completely normal while capturing
and recalling nothing.

### 5. Pin the model in memory

Skip this and ingest deadlocks on a cold model — see
[Documents never finish indexing](#documents-never-finish-indexing).

```sh
curl -s http://localhost:11434/api/generate \
  -d '{"model":"gpt-oss:20b","keep_alive":-1}'
```

`ollama ps` should then report `Forever` in its `UNTIL` column. Re-run this after
every Ollama restart; the pin does not survive one, and
`launchctl setenv OLLAMA_KEEP_ALIVE` did not reach Ollama.app when tested.

### 6. Set the environment

The plugin and the CLI read different variable names for the same key.

| Variable | Read by |
|---|---|
| `SUPERMEMORY_API_URL` | plugin hooks and CLI |
| `SUPERMEMORY_CC_API_KEY` | plugin hooks |
| `SUPERMEMORY_API_KEY` | CLI |
| `SUPERMEMORY_MCP_URL` | the plugin's MCP proxy only — see [The plugin's dead MCP registration](#the-plugins-dead-mcp-registration) |

Set all four in your shell profile. Then set the two URLs a second time, in the
`env` block of `~/.claude/settings.json`:

```json
{
  "env": {
    "SUPERMEMORY_API_URL": "http://localhost:6767",
    "SUPERMEMORY_MCP_URL": "http://localhost:6767/mcp"
  }
}
```

Claude Code launched from an application sources no shell profile. Without this,
the hooks fall back to the hosted service and say nothing about it.

Keep the key out of `settings.json`. Put it in
`~/.supermemory-claude/credentials.json`, which the plugin reads directly:

```json
{ "apiKey": "sm_..." }
```

```sh
chmod 600 ~/.supermemory-claude/credentials.json
```

### 7. Install the plugin

Claude Code installs the supermemory plugin alongside Firehorse — it is a
declared dependency in both manifests. To install it on its own:

```text
/plugin marketplace add supermemoryai/claude-supermemory
/plugin install supermemory@supermemory-plugins
```

Its four hooks are REST and honour `SUPERMEMORY_API_URL`, so capture and recall
run fully local.

Supermemory's public documentation is also available over MCP. It carries no
user data:

```sh
claude mcp add --scope user --transport http \
  supermemory-docs https://supermemory.ai/docs/mcp
```

## Verify it

Write a document, wait, then search for it. Extraction is asynchronous, so a
successful write proves nothing on its own.

```sh
export SUPERMEMORY_API_URL=http://localhost:6767
export SUPERMEMORY_API_KEY=sm_...

npx supermemory add "The firehorse drift check writes upstreams.lock.json." \
  --tag <your tag> --title "drift check"
npx supermemory docs get <returned id>     # wait for status: done
npx supermemory search "drift check" --tag <your tag> --limit 5 --json
```

Resolve `<your tag>` with `npx supermemory tags list` — see
[Container tags](#container-tags).

A one-chunk document takes about 80 seconds end to end with the model resident.

## Troubleshooting

### Extraction fails silently

`POST /v3/documents` returns `queued` in milliseconds and extracts in the
background, so a model that cannot do the job still returns 200 and produces
nothing. Check the server log:

```
memory agent failed (110ms): registry.ollama.ai/library/llama3:latest does not
support tools
```

The document finalized as `1 chunks, 0 memories` and the API never said so. Use
a tool-calling model, and always confirm a write by reading the document back.

### Documents never finish indexing

A document that re-embeds repeatedly and never reaches the memory agent is stuck
on a cold model. Loading 13 GB takes longer than the server's 30-second budget
for its `maintain-container-description` step; when that step times out, the
ingest workflow rolls back and retries the document. It can loop there
indefinitely.

Pin the model as in [step 5](#5-pin-the-model-in-memory). Pinned, the same
document finished in 80 seconds with five correct memories.

### A session recalls nothing

Check the server first — `curl -s -o /dev/null -w '%{http_code}'
http://localhost:6767/v3/documents -H "Authorization: Bearer $SUPERMEMORY_API_KEY"`.
The hooks fail soft, so a dead server is invisible from inside a session.

If the server is up, check that Claude Code sees `SUPERMEMORY_API_URL`. Launched
from an application it reads `~/.claude/settings.json`, not your shell profile.

### `/mcp` shows supermemory as failed

Expected. See
[The plugin's dead MCP registration](#the-plugins-dead-mcp-registration).

## How it works

### The server

`supermemory-server` binds **6767**, not the 8787 the `supermemory local`
launcher advertises as its `--port` default. Its configuration is
`~/.supermemory/env` and its data is an encrypted store under
`~/.supermemory/data`.

Embeddings run locally (`Xenova/bge-base-en-v1.5`, 768d, no key). Summaries,
chunking, and memory extraction go to the OpenAI-compatible endpoint.

### Container tags

The plugin derives a per-repo container as
`repo_<sanitized repo name>__<sha256(normalized git remote)[0:16]>`, taken from
`git rev-parse --git-common-dir`, so every worktree of a repo shares one
container. This repo's is `repo_firehorse__cb4653b1d26a8449`.

Resolve a tag with `npx supermemory tags list` and match on the repo-name
prefix. Do not recompute the hash.

### Deliberate recall

`firehorse-recall`
(`packages/firehorse-core/definitions/skills/firehorse-recall.md`) wraps the CLI
for explicit recall, per D-144. It searches wide and shallow first and fetches
full documents only for the hits you chose.

The supermemory plugin is a declared dependency in both manifests and baselined
in `upstreams.lock.json`, so the drift check watches its version.

Supermemory publishes two skills of its own — `supermemory-cli` in
[supermemoryai/skills](https://github.com/supermemoryai/skills) and an
SDK-integration skill in
[supermemoryai/supermemory](https://github.com/supermemoryai/supermemory/tree/main/skills/supermemory).
Neither repository ships a marketplace manifest, so neither can be declared as a
dependency. `firehorse-recall` links them rather than copying them.

### The plugin's dead MCP registration

The plugin ships a `.mcp.json` registering a stdio proxy hardcoded to
`https://mcp.supermemory.ai/mcp`. It reads `SUPERMEMORY_MCP_URL` — a different
variable from the `SUPERMEMORY_API_URL` the hooks use — and the self-hosted
binary exposes no MCP endpoint to point it at. With a local key it returns:

```
plugin:supermemory:supermemory - Failed to connect
  -32000: Supermemory MCP 401: {"error":"Invalid or expired token"}
```

Measured cost: one failed stdio spawn per session, ~0.3s, no tools registered
and so no token cost. `disabledMcpjsonServers` does not switch it off — tested
with `supermemory`, `plugin:supermemory:supermemory`, and
`supermemory:supermemory`, and all three still connected and failed. That key
governs project `.mcp.json` servers; Claude Code has no equivalent for one
server provided by a plugin.

The real cost is not the noise. Left alone, the proxy sends the local API key in
an `Authorization` header to `mcp.supermemory.ai` at every session start.
`SUPERMEMORY_MCP_URL=http://localhost:6767/mcp` keeps it on this machine; the
server has no such endpoint, so the proxy fails locally instead. The residue is
then one red line in `/mcp` and a `context-gatherer` agent that cannot run.

That is tolerable, so D-143 stands. It would not be if the proxy were the only
way to reach memory — but the hooks and the CLI both speak REST and both honour
`SUPERMEMORY_API_URL`, so nothing depends on it.

### Why gpt-oss:20b

Four models were measured on the same one-chunk document:

| Model | Result |
|---|---|
| `llama3` | fails immediately — no tool support |
| `llama3.1:8b` | 147s, 0 memories |
| `qwen3:8b` | over 300s, never finished; reasoning output dominates |
| `gpt-oss:20b`, cold | stuck in a retry loop |
| `gpt-oss:20b`, resident | 80s, 5 correct memories |

It is the only one that produced correct memories. Extraction is asynchronous,
so its latency costs nothing interactive, but it costs 14 GB of resident memory.

Memories extracted from a session transcript are measurably less accurate than
memories extracted from a written fact — one capture claimed this repo uses
Turborepo, which it does not. The same model got every claim right on a plain
factual document. Where a memory and the repo disagree, the repo wins.

### claude-mem

Both `claude-mem@thedotmack` and `claude-mem@firehorse` are disabled, not
uninstalled. Their 2.6 GB store under `~/.claude-mem` is untouched. No migration
(D-143); re-indexing selected history stays optional and separate.

## Provenance

Tickets [#54](https://github.com/cinjoff/firehorse/issues/54),
[#55](https://github.com/cinjoff/firehorse/issues/55), and
[#56](https://github.com/cinjoff/firehorse/issues/56) produced this setup. Every
number and error string above was observed, not assumed.
