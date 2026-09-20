# Matt Pocock on AI skills: the doctrine behind the workflows

Notes on a Pragmatic Engineer interview with Matt Pocock, gathered to answer one
question for this repo: which of the practices he describes does Firehorse
already implement, which does it claim to and cannot, and which are missing.

They are the evidence behind [`docs/GUIDE.md`](../../GUIDE.md) and the tickets on
map [#218](https://github.com/cinjoff/firehorse/issues/218), so they belong in the
repo rather than in one session.

**Window:** researched 2026-09-20. The interview was published around 2026-09-18.

**Status:** a one-off snapshot of a single source. Not on a refresh schedule.
This is one practitioner's account, not a survey and not measured: treat the
concepts as vocabulary worth borrowing and the rules as his defaults rather than
findings.

## Read in this order

| Document | What it covers |
|---|---|
| [concepts.md](concepts.md) | The seventeen named ideas, who each comes from, and the failure each one prevents |
| [decision-rules.md](decision-rules.md) | The rules stated as rules, and the four places he is openly undecided |
| [firehorse-fit.md](firehorse-fit.md) | Concept by concept: what this repo implements, what is broken, what is missing |

## The short version

**The argument.** Agents have absorbed tactical programming, so what is left to
the human is strategic programming, and it pays better than before because you
apply it at higher leverage. The tactical/strategic pair is Ousterhout's.

**Why old books.** Terms like tracer bullet, deep module, and ubiquitous language
have been in print for 20 years or more, so they sit in the model's priors.
Pocock's coinage for this is a **leading word**: repeat one a couple of times in a
prompt or skill and the agent starts using it in its own reasoning and changes
behaviour accordingly. This is the load-bearing claim. Without it, a guide built
on three old books is nostalgia rather than technique.

**The sizing constraint.** Dex Horthy's smart zone, roughly the first 150k tokens
regardless of window size, is what forces one ticket per session, and forces
planning itself to be split across sessions around an artifact. That artifact is
the map, and it is why `wayfinder` exists.

**The uncomfortable conclusion.** Momento-driven development: your agent wakes up
with no memory every session, so you are optimising the codebase for a permanent
new starter. A human routes around a bad codebase by building memory; an agent
cannot. Your code is the environment your agent operates in, and you are your
agents' platform team.

**Where he is not settled.** He ships a TDD skill and recommends it, and also
argues it aims at the wrong problem for agents. He tried spec-driven development
and rejected it on measured results. He defends upfront planning and then
concedes waterfall is a scarecrow. `decision-rules.md` preserves all four rather
than tidying them into advice, because Firehorse encodes one side of the TDD
question today and [#226](https://github.com/cinjoff/firehorse/issues/226) exists
to settle it.

## What this repo took from it

`firehorse-fit.md` has the full mapping. In short: grilling, the map, one ticket
per session, ubiquitous language, and automated review are implemented and work.
Momento-driven development is implemented and the memory half is broken here.
Spec-to-tickets and the gardening loop are missing entirely.

## On the transcript

The transcript is **not committed**. It is 20,159 words of auto-generated captions
of someone else's published interview, so the repo cites and summarises it instead
of republishing it. Proper nouns are garbled throughout the captions and its
figures are unreliable; every name in these notes was corrected by hand against
the speakers' own spellings, and no figure from the captions is quoted.

To regenerate it locally, into the gitignored `.firecrawl/`:

```sh
yt-dlp --write-auto-subs --sub-lang en --skip-download \
  -o '.firecrawl/yt-%(id)s' 'https://www.youtube.com/watch?v=4DhcSPkEbwI'
```

## Deliberately not here

**The session retro.** The same effort audited 164 local sessions for where these
practices actually held. Those findings are not in this repo. D-147 requires
persisted session-audit reports to carry only redacted snippets, hashes, or
withheld markers, and `62a4105` deleted `.planning/` specifically to stop session
audits reaching a public repo. This repo is public.

## Provenance

Extracted by subagent from the captions on 2026-09-20, in full, then checked
against the repo's shipped surface. Claims are attributed inline to the person
who made them. Where the source hedges, these notes hedge.

Two things were verified locally rather than taken from the interview: the
Firehorse command and skill surface against `packages/firehorse-claude/`, and the
graph and memory state against `.firehorse/manifest.json`.

## Related

- [`docs/GUIDE.md`](../../GUIDE.md) is the user-facing guide these notes produced.
- [`docs/research/loop-engineering/`](../loop-engineering/) covers overlapping
  territory. Ralph loops appear in both, and the context-window argument here is
  the same one that motivates the loop there.
- [`docs/research/skill-quality/`](../skill-quality/) covers measurement, which this
  source has opinions about and no data on.
