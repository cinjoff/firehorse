# Firehorse migration plan

Turn Firehorse from a cross-provider skill distribution into a Claude-only
workflow spine that depends on upstream plugins instead of copying them.

This is a historical plan, kept for its reasoning. Where a decision here has
since been reversed, the promoted entry in [`DECISIONS.md`](./DECISIONS.md)
says so.

Settled by a grilling session on 2026-09-10/11. Written against `e36d96a`
(v0.3.0) plus the uncommitted work in the `workflows-shared-adapters` worktree.

## The shape

Firehorse becomes a Claude Code plugin. (It was settled here as *personal*
tooling; D-170 later reversed that — the audience is anyone building software.) It keeps
the core→claude build structure: `firehorse-core` owns canonical definitions and
the projection generator, `firehorse-claude` is the generated distribution. It
drops Pi, drops vendoring, drops the agent roster, and adds no runtime.

What it owns after this migration:

- The definition format and the projector.
- Seven workflows that orchestrate upstream skills, each earning its place by
  adding something upstream does not do.
- A drift check that tells you when an upstream rename breaks your workflows.
- Repo setup state, in `.firehorse/manifest.json`.

Everything else comes from plugins you install.

## Decisions

These fifteen decisions were settled here and are now recorded in
[`DECISIONS.md`](./DECISIONS.md), which is the only `D-NN` sequence (D-178).
This file keeps the mapping, because commits, issues and older docs cite the
numbers on the left.

| Recorded here as | Now |
| --- | --- |
| D-155 | D-155 |
| D-156 | D-156 |
| D-157 | D-157 |
| D-158 | D-158 |
| D-159 | D-159 |
| D-160 | D-160 |
| D-161 | D-161 |
| D-162 | D-162 |
| D-163 | D-163 |
| D-164 | D-164 |
| D-165 | D-165 |
| D-166 | D-166 |
| D-167 | D-167 |
| D-168 | D-168 |
| D-150 | D-169 |

Read the promoted entry for the decision and its rationale, and for whether a
later decision has invalidated it — D-155 and D-168 both carry one.

## Phase 0 — Rescue

Nothing else is safe while three months of work sits uncommitted.

1. In the `workflows-shared-adapters` worktree, commit everything — all 130
   changed and untracked paths, no tidying — onto `snapshot/pre-migration`.
   Push it. Never merge it.
2. Branch `migration/claude-only` from `main` at `e36d96a`.
3. Cherry-pick onto it only what survives:
   - `packages/firehorse-core/src/setup/` (the manifest schema and validation)
   - `docs/PROJECT.md`, `docs/DECISIONS.md`
   - `docs/prds/` — as **staging only**, to be published as issues and deleted
     in Phase 6 (D-168)
   - `docs/agent-skills/` → renamed to `docs/agents/`
   - `packages/firehorse-claude/hooks/check-setup.mjs`
4. Delete `.planning/` and point `AGENTS.md` and `CLAUDE.md` at `docs/` instead.
   `.planning/STATE.md` already misreports the commit state.
5. Fast-forward local `main` to `origin/main`; it is stranded at the initial
   commit `5a3a02e`.

**Done when:** `migration/claude-only` carries the survivors, `snapshot/pre-migration`
is pushed, and nothing of value exists only in a working tree.

## Phase 1 — Subtract

Tag before deleting: `git tag pi-v0.3.0 e36d96a && git push --tags`.

Delete:

- `packages/firehorse-pi/` entirely — 149 tracked files plus ~4.6 MB of bundled
  upstream `node_modules`.
- `packages/firehorse-core/upstreams/` entirely — all six `UPSTREAM.json` pins
  and every vendored skill copy.
- `packages/firehorse-claude/skills/mattpocock/`, `skills/pbakaus/`,
  `skills/shadcn-ui/` — the mirrored copies. Shadcn goes entirely (D-166).
- The `feedback-loop` skill definition and its generated mirrors (D-166).
- All nine agents in `packages/firehorse-claude/agents/`.
- `packages/firehorse-core/src/providers/pi.ts` and its two export lines in
  `providers/index.ts`.
- `scripts/update-mattpocock-skills.mjs`, `update-impeccable-skills.mjs`,
  `update-shadcn-skill.mjs`, `check-upstreams.mjs`.
