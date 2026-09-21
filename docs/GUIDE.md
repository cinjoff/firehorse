# Working with Firehorse

Here is what a bad agent session looks like. You ask for a feature. The agent builds the
entire database layer. Then the entire application layer. Then a component library. Only
at the very end does it try to wire the three together, and that is when you find out the
shapes never matched.

Nothing in that session was a typing mistake. Every file compiled. The failure was
structural, and it was decided before the first line was written.

Firehorse gives you eight commands for front-loading those decisions: stand up a new
project, index the codebase, chart a map, write the spec the map arrives at, cut that spec
into slices, build one, fix a bug, and open the memory viewer. Most days you will use two
of them.

The commands are the easy part. What makes them work is a set of ideas about how agents
fail, drawn mostly from three books written before anyone had an agent. That is not
nostalgia. Terms like tracer bullet, deep module, and ubiquitous language have been in
print for 20 years or more, which means they are in the model's priors. Matt Pocock calls
these leading words: repeat one a couple of times in a prompt or a skill, and the agent
starts using it in its own reasoning and changes what it does. Jargon turns out to be a
compression channel between you and the agent.

So the job that is left to you is not the typing. John Ousterhout's distinction is between
tactical programming, the syntax and the immediate change, and strategic programming, how
the system holds together over time. Pocock's claim, and this guide is built on it, is
that AI has largely eaten the tactical half. Firehorse is a set of commands for doing the
strategic half on purpose.

---

## Start here

