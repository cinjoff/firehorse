# Same-session memory observation attribution

Draft status: local issue draft; do not publish until the PRD-0005 baseline Session Audit report is reviewed.
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0005-session-audit-and-agent-tooling-efficiency/PRD.md`

## What to build

Include attributable pi-memory/claude-mem observations as bounded Session Evidence after preview approval. The audit should separate injected, fetched, and newly written observations; classify attribution confidence; redact/paraphrase observation content; detect repeated same-session memory blocks; distinguish injection events from distinct observation evidence; classify injected wrapper/header guidance separately from stored observation content; distinguish actual memory injections from generated/search/tool-result echoes containing `$CMEM` text; and surface memory-quality or cross-repo bleed findings without treating memory as authoritative proof of code behavior. This slice detects and reports memory evidence problems only; it must not change memory retrieval APIs, compatibility aliases, injection defaults, query filtering, or source-mixing behavior.

## Acceptance criteria

- [ ] Memory rows are read only when they match the canonical project/repo plus session/run ID or audited timestamp window, including the thirty-minute post-session grace period.
- [ ] Attribution confidence is classified as confirmed, likely, or needs-more-evidence according to PRD rules.
- [ ] Injected, fetched, and newly written observations are reported separately.
- [ ] Repeated pasted memory blocks report injection-event count, distinct observation IDs, and repeated observation-set fingerprints without treating duplicate blocks as independent observation evidence.
- [ ] Repeated pasted memory blocks, broad initial memory injection, irrelevant observations, cross-project bleed, and same-project content/source-domain mismatch produce redacted findings or completeness notes as appropriate.
- [ ] `$CMEM` strings are counted as memory injections only when the source entry indicates user/custom injected memory context, not when found inside tool results, generated reports, or indexed search output.
- [ ] Injected memory wrapper/header/footer guidance is compared against the active tool surface and official docs available at audit time, so stale tool names are findings without mutating historical observations.
- [ ] Same-session observations written during the audit can be reported as feedback-loop evidence, but they do not independently validate findings that they merely summarize.
- [ ] Project-name matches are not treated as sufficient relevance proof; attribution compares content domain, source session, files, platform source, expected task scope, and active memory surface.
- [ ] Tests verify observation-content redaction, unknown observation type preservation, schema-drift handling, repeated memory block detection, repeated observation-set deduplication, source-aware `$CMEM` classification, stale wrapper-guidance detection, content/source-domain mismatch detection, memory-as-evidence-not-ground-truth behavior, and no memory-runtime mutation.

## Blocked by

- Draft issue 0003: Recent Session Evidence discovery preview
- Draft issue 0004: Bounded memory/context database preview adapters
