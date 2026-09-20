# What loop engineering is, and where it came from

Researched 2026-09-20 by a Firehorse research agent, against Geoffrey Huntley's
original Ralph post (2025-07-14), Addy Osmani's three posts that name and extend
the practice, Gergely Orosz's survey for The Pragmatic Engineer, Andrew Ng's
open letter, IBM's encyclopedia entry, Sydney Runkle's LangChain piece, and a
`/last30days` engine run over the 30 days ending 2026-09-20.

**Evidence state.** The chain of attribution is documented and I verified each
link against the post that owns it, with three exceptions. Boris Cherny's and
Peter Steinberger's remarks reach me only through people quoting them, because
the primary artifacts are an X post and a conference talk I did not fetch.
Orosz's article paywalls after its fourth section, so I have his headline
summaries for sections five through seven but not his evidence for them. And
nobody has measured any of this: there is no published trial, no benchmark, and
no controlled comparison of a loop against a person doing the same work by hand.
Every quantitative claim you will read in this file is a practitioner report.

## Verdict

Loop engineering is a real change in where the work sits, wearing a name that
arrived about three months before the evidence did. The mechanism is old and the
operational machinery around it is new. Huntley published the technique in July
2025, both major harnesses shipped it as a built-in command by May 2026, Osmani
named it on 2026-06-07, and Ng called it a "hot buzzphrase" on 2026-06-30. That
is a twenty-three day gap between the coinage and the backlash, which tells you
something about how the term travelled.

Read the lineage as a story about a workaround becoming a product feature. Ralph
existed because context windows were 200k tokens and a large task did not fit.
`/goal` exists because the vendors watched people hand-roll that workaround and
absorbed it. Whether anything remains once the absorption finishes is the open
question, and it is the strongest argument against treating this as a discipline.

## The definition, and whose definition it is

Osmani's is the one people quote:

> Loop engineering is replacing yourself as the person who prompts the agent. You
> design the system that does it instead.