Skip this section if you already run agents seriously. Everything you want is under
[the eight ideas](#the-eight-ideas) and [the decision rules](#the-decision-rules).

### Install

```sh
curl -fsSL https://raw.githubusercontent.com/cinjoff/firehorse/main/install.sh | bash
```

That adds the upstream marketplaces, installs the plugin and its dependencies, registers
the MCP servers, and brings up the local memory stack. Restart Claude Code afterwards so
the plugin, its hooks, and the MCP servers load.

Firehorse does not contain the craft. It installs
[`mattpocock-skills`](https://github.com/mattpocock/skills) for the engineering
disciplines, [`impeccable`](https://github.com/pbakaus/impeccable) for interface work, and
[`claude-mem`](https://github.com/thedotmack/claude-mem) for the memory store,
and calls them at the step where each earns its place. It never copies them.

### Your first hour

In the repo you want to work in:

```
/firehorse:new-project
```

This sets the repo up once: the remote, the upstream skills, the label vocabulary, the
`.firehorse/manifest.json`, and an interview that produces a `DESIGN.md`. Answer the
interview properly. It is the first grilling session, and what you say here is what every
later session inherits.

Then:

```
/firehorse:index
```

This reads your codebase into a graph an agent can query, writes anchor documents under
`docs/codebase/`, and records what it managed to index. Check its report rather than
assuming it worked. The memory half can fail quietly, and there is more on that under
[honest limits](#honest-limits). How memory is configured here, and what leaves the
machine, is in the [memory runbook](./MEMORY.md).

Now take a real piece of work:

```
/firehorse:map
```

You will be interviewed about where you are going, and the session ends with a map issue
on your tracker and a handful of tickets under it. It will not write code. That is the
point.

Those tickets are questions, not work. Each one is a decision, a piece of research, or a
prototype, and you resolve them one per session with `/firehorse:map <map>` until nothing
is left to decide. If the first session surfaces nothing to decide at all, the map does not
get created and you are sent straight on: the work fits in one session.

When the way is clear, in a **fresh session**:

```
/firehorse:spec <map>
```

That reads every decision the map recorded and writes the spec: what the feature does, the
seams it will be tested at, and what is out of scope. Then:

```
/firehorse:tickets <spec>
```

That cuts the spec into vertical slices, each a thin path through every layer, sized to one
session, and asks you to approve the breakdown before it publishes anything.

Now pick the first slice and, in another **fresh session**:

```
/firehorse:build <ticket>
```

One ticket, one session. When it is done, clear the context and take the next one.

**After this you have:** a repo Firehorse knows, a map of where you are going, a spec of
what arriving means, a set of slices, and one of them shipped. That is the whole loop. The
rest of this guide is why each step is shaped the way it is, and when to skip one.

---

## The eight ideas

These are in the order real work hits them. Each one names the failure it prevents and the
command that implements it.

### 1. The agent cannot read your mind

However good the model is, there is a gap between what you meant and what you said. Pocock
argues this is the thing people most underestimate about agents. Closing it is not only
about implementation detail. It is about telling the agent what is in scope, what is out,
and what you care about, which is the part you never write down because you have never had
to.

**Firehorse's answer:** `/firehorse:map` and `/firehorse:new-project` both run a grilling
session, where the agent interviews you until the shape is settled.

**Answer in prose, not telegraph.** This repo's own session history shows grilling answered
in numbered shorthand, and the retrospectives record the disambiguation rounds it cost
later. A terse answer feels efficient and buys a second round of questions.

### 2. Context has a smart zone

Every token you add competes for attention. Dex Horthy's framing, which Pocock uses, is
that a portion of the context window is better than the rest, roughly the first 150k
tokens, and that this holds regardless of how large the window is. Past it, the important
instructions are harder to hear over everything else in the room.

**Firehorse's answer:** one ticket per session, then clear. This is a rule, not a
preference. It is also why planning gets its own sessions and its own artifact, because a
plan big enough to matter does not fit beside the code it is planning.

### 3. The map and the fog of war

If planning itself exceeds one context window, you cannot hold the plan in a session. You
need somewhere outside the model to put it.

A map is a destination plus the decisions you know you must make to reach it, each one a
ticket. You work them one at a time, and resolving a ticket reveals others, the way fog
lifts as you move. Pocock's ticket types are worth knowing: some are decisions, some are
research, some are prototypes, and some are ordinary work.

**Firehorse's answer:** `/firehorse:map`, which wraps the upstream `wayfinder` skill and
adds a Notes block built from your repo's manifest, so every later session inherits your
standing preferences instead of rediscovering them.

### 4. Your agent wakes up with no memory

Pocock calls this momento-driven development. Your agent starts every session knowing
nothing, which makes it a permanent new starter. A human survives a bad codebase by
building up memory of where the bodies are buried. An agent cannot. It only ever sees what
is in front of it.

The conclusion is uncomfortable: you are optimising your codebase for someone who will
never learn it. Your code is the environment your agent works in, and improving that
environment is your job now. Pocock's phrase for this is that you are your agents'
platform team.

**Firehorse's answer:** `/firehorse:index`, which writes the anchor documents under
`docs/codebase/` that an agent reads before opening a file, plus a memory store that holds
what past sessions decided.

### 5. Name it once, and the same way

Eric Evans' ubiquitous language, from the first chapters of _Domain-Driven Design_, pays
twice with agents. First, a precise domain term replaces three sentences of explanation in
every prompt from then on. Second, if the term is also in the code, the agent can find the
relevant functions by grep.

Pocock's example is a term he coined with the agent for a cascade where materialising one
record forces its ancestors to materialise too. Once the word existed, the change was one
word long. He notes agents are good at coining these, so it is worth asking.

Ousterhout's deep modules belong here too: a simple interface over a substantial
implementation means the agent needs less in context to use it correctly.

**Firehorse's answer:** `domain-modeling` on grilling tickets, `codebase-design` during a
build, and `CONTEXT.md` as the place the vocabulary lives.

### 6. Get feedback across the boundary early

This is the failure this guide opened with. _The Pragmatic Programmer_ calls the fix a
tracer bullet: get something end to end that you can watch land, then improve it. A
vertical slice through every layer beats a finished layer, because the integration is
where the wrong assumptions are hiding.

**Firehorse's answer:** `/firehorse:tickets`, which cuts the spec into vertical slices and
puts the thinnest end-to-end path first, then `/firehorse:build`, which implements
test-first and asks for evidence rather than assurances.

**Where the source is unsettled, and you should be too.** Pocock ships a TDD skill and
recommends it, then argues it aims at the wrong problem for agents: TDD supports a small
human working memory, and agents have a large one. What agents need, on his account, is
feedback loops and proof that cannot be faked. His own summary is that he has a mixed
relationship with it and is starting to see the counter arguments. He also warns that
agents write tautological tests, asserting the implementation back at you.

The practical rule survives the disagreement: **demand proof, not tests.** Make the agent
show the change fails without the fix. Whether Firehorse should require TDD or require that
evidence is [an open question](https://github.com/cinjoff/firehorse/issues/226).

### 7. Someone has to review the reviewer

Agents generate plausible work quickly, and plausible is the problem. A second agent
reviewing the first catches standards violations, tautological tests, and the slow decay
of a test suite.

Pocock is honest that this only moves the question along, since something has to review the
reviewer, and eventually that is you. Automated review buys you a better starting point,
not an exit from reading the diff.

**Firehorse's answer:** `code-review` runs inside `/firehorse:build` and again at ship
time.

### 8. You are your agents' platform team

_The Pragmatic Programmer_ named software entropy long before agents. Pocock's observation
is that agents produce it faster than anything before, because they cannot think
strategically and will happily add the fourth way of doing something. He also notes, after
Jared Friedman, that you can now have serious tech debt in a tiny codebase, which used to
take years and a team.

The habit he describes is gardening: noticing the weeds early, when pulling them is cheap.

**Firehorse's answer is its thinnest.** There is no scheduled architecture-improvement loop
in the shipped commands, though `improve-codebase-architecture` exists upstream and you can
run it yourself. Pocock runs his every morning and turns the proposal into tickets.

---

## The decision rules

This is the part worth keeping somewhere you can find it.

### The core triage

Before any piece of work, ask how expensive it would be to be wrong.

| The work                          | What to do                                  |
| --------------------------------- | ------------------------------------------- |
| Small, and cheap to undo          | Do not grill. Let it run, align afterwards. |
| Fits in one session, hard to undo | Grill first, then build.                    |
| Spans several sessions            | Chart a map.                                |

The reasoning behind the middle row is the one to internalise: if the agent gets a big
thing wrong, the wrong code sits in its context window influencing everything that comes
after, and fixing the alignment later costs more than getting it right first. Settle the
awkward questions, the auth model, the rate limits, the scope, before anything is written.

Pocock is explicit that this is not universal. He says outright you should not use grilling
for everything, and that where you can, you should shift right and align after the fact. A
five-line change or moving a button does not need a planning session.

### The rest

- **Budget planning against the project.** A month of work justifies a day or two of
  planning. A day of work justifies none. (Gergely Orosz's framing, which Pocock endorses.)
- **One ticket per session,** then clear the context.
- **A map ends at a spec, not at code.** Its tickets are questions; the slices come from
  `/firehorse:tickets` afterwards. If you want to build straight off a map ticket, the map
  was the wrong tool for that piece of work.
- **Prototype before you specify.** Build three or four rough versions and pick one.
  Prototyping is part of writing the spec, not a phase after it. Slop is cheap now, so
  throwing versions away is cheap too.
- **Demand proof, not tests.** The change must be shown to fail without the fix.
- **Answer grilling in prose.** Shorthand costs you a second round.
- **Make the work text-based** wherever you can. Text is where agents are strongest.
- **Plan on the day shift, build on the night shift.** Pocock optimises for long unattended
  runs rather than flipping between many terminals.

---

## Honest limits

A guide that only describes the happy path is a brochure. Here is what is broken, missing,
or unproven today, each linked to the issue that owns it.

- **The memory half of `/firehorse:index` can fail silently.** In this repo's own run, the
  graph half indexed cleanly while every document queued for the memory store later failed,
  and searches kept returning hits from a different source, which masked it for three days.
  Check the report; do not assume a pass.
  [#232](https://github.com/cinjoff/firehorse/issues/232)
- **`build` and `fix-bug` expect a queryable codebase graph.** If `/firehorse:index` has not
  succeeded, their first step has nothing to read.
  [#233](https://github.com/cinjoff/firehorse/issues/233)
- **The path from a map to a set of slices is new and unexercised.**
  `/firehorse:spec` and `/firehorse:tickets` shipped on 2026-09-20 (D-181) and no real map
  has been through them yet. Expect the completeness gate on the map to be the part that
  needs tuning. [#222](https://github.com/cinjoff/firehorse/issues/222)
- **`firehorse-recall` is not wired into the workflows.** claude-mem's hooks inject an
  index at session start, but no workflow step calls recall. Invoke it yourself when a
  decision is about to be relitigated.
- **Nothing measures whether any of this works.** There is no harness reporting how often
  these workflows succeed. [#211](https://github.com/cinjoff/firehorse/issues/211)
- **The TDD stance is unresolved,** as described in idea 6.
  [#226](https://github.com/cinjoff/firehorse/issues/226)

Firehorse runs in Claude Code today. The definition format is provider-neutral by design,
so a second target would be a projection change rather than a rewrite, but no second target
ships.

---

## Sources

The doctrine in this guide comes from an interview with **Matt Pocock** on
**Gergely Orosz's** The Pragmatic Engineer podcast,
[AI Skills with Matt Pocock](https://www.youtube.com/watch?v=4DhcSPkEbwI), and from the
books he points at.

The three he recommends:

- **Andy Hunt and Dave Thomas, _The Pragmatic Programmer_**: tracer bullets, software
  entropy.
- **John Ousterhout, _A Philosophy of Software Design_**: tactical versus strategic
  programming, deep modules.
- **Eric Evans, _Domain-Driven Design_**: ubiquitous language. Pocock recommends roughly
  the first three chapters and is not a fan of the code-focused half.

Also named: **Dex Horthy** for the smart zone, **Jeffrey Huntley** for Ralph loops,
**Grady Booch** on what waterfall actually was, and **Jared Friedman** on tech debt in
small codebases.

Quotations and framings are summarised from the published interview. Where Pocock is
undecided, this guide says so rather than tidying it into advice.
