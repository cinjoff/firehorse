# Jev by TypeSafe AI

Research on Jev, TypeSafe's System One decision model, and what people are
building with it. Focused on agentic development workflows, with the rest of the
ecosystem covered too.

**Window:** 2026-08-21 to 2026-09-20. Jev launched 2026-09-15, so this covers
the first five days.

**Status:** a one-off snapshot, deliberately. Not on a refresh schedule and not
being kept current. The scripts below reproduce it and would be the starting
point if this ever becomes recurring, but nothing here assumes it will.

**Readable report:** <https://claude.ai/artifact/16Nxxu1vdbFNxAGnhMSVs6> - the
same findings as a browsable, filterable page. These documents are the source.

## Read in this order

| Document | What it covers |
|---|---|
| [overview.md](overview.md) | What Jev is: the three primitives, the API shape, pricing, limits, and the documented failure modes |
| [use-cases.md](use-cases.md) | The taxonomy. Ten categories, deep dive on each, named implementations throughout |
| [catalog.md](catalog.md) | Generated tables of all 307 repositories with stars, role, and description |
| [reception.md](reception.md) | Criticism, the measurement gap, and what is genuinely unresolved |
| [method.md](method.md) | How the classification was done, and the two schema bugs it hit |

## The short version

Jev takes state plus a typed question and returns a typed answer with a
probability, in roughly 70 to 500ms, at $0.042 per million input tokens with
output free. It cannot write text.

Across 307 collected repositories, 240 with a verified integration:

- **One architecture dominates.** 236 of 240 keep deterministic code in charge
  of what executes, with Jev answering a bounded question at a branch point.
  Code enumerates the options, Jev picks one, code executes.
- **Agentic development is the densest cluster.** 61 projects across guardrails,
  routing, and context engineering, 38 of them explicitly aimed at coding agents.
- **The verification pattern was reinvented repeatedly.** Multiple independent
  projects check whether a coding agent's "done" claim is true, which says more
  about coding agents than about Jev.
- **Real tools adopted it in days.** OpenWork (23.7k), Vercel's `json-render`
  (17.0k) and `eve` (5.3k), `fx` (3.1k), QuantDinger (11.8k).
- **Measurement is real but badly distributed.** 30 evaluation projects, several
  pre-registered, several reporting Jev losing to a baseline. Yet of the 61
  agentic-workflow tools, one publishes a precision number.

## Provenance

- Community discussion, X, Reddit, Hacker News, YouTube: gathered with
  `/last30days`, raw dump at
  `~/Documents/Last30Days/jev-by-typesafe-ai-github-repos-and-agentic-use-cases-raw-v3.md`.
- Repository corpus: the READMEs of five community indexes, unioned.
- Stars, language, and dates: GitHub GraphQL API, 2026-09-20.
- Classification: Jev itself, pinned to `jev-1.13.0`.
- First-party facts: `docs.typesafe.ai`.

Every number in these documents is dated. When re-reading later, assume stars
and prices have moved and the model version has changed.

## Reproducing or extending it

`data/implementations.json` is the source of truth. `catalog.md` is generated
from it and should never be hand-edited. The narrative documents are
hand-written and are never touched by the scripts.

If this is ever picked up again, the missing piece is collection: scraping the
five community indexes, extracting links and enriching them from the GitHub API
was done ad hoc and never scripted. `classify.py` and `render.py` only cover
what happens after a repository is already in the JSON.

**Add new projects.** Append entries to `data/implementations.json` with at
least `name`, `desc`, and `stars`, then:

```bash
export TYPESAFE_API_KEY=...
python3 docs/research/jev/classify.py   # classifies only new entries
python3 docs/research/jev/render.py
```

**Re-classify everything** after changing the question schema in `classify.py`:

```bash
python3 docs/research/jev/classify.py --force   # ~30s for 307, under a cent
python3 docs/research/jev/render.py
```

**Correct a classification by hand.** Edit the `jev` block for that entry in the
JSON and re-run `render.py` only. `classify.py` without `--force` skips entries
that already have answers, so hand corrections survive.

**Refresh stars.** No script yet. The GraphQL query is in
[method.md](method.md); note that a batch aborts if any repository in it has
been renamed or deleted.

If you do update it, move the window date at the top of this file and add a line
to the log below.

## Change log

| Date | Change |
|---|---|
| 2026-09-20 | Initial research. 307 repositories collected, 240 verified, classified with `jev-1.13.0`. |
