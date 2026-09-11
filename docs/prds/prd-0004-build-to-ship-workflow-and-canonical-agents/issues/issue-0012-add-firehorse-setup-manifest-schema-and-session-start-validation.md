# Add Firehorse setup manifest schema and session-start validation

Published issue: https://github.com/cinjoff/firehorse/issues/23

Status: open; can proceed after manifest schema design review.

## Parent

https://github.com/cinjoff/firehorse/issues/18

## What to build

Add the narrow setup manifest/schema/check path for `.firehorse/manifest.json` and provider session-start validation. The setup runtime should detect Firehorse-enabled repositories, validate setup expectations read-only by default, stay cheap and silent when healthy, and never become a workflow execution engine.

## Acceptance criteria

- [ ] Manifest schema/check logic records project name, GitHub owner/repo, Tracker Project name and resolved IDs, Status field/options, label vocabulary, and safe-apply policy.
- [ ] Session-start validation runs only when `.firehorse/manifest.json` exists or Firehorse project markers are present.
- [ ] Validation is read-only by default and silent when healthy.
- [ ] Missing setup is reported as actionable gaps without mutating GitHub by default.
- [ ] Setup runtime does not execute workflows, load prompts, provide provider transport, or run autonomous agents.
- [ ] Provider integration is added where appropriate for Pi/Claude session-start surfaces.
- [ ] Tests or fixtures cover manifest parsing and drift detection.
- [ ] `pnpm typecheck` passes.

## Blocked by

None - can proceed after manifest schema design review