That is from [Loop Engineering](https://addyosmani.com/blog/loop-engineering/),
published 2026-06-07. He tightened it two months later in
[Practical Loop Engineering](https://addyosmani.com/blog/practical-loop-engineering/)
(2026-08-14) to "an autonomous, self-correcting feedback cycle where an AI agent
repeatedly acts, tests its results and adjusts its approach until a specific goal
is met."

One disclosure that belongs next to the definition rather than in a footnote.
Osmani's own author bio on both posts says he is a Member of Technical Staff at
Anthropic working on Claude Code. The person who named the practice works on one
of the two products the practice is about, and his posts read partly as feature
documentation. That does not make the definition wrong. It does mean the coinage
came from inside the vendor, which is exactly what the sceptics noticed.

[IBM's entry](https://www.ibm.com/think/topics/loop-engineering) is the
encyclopedia version: "designing agentic workflows, or loops, that iteratively
guide AI agents toward completing user-defined goals with minimal human
intervention." IBM draws the line against prompt engineering cleanly. Prompt
engineering crafts one optimized instruction and a human evaluates the result;
loop engineering builds a system that self-prompts and evaluates its own work
until a specified goal holds. IBM also names its own product, Bob, alongside
Claude Code and Codex in the same sentence, so treat it as a vendor page that
happens to define terms well.

## The chain, with dates

**2025-07-14, Huntley publishes Ralph.** [Ralph Wiggum as a "software
engineer"](https://ghuntley.com/ralph/) opens with the entire technique on one
line:

> Ralph is a technique. In its purest form, Ralph is a Bash loop.
>
> `while :; do cat PROMPT.md | claude-code ; done`

The post is much longer than that line, and the length is the part people skip.
It has a section called "phase two: backpressure" that tells you to wire a type
checker, a test suite, a static analyser, or a security scanner into the loop so
invalid code generation gets rejected, and it warns that if you Ralph a
dynamically typed language without a type checker "you will run into a bonfire of
outcomes." That is a sensor, a year before anyone called it one. Huntley also
writes that "engineers are still needed. There is no way this is possible without
senior expertise guiding Ralph."

Huntley's own frame is a rejection of the thing loop engineering later tries to
protect. Under the heading "but maintainability?" he asks: "by whom? By humans?
Why are humans the frame for maintainability?" Hold that, because it is the
single sharpest disagreement in this whole literature and section three of
[control-theory-method.md](control-theory-method.md) is an answer to it.

**Late 2025, Ralph goes viral.** The two accounts disagree on the month. Orosz
writes that "In December, the approach went viral"; Kyle Mistele says on stage
that "It went viral this past January." Both are describing the same window
either side of the new year, and I found nothing that settles it. Matt Pocock's
tutorial [Ship working code while you
sleep](https://www.youtube.com/watch?v=_IK18goX4X8) is the artifact Orosz points
at for the spread, and its contribution is the continuously updated master PRD,
which turns a fixed plan into what Orosz calls a "dynamic Kanban."

**April to May 2026, the harnesses absorb it.** Per
[Orosz](https://newsletter.pragmaticengineer.com/p/what-is-loop-engineering),
Codex shipped Goals first, Hermes followed three days later on 2026-05-02 with
docs that credit Codex CLI 0.128.0 outright, and Claude Code shipped `/goal` on
2026-05-12. Claude Code had already shipped `/loop` in March. The distinction the
two commands draw is the one that matters for everything downstream: `/goal`
holds a completion condition and keeps working until a separate evaluator model
says the condition holds, while `/loop` reruns a prompt on a timer. Osmani's
practical post adds the fine print I did not find elsewhere, that recurring loops
expire seven days after creation and are session-scoped, and that `/schedule`
moves a routine to the cloud.

Orosz's read of this is blunt and worth keeping: "Goals feels awfully similar to a
Ralph loop, except compressed into a single command."

**2026-06-07, Osmani names it.** The post credits its two triggers explicitly.
Steinberger: "You shouldn't be prompting coding agents anymore. You should be
designing loops that prompt your agents." Cherny: "I don't prompt Claude anymore.
I have loops running that prompt Claude and figuring out what to do. My job is to
write loops." Orosz attributes the Cherny line to [a talk at Anthropic's developer
conference](https://www.youtube.com/watch?v=kRgdkOw82F0).

**2026-06-16, LangChain formalizes a stack.** Sydney Runkle's [The Art of Loop
Engineering](https://www.langchain.com/blog/the-art-of-loop-engineering) nests
four loops: the agent loop (model calls tools until done), the verification loop
(a grader scores the output and sends it back with feedback), the event-driven
loop (a webhook, a schedule, or a Slack channel fires the agent), and the hill
climbing loop (an analysis agent reads production traces and rewrites the harness
config). The fourth is the one nobody else in this corpus has. Runkle's line about
it is the good one: "the return arrow doesn't just loop back to the top, it reaches
inside and updates the agent loop directly." It is also, transparently, a pitch for
LangSmith Engine, and every level maps to a product SKU.

**2026-06-30, Ng marks the crest.** [Andrew
Ng](https://x.com/AndrewYNg/status/2071988145667928442) opens with "'Loop
engineering' is a hot buzzphrase after mentions of it by Boris Cherny (Claude
Code's creator) and Peter Steinberger (OpenClaw's creator) went viral on social
media," then proposes three loops of his own at different timescales: the agentic
coding loop running every few minutes, the developer feedback loop running over
tens of minutes to hours, and the external feedback loop running over hours to
weeks. His reframe of taste is the part worth stealing. He argues humans hold a
context advantage rather than a mystical quality, "since that gives us a clearer
path to helping AI systems get better." The post drew 8,553 likes. The
third-ranked reply is a complaint that the methodology presumes a $200 a month
subscription, which is the cost objection arriving on day one.

**2026-07-25, Mistele publishes the control-theory framing.** Covered in
[control-theory-method.md](control-theory-method.md).

**2026-08-18, Akita calls it bullshit.** Covered in [criticism.md](criticism.md).

## How it differs from harness engineering and context engineering

Osmani draws his own boundary, and it holds up: "Loop engineering sits one floor
above the harness. The harness but it runs on a timer, it spawns little helpers,
and it feeds itself."

Harness engineering is the older and better-evidenced term. Osmani's [Agent
Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/)
(2026-04-19) credits the coinage to Viv Trivedy and reduces it to one equation:
"Agent = Model + Harness. If you're not the model, you're the harness." The scope
is everything around the weights, meaning system prompts, `CLAUDE.md`, tools, MCP
servers, sandboxes, orchestration, hooks, and observability. Its central habit is
a ratchet: every agent mistake becomes a permanent rule in `AGENTS.md`, a hook, or
a reviewer subagent. Harness engineering also has the only hard number in this
neighbourhood, which is that a team moved a coding agent from Top 30 to Top 5 on
Terminal Bench 2.0 by changing only the harness, though that figure reaches Osmani
secondhand from Trivedy and HumanLayer and I did not verify it against a
leaderboard.

Context engineering is narrower than either. IBM scopes it to "designing systems
that provide the data the AI model needs while minimizing excess context" and
files it as one ingredient of a loop, alongside tool design and the harness.

The clean way to hold the three: context engineering decides what goes into one
model call, harness engineering decides what surrounds the model inside one
session, and loop engineering decides what triggers the session and what
condition ends it. Orosz's seventh section argues that for most developers the
context one is the higher-value skill, and I think he is right for anyone not
building agent infrastructure.

## What the last thirty days look like

I checked, because a term that crested in June is worth re-measuring in September.
The `/last30days` run over the window ending 2026-09-20 found the conversation has
gone quiet. Hacker News carried fourteen stories, and every loop-engineering one
scored between three and five points: "Ask HN: What are you using loop engineering
for?" got four, Kevin Mahoney's failure report got three, and Akita's takedown got
four. Neither of the two Reddit threads the run surfaced was about loop
engineering at all. Fifty-three X posts and one YouTube video carried most of the
remaining volume.

Read that carefully rather than as a verdict. Low HN engagement three months after
a term crests is the normal shape of a term cresting, not proof the practice died.
What it does mean is that anyone claiming loop engineering is currently sweeping
the industry is describing June, not September.
