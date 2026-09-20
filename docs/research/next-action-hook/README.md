# A next-action recommendation for Firehorse

Research on making Firehorse tell you what to do next when a workflow ends, the way GSD does,
and on answering "are we actually done, did the tracker get updated" without asking the agent
and trusting the answer.

**Window:** researched 2026-09-20. Sources are the GSD source tree at v1.50.0-canary.0, the
`thruwire/foreman` source tree, the Claude Code hook reference, and TypeSafe's skill-suggestion
cookbook.

**Status:** a design study, not a plan of record. Nothing here has been built or measured.

## Read in this order

| Document | What it covers |
|---|---|
| [gsd-mechanism.md](gsd-mechanism.md) | How GSD actually produces its next-step advice: a text block, a state file, and three advisory hooks. No model anywhere |
| [foreman-gates.md](foreman-gates.md) | `thruwire/foreman`'s ten gate questions, its evidence struct, and its 127-line policy. The answer to "are we done" as named probabilities plus deterministic thresholds |
| [hook-surface.md](hook-surface.md) | What Claude Code hooks allow, and the two rules that rule out the obvious first attempt |
| [jev-fit.md](jev-fit.md) | TypeSafe's skill-suggestion recipe, its measured numbers, and the four jaggedness modes that bite this use case |
| [design.md](design.md) | Four stages for Firehorse, with what not to build |
| [sources.md](sources.md) | Every source with URL, commit pin, archive location, and checksum, plus five limits on the corpus |

## The verdict

**GSD's next-step advice is not a hook and not a model.** It is an `<offer_next>` block written
into the end of every workflow, rendered verbatim, carrying one fully-argument-filled command
and a literal `/clear then:` line. It survives `/clear` because position lives in
`.planning/STATE.md` on disk. GSD's hooks exist only for the two things a workflow cannot see
from inside itself: how full the context window is, and whether someone edited planning state
outside the flow. Both emit advisory text and fail open.

**Firehorse has none of the three layers.** No workflow emits a next step, there is no
position file, and the plugin's only hooks are two `SessionStart` checks. The cheapest version
of what you want is text in the workflow definitions, and it costs no latency and carries no
accuracy risk.

**The tracker question is mostly deterministic.** "Did it update the issue tracker" is
`gh issue view N --json comments`. Foreman's contribution is not that a model should answer it,
but the split underneath: the model estimates named probabilities, ordinary code owns the
thresholds, the limits, and the legal set of actions. Firehorse should take that split and
apply it to the one question code genuinely cannot answer, which is whether a diff satisfies a
ticket.

**Two hook facts decide the shape.** On a `Stop` hook, `additionalContext` restarts the turn
rather than ending it, so a "you are done, open a fresh session" banner built that way would
make the session refuse to finish. `SessionEnd` discards `systemMessage` entirely. The one
working combination is a `Stop` command hook emitting `systemMessage`.

**Prototype the inference with a `type: "prompt"` hook before writing any Jev code.** Prompt
hooks run on `Stop`, need no API key, no SDK, and no version pin. Port to Jev when latency or
cost proves it worth doing, against a baseline that then exists.

## The one number in all of this

TypeSafe's cookbook, over 488 requests: an agent picking from its own 182-skill roster loads
the wrong skill 16.8% of the time and loads one when nothing fits 9.8% of the time. With a Jev
suggestion, 7.3% and 4.0%. Handed the right answer outright, 2.5% and 1.2%.

That last row is the ceiling. It also measures skill selection from a user request, which is
not the question Firehorse is asking. Treat it as the shape of the available gain, not as
evidence this works.
