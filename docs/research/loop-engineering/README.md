# Loop engineering

Research on the practice of designing the cycle that prompts a coding agent,
rather than writing the prompts yourself. Gathered to answer one question for
this repo: is there anything here Firehorse should build, and does it already
have the parts.

**Window:** researched 2026-09-20. Primary sources run from Geoffrey Huntley's
Ralph post of 2025-07-14 through Kevin Mahoney's failure report of 2026-08-25,
with a `/last30days` engine run covering the thirty days ending 2026-09-20.

**Status:** a one-off snapshot. The term crested in June and July 2026 and the
conversation has since gone quiet, so anything here about momentum will age
faster than anything here about mechanism.

## Read in this order

| Document | What it covers |
|---|---|
| [definition-and-lineage.md](definition-and-lineage.md) | What the term means, who coined it and when, the Huntley to Ralph to `/goal` chain, and how it differs from harness and context engineering |
| [control-theory-method.md](control-theory-method.md) | Kyle Mistele's control-loop method in depth, the worked AST-grep example, and the shipped skill that implements it |
| [criticism.md](criticism.md) | The case against, steel-manned, and which parts of it survive |
| [firehorse-fit.md](firehorse-fit.md) | What this repo already has against Osmani's six primitives, and the real gaps |
| [sources.md](sources.md) | Every source with its URL, archive location and checksum, plus the four limits on the corpus |

## The verdict in three sentences

Loop engineering is a real relocation of engineering effort, from the prompt to
the trigger and the stop condition, wearing a vendor-coined name that arrived
about three months before any evidence did. The transferable content is
narrower than the discourse and sits almost entirely in one talk: build a
deterministic sensor your agent cannot silently disable, commit a baseline so
the problem stops getting worse while you fix it, and bound the loop to one open
PR so it never produces work faster than a human reviews it. Firehorse already
has deterministic sensors and written stop conditions at session scope, has no
scheduler or actuator and a standing decision against building one, and is
blocked on the same missing object that `docs/research/skill-quality/gepa.md`
found, which is a scored-task harness.

## The short version

**The mechanism is a year older than the name.** Huntley published Ralph on
2025-07-14 with a backpressure section that already tells you to wire a type
checker or static analyser into the loop as a rejection gate. Codex shipped
Goals in April 2026, Claude Code shipped `/goal` on 2026-05-12, and Addy Osmani
named the practice on 2026-06-07. Andrew Ng called it a "hot buzzphrase" twenty-
three days later.

**Every primary source has a commercial interest in the term.** The coiner works
on Claude Code at Anthropic, the amplifiers created Claude Code and OpenClaw, the
four-level taxonomy comes from LangChain and each level maps to a SKU, the
encyclopedia entry is IBM's and names IBM Bob, and the best technical treatment
is by a founder who is hiring. None of that makes them wrong. It does explain why
nobody has published a controlled measurement.

**The deterministic sensor is the load-bearing choice.** Mistele picks AST-grep
over an agent partly because it sits out of band from the TypeScript config and
the ESLint rules, and "if you're a TypeScript developer, you have watched Claude
disable those with inline comments." Mahoney supplies the empirical case for the
same choice from the other direction: three review-fix loops over Opus 5 output,
and the defect count rose with each round.

**Flow control is the mechanism nobody else has.** Bound the loop to one open PR
per label, checked before the expensive steps run, so a loop that nobody reviewed
does not run again. It is five lines of workflow, it couples output volume to
review capacity, and it is the only answer in the whole corpus to Osmani's
comprehension-debt warning.

**The strongest criticism that survives is convergence, not novelty.** Akita's
"that's had a name for fifty years: tests and code review" is right about the
verification half and misses the operational half, and his own best benchmark
result came from "one strong model, alone, in a simple loop." Mahoney's
non-convergence result, the token cost that every advocate flags first, and
Osmani's own comprehension-debt and cognitive-surrender caveats all survive
intact.

**Firehorse has more of this than expected, and less than it looks.** Four of
Osmani's six primitives are present, `pnpm definitions:check` is a real drift
sensor running unattended on every push, and `/firehorse:fix-bug` states a set
point and a stop condition explicitly ("a red loop precedes every edit", "done
when the loop goes green"). What is absent is everything unattended, and
`AGENTS.md` forbids adding it "until that work is explicitly scoped."

## Provenance

Gathered by one research agent on 2026-09-20 using the `firecrawl` CLI, working
from a corpus collected earlier the same day. The raw corpus is archived
outside the repo at `~/Documents/firehorse-research/loop-engineering/` and indexed by
checksum in [sources.md](sources.md); `.firecrawl/` is gitignored scratch and will be wiped. Primary sources are linked inline
in each document. I fetched Huntley's two posts, Osmani's two follow-ups, the
Orosz survey, the IBM entry, Mahoney's report, Ng's post, and the HumanLayer
skill files myself; the Mistele transcript, Osmani's original post, the LangChain
piece, and Akita's post were already in the corpus.

Four limits worth knowing before you lean on anything here. Mistele's talk
reached me as an automatic transcript, so proper nouns are mangled and I corrected
them in square brackets. Orosz's survey paywalls after its fourth section, which
takes out the three most sceptical parts. Reddit is not scrapeable by firecrawl,
which returns "we do not support this site," so the community reaction reaches me
as search-result snippets only. And no source in this corpus reports a controlled
measurement of a loop against a baseline, so every effect size you read is a
practitioner report.

## Related

- [`docs/research/skill-quality/gepa.md`](../skill-quality/gepa.md) reached the
  same blocker from the optimizer side: the evaluator is the whole problem.
- [`docs/EVALUATION-FRAMEWORK.md`](../../EVALUATION-FRAMEWORK.md) holds the paired
  trial and the fixture contract a loop sensor would share.
- [`docs/research/jev/`](../jev/) is the prior research snapshot.
