# Add new-project GitHub repository and Tracker Project setup

Published issue: https://github.com/cinjoff/firehorse/issues/24

Status: open; blocked by issue #23.

## Parent

https://github.com/cinjoff/firehorse/issues/18

## What to build

Add the planned `new-project` workflow/setup path for creating or configuring a GitHub repository, writing `.firehorse/manifest.json`, creating or reusing a repository-named Tracker Project, ensuring expected Status field/options exist, and installing the Matt Pocock issue-tracker label vocabulary including `ready-for-agent`.

## Acceptance criteria

- [ ] Canonical `new-project` workflow definition exists and projects to `horse-new-project`.
- [ ] Workflow/setup guidance supports creating a GitHub repository when missing or configuring an existing one.
- [ ] Tracker Project is created or reused under the same owner as the repository when permissions allow.
- [ ] Expected Status field/options exist: Backlog, Ready, In Progress, In Review, Done.
- [ ] Matt Pocock issue-tracker label vocabulary is installed or verified, including `ready-for-agent`.
- [ ] `.firehorse/manifest.json` is written/updated with names and resolved IDs where available.
- [ ] Missing GitHub Project automation is recorded as a setup gap rather than blocking repository creation.
- [ ] `pnpm definitions:check` and relevant typechecks pass.

## Blocked by

- https://github.com/cinjoff/firehorse/issues/23
