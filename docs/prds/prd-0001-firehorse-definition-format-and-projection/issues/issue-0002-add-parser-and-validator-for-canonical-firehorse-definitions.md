# Add parser and validator for canonical Firehorse definitions

Published issue: https://github.com/cinjoff/firehorse/issues/4

## Parent

https://github.com/cinjoff/firehorse/issues/2

## What to build

Build the core parser and validator that turns canonical Markdown definitions into typed, validated Firehorse definition objects with actionable diagnostics.

## Acceptance criteria

- [ ] The core library can parse Markdown frontmatter and body content for all three definition kinds.
- [ ] Kind-specific validation enforces schema version, required metadata, aliases, deprecations, and allowed frontmatter fields.
- [ ] Validation enforces globally unique IDs, ID/path consistency, required body sections, structured references, and capability declarations.
- [ ] Upstream skill references remain structured references and are not normalized into Firehorse-authored skill definitions.
- [ ] Errors are actionable enough for authors to identify the invalid definition and field or section.
- [ ] Tests cover valid fixtures, invalid frontmatter, invalid body sections, duplicate IDs, invalid references, and invalid capabilities.

## Blocked by

https://github.com/cinjoff/firehorse/issues/3
