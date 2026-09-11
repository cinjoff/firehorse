# Memory setup

What the self-hosted supermemory setup is on this machine, and which parts were
verified rather than assumed. Tickets #54, #55, and #56 produced it.

## The server

`supermemory-server` binds **6767**, not the 8787 the `supermemory local`
launcher advertises as its `--port` default. Everything downstream —
`SUPERMEMORY_API_URL` for the plugin hooks and for the CLI — points at 6767.

The `npx supermemory` package is a launcher only. The native binary comes from
`https://supermemory.ai/install` and lands at `~/.supermemory/bin/`, wrapped by
`~/.local/bin/supermemory-server`. Its configuration is `~/.supermemory/env`;
its data is an encrypted store under `~/.supermemory/data`. The API key printed
on first boot persists across restarts.

Embeddings run locally (`Xenova/bge-base-en-v1.5`, 768d, no key). Everything
else — summaries, chunking, memory extraction — needs an OpenAI-compatible
endpoint, which here is Ollama at `http://localhost:11434/v1`.

The server runs under launchd as `ai.supermemory.server`
(`~/Library/LaunchAgents/ai.supermemory.server.plist`, `RunAtLoad` and
`KeepAlive`), so it survives reboots. Without it, memory stops silently: the
plugin hooks fail soft, and a session looks normal while capturing nothing.

## The extraction model must support tool calling

This is the trap the setup is built around. `POST /v3/documents` returns
`queued` in milliseconds and extracts in the background, so a model that cannot
do the job still returns 200 and produces nothing. Observed with `llama3`:

```
memory agent failed (110ms): registry.ollama.ai/library/llama3:latest does not
support tools
```

The document finalized as `1 chunks, 0 memories` and the API never said so.
Always confirm a write by reading the document back and searching for it.

Three models were measured on the same one-chunk document:

| Model | Result |
|---|---|
| `llama3` | fails immediately — no tool support |
| `llama3.1:8b` | 147s, 0 memories |
| `qwen3:8b` | over 300s, never finished; reasoning output dominates |
| `gpt-oss:20b`, cold | stuck in a retry loop — see below |
| `gpt-oss:20b`, resident | 80s, 5 correct memories |

`gpt-oss:20b` is the setting, and it has to stay resident. Loading 13 GB takes
longer than the server's 30-second budget for its
`maintain-container-description` step, and when that step times out the ingest
workflow rolls back and retries the document instead of reaching the memory
agent. A document can loop there indefinitely.

Pin the model and the loop disappears:

```
curl -s http://localhost:11434/api/generate -d '{"model":"gpt-oss:20b","keep_alive":-1}'
```

`ollama ps` then reports `Forever`. The pin does not survive an Ollama restart,
and `launchctl setenv OLLAMA_KEEP_ALIVE` did not reach Ollama.app when tested —
re-run the curl after restarting Ollama. It costs 14 GB of resident memory.

## Environment

The plugin and the CLI read different variable names for the same key.

| Variable | Read by |
|---|---|
| `SUPERMEMORY_API_URL` | plugin hooks and CLI |
| `SUPERMEMORY_CC_API_KEY` | plugin hooks |
| `SUPERMEMORY_API_KEY` | CLI |
| `SUPERMEMORY_MCP_URL` | the plugin's MCP proxy only — see below |

`SUPERMEMORY_API_URL` and `SUPERMEMORY_MCP_URL` are also set in the `env` block
of `~/.claude/settings.json`, so the hooks work when Claude Code is launched
from an application rather than from a shell. The key is not: it lives in
`~/.supermemory-claude/credentials.json`, which the plugin reads directly.

## Container tags

The plugin derives a per-repo container as
`repo_<sanitized repo name>__<sha256(normalized git remote)[0:16]>`, taken from
`git rev-parse --git-common-dir`, so every worktree of a repo shares one
container. This repo's is `repo_firehorse__cb4653b1d26a8449`.

Resolve a tag with `npx supermemory tags list` and match on the repo-name
prefix. Do not recompute the hash.

## The plugin's dead MCP registration

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

## Deliberate recall

`firehorse-recall` (`packages/firehorse-core/definitions/skills/`) wraps the CLI
for explicit recall, per D-144. The supermemory plugin is a declared dependency
in both manifests and baselined in `upstreams.lock.json`.

Supermemory publishes two skills of its own — `supermemory-cli` in
[supermemoryai/skills](https://github.com/supermemoryai/skills) and an
SDK-integration skill in
[supermemoryai/supermemory](https://github.com/supermemoryai/supermemory/tree/main/skills/supermemory).
Neither repository ships a marketplace manifest, so neither can be declared as a
dependency. `firehorse-recall` links them rather than copying them.

## claude-mem

Both `claude-mem@thedotmack` and `claude-mem@firehorse` are disabled, not
uninstalled. Their 2.6 GB store under `~/.claude-mem` is untouched. No migration
(D-143); re-indexing selected history stays optional and separate.
