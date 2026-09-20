# The case against, steel-manned

Researched 2026-09-20 by a Firehorse research agent, against Fabio Akita's
[Hot Take: Harness, Loop Engineering, Graph Engineering Are
Bullshit](https://akitaonrails.com/en/2026/08/18/hot-take-harness-loop-engineering-graph-engineering-are-bullshit/)
(2026-08-18), Kevin Mahoney's [AI Review Loops Don't Always
Stabilise](https://kevinmahoney.co.uk/articles/ai-review-loops/) (2026-08-25),
the caveat sections Addy Osmani wrote against his own thesis, the section
headings of Gergely Orosz's paywalled survey, and Reddit search snippets, since
firecrawl cannot scrape reddit.com and returns "we do not support this site."

**Evidence state.** One criticism in this file is backed by an experiment, and
it is a single self-described quick test with no controls whose writeup its own
author labels AI-generated. Akita has real benchmark numbers but none of them
measure a loop; they measure harnesses and orchestrators, and I say below where
he stretches them. The Reddit reaction reaches me only as search-result
snippets, which means I have the headline sentiment and not the argument behind
it. Orosz's strongest three sections sit behind a paywall and I have their
headings only. The steel-manning is mine, and where I say a criticism survives
or fails, that is a judgment, not a finding.

## Verdict

Three criticisms survive: loops that grade their own work do not reliably
converge, the token cost is real and falls hardest on the people not being given
free tokens, and the term was coined and amplified by people selling the
products it describes. Two do not: "it is just tests and code review" is right
about the verification half and misses the operational half entirely, and
"manufactured term" is a complaint about marketing dressed as a claim about
whether the technique works.

The most interesting criticism is the structural one I cannot fully check,
because it is paywalled: that the loop was a workaround for missing harness
features, and the harnesses have now added them. The lineage supports it. If
`/goal` and `/schedule` cover what a hand-rolled loop covered, then loop
engineering describes a thing you configure rather than a thing you engineer,
and Akita's objection to calling it a discipline lands after all, by a route he
did not take.

## Review loops that fail to converge

Mahoney's is the strongest criticism here because it is falsifiable and someone
falsified the optimistic version. He names three mechanisms, and they are
distinct failures rather than three phrasings of one:

> AI does not have a consistent set of opinions. What it considers good code can
> change from run to run. In the worst case, it can flip-flop from review to
> review, causing a never-ending loop.

Then scope creep, where the review escalates from "you don't have a test for
this" to "you don't have an Android app for this," and then false positives,
where a hallucinated review finding introduces a real defect.

His test: he asked Opus 5 to generate a small amount of "perfect, non-trivial"
code and ran it through three review-fix loops. His reported result is that the
defect count increases with each review. He is explicit that this is a quick
test, the [writeup itself is
AI-generated](https://gist.github.com/KMahoney/3098f0f12638d0a83a5ef3b91bef601d),
and there is no control arm, no repetition, and no independent scoring. So treat
the number as an existence proof rather than an effect size: review-fix loops can
diverge, and here is one that did.

This survives, and it is precisely targeted. It hits the loop whose sensor is
another model's opinion, which is the shape Osmani's maker-and-checker split and
LangChain's LLM-as-judge grader both produce. It does not hit a loop whose
sensor is AST-grep or a test suite, because a deterministic sensor cannot
flip-flop. That distinction is Mistele's whole argument for preferring a
deterministic sensor, and Mahoney is the empirical case for it. His own hedge is
fair: "With careful guardrails this can work."

Mahoney also names a failure mode nobody else in the corpus does, the slow
distributed version: "dev A creates an AI-generated PR, dev B lazily AI-reviews
it, then dev A AI-fixes it, ad infinitum." That one has no scheduler and no
workflow file, so no amount of loop engineering catches it.

## "That's had a name for fifty years: tests and code review"

Akita's paragraph is the one that travelled:

> Loop Engineering is this season's name for designing the cycle an agent
> repeats: execute, verify against evidence, iterate until a stop condition. The
> guides list real failure modes, the agent declaring "done" too early, the goal
> drifting on each pass. But the recommended mitigation is "an independent
> verifier checking objective evidence." That's had a name for fifty years:
> tests and code review. An agent in a loop with a test suite is the same old
> basics with a new name.

His broader thesis is about the economics of naming: "when the technology itself
becomes a commodity, the money migrates to taxonomy. They invent five new names
for chaining API calls and suddenly there's a certification that expires in six
months." He puts it in a lineage with microservices, hexagonal architecture, and
DDD, quoting Pedro Arantes, and his diagnosis of how each went wrong is fair:
"Each of them was born from a real problem, and became the default for people who
didn't have the problem."

He also has receipts, which most sceptics do not. His LLM coding benchmark found
that the harness rescues a weak model (Grok 4.3 scored 18 on bare opencode and 55
on the grok CLI) and is noise for a frontier one (Grok 4.5 scored 92 and 91,
Grok 4.6 scored 92 and 93). Where the harness bites is cost: the same roughly 11
million tokens cost $1.19 on the grok CLI against $6.33 on opencode via
OpenRouter, because the official CLI uses native prompt caching. His conclusion
from that is "picking a decent harness matters, for cost, and to give structure
to a weak model. But that's an afternoon of reading docs and watching your token
bill, not a new discipline with a learning track."

**Where it fails.** The verification half of loop engineering is indeed tests and
code review, and Akita is right that nobody should pay for a course on it. But
the mechanisms in [control-theory-method.md](control-theory-method.md) that took
HumanLayer two iterations to find are not verification. A committed violation
baseline that blocks new regressions while a loop chips at old ones is not a
test. A bound that says "shut down if the previous PR from this loop is still
open" is not code review; it is work-in-progress control against a review queue,
and it exists because unattended agents produce faster than humans consume, which
is a genuinely new operating condition. A markdown feedback file loaded
deterministically into an agent's context so a review comment changes future runs
is not a code review either. Akita is arguing against the taxonomy and hitting the
courses, and there is a small amount of engineering standing behind both that his
paragraph does not reach.

His own evidence also argues against him in one place. The best result in his
entire benchmark "came from one strong model, alone, in a simple loop. Fable 5,
96 points, Claude Code, done." A simple loop is still a loop.

**Where he is right and it matters for anyone building this.** His argument
against super-orchestration is the strongest thing in the post, and it is an
argument *for* Mistele's shape rather than against it. The arithmetic is that a
ten-agent chain at 90% per-step success lands at 0.9^10, roughly 35%. He measured
an instance: MiniMax M3 scored 24 under an orchestrator and 91 clean, and his read
of that swing is the sentence worth keeping: "when the plumbing dominates the
result, you stopped measuring the model and started measuring the plumbing." He
backs it with Cognition's [Don't Build
Multi-Agents](https://cognition.com/blog/dont-build-multi-agents), with
Anthropic's own admission that [its multi-agent research
system](https://www.anthropic.com/engineering/multi-agent-research-system) burns
15x more tokens and that most coding tasks are not parallelizable, and with a
Berkeley survey of [86 production systems across 26
domains](https://arxiv.org/abs/2512.04123) finding 68% of production agents
execute at most ten steps before a human intervenes. He also concedes the exact
corner Mistele occupies: "agents running overnight, unwatched, holding
credentials, there, independent verifiers and hard budgets become a security
matter, not a style one."

## The "psyop" and "manufactured term" reaction

Reddit's version is blunter. A thread on r/ClaudeCode is titled ["loop
engineering ===
psyop"](https://www.reddit.com/r/ClaudeCode/comments/1ugy7w4/loop_engineering_psyop/).
A reply in r/AI_Agents quoted in search results calls it a "manufactured term
invented by the AI tech bros (who only leaned software engineering through vibe
coding) to make you feel inferior to them." Another thread splits the difference
usefully: "if Loop Engineering means 'building structured feedback from
real-world outcomes back into your agent system' that's real, valuable, and..."
with the snippet cut off there.

**As a claim about whether the technique works, this fails.** People are running
loops and reporting outcomes. Orosz collected around 210 replies and printed
specific ones: a PostHog engineer pulling flaky tests from a trunk API in a loop
and landing 13 stabilisation PRs, a nightly end-to-end suite where an agent
triages the failure and either fixes it or escalates at a retry cap, a founder
who migrated a React codebase to React Native with a skill on a 30-minute cron
instead of a 50-to-100-ticket epic. None of that is measured against a baseline,
but it is not imaginary either.

**As a complaint about provenance, it is correct and worth stating once.** The
term was coined by an Anthropic Member of Technical Staff who works on Claude
Code, about a Claude Code feature, amplified by the creator of Claude Code and
the creator of OpenClaw, formalized into a four-level stack by LangChain where
each level maps to a LangSmith SKU, given an encyclopedia entry by IBM that names
IBM Bob in its second paragraph, and given its best technical treatment by the
co-founder of a company that sells agent infrastructure and closes his talk with
"at HumanLayer we're hiring." Every single primary source in this research note
has a commercial interest in the term existing. That does not make any of them
wrong. It does mean the absence of an independent measurement is not an accident
of timing.

## Token cost

Everyone flags this, including the advocates, which is unusual enough to take
seriously.

Mistele: "What is abundantly clear, however, is that this is really expensive if
you don't work at a Frontier Lab and have an unlimited token budget." Osmani puts
it in his opening paragraph, before the definition: "you absolutely have to be
careful about token costs (usage patterns can vary wildly if you are token rich
or poor)." He adds that subagents make it worse, since each one runs its own
model and tool work, so "spend them where a second opinion is worth paying for."
LangChain names the tradeoff at level two: "adding verification increases latency
and cost per run." Orosz devotes a section to it under the heading "Disappointment
and 'tokenmaxxing'," summarised as "at companies that pay API prices for tokens,
loop engineering gets expensive fast." The third-most-liked reply to Ng's post is
the same objection from a developer.

This survives without qualification, and it has a second-order form that is
easier to miss. Mistele cites Matt Pocock's point that bad code is more expensive
in the age of agents than it has ever been, because the agent reads it every run.
A loop that ships mediocre code cheaply is buying a recurring cost with a one-off
saving.

## Comprehension debt and cognitive surrender

The sharpest caveats against loop engineering are Osmani's, in the post that
names it, and they are stronger for being self-inflicted.

> A loop running unattended is also a loop making mistakes unattended.

> The faster the loop ships code you did not write, the bigger the gap between
> what exists and what you actually get. That's comprehension debt and a smooth
> loop just makes it grow faster unless you read what the loop made.

> When the loop runs itself it's very tempting to stop having an opinion and just
> take whatever it gives back. I called that cognitive surrender. Designing the
> loop is the cure when you do it with judgement and the accelerant when you do
> it to avoid thinking, same action, opposite result.

His closing formulation is the one I would keep: "Two people can build the exact
same loop and get completely opposite results. One uses it to move faster on work
they understand deeply. The other uses it to avoid understanding the work at all.
The loop doesn't know the difference. You do."

He then tells on himself in the follow-up, which is the most credible paragraph
in the corpus. He had an agent research competitor gaps and draft local PRs, read
the research, skipped the implementations, and nearly pushed them. His verdict on
himself: "So I delegated the task, but I was close to delegating the judgment as
well." When he did read the diffs he found they added significant complexity for
little gain.

This survives, and note what it is not. It is not an argument against loops. It is
an argument that the loop's output volume and your reading rate are independent
variables, and the loop controls one of them. Mistele's one-open-PR bound is the
only mechanism in the entire corpus that couples them.

## The criticism I could not fully check

Orosz's sixth section is headed "Was looping a hack while tooling caught up?" and
summarised as: "Distinguished engineer Max Kanat-Alexander believes the 'loop'
might have just been a temporary hack while the harnesses added the ability to do
the same from a single prompt." His seventh asks whether context engineering
matters more, summarised as "Except for engineers building AI infra, there seems
little benefit in going deep into loop engineering."

Both sections sit behind the paywall, so I have the headings and not the
argument. I flag them anyway because the lineage in
[definition-and-lineage.md](definition-and-lineage.md) independently supports
the first one. Ralph existed because a 200k context window could not hold a large
task. Codex shipped Goals in April 2026, Hermes followed in three days crediting
Codex outright, and Claude Code shipped `/goal` on 2026-05-12. Orosz's own line
in the free portion is that Goals "feels awfully similar to a Ralph loop, except
compressed into a single command."

If that reading is right, then the durable part of loop engineering is not the
loop, which you now get from `/goal`, but the two things no vendor ships: a
sensor that measures your specific codebase, and a bound on how fast the loop is
allowed to produce work for your specific reviewers. Which is roughly what
Mistele's talk spends its time on, and roughly nothing that a course would sell.
