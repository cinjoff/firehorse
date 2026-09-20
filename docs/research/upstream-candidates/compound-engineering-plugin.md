# EveryInc/compound-engineering-plugin

**Verdict: shortlist one skill, reject the plugin.** `ce-compound` is worth a paired
trial against `firehorse-recall`. The other 35 skills either duplicate a Firehorse
workflow or cost idle tokens for capability Firehorse does not want.

Read at the repository's 2026-09-20 tip, version 3.27.0.

## What it actually is

One Claude Code plugin, 36 skills, zero agents, zero commands, zero hooks.

`.claude-plugin/plugin.json` declares `name: compound-engineering`, version 3.27.0,
MIT, and no `skills` field. Under the rule in
[upstream skills](../../UPSTREAM-SKILLS.md#the-manifest-decides-which-skills-exist),
that means the tree under `skills/` is the authority, and it holds 36 directories,
each with a `SKILL.md`. Seven more `SKILL.md` files exist in the repo, at
`.agents/skills/ce-skill-work/SKILL.md` and under `tests/fixtures/`; those are the
repo's own tooling and test fixtures, not shipped surface. A single repo-local command
lives at `.claude/commands/triage-prs.md` and is not part of the plugin.

The mechanism is not "36 skills". It is a chained pipeline with a knowledge store
at the end of it. `CONCEPTS.md` names the parts: a Pipeline carries work from
strategy through ideation, brainstorm, plan, execution, and review, and each stage
hands a durable artifact to the next. The stage that makes the repo interesting is
the last one. `ce-compound` writes a *Learning* under `<root>/solutions/`, and
`ce-plan` reads Learnings back as constraints on the next plan. The README's demo
caption claims a learning written by one run was picked up by a plan run 18 days
later on unrelated work.

Skills are thin orchestrators over reference files rather than monolithic prompts.
`ce-compound/SKILL.md` is 8,175 bytes and its body is mostly routing: step 1 says
"read `references/research.md`", step 3 says "read `references/assembly.md`", and so
on. The 36 skill directories carry 395 supporting files between them, split across
`references/`, `scripts/`, and skill-local `agents/` prompt assets. That is genuine
progressive disclosure, not the advertised kind.

Nine of the 36 set `disable-model-invocation: true` and are user-invoked only:
`ce-dogfood`, `ce-polish`, `ce-product-pulse`, `ce-promote`, `ce-retune`, `ce-setup`,
`ce-sweep`, `ce-test-xcode`, and `wtf`. Firehorse's lockfile records that as
`modelInvocable: false`, and a workflow depending on one of them would have to read
its `SKILL.md` inline, exactly as the `mattpocock-skills` cases do today.

The descriptions are unusually disciplined about the necessity contest that
[skill quality](../skill-quality/README.md) describes. Most of them name the sibling
skill they are not: `ce-ideate` says "Not for refining an idea they already have
(ce-brainstorm) or judging one already on the table (ce-pov)". `ce-resolve-pr-feedback`
says "Not for reviewing the code before feedback exists; that is ce-code-review".
Whether that routing works is unmeasured, but the authors clearly know the problem
exists.

## Idle token footprint

**About 1,990 tokens for all 36 skills; about 1,570 for the 27 a model can invoke.**

Method: for each `skills/*/SKILL.md`, I took the UTF-8 character length of the
frontmatter `name` value plus the `description` value, summed them, and divided by
four. That is what a harness loads eagerly into the system prompt before anything
fires. It excludes `argument-hint` and `allowed-tools`, which some harnesses also
carry, so the true figure is somewhat higher.

| Slice | Skills | name + description chars | Estimated tokens |
|---|---|---|---|
| Everything under `skills/` | 36 | 7,943 | ~1,986 |
| Model-invocable only | 27 | 6,266 | ~1,566 |

Mean description length is 209 characters. The longest is `lfg` at 350.

For scale, the framework's cost section quotes Matt Pocock's skills repo advertising
660 tokens loaded until something fires. compound-engineering costs about three times
that, for 36 skills against that repo's 25. Per skill it is in the same range; the
total is higher because the plugin is bigger.

The loaded-on-fire figure is a different order. All 36 `SKILL.md` bodies together are
248,067 bytes, roughly 62,000 tokens, and the largest single file is
`skills/ce-debug/SKILL.md` at 16,756 bytes, around 4,200 tokens, before any of its
references load. No realistic session loads all of them, but a `lfg` run that chains
plan, work, review, and compound will pull several plus their reference files.

## Licence

MIT, `LICENSE`, "Copyright (c) 2025 Every". `.claude-plugin/plugin.json` repeats
`"license": "MIT"`. That permits vendoring into Firehorse, which is also MIT. D-156
means Firehorse would not vendor it anyway, so the licence is a non-issue in both
directions.

## External dependencies

Nothing is required. Several skills reach outside on invocation, and `PRIVACY.md`
documents them as opt-in:

- **Context7 MCP** at `https://mcp.context7.com/mcp`, used through
  `mcp__context7__resolve-library-id` and `mcp__context7__query-docs`.
- **Proof** at `https://www.proofeditor.ai`, the whole point of `ce-proof`, whose
  `allowed-tools` includes `WebFetch`.
- **XcodeBuildMCP**, required by `ce-test-xcode`, which also needs macOS and Xcode.
- **A browser**, for `ce-dogfood`, `ce-polish`, and `ce-test-browser`;
  `mcp__claude-in-chrome__` appears in the tree.
- **`gh`**, for `ce-babysit-pr`, `ce-resolve-pr-feedback`, and `ce-commit-push-pr`.
  `ce-babysit-pr`'s description says "GitHub (incl. Enterprise) only".
- **Slack and GitHub Issues**, configured sources for `ce-sweep`; its description
  marks email as experimental.

`PRIVACY.md` states the plugin ships no telemetry and runs no background uploader,
and that data leaves the machine only when the host or an explicitly invoked
integration makes a request. `bun` appears throughout `package.json` but only for the
repo's own tests and converter CLI, not for running a skill.

Nothing in the shipped skills needs an API key of its own. If Firehorse referenced a
skill that touches Context7 or Proof, that reference would carry `optional-dep` and
D-179's constraint. The skills Firehorse would plausibly want do not.

## Provider coupling

**Low, and deliberately so.** The repo ships plugin metadata or converter output for
14 hosts: `.codex-plugin/`, `.cursor-plugin/`, `.grok-plugin/`, `.kimi-plugin/`,
`.devin-plugin/`, `.omp-plugin/`, `.opencode/`, `.agy/`, `.cline/`, `.pi/`, plus
`AGENTS.md`, `GEMINI.md`, and `CLAUDE.md` at the root. `src/` holds a converter CLI
with per-target Converter and Writer pairs, and `CONCEPTS.md` treats "Target" and
"Native plugin surface" as domain vocabulary. `tests/` contains
`codex-converter.test.ts`, `pi-converter.test.ts`, `kiro-converter.test.ts`, and
`antigravity-writer.test.ts`.

The architecture is close to the one Firehorse settled on: canonical content in one
place, provider quirks isolated in converters. The skill bodies themselves are mostly
provider-neutral prose. `ce-compound` even carries
`fix(ce-compound): guard validate-frontmatter.py on non-Claude platforms` in its
changelog, which is the same concern as Firehorse's rule that provider-specific
behaviour stays out of shared modules.

These skills would project through the Firehorse definition format without violence
to the schema. They would not project cleanly through its *body contract*: the ten
required `##` sections in
[the definition format](../../FIREHORSE-DEFINITION-FORMAT.md) have no counterpart
here, so adoption would mean rewriting each body, not mirroring it. Under D-156 that
does not arise: Firehorse would reference the installed skill by `upstreamSkills` and
orchestrate it.

## Upstream trackability

Good on discipline, punishing on cadence.

- **Releases:** tagged `compound-engineering-v3.27.0`, published 2026-09-19. Twelve
  releases between 2026-08-22 and 2026-09-19.
- **Versioning:** semantic-release, with `@semantic-release/changelog` and
  `@semantic-release/git` in devDependencies. `CHANGELOG.md` is conventional-commit
  generated, grouped into Features and Bug Fixes, each entry linking its PR.
- **Tag hygiene has a wrinkle.** `/tags` returns a `v2.x` series topping out at
  `v2.42.0`, while `/releases` returns the `compound-engineering-v3.x` series, and
  `CHANGELOG.md`'s head entry is `cli-v3.13.1` from 2026-06-17. Three naming schemes
  coexist. Pinning by release tag works; pinning by "latest tag" does not.
- **Cadence:** 929 commits between 2026-03-20 and 2026-09-20. 141 of those fell in
  the last 30 days. Created 2025-10-09, last push 2026-09-20, not archived,
  25,175 stars.

Firehorse's drift check would have something stable to pin: one plugin name, one
version field, 36 skills whose frontmatter `name` matches the directory name, so
`nameSource` would be `frontmatter` throughout. The cost is noise. At roughly five
commits a day, `pnpm upstreams:check` would report changed `sha256` values on most
runs. That is advisory, exit 0, and it is exactly the finding
[upstream skills](../../UPSTREAM-SKILLS.md) warns trains the reader to ignore the
report. Declaring this plugin makes the drift check less useful for the plugins that
matter.

## Overlap with Firehorse

Heavy. Eight of the eleven shipped workflows have a counterpart here.

| Firehorse | compound-engineering | Verdict |
|---|---|---|
| `/firehorse:build` | `ce-work` | Direct. `ce-work` executes a plan end-to-end; `build` does it test-first off the codebase graph. |
| `/firehorse:fix-bug` | `ce-debug` | Direct. Both are diagnosis loops. `fix-bug` traces callers in the graph first. |
| `/firehorse:ship` | `ce-commit-push-pr` + `ce-code-review` | Direct, and `ship` does more: changelog, version bumps, tag, release, issue close. |
| `/firehorse:spec` | `ce-plan` + `ce-brainstorm` | Substantial. `spec` reads decisions out of a wayfinder map; `ce-plan` starts from a prompt. |
| `/firehorse:tickets` | `ce-plan` (task breakdown) | Partial. Firehorse cuts tracer-bullet slices wired with blocking edges; `ce-plan` does not touch a tracker. |
| `/firehorse:map` | `ce-handoff`, `ce-strategy` | Weak. Different artefacts, same "where are we" job. |
| `firehorse-recall` skill | `ce-compound` + `ce-compound-refresh` | **Direct competitor, and the interesting one.** |
| `/firehorse:triage` | none | Firehorse-only. |
| `/firehorse:index`, `/firehorse:memory` | none | Firehorse-only; both sit on codebase-memory-mcp and supermemory. |
| `/firehorse:upstreams-check` | none | Firehorse-only by construction. |

The overlap is not incidental. Both repos implement the same loop on different
foundations, and Firehorse's version is wired to a codebase graph and a tracker that
compound-engineering has no equivalent for. Adopting the pipeline wholesale would
mean unpicking that.

**Where it is genuinely additive:**

`ce-compound`'s durable bar. The skill refuses to write unless a counterfactual
holds, quoted verbatim from `skills/ce-compound/SKILL.md`: "if the learning document
disappeared, would a future engineer reading the final implementation still be likely
to repeat the mistake or redo substantial investigation?" It adds "Completion,
effort, and diff size do not establish eligibility", enforces one learning per run
with a reference explaining what batching breaks, and constrains writes to a resolved
artefact root. `firehorse-recall`'s triggers in `CLAUDE.md` are looser: a decision
about to be relitigated, a convention that should exist, resumed work, a trap the
next session would rediscover. Those are occasions to write, not a bar for what
earns a note. Firehorse stores into supermemory rather than tracked files, so the
failure mode differs, but the question "what deserves to be remembered" is the same
and compound-engineering has a sharper answer to it.

`ce-retune` has no Firehorse counterpart and is close to what
[the evaluation framework](../../EVALUATION-FRAMEWORK.md) describes. Its description
says it mines a run archive for a baseline, establishes a noise floor, audits the
corpus adversarially, then cuts in measured passes until a pre-registered bar clears,
and that it "Requires a benchmark harness that can A/B two builds of the corpus;
refuses without one". Its references are `baseline-mining.md`, `noise-floor.md`,
`corpus-audit.md`, `cut-passes.md`, and `halt-taxonomy.md`. It is `disable-model-invocation`,
so a workflow would read it inline. Worth reading as design input. Not worth adopting,
because Firehorse has no run archive to mine.

## What the authors measured

**They built a real harness and published no lift numbers from it.** That is an
unusual and specific failure, and it is better than the field's norm.

`tests/skill-eval-cell/` is a cross-model paired-arm driver. From its README: it
extracts `skills/<name>` from a git ref and runs the same prompt on whichever of
`claude`, `codex`, and `grok` are on PATH, defaulting to the two peers of the calling
harness. It has 22 committed fixtures under `tests/skill-eval-cell/fixtures/`
(`babysit-ci-red`, `plan-holdable-objective`, `review-peer-folded`, and so on), a
`--read-only` mode that enforces its boundary rather than suggesting it, a `catalog.ts`
of A/B cases, provenance fingerprinting, frozen grader hashes, and a regrade path
documented in `reproducibility.md` where `--mode original` reproduces a recorded
assessment. `test:skill-eval-pack --arm ab` runs a pre-sweep ref against the working
tree, which is a genuine two-arm comparison on a skill edit.

The `--read-only` detail is worth quoting, because it is the kind of thing only
someone who ran the harness would find: Codex drops
`--dangerously-bypass-approvals-and-sandbox` for `--sandbox read-only` because the two
contradict, and Claude pairs `--allowedTools Read,Glob,Grep` with a `--disallowedTools`
list naming `Task,Skill,WebFetch,WebSearch,NotebookEdit`, because under
`--dangerously-skip-permissions` allow-listing alone leaves the boundary open.

What I could not find: any published result. `ok` is the only verdict the pack emits.
No lift figure, no distribution, no per-fixture table, nothing in `README.md`,
`CHANGELOG.md`, `docs/`, or `STRATEGY.md`. Grepping the root and `docs/` markdown for
percentages, p-values, or sample sizes returns two hits, both rhetorical: "80% is in
planning and review, 20% is in execution", and a demo GIF caption about an 18-day gap.

So the honest reading is: they measure regressions, and they make no measured claim
about whether the plugin helps. The framework's premise that most of this field
measures nothing survives contact with the best-engineered repo I looked at.

## Intake fields

**Claim under test.** Adding `ce-compound`'s counterfactual bar to the
`firehorse-recall` skill reduces the number of notes written that no later session
retrieves, without reducing retrievals of the notes that matter.

**Cheapest test that could refute it.** Two arms over the same ten sessions replayed
from transcripts: arm A is `firehorse-recall` as shipped, arm B is `firehorse-recall`
with the durable bar and the one-note-per-run rule inserted into `## Instructions`.
Everything else fixed: same model, same effort, same fixture, same grader. The
fixture is a committed repo state plus a scripted session that produces four
write-worthy moments and six that are recoverable from the final diff, planted the
way `broken-project` plants defects, so the right answer is known rather than judged.
Grade write precision, whether each note the arm wrote was one of the four, and write
recall, how many of the four it caught. Run each arm 10 times per the framework's
count and report the distribution.

**What I would accept as a no:** arm B's recall drops below arm A's while precision
gains less than it loses, or the sign flips between the two fixtures with no rule to
tell them apart. Also a no, and the likelier outcome: both arms score the same
because the bar is already implicit in how the model reads the existing triggers, in
which case the delta is zero and the candidate closes with a recorded number.

Note the scoping. The claim names one skill, not the plugin, and it does not require
declaring `compound-engineering` as a Firehorse upstream. Testing it costs a fixture
and twenty runs. Testing the plugin costs 1,990 idle tokens plus permanent sha256
drift noise, to get workflows Firehorse already has.

## What would change the claim

- **If Firehorse builds the session reader** (concept #58, build #231), `ce-retune`
  becomes testable, because retune needs a run archive and #58 is what would produce
  one. Today it is unreachable and the claim above deliberately avoids it.
- **If `ce-compound`'s store moves off tracked files.** The claim compares a bar, not
  a storage model. If a future version couples the bar to `<root>/solutions/` more
  tightly than the current `references/assembly.md` split suggests, the bar stops
  being portable to supermemory and the test is measuring the wrong thing.
- **If the authors publish a number from `skill-eval-cell`.** A published lift figure
  for `ce-compound` would change this from a trial worth running to a result worth
  replicating, which is cheaper.
- **If the cadence slows.** The overlap argument against declaring the plugin does not
  move, but the drift-noise argument does. At 141 commits a month the noise is the
  bigger objection; at 10 it is not an objection at all.
