---
target: Embed docs site (BaseLayout shell + content pages)
total_score: 31
p0_count: 0
p1_count: 2
timestamp: 2026-06-15T19-03-54Z
slug: src-layouts-baselayout-astro
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Dev search box renders as a blank gap (Pagefind only builds in prod); reads as broken |
| 2 | Match System / Real World | 4 | Domain language is exact (journals, "nets to zero", debit/credit colors) |
| 3 | User Control and Freedom | 3 | Lens + lightbox have escape paths, but no breadcrumb back to a section |
| 4 | Consistency and Standards | 4 | Tokens applied uniformly; native controls used correctly |
| 5 | Error Prevention | 3 | Read-only tool; lens defaults safely to `all`; nothing destructive |
| 6 | Recognition Rather Than Recall | 3 | Lens dims off-target blocks with no legend explaining why text greyed out |
| 7 | Flexibility and Efficiency | 3 | No in-page TOC despite an unused `--toc-width` token; long pages have no jump nav |
| 8 | Aesthetic and Minimalist Design | 4 | Exemplary: 70ch measure, one accent, strong contrast, the tool disappears |
| 9 | Error Recovery | 2 | Missing assets / dead links / dev search show no fallback messaging |
| 10 | Help and Documentation | 2 | Lens and stepper are never explained in-context |
| **Total** | | **31/40** | **Strong** |

## Anti-Patterns Verdict

**Not AI slop. Both assessments independently agree.** Passes every absolute ban and the product-register "earned familiarity" test. Verified in-browser: `.callout` is a uniform 1px hairline (no side-stripe), no `background-clip: text`, no `backdrop-filter`, no hero-metric tiles, the `.child-grid` cards are text-only (no icon-card grid), and the only modal is the earned ERD lightbox.

**Deterministic scan** (`impeccable detect`, exit 2): 3 warnings, all in BaseLayout.astro — `overused-font`/`single-font` (Inter only; a brand call, not a defect) and `broken-image` line 158 (FALSE POSITIVE: runtime-populated lightbox template). No structural slop.

## Priority Issues

**[P1] Progressive disclosure is specified but barely populated.** The three-layer model (headline → `:::why` → `:::how`) is the project's reason to exist, yet `:::how` disclosures appear in only 2 of 84 docs and `:::why`/audience tags live almost entirely in the 13 product/* pages. Domain and architecture pages are plain prose with zero callouts/tags. Most of the corpus is the exact "undifferentiated wall of text" the brief names as an anti-reference, and the lens has nothing to act on outside product/*. Fix: treat callout/disclosure/audience coverage as a content-completeness gate; add at least one `:::why` and one `:::how` per domain/architecture page and audience-tag dense engineering passages.

**[P1] The lens dims but never explains itself.** Selecting a lens greys non-matching blocks to 0.32 opacity with no legend, counter, or hide option; on pages with no tagged blocks it appears to do nothing. Hurts recognition-vs-recall and the Compliance reader's trust (ghosted authoritative text reads as ambiguous). Fix: inline status when a non-`all` lens is active ("Compliance lens, 6 blocks dimmed, Show all"); grey out the lens buttons on pages with zero tagged content so it never looks inert.

**[P2] No wayfinding beyond the rail.** Deep child pages (/domains/payments) have no breadcrumb to their section, and long pages have no in-page TOC despite a defined-but-unused `--toc-width: 220px` (global.css:28). Fix: breadcrumb above the h1 on child pages; wire the TOC token into a sticky right-rail heading list above a length threshold.

**[P2] Prod-only features look broken in dev/live.** The Pagefind `#search` slot renders empty in dev (no input, placeholder, or hint). Anyone reviewing the running site sees what looks like broken search. Fix: render a static placeholder/hint when Pagefind hasn't loaded.

**[P3] No focus-visible styling anywhere + keyboard gaps.** No `:focus`/`:focus-visible`/`outline` rules exist in global.css; custom pill buttons and rail links fall back to default rings. The ERD lightbox isn't `role="dialog"`, doesn't trap/restore focus, and zoomable content images are click-only (no tabindex/role), so zoom is mouse-only. Fix: add a consistent `:focus-visible` ring on all interactive elements; make the lightbox a focus-trapping dialog; make zoomable images keyboard-operable.

## Minor Observations

- 2 em dashes in user-visible .astro prose (data-model.astro:25, money-flow.astro:19) violate the no-em-dash ban.
- 2 pure `#fff` literals (global.css:304, 315) break the "tinted OKLCH only" rule.
- money-flow.astro:22 hardcodes `/assets/ledger-account-flow.pdf` without BASE_URL; 404s under a sub-path deploy.
- Mobile (390px): lens nav overflows ("Compliance" clipped), full rail buries content below the fold. Brief says desktop-only, so low priority.
- Reference rail links get `.active` styling without `aria-current`; minor a11y inconsistency.

## Persona Red Flags

**Compliance officer (auditable exactness):** The lens dims rather than hides off-target content; ghosted-but-present text invites "did I miss something?" Missing assets and the dev search render silently, so absence is ambiguous (not-applicable vs not-loaded). Both undermine "trustworthy by exactness."

**Engineer (drill-down detail):** Lands on /domains/payments and gets plain prose with no `:::how` engineering layer, no breadcrumb, no in-page TOC on long pages. The promised deepest layer mostly isn't there. Keyboard-only engineer can't operate the ERD zoom.

**First-timer (any audience):** The novel lens control is unexplained; switching it greys text with no legend. On a page with no tagged blocks it looks inert and they learn the wrong lesson about what it does.
