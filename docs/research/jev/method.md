# How this was built, and what went wrong

The catalog was classified by Jev. That is not a gimmick: sorting 307 projects
into ten overlapping categories from short descriptions is the "pick one of N
from unstructured state" shape the model exists for, and every answer carries a
probability, so weak rows can be flagged instead of silently wrong.

It is also the best available test of the thing, so this page records the
failures as carefully as the results.

## Pipeline

1. **Collect.** Scrape the READMEs of five community indexes
   (`Anil-matcha/awesome-jev-by-typesafe`, `yibie/awesome-jev`,
   `AbdelStark/awesome-typesafe`, `AnotiaWang/awesome-jev`, `cobanov/awesome-jev`),
   extract every GitHub link from a list item, and union them. 306 unique
   repositories, plus one added by hand.
2. **Enrich.** Fetch live stars, language, push date, and description for each
   through the GitHub GraphQL API.
3. **Classify.** Six questions per repository in one call: category (Choice,
   11 options), Jev's role (Choice, 5 options), readiness (Score, 4 levels),
   agentic-development fit (Noul), and whether deterministic code retains
   control (Noul).
4. **Render.** `render.py` regenerates `catalog.md` from the JSON.

307 repositories, six questions each, in about 30 seconds wall clock at 8 concurrent
requests. Total cost was under one cent. That part of the pitch is real and it
is not close.

## The failure that matters

The first schema had a Noul gate as question one:

> Is this project actually built on, integrating, or reimplementing TypeSafe's
> Jev / System One decision model? Answer false for unrelated projects, general
> awesome-lists, and tools that merely appear alongside it.

It rejected 66 of 306, including several that say "powered by TypeSafe AI Jev"
in their own description. `GhalebDweikat/winnow` scored 0.31. TypeSafe's own
JavaScript SDK scored 0.15.

Rewording the same question against the same state:

| Repository | Original | Plain wording | Framed wording |
|---|---:|---:|---:|
| `GhalebDweikat/winnow` | 0.31 | 0.80 | 0.72 |
| `browser-use/jev-ultrafast` | 0.24 | 0.63 | 0.39 |
| `kierandotai/jev-scout` | 0.26 | 0.54 | 0.31 |
| `Butochnikov/typesafe-sdk-php` | 0.19 | 0.03 | 0.13 |
| `typesafe-ai/typesafe-sdk-js` | 0.15 | 0.03 | 0.05 |
| `Anil-matcha/awesome-agent-apis` | 0.05 | 0.09 | 0.07 |

A swing from 0.24 to 0.63 on identical state is not a marginal calibration
issue. Two separate things were wrong.

**The question was compound.** "Built on, integrating, or reimplementing" plus
a three-clause negative exclusion is four conditions in one Noul. This is
failure mode 1 on TypeSafe's own
[jaggedness page](https://docs.typesafe.ai/model-jaggedness/jev-1.13): Jev
answers the question you wrote, not the one you meant. Their guidance is exact,
and I had not read it when I wrote the question:

> Where interpretation is unavoidable, split it into two literal questions and
> combine them in code.

**The question was ambiguous, and the model was arguably right.** An SDK is a
transport for the model, not a consumer of its judgments. Reading
`typesafe-sdk-js` as "does not use Jev to make decisions" is defensible. I was
asking about ecosystem membership and wording it as usage. The low score was my
error surfacing as the model's answer.

The tell was visible in the same response the whole time: on those exact rows
the Choice questions were confident and correct. `winnow` came back
`context-engineering` at 0.97 while the Noul gate said 0.31. One question was
broken, not the model.

## What fixed it

Replace the boolean gate with an escape option on the Choice that was already
working: add `not-jev` as an eleventh category. Membership then falls out of a
question the model answers well, and it is mutually exclusive by construction
rather than by a threshold someone picked.

The result: 18 excluded instead of 66, `winnow` at 0.98 confidence,
`typesafe-sdk-php` correctly `dev-tooling` at 0.96, and the sibling awesome-list
still correctly excluded.

**The rule worth keeping: prefer a Choice with an explicit escape option over a
Noul gate for membership questions.** A Choice makes the alternatives explicit
and forces you to describe the reject case as carefully as the accept cases. A
Noul lets you leave the reject case implicit, which is exactly where literal
reading bites.

## A second, subtler bug

`verified_integration` was first defined as "in the ecosystem and `jev_role` is
not `none`". That silently excluded every open reproduction, because a project
that reimplements the `/v1/systemone` interface genuinely does not call Jev.
`logan-markewich/jeff` classified as `open-reproduction` with role `none`, and
both answers were right; the derived rule was wrong. Open reproductions are now
an explicit exception, which moved 7 projects back in.

Jev got both of these right. The taxonomy around it was wrong twice.

## A third bug, and the worst one

The taxonomy shipped without an `evaluation` category. Benchmark and calibration
repositories had nowhere to go, so the classifier put them in `not-jev` and the
excluded bucket filled with things like `jev-eval`,
`jev-agent-failure-benchmark`, and `jev-behavior-study`.

This did not just misfile 30 rows. It produced a wrong conclusion about the
whole ecosystem. The first draft of [reception.md](reception.md) stated that
almost nobody was measuring anything, because from inside the taxonomy that was
what the data showed. Adding one option surfaced roughly 25 genuine independent
evaluations, several pre-registered, several reporting Jev losing to a baseline.

A missing option does not produce a low-confidence answer you can filter on. It
produces a confident wrong answer, because `Choice` renormalizes over the
options you supplied and the model has nowhere honest to put the row. The three
bugs on this page rhyme: **the model answered correctly each time and the
schema was wrong.** Auditing the reject bucket is not optional, and it is the
step most likely to be skipped.

Adding the category moved exclusions from 18 to 7 and verified integrations
from 234 to 240.

## Known limits of this dataset

- **`jev_role` is the weakest field.** It asks what the model does inside a
  codebase, from a one-line description. 86 rows came back below the 0.55
  confidence floor and are marked `?` in the catalog. Answering it properly
  means reading source.
- **Descriptions come from curators, not maintainers.** Most text is the
  community list's summary. A list author's framing propagates into the
  classification.
- **Readiness is a guess about polish.** It reads documentation quality and
  stated caveats, not tests, coverage, or whether the thing works.
- **Stars are a point-in-time snapshot** from 2026-09-20, during a launch spike.
  Expect decay.
- **No circularity control.** Jev classified its own ecosystem and nobody
  hand-labelled a sample to check it. `zhuyansen/jev-search-rerank-eval` does
  run a judge-circularity analysis and is the right prior art if anyone wants to
  do this properly.

The honest summary: the categories are reliable, membership is now reliable,
role and readiness are indicative. The `?` marks are not decoration.

## Reproducing

```bash
export TYPESAFE_API_KEY=...
python3 docs/research/jev/classify.py --force   # ~30s, well under a cent
python3 docs/research/jev/render.py
```