- `packages/firehorse-claude/guidance/claude-mem-preamble.md` (91 lines),
  `scripts/patch-claude-mem-project-env.cjs` (184 lines), the `claude-mem`
  dependency in both `.claude-plugin/marketplace.json:24` and
  `packages/firehorse-claude/.claude-plugin/plugin.json:13`.
- The root `package.json` `"pi"` manifest block, the `pi-package` keyword, and
  the seven Pi-only dependencies.

Note: removing Firehorse's claude-mem *wiring* is not the same as uninstalling
your claude-mem plugin. Leave the installed plugin running until Phase 7 stands
supermemory up, so you are never without memory.

Trim, do not delete:

- `src/definitions/projection.ts` — remove the Pi entry from the three return
  arrays in `projectWorkflow`, `projectSkill`, `projectAgentRole`, plus
  `piFrontmatter` and the `ProjectionProvider` union. Roughly 60–70 of 320 lines.
  `projectAgentRole` goes entirely under D-160.
- `src/definitions/manifests.ts` — four of seven fields in
  `GeneratedManifestEntries` are Pi. The file shrinks to near-trivial.
- `src/types.ts` — delete `agentRoleFrontmatterSchema` (L136-158) wholesale.
- `scripts/definitions.ts` — the Pi output dirs in the stale sweep (L29-31) and
  the Pi manifest writes (L225-256).
- `definitions.test.ts` and `definitions-cli.test.ts` — 98 Pi references between
  them. The largest single rewrite in this phase, and its own work item.

**Done when:** `pnpm typecheck`, `pnpm test`, and `pnpm definitions:check` pass
with no Pi reference anywhere outside the tag.

## Phase 2 — Rewire dependencies

Declare in `.claude-plugin/marketplace.json` and the plugin manifest:

- `mattpocock-skills` (official marketplace)
- `impeccable`

Install alongside, outside the plugin:

- `codebase-memory-mcp`

The supermemory plugin and its docs MCP are declared in Phase 7, not here.

**Done when:** a fresh `/plugin install firehorse@firehorse` pulls the upstream
plugins with it, and no skill ships twice.

## Phase 3 — Rebuild the definition set

Seven workflows in `packages/firehorse-core/definitions/workflows/`, each with a
populated `upstreamSkills` list.

| Workflow | What it adds | Orchestrates |
| --- | --- | --- |
| `/map` | Pre-fills the wayfinder map's `## Notes` with standing preferences — codebase graph, ADRs, `CONTEXT.md`, `DESIGN.md`, supermemory | `wayfinder` |
| `/build` | Graph query for the affected seam; prototype when UI and the shape is uncertain; impeccable when UI; verification evidence | `implement`, `tdd`, `prototype`, `impeccable` |
| `/fix-bug` | Graph trace of callers before hypothesising; regression evidence | `diagnosing-bugs` |
| `/ship` | PR, merge, changelog, tag, release, issue closure | — |
| `/new-project` | Repo, tracker, labels, setup, manifest, `DESIGN.md` interview, then calls `/index` | `setup-matt-pocock-skills` |
| `/index` | Indexes into codebase-memory-mcp and supermemory; writes derivable anchors; records freshness | `wayfinder` (narrative pass) |
| `/upstreams-check` | Drift and impact report | — |

Dropped: `create-plan` (wayfinder covers it), `review-code`, `diagnose-fix`,
`update-upstreams`, `plan-review` (D-166).

`/map` is the key one. Wayfinder's map body defines `## Notes` as "domain; skills
every session should consult; standing preferences for this effort", and every
session working that map reads it. Writing preferences there is how they reach
work you do days later, without forking wayfinder.

**Done when:** `definitions:write` produces seven Claude commands under
`packages/firehorse-claude/commands/firehorse/`, and `definitions:check` passes.

## Phase 4 — Drift check

Replace the deleted `check-upstreams.mjs` with something that watches installed
plugins rather than git pins.

- Record, per depended-on plugin: version, every skill ID it exposes, and a
  SHA-256 of each `SKILL.md`. Store as a lockfile in the repo.
- Compare against `~/.claude/plugins/` on disk.
- Report impact: cross-reference vanished or renamed skill IDs against every
  `upstreamSkills` entry and name the workflows that break.
- Expose as `pnpm upstreams:check`, and fold the reference check into
  `definitions:check` so breakage fails the existing gate.

Content hashes matter more than versions here: `zoom-out` → `wayfinder` is
invisible at version granularity on a continuously-shipped marketplace.

