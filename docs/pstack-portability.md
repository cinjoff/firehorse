# pstack portability

Research notes for [#138](https://github.com/cinjoff/firehorse/issues/138). Extends
[`pstack-workflow.md`](./pstack-workflow.md), which summarises pstack, and
[`verification-harnesses.md`](./verification-harnesses.md), which priced the verification
cluster. This note answers one question across all ten clusters of
[#129](https://github.com/cinjoff/firehorse/issues/129)'s inventory: what does pstack
depend on that Cursor provides and Claude Code does not, and what does each gap cost.

The headline is that the list of genuinely dead parts is much shorter than the surface
area suggests. Most of what reads as Cursor-specific is a path, a field name, or a
warning about a Cursor quirk that does not exist here. Two things have no equivalent, and
one load-bearing premise degrades rather than breaks.

## Source note

Read in full, from the source that owns each claim:

- **pstack**, from the local clone of [`backnotprop/pstack`](https://github.com/backnotprop/pstack)
  (MIT, `.cursor-plugin/plugin.json` version 0.14.1, clone at `18e0e90`). Every
  `SKILL.md`, both files in `agents/`, `skills/poteto-mode/SKILL.md` and all 23
  playbooks plus `references/plan.md`, the `benny` pack, and the frontmatter of every
  Markdown file in the tree. Grepped exhaustively for `.cursor` paths, `Task` call
  parameters, `subagent_type` values, model slugs, slash commands, tool names, and
  references to things that "ship elsewhere".
- **Claude Code docs** (first-party, `code.claude.com/docs/en/`):
  [Skills](https://code.claude.com/docs/en/skills),
  [Subagents](https://code.claude.com/docs/en/sub-agents),
  [Hooks](https://code.claude.com/docs/en/hooks),
  [Commands](https://code.claude.com/docs/en/commands),
  [Model configuration](https://code.claude.com/docs/en/model-config),
  [Run agents in parallel](https://code.claude.com/docs/en/agents),
  [Agent teams](https://code.claude.com/docs/en/agent-teams),
  [Dynamic workflows](https://code.claude.com/docs/en/workflows),
  [Worktrees](https://code.claude.com/docs/en/worktrees),
  [Cross-session messaging](https://code.claude.com/docs/en/cross-session-messaging),
  [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web),
  [Routines](https://code.claude.com/docs/en/routines),
  [Scheduled tasks](https://code.claude.com/docs/en/scheduled-tasks),
  [Memory](https://code.claude.com/docs/en/memory),
  [Advisor](https://code.claude.com/docs/en/advisor),
  [Plugins reference](https://code.claude.com/docs/en/plugins-reference),
  [Settings](https://code.claude.com/docs/en/settings).
- **Checked on this machine**, Claude Code 2.1.270: `claude --version`,
  `claude mcp list`, and the layout of `~/.claude/projects/<slug>/`.
- **Not read**: Cursor's own documentation, and the `cursor-team-kit` skills pstack
  references but does not bundle (`control-cli`, `control-ui`, `deslop`). Every claim
  about Cursor behaviour below comes from pstack's own prose, so a Cursor mechanism I
  describe is what pstack says it does, not what Cursor documents.

## Verdict vocabulary

Four words, used consistently in the tables.

- **Ports.** A direct equivalent exists. Usually a rename.
- **Ports with a rewrite.** The capability exists under a different shape. The
  instruction has to be rewritten, and the rewrite is bounded.
- **Mechanism ports.** No feature equivalent. The thing the mechanism buys is reachable
  another way, at a named cost.
- **Dead.** No equivalent and nothing to route around. Either the dependency is a Cursor
  product surface or the instruction is a no-op here.

## Skill and plugin format

| Dependency | Claude Code equivalent | What the mechanism buys | Cost of the gap |
|---|---|---|---|
| `.cursor-plugin/plugin.json` with `skills` and `agents` keys | `.claude-plugin/plugin.json`, which takes `skills`, `agents`, `commands`, `hooks` (and more) as a path string or a path list. **Ports.** | Packaging a skill set as one installable unit | None. `packages/firehorse-claude/` already has this shape. |
| `disable-model-invocation: true`, on 20 of pstack's skills | The identical field name and semantics, plus `user-invocable: false` for the inverse. **Ports.** | User-only invocation for heavy or side-effecting workflows | None. This is the one field that transfers verbatim. |
| `.cursor/skills/`, `~/.cursor/skills/` | `.claude/skills/`, `~/.claude/skills/`, plus nested and monorepo discovery and `--add-dir`. **Ports.** | Project and personal skill scopes | None. |
| Playbooks as reference files inside the mode's skill directory, opened only on match | Skills are directories; supporting files sit beside `SKILL.md` and resolve through `${CLAUDE_SKILL_DIR}`. **Ports.** | 23 workflows at one skill's context cost | None. The conditional-loading trick is the same trick. |
| `~/.cursor/rules/pstack-models.mdc` with `alwaysApply: true` | No `.mdc` rules. `CLAUDE.md` is read at the start of every session; path-specific rules scope it; a skill's `paths:` frontmatter scopes a skill to matching files; `SessionStart` and `InstructionsLoaded` hooks inject text. **Ports with a rewrite.** | One always-applied file every skill reads at run time | Low, and see [Model-per-role routing](#model-per-role-routing) for why the file itself stops earning its place. |
| `~/.cursor/plugins/` (cited by `reflect`'s tooling reviewer) | `~/.claude/plugins/`. **Ports.** | Locating installed plugin skills | None. |
| `mode: true` on `poteto-mode`, and Opt+Enter to pin it | No sticky-mode field. **Mechanism ports**, precisely: a skill's `hooks:` frontmatter block registers hooks when the skill is invoked and Claude Code **keeps running them for the rest of the session**, including on later turns. A `UserPromptSubmit` hook returning `hookSpecificOutput.additionalContext` puts a string into context wrapped in a system reminder on every turn. | A per-turn reminder that the mode is on, surviving turns the mode is not mentioned | A hook script instead of a frontmatter boolean. That is the whole cost, and the hook is strictly more capable: it can vary its text, check state, and remove itself with `once: true`. |
| `reminder:` frontmatter (`"New task? Playbook match or rigor needed -> apply /poteto-mode…"`) | The literal string a `UserPromptSubmit` hook emits. **Mechanism ports.** | The exact text of the per-turn nudge | None beyond the hook above. |
| `icon: crown`, `color: yellow` | Subagent frontmatter takes `color`, and `yellow` is one of its eight values. No `icon` field. **Ports with a rewrite.** | Cosmetic | Zero. |

The sticky-mode row is the single most important line in this document. #138 guessed it
correctly: a sticky mode buys a reminder on every turn, and the reminder mechanism is
first-class here. Skill hooks are documented to persist for the session, which is exactly
the property `mode: true` provides. Note the counterweight the docs supply: a skill's
rendered content enters context once and Claude Code **does not re-read the file on later
turns**, so a Claude Code port of `poteto-mode` has to write its rules as standing
instructions rather than one-time steps, and carries a compaction budget (the most recent
invocation of each skill is re-attached after a summary, first 5,000 tokens each, 25,000
tokens shared). pstack's "copy the playbook's steps into the todolist verbatim before you
reason" is, read this way, a workaround for the same decay.

## Tools and built-ins pstack calls

| Dependency | Claude Code equivalent | What the mechanism buys | Cost of the gap |
|---|---|---|---|
| `AskQuestion` tool, named in `poteto-mode`, `setup-pstack`, `automate-me`, `autonomous-run`, `orchestrate`, `references/plan.md` | `AskUserQuestion`. **Ports in the main conversation only.** It is on the list of tools removed from **every** subagent. | Structured multi-choice questions instead of free text | None in the main thread. In subagents the gap is a feature: pstack's "a worker cannot ask you a question" and `never-block-on-the-human` are structurally enforced here rather than asserted. |
| Cursor's built-in `create-skill`, cited by `reflect`, `automate-me`, `authoring-a-skill`, `references/plan.md`, and `poteto-mode`'s prose trigger | No bundled equivalent. The [`skill-creator` plugin](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator) from `claude-plugins-official` covers authoring plus the eval loop pstack's `reflect` wants: `evals/evals.json` test cases, one subagent per case, `grading.json`, a with-skill versus without-skill benchmark, a blind A/B between two versions, and description tuning against should-trigger and should-not-trigger prompts. **Ports with a rewrite.** | A canonical authoring loop with a draft / test / iterate discipline, and a description-optimisation loop | An install (`/plugin install skill-creator@claude-plugins-official`), not a built-in. Any definition that routes to it must say so. The compensation is large: `skill-creator` also subsumes most of the eval playbook in cluster 8. |
| Cursor's built-in `babysit`, which `poteto-mode` spends a bullet and a playbook preamble avoiding | No `babysit` bundled skill. **Dead instruction.** | Nothing | Zero, and a small win. The name collision the playbook is written around does not exist, so two paragraphs of disambiguation delete cleanly. |
| Cursor's `/loop` (`autonomous-run` step 2, `babysit` step 6, `orchestrate`'s frontier watcher) | `/loop [interval] [prompt]`, a bundled skill, alias `/proactive`. Omit the interval and Claude self-paces; omit the prompt and it runs the built-in maintenance prompt or your `loop.md`. **Ports.** | A wake mechanism for a run with no human in it | None. Present in this session's skill list. |
| `/deslop` and the `deslop` skill, stated to ship in `cursor-team-kit` | Not bundled anywhere. `/code-review` (levels low through ultra, `--comment`, `--fix`), `/simplify`, and `/security-review` cover adjacent ground. **Dead, cheap to replace.** | A pre-commit pass that strips code slop, as `unslop` does for prose | Small. `deslop`'s body was never readable from pstack either, so nothing is lost that was ever available. `/simplify` is the nearest bundled thing. |
| `control-cli` and `control-ui`, stated to ship in `cursor-team-kit`, named as the runtime-verification floor by `poteto-mode`, `orchestrate`, both autopilots, and `no-comments` | Not bundled. `/run`, `/verify`, `/run-skill-generator` occupy the launch half. **Dead as written; the role is half-filled.** | A shipped harness an agent calls to drive a real UI or CLI | This is the gap [#131](https://github.com/cinjoff/firehorse/issues/131) already priced and [#135](https://github.com/cinjoff/firehorse/issues/135) owns. Claude Code records launch, not features, and emits steps, not a CLI. Nothing here changes that verdict. |
| Bugbot and "the agentic security review", with a shared triage rubric at `references/bugbot-triage.md`, load-bearing in `babysit` step 8 and both autopilots | `/code-review`, `/security-review`, and Auto-fix through the Claude GitHub App, which responds to CI failures and review comments on a pull request. **Ports with a rewrite.** | A bot files findings on your PR and you triage them skeptically rather than churning code | Low. The posture, the fix-or-dismiss-with-disproof rule, the pass-count escalation, and the "never churn code to quiet a bot" line are all bot-agnostic. Only the rubric's worked examples are Cursor-specific. |
| Cursor Slack actions, `SendSlackMessage`, `PostToSlack`, `BENNY_SLACK_BOT_TOKEN` | Claude Tag (Claude in Slack) and any Slack MCP server. **Ports with a rewrite.** | Reading and posting in a thread as an identity | Moderate. Benny's fail-closed design turns on the coordinator being the only poster and children provably lacking Slack credentials. `mcpServers` in subagent frontmatter gives exactly that isolation, and it is per-definition rather than per-prompt, so the guarantee gets stronger. |
| Cursor's built-in `/automate` and the Automations editor handoff (the whole `benny` setup path) | `/schedule` and [routines](https://code.claude.com/docs/en/routines), which run sessions on a cron in the cloud, plus Claude Tag channel sessions and `CronCreate`. **Mechanism ports.** | Creating a reviewed, triggered automation through a product UI | High for `benny` as written. The reviewed-draft-then-editor-handoff flow, the Cursor protocol deep links it forbids, `.cursor/settings.json`, and `.cursor/automations/benny/` are a Cursor product surface with no analogue. The triage and repro *skills* port; the installer does not. |
| `scripts/watch-pr/watch-pr`, `scripts/orch/orch.ts`, `scripts/bootstrap.ts`, `scripts/worktree-audit.sh`, `show-me-your-work/scripts/log.sh` | Nothing needed. These are bun and bash over `git` and `gh`, with no Cursor API. **Port as-is.** | Levers instead of prose | Only a `bun` dependency. |
| Graphite (`gt`, `gt submit --stack`, `gt restack`, `gt sync`, merge-when-ready, the Graphite UI), all through `babysit`, `shipping`, `orchestrate`, and both autopilots | Not a Cursor dependency. `gt` is a third-party CLI that runs anywhere. **No port problem.** | Stacked PRs with tracked metadata | Zero from Cursor. Whether Firehorse wants a stacking tool at all is a separate question this map has not asked. |
| "inspect the `mcps/` directory Cursor exposes for enabled MCP servers" (`why` step, the load-bearing discovery step of the whole understanding cluster) | `claude mcp list`, which prints every configured server with a health verdict, plus `/mcp` and the model's own tool list. **Ports, and improves.** | Enumerating which evidence categories are reachable this session | Negative. Verified on this machine: the output distinguishes connected, disabled for this project, needs authentication, and failed to connect. `why`'s "null results are findings" discipline gets a fourth state it did not have, since a server that *looks* enabled and is actually 404ing is now visible rather than silently empty. |

## The subagent contract

pstack's contract, gathered from `poteto-mode`'s Subagents section, `agents/*.md`, `swarm`,
`arena`, `reflect`, `interrogate`, `no-comments`, `how`, and `orchestrate`. Eight
parameters. Five port, one is a no-op, two have no equivalent.

| pstack spawn parameter | Claude Code | Verdict |
|---|---|---|
| `subagent_type: "poteto-agent"` | `.claude/agents/poteto-agent.md` plus the `subagent_type` parameter on the Agent tool. The agent body becomes the system prompt; subagents get that prompt plus basic environment details, not Claude Code's own system prompt. | **Ports.** |
| `subagent_type: generalPurpose` (7 of pstack's 10 typed spawns) | `general-purpose`. | **Ports**, renamed. |
| `subagent_type: "Comment Sicko"` | Subagent `name` must be lowercase letters and hyphens, and may not contain `:`. `comment-sicko`. The persona stays in the body, which is what carries it anyway. | **Ports**, renamed. |
| The built-in `plan` subagent type, which `references/plan.md` forbids ("it ignores this skill") | Built-in `Plan` and `Explore` subagents exist, with the same property: they have their own prompts. The warning transfers unchanged. | **Ports.** |
| `is_background: true` (agent frontmatter, on `poteto-agent`) | `background: true`. | **Ports.** |
| `run_in_background: true` as the default on every call | Claude Code decides, not the caller. Where fork mode is on, which is the default in an interactive session, every subagent runs in the background and Claude cannot ask for the foreground. Where it is off (`-p`, the SDK), Claude picks, and `background: true` in the definition pins it. | **Ports with a rewrite.** pstack's default is Claude Code's default. The cost is a documented one: a background subagent keeps every MCP tool but only a reduced built-in set (`Read`, `Grep`, `Glob`, `Bash`, `PowerShell`, `Edit`, `Write`, `NotebookEdit`, `WebFetch`, `WebSearch`, `TodoWrite`, `Skill`, `ToolSearch`, `EnterWorktree`, `ExitWorktree`, `Monitor`, `TaskStop`, `SendMessage`, `Artifact`). Forks skip both filters. |
| `readonly: false` (agent mode), with the repeated warning that "readonly strips MCPs" — stated five times across `reflect`, `why`, and `poteto-mode` | No such mode. `permissionMode` (`default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`, `manual`) governs approval, not tool availability, and background subagents keep every MCP tool. | **Dead instruction.** Every one of those five warnings is a no-op here. Zero cost, and one less thing to get wrong. |
| `readonly: true` for judges and reviewers (`arena`'s cross-judge, `interrogate`'s panel, `benny`'s children) | `tools:` as an allowlist or `disallowedTools:` as a denylist, per agent definition. An entry with a specifier such as `Bash(git push *)` removes the whole tool. | **Ports with a rewrite**, and the rewrite is stronger: the restriction lives in the definition rather than in a per-call flag, so a reviewer cannot be spawned writable by accident. |
| `environment: "cloud" \| "local"`, the default for every `swarm` worker and every `orchestrate` worker and verifier | **No equivalent on the Agent tool.** Cloud sessions exist (`--cloud` to create one, `--teleport` to pull one local, routines, Claude Tag, configurable cloud environments), but a local session cannot spawn one as a subagent. The docs are explicit that a routine "runs a session on a schedule in the cloud, not in parallel on your machine". | **Mechanism ports, at a cost.** See [Cloud agents](#cloud-agents-and-parallelism). |
| `cloud_base_branch`, for a worker starting from a non-default pushed branch | `worktree.baseRef` takes only `"fresh"` or `"head"`, is a settings-file global rather than a per-spawn parameter, and explicitly cannot be set to a branch name. `--worktree '#123'` branches a whole session from a pull request into `.claude/worktrees/pr-<number>`. | **Mechanism ports.** The brief does `git worktree add <path> <branch>` itself. One line in the brief template, and `orchestrate` already has a FORBIDDEN field for keeping workers off stack operations. |
| "nesting works to depth 3" | Default depth 3 below the main conversation, configurable with `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`; `1` turns nesting off. At the limit the `Agent` tool is withheld. | **Ports.** The numbers coincide exactly. |
| "cap in-flight children at what one drain can process, roughly ten" | 20 concurrent subagents by default, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` to change it, ultracode sessions exempt. No cap on the session total. | **Ports.** pstack's ten is a coordinator-attention judgement, not a platform limit, so it survives as advice. |
| "Never resume an agent to check on it; a resume restarts an idle agent" | Subagents are resumable and messageable by `name`. Resuming one that finished "takes a fresh slot without checking the limit, so resumes can push the running count past it". | **Ports**, and the warning still earns its place for a different reason. |
| Naming a subagent to address it later | The `name` parameter. One behaviour difference: in an interactive session with agent teams enabled, a named subagent spawned from the main conversation **launches as a teammate instead**, unless it is a fork or passes `isolation` on the call. | **Ports with a caveat** worth writing down, because it silently changes the coordination model. |
| Model per role on every call | See the next section. | **Ports and improves, except for the diversity premise.** |

## Model-per-role routing

#138 asks whether Claude Code's per-subagent model overrides are enough to carry
pstack's pattern. They are more than enough for the routing, and not enough for the
premise the routing exists to serve. Those are two different answers and the cluster's
verdict needs both.

**The routing ports, and the configuration layer largely disappears.** Claude Code
resolves a subagent's model from the first of four sources: the per-invocation `model`
parameter Claude passes on the Agent tool, the definition's `model` frontmatter (where
`inherit` means the main conversation's model), `CLAUDE_CODE_SUBAGENT_MODEL`, then the
main conversation's model. Add `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` and the first two
sources stop applying, which is a blunt instrument `setup-pstack` has no equivalent of.
Skills carry `model` too, and with `context: fork` that value sets the forked subagent's
model. `/advisor` consults a second model mid-task at key moments.

So `setup-pstack`'s central always-applied rule file is the part that stops earning its
place. Its job is to let one file override model choices baked into seven skills. Here the
same effect is a `model:` line in each agent definition, or one `env` entry in
`settings.json` for a blanket default. Its other job, detecting available slugs and
refusing to write one it has not confirmed, matters much less against a roster of four
aliases that the CLI validates itself: an unrecognised model id is rejected outright with
`Model "<name>" is not a recognized model id.` and the session keeps its model, and a
value outside an organisation's `availableModels` allowlist gets a documented
substitution with a warning naming both models. The interrogate skill's whole
slug-rejection fallback paragraph becomes unnecessary.

**pstack's slug suffixes decompose into two fields, which is a cleaner factoring.**
`claude-opus-5-thinking-xhigh` and `claude-fable-5-thinking-max` fuse a model and a
reasoning budget into one string. Claude Code splits them: `model` takes `sonnet`,
`opus`, `haiku`, `fable`, a full id, or `inherit`, and `effort` takes `low`, `medium`,
`high`, `xhigh`, `max` on Fable 5.1, Fable 5, Opus 5, Sonnet 5, Opus 4.8 and Opus 4.7
(`low`, `medium`, `high`, `max` on Opus 4.6 and Sonnet 4.6). Both `model` and `effort`
are available in skill frontmatter and subagent frontmatter. A role table that today
reads `claude-opus-5-thinking-xhigh` becomes `model: opus` plus `effort: xhigh`, and
gains the ability to vary one without the other. Nothing is lost.

**The diversity premise degrades.** This is the real finding. pstack's adversarial
mechanisms do not want *a* model per role, they want *different labs* per role, and they
say so. `interrogate`: "The adversarial signal comes from model diversity, not assigned
personas. Models differ in blind spots, priors, and reasoning patterns." Its default
panel is Fable, GPT, Grok, Opus. `arena` picks a cross-judge "whose model family differs
from the parent's when possible". `orchestrate` requires "a unit's verifier on a
different model family from its worker". `how` spawns one critic per model across the
same four. `poteto-mode` routes the hardest work to "your strongest judgment model" or
"your strongest instruction-following model" depending on whether the task needs
judgment or precise execution, a distinction drawn between vendors.

Claude Code's workers are Claude sessions. The docs state the boundary plainly: "In every
approach the workers are Claude sessions. To involve a different tool, expose it to Claude
as an MCP server." On Bedrock, Google Cloud's Agent Platform, Microsoft Foundry, or behind
a gateway, Claude Code passes model strings through to your deployment unchecked, but
those deployments serve Anthropic models. There is no documented way to spawn a subagent
on a non-Anthropic model.

What a four-way panel becomes here is Opus 5, Sonnet 5, Haiku 4.5, and Fable 5.1: four
families, one lab, plus effort variation across five levels. Whether that still separates
blind spots the way cross-lab diversity does is an empirical question, and neither source
answers it. pstack asserts the mechanism without measuring it; the Claude Code docs do
not address the question.

**The cost, priced both ways.** Reject the diversity premise and `interrogate` collapses
toward `/code-review`, which already runs at five levels, posts inline, applies findings
with `--fix`, and has an `ultra` mode that runs a deep multi-agent review in the cloud.
`arena`'s cross-judge loses its different-family rule and keeps its rubric and its base
selection. `orchestrate`'s different-family verifier rule becomes different-model. Keep
the premise and you own one MCP shim per foreign model, with credentials, rate limits,
and drift. That is precisely the kind of maintained surface [D-166](./DECISIONS.md)
dropped `feedback-loop` over, and the map's own warning about adopting mechanisms on an
author's throughput claim applies with full force: the diversity claim is the most
confident and least evidenced thing in pstack.

**Verdict.** Model-per-role routing is **adopt, with the premise renegotiated**. The
mechanism is native here and better factored than Cursor's. `setup-pstack` itself is
**reject**: its file, its detection step, and its validation step are all answering
problems Claude Code does not have. The cross-lab-diversity requirement inside
`interrogate`, `arena`, `architect`, `how`, and `orchestrate` is **not portable as
stated** and needs its own decision, because four of the map's ten clusters rest on it.

## Cloud agents and parallelism

pstack's parallelism story is cloud-first and says why: worktrees "cap out around ten
parallel agents and burn disk", while a cloud agent "gets a real machine, snapshotted
after the first build". Every `swarm` worker and every `orchestrate` worker defaults to
`environment: "cloud"`, with a short local exception list (runtime verification through
`control-ui` or `control-cli`, reading local transcripts, simulators, local-only auth).
Both autopilots run one Cursor cloud agent per PR. `orchestrate` restacks in the cloud
because "a local restack at this scale takes the laptop down".

Claude Code inverts this. Its parallelism is worktree-first by design, and its cloud is a
separate surface you dispatch to rather than a spawn target.

| Dependency | Claude Code equivalent | What the mechanism buys | Cost of the gap |
|---|---|---|---|
| `environment: "cloud"` on a spawn | `isolation: worktree` on a subagent definition, which branches from the default branch rather than the parent's `HEAD` and is cleaned up automatically if the subagent changed nothing. `/batch` packages it: 5 to 30 worktree-isolated background subagents, each implementing a unit, running tests, and opening a PR. Sessions dispatched from agent view move into their own worktree before editing. | A real machine per worker, disk that is not yours, and no contention on the local checkout | The biggest single gap. Parallel workers share this laptop's disk, CPU, and rate limits, and rate limits are shared account-wide with all Claude usage. `orchestrate`'s "restacks run in cloud" instruction has no home. The offset is that Claude Code's worktree isolation is enforced rather than advisory: a subagent's Bash commands run inside its worktree, a command that resolves to the main checkout fails, and commands that redirect git into the main checkout are blocked. |
| Cloud sessions as such | `--cloud <task>` creates one for the current repo, `--teleport` pulls one into the terminal, `/schedule` creates routines that run in the cloud on a cron, Claude Tag runs channel sessions, and cloud environments configure network access, env vars, and setup scripts. Session handoff from the CLI is one-way: you can pull a cloud session local, not push a local one up. | Work that survives closing the laptop | Moderate. Cloud exists; it just is not addressable from inside a running local session's fan-out. A human or a routine dispatches it. |
| "a cloud-sleeper wake chain (a sleeping cloud agent that re-arms its own wake)", the audit tick in both autopilots | `/loop` with an interval or self-paced, routines on a cron, the `Monitor` tool, and `ScheduleWakeup` — which is on the list of tools removed from every subagent, so only the main conversation can arm one. | A supervisor that wakes itself every 30 minutes without a human | **Mechanism ports** for the main conversation and is **dead for a subagent**. An autopilot root has to be the main session, not a delegate. That is a structural constraint on porting clusters 7 and 10, and it is cheap to satisfy. |
| "the cloud agent's status in the Cursor dashboard" (`orchestrate`'s read-only liveness probe) | `/tasks` for the current session's background work including finished subagents, `claude agents` for agent view, `/workflows` for workflow runs, and claude.ai/code for cloud sessions. | Probing liveness without resuming an agent | None. The instruction's substance, probe read-only rather than resume, holds. |
| "After a Cursor restart: local agents are dead, cloud work is not" | The same split. `--resume`, `--continue`, `/resume`, and cloud sessions persist independently. | Recovery after the editor dies | None. |
| A "cloud-agent URL" as a session-pickup source | A claude.ai/code session URL, plus `--teleport` to continue it locally. | Taking over another agent's in-flight work | None. |
| `orchestrate`'s hand-built coordination: a store directory, `preferences.md` standing orders pasted verbatim into every spawn, `inbox/` completion pointers, a drain protocol, `units.tsv`, `gates.md` | Three first-party surfaces do parts of this. **Agent teams** give a lead, teammates, a shared task list and direct inter-agent messaging (experimental, disabled by default, and teammates are not worktree-isolated so work must be partitioned by file). **Dynamic workflows** put the plan in a script that fans out across many subagents and cross-checks their results, for work that "outgrows a handful of subagents". **Cross-session messaging** (`ListAgents`, `SendMessage`) lets sessions on this machine, another machine, or the web pass findings between themselves. | A coordinator that never loses state and never blocks | This is the inversion worth flagging to the map. `orchestrate` is a careful hand-build of machinery Claude Code ships, and the reason pstack hand-built it is that its workers are cloud agents that "cannot read the local store". Here they can. The honest caveat is that agent teams are experimental and off by default and workflows are feature-gated, so "it already exists" is not the same as "it is dependable". The parts of `orchestrate` that survive either way are the brief template, the ledger keyed by PR plus head SHA, and the rule that a new head SHA voids a verdict. |
| "the current agent's store (path in the system prompt)" | A scratchpad directory, named in the system prompt of this session. | A durable, agent-private working directory | None. Confirmed first-hand. |

## Transcripts, the store, and local state

`recall`, `reflect`, `automate-me`, the `eval` playbook, `session-pickup`,
`show-me-your-work`'s truth-check, and `worktree-audit.sh` all read agent transcripts off
disk. This is the cluster that looks most Cursor-specific and ports most cleanly.

| Dependency | Claude Code equivalent | What the mechanism buys | Cost of the gap |
|---|---|---|---|
| `~/.cursor/projects/<slug>/agent-transcripts/<uuid>/<uuid>.jsonl`, slug being the workspace path with the leading slash dropped and each `/` turned into `-` | `~/.claude/projects/<slug>/<uuid>.jsonl`, with the same slug idea (leading `/` becomes `-`, each `/` becomes `-`, and `.` becomes `-`, so `.superset` yields `--superset`). **Ports with a path change.** | Past transcripts as a searchable context store | None. Verified first-hand in this session's own project directory. |
| pstack's three transcript layouts: legacy flat `<id>.jsonl`, nested `<id>/<id>.jsonl`, subagent `<parent>/subagents/<child>.jsonl` | This machine has flat `<id>.jsonl` files alongside a `<id>/` directory containing `subagents/` and `tool-results/`. Two of the three layouts, including the subagent one, exist here under different nesting. **Ports with a rewrite** of the glob. | Reaching a subagent's own transcript, not just the parent's | Low. The globs change; the three-layout defensiveness was the right instinct. |
| "The system prompt names the active workspace's `agent-transcripts/` directory; use that path. Do not glob across `~/.cursor/projects/*/`." | Claude Code's system prompt does **not** name a transcript directory. It names a scratchpad directory. **Mechanism ports.** | A cheap, authoritative way to stay inside one project's private chats | Small but load-bearing. The privacy guard has to be reconstructed by deriving the slug from `cwd` rather than read off the prompt, and the derivation has to handle the `.` to `-` rule. Four skills repeat this instruction verbatim, so a Firehorse port should factor it into one place rather than four. |
| `ls -t` ordering by real modification time, never by UUID name | Unchanged. **Ports.** | Recency that UUIDs do not carry | None. This is good advice on both platforms. |
| "one line is one chat message" (`recall`) | Not checked. See [What I could not check](#what-i-could-not-check). | The mining prompts' parsing assumption | Unknown. The file layout is confirmed; the record shape is not. |
| The Cursor sidebar's pinned and active chats, which `worktree-cleanup` step 2 makes the authoritative safety gate ("The lever has marked `safe` a worktree the user had pinned, so the pinned set wins") | No equivalent. `/resume` lists conversations; there is no pin, and no documented way to read which sessions are open. **Dead.** | The one check that stops an irreversible deletion of in-use state | Real, and concentrated on the one playbook that "deletes user state with no code review to catch a slip". The gate has to become either an explicit question to the user or a weaker proxy: `git worktree list` plus transcript mtime plus `/tasks`. A port of this playbook should keep the pause and drop the claim that a machine check can clear a worktree. |
| `.cursor/worktrees/myrepo/x` as the worktree path the hand-typed audit missed | `.claude/worktrees/`, and `.claude/worktrees/pr-<number>` for a PR-based one. **Ports.** | The reason the audit reads `git worktree list` instead of guessing | None. The lesson is the same lesson. |
| `~/Library/Application Support/Cursor` reclaimers (`state.vscdb.backup`, `snapshots/roots/<root>`) | `~/.claude/` and, presumably, `~/Library/Application Support/Claude`. **Ports with a rewrite**, unverified. | Disk back | Small. These are specific filenames inside another product; a port has to rediscover them. |

## What is genuinely dead

Five things, and only two of them cost anything.

1. **`environment: "cloud"` as a spawn parameter.** Cloud sessions exist; spawning one as
   a subagent of a local session does not. Costs the premise behind `swarm`,
   `orchestrate`, and both autopilots: many workers on machines that are not yours.
   Worktrees and `/batch` substitute, at this laptop's disk and this account's rate limits.
2. **The Cursor sidebar's pinned-chat set.** Costs `worktree-cleanup` its safety gate.
3. **`control-cli`, `control-ui`, `deslop`.** Never bundled with pstack, so never
   readable. Already owned by #131 and #135.
4. **Cursor Automations as a product** (`/automate`, the Automations editor handoff,
   `.cursor/settings.json`, protocol deep links). Costs `benny` its installer. The triage
   and repro skills themselves are portable.
5. **Cursor's built-in `babysit`, and every `readonly` warning.** Dead in the sense of
   moot. Deleting them makes the definitions shorter.

## What looks Cursor-specific and ports once you name the mechanism

The list #138 suspected was incomplete, and it was, in the helpful direction.

- **`mode: true` and Opt+Enter pinning.** A skill's `hooks:` frontmatter registering a
  session-long `UserPromptSubmit` hook that returns `additionalContext`. Strictly more
  capable than the boolean.
- **`reminder:`.** The string that hook emits.
- **`AskQuestion`.** `AskUserQuestion`, and its absence from subagents turns two of
  pstack's asserted disciplines into structural facts.
- **`is_background`, `run_in_background`.** `background: true`, and Claude Code's
  interactive default already is background.
- **`readonly: true` for reviewers.** `tools:` and `disallowedTools:`, enforced per
  definition rather than per call.
- **Cursor's `/loop`.** A bundled `/loop` here, plus routines for the cloud-cron case.
- **`~/.cursor/rules/*.mdc` with `alwaysApply: true`.** `CLAUDE.md`, path-specific rules,
  a skill's `paths:`, or a `SessionStart` hook.
- **The `mcps/` directory.** `claude mcp list`, with health states Cursor's directory
  listing does not carry.
- **Every transcript path.** Same slug shape, same subagent nesting, different root.
- **`cloud_base_branch`.** One `git worktree add` line in the brief.
- **The whole `orchestrate` store-and-drain apparatus.** Partly subsumed by agent teams,
  dynamic workflows, and cross-session messaging, with the caveat that both team surfaces
  are experimental.
- **`create-skill`.** The `skill-creator` plugin, which also brings the eval loop cluster
  8 wants.
- **Bugbot triage.** Bot-agnostic posture plus `/code-review` and `/security-review`.
- **`.cursor-plugin/plugin.json`.** `.claude-plugin/plugin.json`, near-identical keys.
- **`disable-model-invocation`.** Byte-identical.

## The bundled-skill listing discrepancy

#131 flagged that `/verify` and `/run-skill-generator` are absent from a session's skill
list while `/run` is present, and asked whether that means they are unavailable. The docs
explain one of the two and not the other, so this is recorded rather than resolved.

**Explained.** The commands reference says, under the marker for bundled skills:
"`/verify` runs only when you invoke it. Before v2.1.215, Claude could also run `/verify`
on its own." The skills page's visibility table says a skill Claude cannot invoke has its
description kept out of context while staying user-invocable. The skills list this session
shows is the model-facing listing. A bundled skill deliberately restricted to manual
invocation would therefore be typable and absent from that listing, which is exactly the
observed behaviour. `disableBundledSkills` being unset is consistent with this; the
setting turns bundled skills off entirely, and `/run` is present.

**Unexplained.** `/run-skill-generator` carries no such note in the commands reference,
is not listed among the feature-gated bundled skills (the docs name `/workflow-authoring`
and dynamic workflows as that case), and is still absent from this session's listing. I
have no documented mechanism for it. I could not read any bundled skill's frontmatter to
check directly: they are prompt-based rather than files on disk, and nothing on disk
corresponds to them. Both skills are typable regardless, so the practical consequence for
the design is nil. It is recorded as unexplained rather than asserted either way.

## What I could not check

- **Whether one-lab, four-family diversity separates blind spots.** The load-bearing
  empirical question under cluster 9 and under `interrogate`, `arena`, `architect`, and
  `how`. pstack asserts cross-lab diversity works and measures nothing; the Claude Code
  docs do not address it. Any verdict that keeps the adversarial mechanisms is deciding
  this blind, and the eval playbook plus `skill-creator`'s blind A/B is the only route to
  an answer I can see.
- **`/run-skill-generator`'s absence from the model-facing listing**, above.
- **Cursor's actual behaviour.** Every claim here about what Cursor does is pstack's own
  prose. I did not read Cursor's documentation and Cursor is not installed. So "`mode:
  true` injects a reminder every turn", "readonly strips MCPs", and the cloud-agent
  concurrency and snapshotting claims are pstack's descriptions of its own platform.
- **The transcript record schema.** I confirmed the file layout on this machine and did
  not compare a Claude Code JSONL record against Cursor's, so `recall`'s "every line is
  one chat message" may or may not transfer to a mining prompt.
- **Agent teams and dynamic workflows in practice.** Read in the docs, not exercised.
  Both are gated: agent teams are experimental and disabled by default, workflows are
  feature-flagged. Treating them as the answer to `orchestrate` needs someone to run them.
- **`control-cli`, `control-ui`, `deslop`.** Not bundled with pstack, not published
  anywhere I could reach. Same conclusion #131 reached.
- **The Claude Code application-support paths** for `worktree-cleanup`'s disk reclaimers.
  Inferred by analogy, not verified.
- **Whether a `UserPromptSubmit` hook registered from skill frontmatter actually survives
  across turns as documented.** Read in the hooks reference, not tested. It is the
  mechanism the mode-port verdict rests on, so it deserves a five-minute test before a
  build ticket assumes it.
