# Sources

Every source behind this research, what it is, and where the raw copy lives. Written
2026-09-20 so the claims in the other four documents stay checkable after the scratch
directory is gone.

**Why this file exists.** `.firecrawl/` is gitignored (`.gitignore:36`) and is working
scratch: it gets wiped. `docs/research/` holds synthesis, not raw scrapes, which is the
convention `docs/research/jev/` already follows by keeping one structured
`implementations.json` rather than the pages it was built from. So the raw corpus is
archived outside the repo and indexed here by checksum.

## Where the raw corpus lives

```
~/Documents/firehorse-research/loop-engineering/
```

23 files, 652K, archived 2026-09-20 from the `outgoing-painter` worktree's `.firecrawl/`
and from the `/last30days` output directory. Not in the repo and not in git. If it is lost,
every row below carries a URL and a checksum, so it can be re-fetched and verified.

Checksums are the first 16 hex characters of SHA-256. Verify one with:

```sh
shasum -a 256 ~/Documents/firehorse-research/loop-engineering/<file> | cut -c1-16
```

## Primary sources

| Source | Date | Archived as | SHA-256 |
|---|---|---|---|
| [Addy Osmani, "Loop Engineering"](https://addyosmani.com/blog/loop-engineering/) - the post that named the practice | 2026-06-07 | `le-addy.md` | `7e91c0d184aa76b5` |
| [Addy Osmani, "Practical Loop Engineering"](https://addyosmani.com/blog/practical-loop-engineering/) | 2026-08 | `le-addy-practical.md` | `b9ae3cc944edc162` |
| [Addy Osmani, "Agent Harness Engineering"](https://addyosmani.com/blog/agent-harness-engineering/) - the layer below loops | 2026 | `le-addy-harness.md` | `31666bb0337ba865` |
| [Geoffrey Huntley, the Ralph post](https://ghuntley.com/ralph/) - the origin, a year before the name | 2025-07-14 | `le-huntley-ralph.md` | `82f48718f3a720c3` |
| Geoffrey Huntley, follow-up on loops | 2026 | `le-huntley-loop.md` | `737c8a7ed01795a1` |
| [Kyle Mistele (HumanLayer), "Loop Engineering from First Principles"](https://www.youtube.com/watch?v=xIt_mTQp6mY), AI Engineer | 2026-07-25 | `yt-kyle-loop.txt`, `yt-xIt_mTQp6mY.en.vtt` | `35bcc8c44fa4c701`, `504b86e3e5406fcc` |
| [Sydney Runkle (LangChain), "The Art of Loop Engineering"](https://www.langchain.com/blog/the-art-of-loop-engineering) | 2026-06-16 | `le-langchain.md` | `4337a0172bd922d5` |
| [Gergely Orosz, "What is loop engineering?"](https://newsletter.pragmaticengineer.com/p/what-is-loop-engineering) | 2026 | `le-orosz.md` | `caf2d609a5693e9b` |
| [IBM, "What Is Loop Engineering?"](https://www.ibm.com/think/topics/loop-engineering) | 2026 | `le-ibm.md` | `193559083cab2bc0` |
| [Fabio Akita, "Hot Take: Harness, Loop Engineering, Graph Engineering Are Bullshit"](https://akitaonrails.com/en/2026/08/18/hot-take-harness-loop-engineering-graph-engineering-are-bullshit/) | 2026-08-18 | `le-hottake.md` | `3ec8b55b86b89d03` |
| [Kevin Mahoney, "AI Review Loops Don't Always Stabilise"](https://kevinmahoney.co.uk/articles/ai-review-loops/) | 2026-08-25 | `le-mahoney.md` | `21ac675831c1423f` |
| [Andrew Ng on X](https://x.com/AndrewYNg/status/2071988145667928442) - "hot buzzphrase", the crest marker | 2026-06-30 | `le-ng-x.md` | `424b9054b6fd714d` |
| ADTmag coverage | 2026 | `le-adtmag.md` | `b2a5ad5a4080aff4` |

## The HumanLayer skill

[`humanlayer/skills`](https://github.com/humanlayer/skills), MIT, at
`plugins/design-control-loop/skills/design-control-loop/`. Pulled from
raw.githubusercontent on 2026-09-20. Filed as a candidate in
[#241](https://github.com/cinjoff/firehorse/issues/241).

| File | Archived as | SHA-256 |
|---|---|---|
| `SKILL.md`, the eight-phase interview | `hl-dcl-SKILL.md` | `4e31d397362b23a8` |
| The loop taxonomy | `hl-dcl-taxonomy.md` | `03bf2e862f8322cc` |
| Worked example | `hl-dcl-example.md` | `faee7f1f7ffb0f98` |
| Runner workflow template | `hl-dcl-workflow.yml` | `a80828159bd01f09` |
| Repo landing page | `le-hl-skills.md` | `5d6c3155f8a65c69` |

## Community evidence

| Source | Archived as | SHA-256 |
|---|---|---|
| `/last30days` engine run, 30 days ending 2026-09-20: 2 Reddit threads, 53 X posts, 14 HN stories, 6 GitHub items, 1 YouTube video, plus a supplemental appendix | `loop-engineering-raw-v3.md` | `ef395bdd73f98961` |
| Web search results, definition and origin | `loop-eng-1.json`, `loop-eng-2.json` | `a8c9d65b8c813a1c`, `67b8c81bfd0a0877` |
| Web search results, the sceptical reaction | `le-reddit-skeptic.json` | `0ec4045e19287393` |

## Four limits on this corpus

Stated so nobody leans on a source harder than it holds.

**The Mistele talk reached us as automatic captions.** Proper nouns are mangled; they are
corrected in square brackets where quoted. Figures spoken aloud are unreliable. The
argument and the method are clear and are what the research rests on.

**Orosz paywalls after section four.** That removes the three most sceptical parts:
"tokenmaxxing", Max Kanat-Alexander's view that the loop "was a temporary hack while the
harnesses caught up", and "context engineering matters more". Headings only. Anywhere this
research reports Orosz's scepticism, it is reporting a heading.

**Reddit is not scrapeable.** firecrawl returns "we do not support this site" for
reddit.com, so the "psyop" and "manufactured term" reaction survives only as search-result
snippets, one of which is truncated mid-sentence. Treat community sentiment here as
indicative, not measured.

**Cherny and Steinberger were never fetched first-hand.** Both reach this corpus only
through people quoting them: Osmani, Orosz, Ng, LangChain. The primaries are an X post and
a conference talk. Their quotes are consistent across four independent quoters, which is
some corroboration, but it is not a primary read.

And the one that governs everything above: **no source in this corpus reports a controlled
measurement of a loop against a baseline.** Every effect size is a practitioner report.
Mahoney's non-convergence result is n=1 with no control and no repetition, and the writeup
is itself AI-generated, so it is an existence proof rather than an effect size.
