# The rules, and where he is undecided

The interview states a set of rules outright. Those are in the first half. The
second half records the four places he argues against himself, because flattening
those into advice would misrepresent the source and produce worse guidance.

## The rules

### The core triage
The organising rule. Before any piece of work, ask how expensive it would be to
be wrong.

| The work | What to do |
|---|---|
| Small enough to align afterwards | Do not grill |
| Fits into a single session | Grill |
| Spans multiple sessions | Chart a map |

Grilling earns its cost on work that is large and hard to row back from. The
reason is specific to agents: if the agent gets it wrong, the wrong code sits in
its context window influencing everything that follows, and doing the alignment
after the fact is expensive. When you do grill, settle the tricky questions first,
his example being the authentication token.

### When not to grill
Simple bug fixes, a five-line change, moving a button. You can see the whole thing,
so align afterwards. He states outright that you should not use grilling for
everything, and that where you can, you should shift right as much as possible.
Only "shift right" appears in the interview; he never says "shift left".

His worked example of shifting right: a feedback button files a GitHub issue, an
implement agent picks it up immediately, a review agent follows, and he does his
alignment by watching the thing get fixed. Scope for that path is work that is
easy to specify.

### Sizing
- One ticket per session.
- The reason planning splits across sessions: there is no way to plan something
  large inside 150k tokens.
- Ralph rule: make the smallest change that moves toward the goal, then clear the
  context.

### Planning budget
**Gergely Orosz's framing, which Pocock endorses.** A one-month project justifies
one or two days of planning. A one-day project justifies none.

### Prototype before the spec
Build three or four versions, pick a favourite, iterate on it. He calls producing
prototypes an essential part of writing specs, not a phase that follows them.

### Verification
- Demand proof the change does what it claims, and that it would fail without the
  change.
- Automated review targets: impose coding standards, hunt tautological tests where
  the test asserts the implementation back at you, and improve the test suite over
  time.

### Organisational
- First step is observability over agents across the organisation, to find what is
  working, plus someone whose job includes reading that data.
- Some repos will have better success rates than others; take what is working
  there and spread it.
- Standardise on a common set of skills so you can A/B test process changes.
- He runs an architecture-improvement skill every morning, reviews the proposal,
  and turns it into tickets.

### General
- Make the work text-based wherever possible, because that is where agents do
  well.
- For juniors: use the agents as much as possible, because that is how people will
  be working.

## Where he is undecided

### TDD
He holds both positions, and flags the thinking as in flight rather than settled.

- He ships a TDD skill and recommends it.
- The case against: TDD optimises for a small human working memory, and a large
  working memory is exactly what agents have, so on his account it aims at the
  wrong problem. He hedges the verdict itself.
- The case for, on different grounds than the original rationale: agents need
  feedback loops, and a failing-then-passing test is hard for an agent to cheat.
- His own summary is a mixed relationship: he still recommends it for the
  confidence it gives a human, while starting to see the counter arguments.
- A separate complaint: agents write poor tests, especially tautological ones.

What survives the disagreement is the rule under Verification above: demand proof,
not tests. [#226](https://github.com/cinjoff/firehorse/issues/226) owns what this
repo does about it, since `build` currently encodes the recommendation and not the
doubt.

### Spec-driven development
Tried, measured against hand-coding, and rejected. He calls the term strange and
too broad, describes hoping English was the new programming language, and reports
getting worse results than coding by hand, with no sign of improvement. He also
says the generated code was poor when he looked at it, which you are not supposed
to do.

Note the tension he does not address: he keeps a spec. The difference is that his
spec is a destination document that spawns tickets, not an editable source of
truth you regenerate code from. Citing "spec" without that distinction
misrepresents him.

### Waterfall
He raises the objection against himself, that wayfinder sounds like waterfall. His
defence is the upfront prototyping rather than a defence of waterfall. He then
accepts the point that waterfall as criticised never really existed, calling it a
scarecrow, and keeps criticising it anyway on the grounds that it is a useful
cautionary tale. He lands on agile as the closer fit, hedged.

### The factory tax
Floated, not asserted: he does not know whether you need something like a fifth of
your time on the factory that builds the software as well as on the software. He
adds that you might need to hide that work before revealing it.

### Remote over local
He has moved to a remote box driven from a chat client, arguing collaborative
grilling needs a shared space rather than your terminal. The only thing he still
does locally is debugging the remote bot. Front end is the live exception, though
he thinks port forwarding largely defeats it.
