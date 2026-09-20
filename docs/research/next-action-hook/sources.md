# Sources

Every source behind this research, what it is, and where the raw copy lives. Written
2026-09-20 so the claims in the other four documents stay checkable after the scratch
directories are gone.

`.firecrawl/` is gitignored (`.gitignore:36`) and gets wiped, so the raw scrapes are archived
outside the repo and indexed here by checksum, the same way `docs/research/loop-engineering/`
does it.

## Where the raw corpus lives

```
~/Documents/firehorse-research/next-action-hook/
```

Eight files, 396K, archived 2026-09-20 from the `outgoing-painter` worktree's `.firecrawl/`.
Not in the repo and not in git. Checksums are the first 16 hex characters of SHA-256:

```sh
shasum -a 256 ~/Documents/firehorse-research/next-action-hook/<file> | cut -c1-16
```

## Primary sources: code

Both repositories were cloned shallow into the session scratchpad and read directly. They are
not archived; the commit pins below make them re-fetchable.

| Repo | Commit | Committed | Read for |
|---|---|---|---|
| `gsd-build/get-shit-done` | `bdcaab2c752d9a33a1a1ca9acf3a3c81fb991815` (v1.50.0-canary.0) | 2026-05-31 | `<offer_next>` blocks, `bin/install.js` hook registration, `hooks/gsd-context-monitor.js`, `hooks/gsd-phase-boundary.sh`, `get-shit-done/workflows/transition.md`, `scripts/lint-command-contract.cjs` |
| `thruwire/foreman` | `a7d21d18d306a0cb9f3e15acefbdb5663521405c` | 2026-09-20 | `src/foreman/foreman/jev.py` (the ten gates), `src/foreman/policy.py` (thresholds and ordering), `src/foreman/config.py` (defaults and truncation limits), `src/foreman/observation.py` (evidence struct), `docs/theory.md` |

## Primary sources: docs

| Checksum | File | URL | What it is |
|---|---|---|---|
| `4287ffd5b7607ef2` | `na-cc-hooks-ref.md` | <https://code.claude.com/docs/en/hooks> | The Claude Code hook reference. Event list, `systemMessage` and `additionalContext` semantics, the discard table, matcher rules, prompt and agent hook types, async hook behavior, the 10,000 character cap |
| `b17543dcdcaaef67` | `na-ts-skill-suggestion.md` | <https://docs.typesafe.ai/cookbooks/skill_suggestion> | The two-request skill selection recipe, gate questions verbatim, thresholds, and the 488-request result table |
| `186d6272b9ca94b1` | `na-ts-confidence-routing.md` | <https://docs.typesafe.ai/patterns/confidence-routing> | Per-action confidence thresholds, and why riskier actions need higher floors |
| `ba0059c7f9da2467` | `na-ts-intent-routing.md` | <https://docs.typesafe.ai/patterns/intent-routing> | Routing a request to one of a fixed set of handlers |
| `5c2575d0cf6f9003` | `na-typesafe-map.json` | <https://docs.typesafe.ai> | Site map, the search that surfaced `skill_suggestion` |

## Search results

| Checksum | File | Query |
|---|---|---|
| `80e629c72734ca40` | `na-gsd-search.json` | GSD framework, next-command and new-session behavior |
| `ef92b84b213784ac` | `na-hooks-search.json` | Claude Code Stop / PostToolUse / SessionEnd, `additionalContext` |
| `8c9a83ce707ce326` | `na-jev-search.json` | Jev next-best-action, agent workflow routing |

## Prior research in this repo

- `docs/research/jev/overview.md` holds the three primitives, API shape, pricing, rate limits, and
  the nine documented jaggedness failure modes for `jev-1.13`. Every Jev reference facts claim
  in [jev-fit.md](jev-fit.md) that is not from the cookbook comes from here.
- `docs/research/jev/README.md` holds the 307-repository corpus, and the finding that 236 of 240
  verified integrations keep deterministic code in charge with Jev answering a bounded
  question at a branch point. Foreman is that architecture exactly.
- `docs/research/loop-engineering/firehorse-fit.md` covers what this repo already has against the
  loop-engineering primitives.

## Limits on this corpus

1. **One measured result.** The cookbook's 488-request table is the only accuracy number in
   any source here, and it measures skill selection from a user request, not next-action
   recommendation from session state. Nothing in these documents establishes that the latter
   works.
2. **Foreman publishes no numbers** and describes itself as an architectural experiment. Its
   thresholds are somebody's defaults, read as design evidence, not as calibration.
3. **GSD was read at a canary tag,** `1.50.0-canary.0`, committed 2026-05-31. Its hook
   registration lives in a 9,000-line installer and the reading of it is by grep, not by
   running the installer.
4. **The Claude Code hook reference is a moving target.** Several behaviors cited carry
   version floors in the docs themselves (`last_assistant_message` reliability, matcher
   comma separators at v2.1.191, hyphens at v2.1.195). Re-check before relying on them.
5. **No page was scraped for how GSD users experience the recommendation.** The claim that it
   helps is the user's own report, not a finding here.
