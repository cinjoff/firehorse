# pstack justifications

Research note for [#137](https://github.com/cinjoff/firehorse/issues/137). It sorts pstack's
reasoning, cluster by cluster, into the four categories the ticket names, then lists the
contradictions and the conflicts with decisions this repo has already made.

The short version: pstack's mechanisms are mostly reasoned and mostly checkable, its outcome
claims are unverifiable and load-bearing only in the marketing, its one measurement claim is
unpublished, and its heaviest borrowing is from a source it never names. The most useful finding
is how much carries no justification at all: every model-to-role assignment, every count and
cadence, and the grouping of the principles.

## Source note

Read in full from the clone at `backnotprop/pstack` (MIT, mirror of `cursor/plugins/pstack`):

- `README.md`, all ten pages of `docs/guide/`, both `agents/`.
- Every `skills/*/SKILL.md` except `interrogate/references/*`, `how/references/*`,
  `why/references/*` and `typescript-best-practices/references/patterns.md`, which were read by
  targeted grep rather than end to end.
- All 21 `principle-*` skills, end to end.
- `skills/poteto-mode/SKILL.md`, `references/plan.md`, and the playbooks for prototype, feature,
  eval, autonomous-run, autopilot-full, multi-phase-plan. The other playbooks were grepped, not
  read whole. `references/bugbot-triage.md` and `playbooks/orchestrate.md` were grepped only.
- `automations/benny/README.md` and `FOR_AGENTS.md`. The three benny skills were grepped only.
- The TypeScript under `skills/poteto-mode/scripts/` was not read. It is a PR watcher and an
  orchestration store, and no justification claim in this note rests on it.

Reached on the web with `firecrawl`: [diataxis.fr](https://diataxis.fr/) and its compass,
tutorial and explanation pages; [Google's developer style
guide](https://developers.google.com/style/voice) voice and tone pages; [Tom Preston-Werner on
readme-driven
development](https://tom.preston-werner.com/2010/08/23/readme-driven-development.html); [Flavio
Copes' pstack deep dive](https://flaviocopes.com/pstack/) and his
[fstack](https://flaviocopes.com/fstack/); search results on evaluation awareness and on the
"measured to fail" claim.

Could not reach or did not verify:

- **Reddit.** Firecrawl refuses the domain, so the `r/claudeskills` thread on the Claude Code
  port is unread.
- **The YouTube critique.** "Pstack Is Agent Overkill. Use It Anyway!" returned metadata and a
  description, no transcript. I do not know what its argument is.
- **Ousterhout.** *A Philosophy of Software Design* is not online and I did not fetch a
  secondary source for it. The comparison in [Borrowed authority](#borrowed-authority-checked)
  rests on my own knowledge of the book, not on a source read this session. Treat it as a strong
  lead to confirm against the text, not as a checked citation.
- **ASD-STE100 and Kohl's *Global English Style Guide*.** The spec is a paywalled PDF and the
  Kohl is a book. I confirmed only that pstack names an edition and a date, not that the rules
  it lists are the source's.
- **The two guide posts.** Not re-scraped. Where this note reports a post claim it takes it from
  [`docs/pstack-workflow.md`](./pstack-workflow.md) and marks it "post only".
- **Part 3 of the series.** Still not posted as of 2026-09-14.

## How the sort reads

Four labels, from the ticket:

- **Mechanism.** A claim you can check from the structure. It holds or fails on its own terms.
- **Mechanism with a stated failure mode.** The same, plus a named way it goes wrong. Where
  pstack says something "has been measured", this note says whether the measurement is published.
- **Assertion about outcomes.** Nobody outside Cursor can check it. Named, not discounted.
- **Borrowed authority.** A real source stands behind it. Checked for whether pstack uses it the
  way the source means.

A fifth heading appears where it applies: **no justification**. It is the largest category in
clusters 9 and 10.

## Cluster verdicts at a glance

| Cluster | Dominant kind | Weakest load-bearing claim |
|---|---|---|
| 1. Router | Mechanism | That copying steps *before* reasoning is what prevents drift |
| 2. Principles | Mechanism, with uncited borrowing | That 21 names steer better than a paragraph |
| 3. Verification | Mechanism with stated failure modes | "Verification is all you need" (post only) |
| 4. Understanding | Mechanism, strongest in the set | The indirect prompt (post only) |
| 5. Design | Mechanism, heavy uncited borrowing | That one attempt locks in the wrong shape |
| 6. Review and prose | Mechanism plus the only real citations | "The cleanup-afterward pass has been measured to fail" |
| 7. Parallelism | Mechanism | "Fearless parallelism", cloud agents over worktrees |
| 8. Self-improvement | Mechanism, and an admitted evidence gap | That reflecting improves later runs |
| 9. Model routing | No justification | Every role-to-model assignment |
| 10. Automations | Mechanism (fail-closed), never run | That the triage is accurate enough to act on |

## 1. The router

**Mechanism.** Conditional loading is checkable from the file layout and it holds: 23 playbook
files sit beside `SKILL.md` and the mode opens one on match, so twenty-three workflows cost one
file read at match time rather than twenty-three at load time. The `skip: <reason>` rule makes an
omission visible in the todo list instead of silent, which is a structural property, not a claim
about quality. Both survive the port to Claude Code intact, because both are just files and a
reading rule.

**Mechanism with a stated failure mode.** The verbatim-copy rule names its failure: "reading a
playbook then writing a bespoke plan that drops its named steps (`architect`, the throughput
checkpoint)". That is specific and it is the reason the rule exists. Unpublished, and observed in
Cursor. Two more are Cursor-specific and unverifiable here: "interrupt-chained resumes silently
drop directives" and "reaching for `drive` inside a phase agent stops that agent finishing its
turn".

**Assertion about outcomes.** "This turns cursor into a real engineering team." "pstack gives you
fearless parallelism." 10,000 runs in a week by Cursor's engineering team (LinkedIn, and the
video description). 2,000 PRs a month and 100-1000x team output (post only). None of these is
checkable and no verdict should rest on one.

**No justification.** Why 23 playbooks rather than five or fifty. Why the steps must be copied in
*before* the model reasons about the task rather than after, which is the ordering claim doing
the actual work. The wording of the `reminder:` field. And the counts drift: the README and guide
say "twenty-two playbooks", the README's own table lists 22 rows and omits Opening a PR,
`playbooks/` holds 23 files, and the mode's list runs to 24 bullets. `technical-writing`'s
checklist item 8 requires every count to be true at the commit that lands it.

## 2. The principles layer

**Mechanism.** Every leaf carries an explicit `**Why:**` paragraph, and most of those are
arguments you can follow: reader load beats LOC as a maintainability proxy because code is read
more than written; shared-state races are expensive because they are intermittent; textual
instructions require the reader to notice and comply while a lint does not. The citation rule is
the interesting part, because it is falsifiable by design. A named principle must trace to a
specific choice it changed, and `eval.md` states the honest test for it: read which files the
agent actually opened, since "citing a principle is not reading its leaf skill, and reading it is
not applying it". That is pstack policing its own compliance theatre.

**Mechanism with a stated failure mode.** From the same playbook: asking an agent which
principles it applied "inflates citation behavior". Measurement-shaped, unpublished, and the
reason the eval rule exists.

**Borrowed authority, uncited.** See [Borrowed authority](#borrowed-authority-checked). The
architecture principles restate Ousterhout, "make illegal states unrepresentable" is Yaron
Minsky's line, parsing external data into domain types at the boundary is Alexis King's "parse,
don't validate", and "keep general-purpose mechanism inside and special-purpose policy at the
edge" is Lampson's. No name appears anywhere in pstack.

**No justification.** Why 21. Why the five groups are core, architecture, verification,
delegation and meta. Why each principle is its own file and its own skill rather than one
document, which matters for the port because `guard-the-context-window` argues the opposite in
the same breath: "templates and references used on every invocation belong in the skill file, not
in separate files that cost a read each time". The mode requires the inline index read in full at
the start of every multi-step task, plus a full read of each applied leaf. Conditional loading
saves the playbooks. It does not save the principles, and nothing in pstack claims otherwise or
measures the tax.

## 3. Verification

**Mechanism.** The generator proves its own output once before handover, then checks that the
evidence survived the cleanup it just ran, which catches the specific bug where teardown eats the
proof. The maintenance loop fences its edit scope to the verification skill's own directory, so a
behavior the map claims and the app no longer does must be reported as a regression rather than
quietly rewritten in docs. Its three outcomes are fixed and exhaustive (`clean`, `changed`,
`blocked`) and `blocked` must name the blocker. The feature map is the coverage list, and the
rule "a proof that drives one convenient entry point is incomplete when the map lists others"
turns coverage into something a reviewer can check. Doctor-before-drive, re-doctor after a failed
drive, and kill only what you started are all structural.

**Mechanism with a stated failure mode.** "A generated skill that was never executed is a draft,
not a deliverable." "A feature map rots the moment the app changes." "Some dry-runs still touch
the network or open a browser", so verify what a dry-run skips by observing files, network and
git refs rather than trusting its name. From `figure-it-out`, the sharpest one: "a blank
screenshot passes a lazy gate", so suspect the observation method when something passes too
easily. These are the best-earned sentences in pstack.

**Assertion about outcomes.** "Verification is all you need" and everything downstream of it, the
suggested oncall rotation, the daily `/maintain-verification-skill` cadence, and the claim that
worktrees cap out around ten parallel agents while snapshotted cloud agents do not. All post
only. The worktree number is a measurement from one machine and one repo.

**Borrowed authority.** The agent-friendly CLI property list (deep modules, `--dry-run` on
anything destructive, subcommands for progressive disclosure, errors that say what to do, rich
`--help`, JSON out) is post only. [#131](https://github.com/cinjoff/firehorse/issues/131) already
found it an uncited synthesis; this note adds that it has no counterpart in the shipped skill
files, whose only helper rule is "any script the skill ships is executable and its invocation is
shown in the skill body". Two elements of the bundle have real sources that go unnamed: deep
modules is Ousterhout's and progressive disclosure is from usability literature.

**No justification.** The daily cadence. The oncall suggestion. Why the feature-map entry
contract is exactly those four H2s. Why driving one mapped feature is "enough" at generation
time, which is stated and never argued.

## 4. Understanding

**Mechanism.** The strongest cluster, because most of it constrains pstack's own output rather
than promising a result. `blast-radius` ships a five-rung certainty ladder (said so, pointed at
the line, showed the bad case cannot happen, ran it, reproduced it in the app), requires you to
say where each safety fact stopped, and refuses to round up. `why` separates direct evidence from
inference, requires a commit, PR, ticket, URL, permalink or `file:line` per claim, counts null
results as findings, and bans citing code as evidence for its own intent, which is a real
epistemic rule and not a style preference. `how` gates on complexity and says "when in doubt,
lean simple". `recall` verifies transcript findings against live `git` and `gh` state before
reporting them, and pins a default window rather than letting "recent" float.

**Mechanism with a stated failure mode.** "A blast-radius writeup that sounds right is worthless.
It reads as convincing whether or not it's true, and that is the trap you are walking into." `why`
names "confident storytelling" as its antipattern. `recall` names the corpus trap: a transcript
or a stale ticket is history, not current truth.

**Assertion about outcomes.** The indirect prompt, asking the agent to restate the problem first,
"compresses the noise and exposes misreadings early" (post only). "Past transcripts are context
goldmines." That fanning explorers out on a fast model produces a better mental model than one
pass.

**No justification.** That the seven evidence categories are the right seven or a complete set.
The 2-4 explorer bound. The seven-day default recall window. The prompt-injection hygiene in the
reviewer prompts is unexplained but standard, so it needs none.

## 5. Design

**Mechanism.** Candidates write to separate worktrees or directories, justified by pstack's own
shared-state principle rather than by assertion. The rubric is derived before fan-out and
withheld from candidates, so the picker has a tool the candidates could not have optimised
against. The cross-judge runs on a different model family from the parent and is spawned only
after the candidates finish, with the failure stated: spawn it early and it "sees partial or empty
outputs and reports them as dropouts". "Design it twice" is made concrete as at least two
structurally distinct candidates, and "a second flavor of the first shape does not count".
`design-red-flags.md` gives four named, screenable rejection criteria.

One weakness worth naming: the convergence rule is unfalsifiable as written. Candidates agreeing
is "a strong agreement signal, ship the consensus shape"; candidates diverging means "Phase A was
under-specified, reframe and re-run". Every outcome confirms the method.

**Mechanism with a stated failure mode.** "Skimming N candidates surfaces only the candidate whose
surface looks most familiar", which is why Phase D requires reading each end to end. The scrap
trigger is deliberately a pattern and not an instance: repeated workarounds of the same shape,
`any` escape hatches, the "we need a lock" reflex. Both name a bias; neither is measured.

**Assertion about outcomes.** "One attempt at a hard design locks in the first shape the model
thought of." That arena plus a cross-judge yields a better design than one strong attempt. That
throwaway prototypes settle empirical forks faster than asking, which is plausible and untested.

**Borrowed authority.** Ousterhout throughout, unnamed. Readme-driven development is implemented
faithfully in the code and never named there: `architect/references/runner-prompt.md` requires the
caller's README-style usage and two or three real call sites written before the types, with "the
usage is the spec". That is Preston-Werner's core move, and his stated payoff (you cannot know
what you are building until you have written about it) is the same one pstack relies on. Two
divergences: his payoffs are human and durable, a document you keep and a published interface
others build against in parallel, while pstack's usage sketch is throwaway input to a type
sketch; and RDD is scoped to software others consume, which pstack applies more broadly. Neither
is a misuse.

**No justification.** The default panel of four models. Why the cross-judge is one model rather
than a panel. "Usually one or two things per candidate" is worth grafting.

## 6. Review and prose

**Mechanism.** `interrogate` rests on model diversity rather than assigned personas, with
independent agreement across models as the confidence signal and lone findings kept but weighted
down. The lead's Dismissed bucket must carry a reason, so the filtering is auditable and
overridable. `no-comments` is structural separation: "authoring agents defend comments", so a
separate read-only reviewer proposes the deletions and the parent applies them. `unslop`'s 31
rules are concrete enough to check one at a time. `show-me-your-work` picks TSV for stated
reasons (GitHub renders it, `column -s$'\t' -t` renders it, a row appends with one command) and
its `log.sh` prefixes cells starting with `=`, `+`, `-` or `@` so a spreadsheet does not execute
them, which is a real vulnerability handled without ceremony.

**Mechanism with a stated failure mode.** "Write the reply clean as you draft it. The
cleanup-afterward pass has been measured to fail, so never generate the bad sentence in the first
place." I searched for the measurement. Every hit is a mirror of that sentence: the GitHub file,
a Chinese skill-hosting mirror, a skills directory. No data, no method, no sample. The
measurement is internal and unpublished, and the same-shaped claim appears for comments ("a flat
'no narrating comments' ban doesn't catch them, you have to not write them in the first place").
For contrast, `theclaymethod/unslop`, an unrelated project doing the same job, ships a runnable
eval suite. That is what a published version of this claim would look like.

**Assertion about outcomes.** That `unslop` output reads human. The "adding soul" rules (have
opinions, let some mess in) are taste, presented as rules.

**Borrowed authority, and the only properly cited work in pstack.** `technical-writing` layers
four named standards and dates each fetch: Diátaxis (`diataxis.fr`, 2026-07-18), Google developer
style (`developers.google.com/style`, 2026-07-18), ASD-STE100 (Issue 9, 2025) and Kohl's *Global
English Style Guide*. See the next section for what checked out.

**No justification.** The strength of the em-dash ban ("banned outright", including a ban on
substituting parentheses) rests only on "em dashes are an AI tell". Rule 26's word list is one
person's judgment, and pstack's own corpus breaks it.

## 7. Parallelism and autonomy

**Mechanism.** One writer per branch, worktree or output directory, derived from the shared-state
principle rather than asserted. Verification is separated from authorship: in `shipping` and
`autopilot-full` the agent that judges a change is never the one that wrote it, no owner merges
on its own verdict, and only the contiguous verified run from the bottom lands. The patch-id rule
voids a verdict when the head moves unless the patch is unchanged, which is a concrete
re-verification trigger rather than a judgment call. `autonomous-run` requires a checkable
predicate before the first iteration, and one change, one check, one log row per loop.

**Mechanism with a stated failure mode.** "Green is not safe." "A plateau is not a stop", and
never relax the predicate to declare victory. "A duration is not a finish condition", so "work on
this for 4 hours" yields motion instead of a result. Each names a specific way autonomy fails.

**Assertion about outcomes.** "Fearless parallelism." That cloud agents beat worktrees past ten
agents. That this machinery is what makes overnight work safe.

**No justification.** The roughly 30-minute audit tick. Default worker counts. The cloud-sleeper
wake chain.

## 8. Self-improvement

**Mechanism.** `reflect` fans out three fixed lenses (judgment, tooling, divergent) and a
synthesizer that must return Accepted, Rejected and Backlog, so a proposal cannot land
unclassified. A structural-enforcement pass then moves any Accepted item to Backlog when a lint,
script, flag or runtime check would enforce it better, which applies
`encode-lessons-in-structure` to its own output. Every reviewer prompt treats the transcript as
untrusted data and confines MCP lookups to what the transcript references, which is prompt-
injection hygiene on a genuinely hostile input. Transcript reads are workspace-scoped, with the
reason given: globbing `~/.cursor/projects/*/` reads unrelated private chats. `automate-me`'s
update mode bounds its corpus by `git log -1` on the skill file.

**Mechanism with a stated failure mode.** "One weird session is an anecdote, not a rule." "A
preference stated once and contradicted another time is noise", so require multiple instances,
and patterns seen in two or more history slices are high-confidence while lone signals get
dropped. This is the overfitting failure named and guarded.

**Assertion about outcomes.** That routing lessons into skill edits improves later runs. Nothing
measures it.

**No justification, and pstack says so.** `automate-me`'s Evaluation section states that a
`-mode` skill is subjective output, that a test-and-iterate benchmark loop "isn't useful here",
and that the check is to "vibe-check with the user". That is the cluster admitting its own output
is unevaluable. Set beside it the larger gap: pstack ships a careful blinded eval playbook, with
sanitized directories, a blinded judge, a single-pass scale and chain-following graded from
transcripts, and publishes no eval result anywhere in the repo or the guide. The instrument
exists. The measurements do not.

## 9. Model routing

**Mechanism.** `setup-pstack` validates every real slug against the set it detected and stops
rather than writing one the user cannot use, with the failure stated: "a rule pointing at a model
the user cannot use breaks every delegation that reads it". It overwrites the whole file so
re-runs are idempotent, citing its own idempotence principle. Skills fall back to inline defaults
when a role line is absent, so the config is an override layer and not a requirement.
`inherit-parent` and `auto` are aliases that omit the `model` field, documented as such because
users kept reading them as slugs. `interrogate` ships a fallback for an unresolvable slug that
keeps the review running and files the fix separately.

**No justification.** Every single assignment. Precisely specified code to `gpt-5.6-sol-max`,
fast mechanical code to `grok-4.6-fast-xhigh`, prose and judgment to
`claude-fable-5-thinking-max`, the hardest changes to the strongest judgment model, a four-model
panel for every review role. No benchmark, no eval, no cited comparison, not even an anecdote.
This is the most perishable content in pstack: the assignments are specific to one model
generation and one provider's entitlements, and the eval playbook that could have tested them is
never pointed at them.

## 10. Automations (benny)

**Mechanism.** The safety rules are structural and mostly good. Fail closed when channel
coordinates, tracker access, the control adapter or the feature map is missing or uncertain. Root
thread coordinates immutable for the run. Subagents may help but cannot post to Slack or receive
Slack credentials. Draft pull requests only, never merge or deploy. If an existing PR or merged
commit may fix the report, verify it instead of authoring a competing change. Utility and debug
bots count as evidence, never as delegation or fix ownership. Reply exactly once in the source
thread, never a root message.

**Assertion about outcomes.** That triage from a chat thread is accurate enough to act on, and
that a reproduction plus a bounded root-cause fix produces a PR worth reviewing. No accuracy
data, no run reports, and the pack is dormant: nothing in the repo says either automation has
ever run.

**No justification.** Why the symptom must be reproduced exactly twice. Every budget value is a
placeholder. The status-emoji protocol. The whole pack is written first person as an intent
document ("i want it to..."), a form choice with no stated reason, which matters if the shape is
copied.

## Borrowed authority, checked

| Source | Where pstack uses it | Named? | Faithful? |
|---|---|---|---|
| Ousterhout, *A Philosophy of Software Design* | `architect/references/design-red-flags.md`, `architect/SKILL.md` Phase B, `principle-minimize-reader-load`, `principle-type-system-discipline` | **No, nowhere** | Yes, on my reading of the book, with one reconciled tension |
| Diátaxis | `technical-writing` mode selection | Yes, with fetch date | Yes |
| Google developer style guide | `technical-writing` sentence layer | Yes, with fetch date | Yes |
| ASD-STE100, Kohl's Global English | `technical-writing` statement and ambiguity layers | Yes, with edition and date | Not verified; see the source note |
| Readme-driven development | `architect/references/runner-prompt.md` caller-usage-first | Only in the post, not in the code | Yes on the core move |
| Progressive disclosure, deep modules in the CLI property list | Post only, no code counterpart | No | Not assessable |

**Ousterhout is the finding.** `design-red-flags.md` is four of his red flags under his names,
in his order of concern: shallow module, information leakage, temporal decomposition,
pass-through method. `architect` Phase B says "design it twice" outright, which is his chapter
title, and requires the radically different alternative the book insists on. `principle-type-
system-discipline` opens with "prefer defining errors and special cases out of existence", which
is his chapter 10. `principle-minimize-reader-load` restates information hiding and interface
compression. No file in pstack names him, the book, or any other source for this material.

The map expected a citation to check. There is none, which is a different and slightly worse
problem: a reader cannot tell that this layer has a source, so they cannot go read it, and the
material arrives with pstack's authority rather than the book's.

Usage is faithful, with one tension pstack sees and patches rather than ignores. Ousterhout
argues that reducing complexity can justify more code and a larger implementation behind a small
interface. `principle-laziness-protocol` argues the reverse defaults, "minimize the diff", "fewer
lines beat elegant boilerplate", "maintain a flat call hierarchy". pstack reconciles them in two
places, once in the leaf ("a rich interface that hides substantial work is not a deep call
chain") and once in the red flags ("do not confuse a deep module with a deep call chain"). That
is the right distinction and it is drawn explicitly.

**Diátaxis checks out.** pstack's two questions are the compass's two axes, and the four cells map
correctly: action plus learning is tutorial, action plus work is how-to, understanding plus work
is reference, understanding plus learning is explanation. Its per-mode rules match the source's
own emphases, including the learner's success being the teacher's job in a tutorial, opinion
belonging in explanation and nowhere else, and generating reference from code. "One document, one
mode, split and link instead" is Diátaxis's own insistence, not an overreach.

**Google checks out.** Second person, present tense, active voice with a named actor,
instructions as imperatives, condition before instruction, common case first, no "simply", "easy"
or "quickly" in a procedure, descriptive link text over "click here", sentence-case headings that
carry the point, serial commas, code font and bold UI labels. These are all in the guide and
pstack's wording of them is close to the source.

**One transfer is asserted rather than argued.** ASD-STE100 was written for controlled human
documentation in aerospace maintenance and Global English for translatability by human readers
and machine translation. pstack applies both to prose an agent will read. Plausible, and the
layering of four standards is pstack's own synthesis, presented without the caveat.

## Contradictions inside pstack

The two the ticket already knows, sharpened, then seven more.

1. **Planning.** The README's answer to "why are there no planning skills?" is "personally, i
   don't believe in planning. the best spec is code", with the carve-out that a plan is available
   but "not a default". The carve-out does not cover what ships. `figure-it-out` is the *default*
   route for anything large, cross-cutting or reviewed after the user steps away, and its first
   line is "the deliverable before any code is the workflow itself". `references/plan.md`
   produces a phased plan directory, prescribes eight to ten small phases over three to four
   large ones, and ends "Stop. The user decides when implementation starts". pstack does not
   believe in planning for small work and mandates it for the largest.
2. **Rule 26 against its own corpus.** `unslop` is described as "Must always apply" and bans
   "surface (as in 'API surface')", "harness (as metaphor)", "scaffolding (as metaphor)" and em
   dashes outright, parentheses included as a substitute. pstack's own files use "the public
   surface" (`principle-boundary-discipline`, `architect/SKILL.md`,
   `architect/references/runner-prompt.md`, `design-red-flags.md`), "surface area"
   (`principle-subtract-before-you-add`, `arena/SKILL.md`), "any prose surface" (`poteto-mode`
   itself, and again in its `plan.md` reference), "verification scaffolding" (`create-verification-skill`) and 16 em dashes
   across seven files, five each in the two verification skills and one in the README's first
   line. This is the D-172 conflict the map flagged, plus the discovery that pstack does not
   apply the rule to itself.
3. **Never block on the human, against three hard gates.** The principle says proceed on
   reversible work and reserve confirmation for irreversible actions, and the mode's Autonomy
   section says "just do it". `plan.md` step 7 stops dead and hands back. `reflect` step 5 waits
   for explicit approval before any edit. `figure-it-out` Phase A says "a multi-hour run earns
   one checkpoint". `reflect` gives a reason that fits the principle's carve-out, since a skill
   edit affects every future agent in the org. `plan.md` gives none, and `figure-it-out`'s
   checkpoint contradicts the principle it cites in the same paragraph.
4. **Adversarial review.** Part 2 refuses adversarial review of plans on the grounds that
   "agents invent theoretical risks and edge cases that never happen". `interrogate` exists to
   have several models adversarially attack a diff, and `how` critique mode does it to
   architecture. The distinction that would settle it, that a wrong plan is cheap and a wrong
   diff is not, is never stated.
5. **Guarding the context window, against the mode's fixed tax.** The principle says do not read
   what you will not use and keep per-invocation content inline rather than in files that cost a
   read each time. The mode requires reading the full inline principles index at the start of
   every multi-step task and reading each applied leaf skill in full, on top of the matched
   playbook. Conditional loading saves the playbooks and spends on the principles, and pstack
   never says so.
6. **Two different comment rules.** The mode's Comments section keeps only "a non-obvious *why*
   the code can't show". Comment Sicko's keep list is wider: legal headers, doc comments defining
   a public API contract, `// prettier-ignore`, issue or RFC links. An agent following the mode
   deletes comments that `/no-comments` would have spared.
7. **Which default wins.** `principle-laziness-protocol` says bias to deletion and the smallest
   change. `figure-it-out` says "bias toward more rigor. The cost of building the wrong thing
   dwarfs the cost of being careful". The Prototype playbook states outright that it inverts the
   Laziness Protocol and the verification bar. So the inversions are known, named one at a time,
   and never arbitrated: nothing says which default governs work that is both large and
   reversible.
8. **Counts.** See cluster 1. Twenty-two in prose, 22 rows in the table, 23 files, 24 bullets,
   against `technical-writing`'s own rule that counts must be true at the landing commit.
9. **A gap rather than a contradiction.** `tdd` is scoped to a cheap local test path and prefers
   no test to a bad one; `prove-it-works` and `plan.md` say unit tests do not prove a bug is
   gone. Both are right and the mode lists `tdd` as a routed skill without saying which wins when
   a cheap test exists and the surface proof is expensive.

## Conflicts with what this repo already decided

- **D-159, workflows are the only carrier for standing preferences.** Its rationale rejects
  `CLAUDE.md` rules as "read inconsistently" and hooks as firing "outside the work". pstack's
  architecture is precisely a standing-preference carrier outside the invoked command: a sticky
  mode, an inline index, 44 skill files and 23 playbooks read by reference. This also catches the map's own first
  verdict, which put `unslop`'s delta into `~/.claude/CLAUDE.md`. That adoption sits against
  D-159's evidence and nothing in the map reconciles them. Worth settling before a second
  global-home verdict is issued.
- **D-164, explicit invocation only, no auto-triggering skills.** `unslop`'s description is "Must
  always apply" and it carries no `disable-model-invocation`. `typescript-best-practices` is
  documented as loading whenever the agent touches a `.ts` or `.tsx` file. `poteto-mode` sets
  `mode: true` and ships a `reminder:` string. Three auto-trigger mechanisms, all of which D-164
  closed off.
- **D-160, `kind: agent-role` and all nine agents dropped, workflows run their steps inline.**
  pstack ships two subagent types and a model-per-role config that every skill reads. Adopting
  cluster 9 or either subagent reverses D-160 rather than extending it.
- **D-168 and D-174, planning lives in the tracker or it does not exist.** `plan.md` writes
  `NN-slug/overview.md` plus phase files into the repo. That is the artifact D-168 refused.
  `show-me-your-work`'s TSV survives the decision, because a decision trail is evidence rather
  than a plan, and it is local by default.
- **D-165, `/firehorse:index` writes only derivable anchors.** The feature map is seeded from the
  repo but carries hand-written proof standards, user-POV entry points and gotchas, and needs a
  live pass to stay true. It is neither a derivable anchor nor a human statement of direction, so
  adopting it means naming a third category of maintained doc.
- **D-166, `feedback-loop` dropped as unproven.** Adopting the verification cluster on the
  strength of Part 1's framing would repeat what D-166 refused. The mechanisms in cluster 3 are
  the strongest in pstack, so the adoption case is available; it has to be made from those, not
  from the thesis.
- **D-170, Firehorse is for anyone building software.** pstack is one person's mode, with
  `~/.cursor` paths, named model slugs and a personal voice throughout. Stripping the personal
  layer removes most of the router's actual content, which is a real cost to price in.
- **D-177, decision citations are maintainer-facing and stay out of shipped definitions.** pstack
  requires every reply to name the principles that shaped it. Same mechanism, opposite verdict on
  who pays the reading cost. Not fatal, since pstack cites in replies and D-177 governs docs, but
  a `firehorse` version of the citation rule has to answer D-177's objection.
- **One alignment worth recording.** D-175 derives the gate from the repo, and
  `create-verification-skill` interviews the repo rather than the user and prefers its documented
  dev command. Same instinct, independently arrived at.

## Outside critique

Little exists, and most of what exists is summary. The specific and sceptical material:

- **Flavio Copes' deep dive** ([flaviocopes.com/pstack](https://flaviocopes.com/pstack/)) is
  sympathetic and makes three concrete objections. The ceremony exceeds most tasks: "moving one
  publication date or correcting one sentence does not need several models, an architecture arena,
  a decision log, and a verification skill". The fan-out costs real money: "pstack can start
  several agents for one task. If they all use frontier models, the tokens add up fast." And the
  routing is a trust assumption: "long playbooks also require me to trust the routing rules".
- **The same author's fstack** ([flaviocopes.com/fstack](https://flaviocopes.com/fstack/)) is the
  sharpest datapoint, because it is a counter-design built after studying pstack. His stated
  reason for abandoning stacks of this size: "they kept growing. 30+ skills, personas, pipelines,
  voice triggers. I couldn't hold them in my head, so I stopped using them." And the reverse
  outcome claim, on the same kind of evidence pstack offers: "a process full of phases, personas,
  and ceremony produced layers, abstractions, and options nobody asked for." pstack claims its
  machinery makes you "write less, but higher quality code"; Copes reports the machinery
  producing exactly the abstractions pstack's principles exist to prevent. Two practitioners,
  two anecdotes, no measurement either way. fstack's counter-design is 13 skills of about 150
  lines each, the human invoking every step, no autonomous runs, and one skill whose only job is
  deleting code.
- **A hostile comment** under a daily.dev post on a comparable stack: "you don't know if it's
  actually right for your needs; it's often verbose... I've tried it, and for me, it's something
  to be ABSOLUTELY avoided." Low information, and the only outright rejection I found.
- **Rob Shocks' video**, "Pstack Is Agent Overkill. Use It Anyway!", leads with overkill and
  promises to say "when the whole thing is overkill". I could not retrieve the transcript, so
  this note cannot report what he argues.
- **One pstack assertion has outside support it does not claim.** The eval playbook's premise,
  that an agent which knows it is being evaluated behaves differently, is supported by published
  work: ["Large Language Models Often Know When They Are Being
  Evaluated"](https://arxiv.org/abs/2505.23836) and Apollo Research's finding that Claude Sonnet
  3.7 often recognises alignment evaluations. pstack cites neither, and the blinding rules it
  derives are the right response to that literature.

## What this note cannot answer

- Whether any outcome claim is true. 10,000 runs a week, 2,000 PRs a month, 100-1000x, and the
  cleanup-pass measurement are all internal to Cursor. No verdict should rest on one, and this
  note found no way to check any of them.
- Whether conditional playbook loading nets out positive on context in Claude Code. The saving is
  structural and real; the principles index and per-leaf reads are a tax that nobody has
  measured. That needs a measurement in this harness, not another structural argument.
- Whether the per-role model map holds for any model generation, including the one Firehorse runs
  on. Nothing in pstack tests it.
- Whether the principle-citation rule changes behavior or only output. pstack states the honest
  test, reading which files the agent opened, and no such study exists in the repo or anywhere I
  could find.
- What the STE and Global English layers of `technical-writing` actually say, since both sources
  are closed. Whether Ousterhout's text says what this note attributes to him, since I did not
  fetch it.
- What the one video-length critique argues.
- Whether benny has ever run.