**Done when:** renaming a skill in a local plugin copy makes `definitions:check`
fail with the list of affected workflows.

## Phase 5 — Setup state

`.firehorse/manifest.json` keeps its schema module but changes content. Its old
job, pinning the memory project id, is obsolete: supermemory derives its container
from `git rev-parse --git-common-dir` plus the normalized git remote, which is
stable across all your Superset worktrees by design.

New content: whether `setup-matt-pocock-skills` has run, the commit at which the
repo was last indexed, whether the codebase anchors predate HEAD, whether
`DESIGN.md` exists.

`check-setup.mjs` stays as a SessionStart hook, hard-bounded: read the manifest,
compare recorded index commit to HEAD, print at most one line. No analysis, no
network, never fails startup. It reports state rather than injecting rules, so it
does not conflict with D-164.

## Phase 6 — Tracker consolidation

GitHub Issues becomes the only tracker (D-168). Local planning docs move into it
and then go.

1. **Publish the six PRDs as issues**, labelled `prd` + `parked` — PRD-0001
   through PRD-0006, bodies lifted from `docs/prds/*/PRD.md` with their
   `DECISIONS.md` and `ASK.md` content folded in as comments. They keep their
   reasoning where it can be found (D-169).
2. **Close the derived implementation tickets.** #26–#32 (PRD-0006, Pi memory
   over claude-mem) and #33–#42 (PRD-0005, session audit) close with a comment
   pointing at their parked PRD issue. The ideas survive as PRDs; the stale
   tickets do not.
3. **Extract the one durable idea** from PRD-0005 — auditing whether your own
   tooling actually got used well — into a single fresh issue against the new
   surface.
4. **Delete `docs/prds/` and `docs/issues/`.** Update the "Local files vs GitHub"
   section of `docs/agents/issue-tracker.md`, which currently permits PRDs and
   issue drafts to live in repo docs — under D-168 they do not.

Note this contradicts a pattern the rescued worktree leans on heavily: the
`new-project` and planning workflows there write local drafts first as
`docs/prds/prd-NNNN-*` and `docs/issues/issue-NNNN-*`. Phase 3 definitions must
publish straight to the tracker instead.

## Phase 7 — Memory

Last, deliberately (D-167): the surface supermemory serves is settled by now.

1. `npx supermemory local`. Note the API key printed on first boot.
   **Verify the port** — the self-hosting docs say `6767`, the CLI's own
   `supermemory local` defaults to `8787`.
2. Ollama for extraction:
   `OPENAI_BASE_URL=http://localhost:11434/v1 OPENAI_API_KEY=ollama OPENAI_MODEL=gpt-oss:20b`.
3. Shell profile, all three:
   - `SUPERMEMORY_API_URL=http://localhost:<port>` — read by the plugin hooks and the CLI
   - `SUPERMEMORY_CC_API_KEY=sm_...` — read by the plugin
   - `SUPERMEMORY_API_KEY=sm_...` — read by the CLI, same key, different variable
4. `/plugin install supermemory`, and
   `claude mcp add --transport http supermemory-docs https://supermemory.ai/docs/mcp`.
   The hooks are REST and honour `SUPERMEMORY_API_URL`; automatic capture and
   reasoned recall work.
5. Ship one Firehorse `SKILL.md` wrapping `npx supermemory search|add` for
   deliberate recall, explicit invocation only.
6. **Verify extraction actually produces memories.** `POST /v3/documents` returns
   `queued` immediately, so a misconfigured model fails silently and leaves an
   empty store.
7. Only now remove claude-mem. Start clean — no migration. Re-indexing selected
   history later remains open.

**Known broken and parked:** the supermemory plugin registers an MCP proxy
hardcoded to `https://mcp.supermemory.ai/mcp`, which your local key cannot
authenticate against. Its `context-gatherer` agent depends on those tools and is
dead weight. Nothing will invoke either once no skill references them. Revisit if
it proves noisy.

## Open items

| Item | Where it lands |
| --- | --- |
| The plugin's dead MCP registration | Parked; revisit after Phase 7 if noisy |
| Local server port: 6767 or 8787 | Phase 7 |
| Re-indexing claude-mem history into supermemory | After Phase 7, optional |
| Re-introducing shadcn by a non-vendored route | Deferred (D-166) |
| Whether `docs/PROJECT.md` and `docs/DECISIONS.md` also belong in the tracker | Phase 6 — they are anchors, not planning artifacts, so they likely stay |
