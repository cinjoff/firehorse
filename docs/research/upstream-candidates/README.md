# Upstream candidates

Two repositories assessed as Firehorse upstreams: EveryInc's compound-engineering-plugin
and NeoLabHQ's context-engineering-kit. Read against the intake gate in
[the evaluation framework](../../EVALUATION-FRAMEWORK.md) and the no-vendoring rule
in [upstream skills](../../UPSTREAM-SKILLS.md).

**Window:** researched 2026-09-20 against shallow clones at that date's tip, plus the
GitHub API. Every count and hash-adjacent figure below moves with the next push, and
compound-engineering pushes several times a day.

**Status:** a one-off snapshot. Not on a refresh schedule.

## Read in this order

| Document | What it covers |
|---|---|
| [compound-engineering-plugin.md](compound-engineering-plugin.md) | 36 skills, MIT, one plugin, a cross-model eval driver nobody has published numbers from |
| [context-engineering-kit.md](context-engineering-kit.md) | 68 skills across 13 sub-plugins, GPL-3.0, a reliability table with no method behind it |

## The bottom line

**Neither is adopt-on-sight, and they fail in opposite directions.**

**compound-engineering-plugin: shortlist one skill, reject the plugin.** It is the
better-built repo by every structural measure I checked. MIT, 25,175 stars, one clean
manifest, 929 commits in six months, semantic-release, and an actual cross-model A/B
eval driver in `tests/skill-eval-cell/`. It is also a near-complete competitor to
Firehorse: 8 of its 36 skills sit on top of workflows Firehorse already ships, and
installing it costs about 1,990 idle tokens to get them. The one thing worth testing
is `ce-compound`, whose counterfactual bar for what earns a durable learning is
sharper than anything in `firehorse-recall`. Test that claim, not the plugin.

**context-engineering-kit: do not adopt.** GPL-3.0 against Firehorse's MIT, last push
2026-08-26, and its own artifacts contradict its pitch. It advertises "minimal token
footprint" and ships a 118,233-byte `SKILL.md`. It claims to be "scientifically
proven" and backs that with a README table giving eight approaches four accuracy
brackets each, sourced to "more than year of real development usage on production
projects" with no n, no baseline arm, and no method. Four of its orchestrator skills
tell the model it will be killed if it reads a file. One shipped description
misspells "previous". The `kaizen` sub-plugin is the only part I would keep open, at
roughly 234 idle tokens for seven skills, because Firehorse's retro loop is unbuilt
and kaizen is aimed at it.

## What decides this for Firehorse specifically

An "upstream candidate" here is narrower than it sounds. D-156 says Firehorse depends
on upstream plugins and vendors nothing, so a candidate has to be a plugin a user
installs, with a `.claude-plugin/plugin.json`, whose skills carry a stable frontmatter
`name` that an `upstreamSkills` entry can reference and `upstreams.lock.json` can
pin. Both repos clear that bar mechanically. Both then lose most of their value to
overlap, which the framework names as the common reason a candidate closes.

The lockfile is the second filter, and the two repos behave differently under it.
compound-engineering would land as one plugin with 36 hashed skills and 141 commits
in the last 30 days, so `pnpm upstreams:check` would report advisory sha256 drift on
nearly every run. context-engineering-kit ships 13 independently versioned
sub-plugins, so Firehorse could declare `kaizen` alone and pin a small, slow-moving
surface. On trackability the worse repo has the better shape.

## Provenance

Primary sources only. Both repos were read as shallow clones under the session
scratchpad; `EveryInc/compound-engineering-plugin` at its 2026-09-20 tip and
`NeoLabHQ/context-engineering-kit` cloned fresh on 2026-09-20. Stars, tags, releases,
licence, and commit counts come from the GitHub REST API via `gh` on 2026-09-20.
Every file path cited is relative to its repository root. No live web pages were
fetched; the GitHub API and the source trees answered everything.

Token figures are estimates, not tokenizer counts. The method is stated in each
document and is the same in both: UTF-8 character length of the frontmatter `name`
and `description` values, divided by four. Treat them as accurate to within maybe
15%, which is enough to compare the two repos against each other and against Matt
Pocock's advertised 660 tokens, and not enough to put in an issue as a measured
number.
