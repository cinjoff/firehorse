# Verification harnesses

Research notes for [#131](https://github.com/cinjoff/firehorse/issues/131). Extends
[`pstack-workflow.md`](./pstack-workflow.md), which summarises pstack; this note reads the
two verification skills in full and goes after the four things the design needs before a
CLI shape can be fixed: the harness recipes, the generator prior art, what is actually
written down about CLIs for agents, and whether pstack's feature-map schema has any
company.

## Source note

Read in full, from the source that owns each claim:

- **pstack**, from a local clone of [`backnotprop/pstack`](https://github.com/backnotprop/pstack)
  (MIT): `skills/create-verification-skill/SKILL.md`,
  `skills/maintain-verification-skill/SKILL.md`, and all three files in
  `skills/create-verification-skill/references/feature-map-example/` (`README.md`,
  `create-note.md`, `search.md`).
- **Anthropic**: [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices),
  the [Claude Code skills page](https://code.claude.com/docs/en/skills), and the engineering
  post [Writing effective tools for agents — with agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
  (2025-09-11).
- **agentskills.io**: [Best practices for skill creators](https://agentskills.io/skill-creation/best-practices).
- **Playwright**: [Isolation](https://playwright.dev/docs/browser-contexts),
  [Screenshots](https://playwright.dev/docs/screenshots),
  [Snapshot testing](https://playwright.dev/docs/aria-snapshots),
  [Trace viewer](https://playwright.dev/docs/trace-viewer),
  [Electron](https://playwright.dev/docs/api/class-electron),
  [Command line](https://playwright.dev/docs/test-cli),
  [Playwright Test Agents](https://playwright.dev/docs/test-agents),
  [Playwright MCP](https://playwright.dev/mcp/introduction), and the Playwright CLI pages
  [Introduction](https://playwright.dev/agent-cli/introduction),
  [Sessions & Dashboard](https://playwright.dev/agent-cli/sessions),
  [Skills](https://playwright.dev/agent-cli/skills).
- **Chrome DevTools Protocol**: [the protocol home page](https://chromedevtools.github.io/devtools-protocol/),
  including its HTTP-endpoint reference.
- **Electron**: [Automated Testing](https://www.electronjs.org/docs/latest/tutorial/automated-testing),
  [Command line switches](https://www.electronjs.org/docs/latest/api/command-line-switches).
- **tmux**: [`tmux(1)`](https://man.openbsd.org/tmux.1). **script**: [`script(1)`](https://man.openbsd.org/OpenBSD-7.4/script.1).
  **expect**: the local `man expect` (Expect 5.45). **curl**: [the curl man page](https://curl.se/docs/manpage.html).
  **node-pty**: [its README](https://github.com/microsoft/node-pty).
- **Mobile**: `xcrun simctl help` and the per-subcommand help for `io`, `launch`, `spawn`,
  `create`, `privacy`, and `ui`, run on this machine (Xcode simulator tooling, Darwin 25.0.0);
  Android [`adb`](https://developer.android.com/tools/adb) and
  [Start the emulator from the command line](https://developer.android.com/studio/run/emulator-commandline).
- **CLI design**: [Command Line Interface Guidelines](https://clig.dev/) (clig.dev).

Could not reach or does not exist:

- `https://agentskills.io/skill-creation/overview` and
  `https://code.claude.com/docs/en/skills-best-practices` both return 404. The
  best-practices page the ticket names is at `/skill-creation/best-practices` and does
  exist; Anthropic's own authoring guidance lives on `platform.claude.com`, not
  `code.claude.com`.
- The bodies of Claude Code's bundled `/run`, `/verify`, and `/run-skill-generator` skills
  are not published. They ship inside the CLI rather than as files — a filesystem search of
  this machine found no `run-skill-generator` directory. Everything claimed about them below
  comes from the docs page describing them, not from their text.
- pstack Part 3 of the guide was still unposted as of 2026-09-14, unchanged from the earlier
  note.

## 1. Harness recipes per surface

### Browser

Two layers, and they answer different questions.

**Chrome DevTools Protocol (CDP)** is the raw floor. It is domain-scoped (DOM, Debugger,
Network, and so on); commands and events are JSON objects of a fixed structure. Launch the
browser with `--remote-debugging-port=9222` and the same port serves HTTP endpoints:
`GET /json/version` (browser metadata, plus the browser-level `webSocketDebuggerUrl`),
`GET /json` or `/json/list` (every websocket target, each with its own
`webSocketDebuggerUrl`), `GET /json/protocol/`, `PUT /json/new?{url}`,
`GET /json/activate/{targetId}`, `GET /json/close/{targetId}`. With
`--remote-debugging-port=0` the chosen port is written to stderr and to the
`DevToolsActivePort` file in the profile folder. Chrome 63 added support for multiple
simultaneous clients; a displaced client receives
`{"method":"Inspector.detached","params":{"reason":"replaced_with_devtools"}}`. The
tip-of-tree protocol "changes frequently and can break at any time" with no backwards
compatibility guaranteed; the stable subset is tagged at Chrome 64. Driving CDP directly
means an agent writes a websocket client — there is no first-party CLI.

**Playwright** is the layer most repos already have. Install is `npm`/`npx` plus a browser
download. Evidence it can capture, each from its own doc page:

- `page.screenshot({ path })`, `{ fullPage: true }`, or a locator screenshot; or into a
  buffer with no file.
- An accessibility-tree snapshot in YAML, asserted with `expect(page).toMatchAriaSnapshot()`.
  Nodes are `- role "name" [attribute=value]`, where quoted strings are exact and
  `/patterns/` are regular expressions.
- A trace zip (`--trace on`, or `context.tracing.start({ screenshots: true, snapshots: true })`
  then `stop({ path })`), opened with `npx playwright show-trace`. `trace: 'on-first-retry'`
  is the documented CI setting.

Side-by-side: Playwright's isolation unit is the `BrowserContext`, described as
"incognito-like profiles", "fast and cheap to create and completely isolated, even when
running in a single browser". The test runner defaults to 50% of logical cores as workers
and `--workers=1` forces serial.

**Playwright CLI** (`npm install -g @playwright/cli`, invoked `playwright-cli`) is the
finding that matters most for the CLI-shape question, because it is a first-party,
published, agent-facing CLI over exactly this surface. Its own framing: "A command-line
interface for browser automation designed for coding agents." The loop is
`open <url>` → `type` / `click <ref>` / `press` → `screenshot`, and after each command it
prints the page URL, title, and a path to a snapshot file under `.playwright-cli/` holding
the accessibility tree with element refs for the next command. Command groups are Core,
Navigation, Keyboard, Mouse, Save as, Tabs, Storage, Network, DevTools, Install, Browser
sessions. Global options are `--help [command]`, `--json`, `--raw`, `--version`. It runs a
daemon so there is no per-command browser startup, and it defaults to headless where the
MCP server defaults to headed.

Its isolation model is explicit and worth copying: `-s=<name>` selects a named session, each
with "its own browser instance, cookies, localStorage, IndexedDB, cache, navigation history,
open tabs, and console log"; `PLAYWRIGHT_CLI_SESSION=<name>` pins a whole agent session to
one; profiles are in-memory by default, `--persistent` writes `ud-<session>-<browser>` under
a per-workspace cache directory, and `--profile=<dir>` overrides. `list`, `close-all`, and
`kill-all` manage the set.

Playwright also ships an MCP server over the same engine (70+ tools, snapshot-based, headed
by default). The docs draw the trade-off themselves: the CLI is "Lower — concise CLI output,
skills loaded on demand", MCP is "Higher — tool schemas + snapshots in context".

### Electron

Electron does not maintain its own testing solution and its guide points at third-party
options: WebdriverIO with the `electron` service (`npm init wdio@latest ./`, then
`browserName: 'electron'` and `wdio:electronServiceOptions`), or ChromeDriver directly.

Playwright's Electron support is labelled **experimental**. `_electron.launch({ args:
['main.js'] })` gives an `electronApplication`; `electronApp.evaluate(...)` runs in the main
process; `firstWindow()` returns a page you drive and screenshot like any other. Supported
versions are v12.2.0+, v13.4.0+, v14+. Two gotchas are documented: launch times out if the
`nodeCliInspect` fuse is set to `false`, and Playwright does not intercept the native
`dialog` API because those calls happen in the main process and go straight to OS APIs — you
stub `dialog.showOpenDialog` and friends via `electronApp.evaluate`, and the replacement
persists until the app closes.

Electron accepts `--remote-debugging-port=<port>` ("Enables remote debugging over HTTP on
the specified `port`"), so the CDP recipe above applies to the renderer as well.

### CLI and TUI

Three mechanisms, with different evidence and different install costs.

**tmux** is the one that gives an agent a real terminal it can come back to. It is not
preinstalled on macOS — `tmux -V` on this machine reports command not found, while
`/usr/bin/expect` (Expect 5.45) and `/usr/bin/script` are present. A generated skill that
assumes tmux has to install it.

- Drive: `send-keys [-t target-pane] [key ...]`. Arguments are key names (`C-a`, `NPage`);
  anything unrecognised is sent as characters. `-l` disables key-name lookup and sends
  literal UTF-8 — the flag you want when typing user text that happens to look like a key
  name.
- Transcript, on demand: `capture-pane -p` writes pane contents to stdout; `-S`/`-E` bound
  the range, `-e` keeps escape sequences, `-J` joins wrapped lines, `-N` preserves trailing
  spaces.
- Transcript, streamed: `pipe-pane [-IOo] [-t target-pane] [shell-command]`. With `-O`
  (the default) pane output is piped to the command, so `pipe-pane -o 'cat >>~/out.#I-#P'`
  is a running log. A pane may only be connected to one command at a time.
- Exit codes: set the `remain-on-exit` window option (`on`, or `failed` for non-zero only)
  and the pane survives the process; the formats `#{pane_dead}`, `#{pane_dead_status}`,
  `#{pane_dead_signal}`, and `#{pane_dead_time}` then carry the exit status. Without this,
  a tmux-driven run has no exit code to capture.
- Synchronisation: `wait-for` with `-S`/`-L`/`-U` blocks a client on a named channel, which
  is how you wait for a step instead of sleeping.
- Side by side: `-L <socket-name>` puts the server socket under `$TMUX_TMPDIR` (or `/tmp`)
  under a chosen name, "allowing several independent `tmux` servers to be run"; `-S` takes a
  full path. One socket per verification run is the isolation unit.

**A PTY library** is the option when the driver is a program rather than a shell script.
`node-pty` (`pty.spawn(shell, [], { name, cols, rows, cwd, env })`, `onData`, `write`,
`resize`) supports Linux, macOS, and Windows, the last via the Windows conpty API on
1809+ — winpty support has been removed. Installing from source needs Python and a C++
compiler.

**`expect`** is preinstalled on macOS and drives a spawned process against expected output.
Two constraints from its own man page: terminal parameters have "a big effect on scripts"
(a script written to look for echoing misbehaves when echoing is off, so Expect forces sane
terminal parameters), and `spawn_id` is scoped, so a `spawn` inside a procedure needs
`global spawn_id` to stay reachable.

**`script(1)`** is the cheapest transcript: `script -c <command> <file>` records everything
printed to the terminal. Its own caveat is that screen-manipulating programs such as `vi`
"create garbage in the typescript file" — so it suits line-oriented CLIs, not TUIs. It
exits 0 unless a child process fails, in which case 1; it does not surface the child's own
exit code.

### Services over HTTP

Nothing to install: `curl` is present everywhere. `-w, --write-out <format>` prints
selected variables after the transfer, so `curl -w '%{response_code}\n' <url>` is the
documented way to get the status separately from the body; `-o` sends the body to a file
and `%output{name}` inside a write-out format redirects parts of the report. Exit code 22
("HTTP page not retrieved") appears only when `--fail` is used, so a plain `curl` returns
0 on a 500 — an agent asserting on exit code alone gets a false pass. Side-by-side
isolation is whatever port and data directory the service is launched with; there is no
harness-level isolation to inherit.

### Mobile simulators

**iOS.** `xcrun simctl` is the whole harness, verified against its own help on this machine.

- Devices: `simctl list devices --json` gives machine-readable state and each device's
  `dataPath`; `create <name> <device type id> [<runtime id>]`, `clone`, `boot`, `shutdown`,
  `erase`, `delete`.
- Drive: `install`, `launch [--console|--console-pty] [--stdout=<path>] [--stderr=<path>]
  [--terminate-running-process] <device> <bundle id> [argv...]`, `terminate`, `openurl`,
  `spawn`, `push`, `addmedia`, `pbcopy`/`pbpaste`, `location`. Child environment variables
  are passed by setting them with a `SIMCTL_CHILD_` prefix in the calling environment.
- Evidence: `simctl io <device> screenshot [--type=png|tiff|bmp|gif|jpeg] <file or url>`
  (`-` for stdout) and `io <device> recordVideo [--codec=h264|hevc] [--force] <file>`.
  Recording writes `Recording started` to **stderr** once the first frame is processed —
  the documented signal to wait on — and stops on SIGINT, exiting after the file is
  finalised. App stdout and stderr come from `launch --stdout=`/`--stderr=`, and the help
  warns "Log output is often directed to stderr, not stdout."
- State an agent usually has to set before a feature is reachable:
  `privacy <device> grant|revoke|reset <service> [<bundle id>]` (services include
  `location`, `photos`, `microphone`, `contacts`, `all`), `ui <device> appearance
  light|dark`, `status_bar`.
- Side by side: the global `--set <path>` selects a different device set, and `clone`
  duplicates a device, so two runs can hold separate devices and separate device sets.
  `booted` resolves to an arbitrary booted device when several are up, so a concurrent
  recipe must pass explicit UDIDs rather than `booted`.

**Android.** Install is the SDK plus `adb` and `emulator`.

- Devices: `adb devices`; `-s <serial>` or `$ANDROID_SERIAL` targets one, and `-s`
  overrides the environment variable.
- Drive: `adb shell am start -a <action> ...` for intents, `adb shell` for the rest.
- Evidence: `adb exec-out screencap -p > screen.png` — the docs say to use `exec-out`
  rather than `shell` "to get raw data" — and `adb shell screenrecord /sdcard/demo.mp4`;
  `logcat` for logs.
- Side by side: `emulator -avd <name> -port <port>`. Each virtual device occupies a pair of
  adjacent ports, console and adb, starting at 5554/5555 and increasing by two; the range
  5554–5682 allows 64 concurrent virtual devices, and the emulator will not start if either
  port is in use. Use an even console port: an odd value in 5554–5584 boots but stays
  invisible to `adb devices` when the adb server starts after the emulator. `-port` reports
  the ports and serial it took.

I did not find, on the emulator command-line page, a documented flag for booting the same
AVD twice concurrently. The documented concurrency story is one AVD per instance on
distinct ports. Treat "two instances of one AVD" as unresolved rather than impossible.

## 2. Generator prior art

### pstack `/create-verification-skill`

The generator is five numbered steps, and its framing is the part to steal: "You write the
generator's output for the next agent, not for a human: it will be read cold, mid-task, by
an agent that has never seen the app."

1. **Interview the repo, not the user** — answer from the codebase and only ask what cannot
   be observed. The five questions are Surface, Run, Drive, Observe, Isolate, and they match
   the four axes this ticket asked for almost exactly. Drive prefers existing harnesses
   (Playwright/Cypress specs, expect scripts, PTY helpers, curl-able endpoints, a debug
   port) before any generic recipe, and only then "browser/CDP for web and Electron, a
   tmux/PTY harness for CLI/TUI, plain HTTP for services". Isolate says that when two
   instances cannot run side by side, the generated skill must say so: "refusing to
   double-drive a shared instance beats corrupting the user's session." If the checkout does
   not build or start, fix or report that first, because "a skill written against a broken
   base teaches wrong steps."
2. **Generate the skill** at `.cursor/skills/verify-<app>/SKILL.md` with YAML frontmatter
   (without it "the skill never registers") and six sections: **Launch** (exact command plus
   how to tell it is ready — a log line, a port answering, a prompt — and teardown; for a
   short-lived CLI or TUI, launch means build once and then start each drive in its own
   isolated PTY or tmux session), **Doctor** (one read-only check answering "is this instance
   worth driving?"), **Drive** (real selectors from this repo, stable handles over
   coordinates), **Evidence** (exercise the real user path, not internal setters or test-only
   endpoints; capture the action and the resulting state, not just the final screen; verify
   side effects alongside what is visible; and verify what a dry-run actually skips by
   observing files, network, and git refs, "because some dry-runs still touch the network or
   open a browser"), **Cleanup** ("Never kill by process name; kill what you started" —
   cleanup removes instances and scratch state, never the evidence), **Helpers** (every
   shipped script executable, its invocation shown in the skill body).
3. **Seed the feature map** — see area 4.
4. **Prove the generated skill before handing it over** — run its own instructions once
   end to end: launch, doctor, drive one mapped feature, capture evidence, clean up, then
   confirm the evidence still exists at the named location, because "a cleanup that eats the
   proof fails this step". Run the generated cleanup after every failed iteration too. "A
   generated skill that was never executed is a draft, not a deliverable."
5. **Offer the maintenance loop.**

### pstack `/maintain-verification-skill`

The upkeep pass, and the more opinionated of the two. It declares one of three outcomes —
**clean** (no branch, no PR), **changed** (one PR of proven corrections), **blocked** (say
exactly what blocked it) — and constrains edit scope to the verification skill's own
directory: never product code, because behaviour the map describes that the app no longer
does is either doc drift (fix the map) or a product regression (report it, do not paper over
it). "The unit of rigor is the feature, not every sentence."

Six steps: locate the target (several candidates → ask; none → point at the generator);
index hygiene; a **source wave** of one read-only subagent per feature file, launched
concurrently, each returning feature summary / source entry points / likely drift or none /
one live-verification recipe, and never driving the app or editing files; **reconcile**
(merge recipes into as few app states as practical, spot-check cited drift, do not re-prove
clean claims, require a concrete source path before calling a surface missing); a **live
pass**, required even when source looks clean, holding three invariants whatever fails —
(1) never drive an instance not health-checked since it last did something surprising, and
where doctor cannot see the failure (a wedged UI on a healthy process) reset or relaunch
rather than hope; (2) evidence captured so far survives every cleanup, checked at its named
location, not assumed; (3) nothing a drive started outlives that drive's usefulness, and
for a shared instance you clean the residue, not the instance. A doctor failure caused by
skill drift counts as drift: fix it under edit scope and retry once before calling the pass
blocked. An unreachable feature is `verified-unreachable` only with the concrete prerequisite
and the route attempted — and if the map omitted that prerequisite, that omission is drift.
Then **triage** (doc drift → fix; harness gap → fix and re-drive live before shipping;
product gap → record for the user, keep out of the PR) and **ship or stop**.

### Claude Code's own generator

Three bundled skills, described on the Claude Code skills page: `/run` ("Launch and drive
your app to see a change working"), `/verify` ("Build and run your app to confirm a code
change does what it should, without falling back to tests or type checks"), and
`/run-skill-generator` ("Teach `/run` and `/verify` how to build and launch your project").

The design this encodes is close to pstack's and differs in one interesting way. `/run` and
`/verify` work with no setup by inferring the launch from the project type — the page names
CLI, server, TUI, browser-driven — and from the README, `package.json`, or `Makefile`.
Inference "gets unreliable for projects that need anything beyond a standard launch: a
database, an env file, a graphical session, a multi-step build", and that is when
`/run-skill-generator` records the recipe: it gets the app running from a clean environment,
captures the install commands, env vars, and launch script, and commits a per-project skill
at `.claude/skills/run-<name>/`. Run it once per project, and again when the build changes.

`/verify` can also record its own recipe, writing what worked to `.claude/skills/verify/SKILL.md`
at the repo root (or the touched package directory in a monorepo), where at the root the
recorded skill replaces the bundled one — a self-replacing generator. The changelog detail
is a real lesson: Claude edits the recorded file "only when it steered a run wrong, such as
a command that failed or a missing step, so you can commit the file without per-session
diffs", because before v2.1.205 the skill folded in anything a run learned "which caused
frequent merge conflicts". Requires v2.1.200 or later; v2.1.205 for the narrowed edit rule.

Note the shape difference from pstack: Claude Code splits *launch* (recorded once, by the
generator) from *feature knowledge* (not recorded at all — there is no bundled feature map),
where pstack's generator produces both in one artifact.

### Anthropic's published skill-authoring guidance

The parts that bear on generating a skill rather than writing one:

- **Build evaluations first**, before extensive documentation: run Claude on representative
  tasks without the skill and document specific failures, build three scenarios testing
  those gaps, establish a baseline, write minimal instructions, iterate. "There is not
  currently a built-in way to run these evaluations."
- **The Claude A / Claude B loop.** One instance helps author the skill; a *fresh* instance
  with the skill loaded does real tasks; you observe B and bring specifics back to A. The
  page states plainly that no special prompt or meta-skill is needed: "Claude models
  understand the Skill format and structure natively." That is an argument against a heavy
  generator and for a thin one — worth weighing.
- **Observe how Claude navigates skills**: unexpected read order means the structure is not
  as intuitive as you thought; a bundled file Claude never opens "might be unnecessary or
  poorly signaled".
- **Solve, don't defer.** Scripts a skill ships should handle their error conditions rather
  than failing for Claude to figure out. No "voodoo constants": "If you don't know the right
  value, how will Claude determine it?"
- **Verifiable intermediate outputs (plan-validate-execute).** For batch or destructive work:
  analyse → write a plan file → validate the plan against a source of truth with a script →
  execute → verify. The load-bearing step is the validator, and it should be verbose and
  specific: `Field 'signature_date' not found. Available fields: customer_name, order_total,
  signature_date_signed`.
- Mechanics: `name` at most 64 characters (lowercase, digits, hyphens), `description` at
  most 1,024 characters, `SKILL.md` body under 500 lines, file references one level deep,
  forward slashes only, MCP tools referenced as `ServerName:tool_name`.
- The checklist ends with testing: at least three evaluations, tested with Haiku, Sonnet,
  and Opus.

The Claude Code page adds the measurement tooling: `claude plugin eval` runs each prompt in
an isolated session with and without the plugin, scores with graders, and exits non-zero
below a threshold; the `skill-creator` plugin runs a comparable loop in-conversation with
its own `evals/evals.json`. "The two formats aren't interchangeable." `/skill-doctor`
reports per-skill context cost and invocation counts.

### agentskills.io best practices

Independent of Anthropic's page and largely agreeing with it, with three things stated more
sharply:

- **Skills generated without domain context are the named pitfall.** "A common pitfall in
  skill creation is asking an LLM to generate a skill without providing domain-specific
  context — relying solely on the LLM's general training knowledge. The result is vague,
  generic procedures." Good source material is project-specific: internal runbooks, API
  specs, code review comments, version control history, real failure cases. This is the
  same claim as pstack's "interview the repo, not the user", arrived at from the other
  direction, and it is the strongest sourced argument that a verification-skill generator
  must read the repo rather than template.
- **Refine with real execution**, feeding all results back, not just failures. "Even a
  single pass of execute-then-revise noticeably improves quality." Read execution traces,
  not just final outputs: time wasted usually means instructions too vague, instructions
  that do not apply, or "too many options presented without a clear default".
- **Gotchas are the highest-value content.** "The highest-value content in many skills is a
  list of gotchas — environment-specific facts that defy reasonable assumptions." Not
  general advice; concrete corrections. Keep them in `SKILL.md` where the agent reads them
  *before* encountering the situation, because for non-obvious issues "the agent may not
  recognize the trigger" to load a reference file. When you correct an agent's mistake, add
  the correction to gotchas.

Also: `SKILL.md` under 500 lines and 5,000 tokens per the specification; tell the agent
*when* to load each reference file ("Read `references/api-errors.md` if the API returns a
non-200 status code" beats "see references/ for details"); match specificity to fragility;
provide defaults, not menus; favour procedures over declarations; and four instruction
patterns — templates, checklists, validation loops, plan-validate-execute.

## 3. Agent-friendly CLI contracts

This is the thinnest area, and the honest answer is that the four properties the ticket
names are not documented together anywhere authoritative. Here is what each rests on.

**Sourced, but about MCP tools rather than CLIs.** Anthropic's *Writing effective tools for
agents* is first-party and evaluation-backed, and its principles transfer to a CLI argument
by argument even though it never discusses one:

- Do not merely wrap existing API endpoints. "Agents have distinct affordances to
  traditional software." Build a few tools for high-impact workflows, and consolidate:
  `search_contacts` or `message_contact` rather than `list_contacts`; `search_logs` rather
  than `read_logs`; `schedule_event` rather than `list_users` + `list_events` +
  `create_event`.
- **Namespacing** — grouping under common prefixes, `asana_search` / `jira_search`, then
  `asana_projects_search` / `asana_users_search` — measurably affects tool selection, and
  prefix versus suffix choice "has non-trivial effects", varying by model.
- **Return only high-signal context.** Prefer `name`, `file_type` over `uuid`, `mime_type`;
  resolving alphanumeric UUIDs to semantic names or a 0-indexed scheme "significantly
  improves Claude's precision in retrieval tasks by reducing hallucinations". Offer a
  `response_format` enum (`"concise"` / `"detailed"`) so the caller picks verbosity — the
  example saves roughly two-thirds of the tokens.
- **Token efficiency**: pagination, range selection, filtering, truncation with sensible
  defaults. Claude Code restricts tool responses to 25,000 tokens by default.
- **Error responses are prompt-engineered.** "If a tool call raises an error (for example,
  during input validation), you can prompt-engineer your error responses to clearly
  communicate specific and actionable improvements, rather than opaque error codes or
  tracebacks." This is the closest first-party statement to "error messages that state the
  next action", and the page's worked examples are an unhelpful and a helpful error response
  side by side.
- Parameters unambiguously named: `user_id`, not `user`. Response structure (XML, JSON,
  Markdown) affects performance and has no universal answer — measure it.
- And the meta-point: evaluations first, from realistic tasks (dozens of tool calls, real
  data), with agents' own reasoning and feedback blocks read as evidence.

**Sourced, but explicitly human-first.** clig.dev covers three of the four properties and
opens the relevant section with "Human-readable output is paramount. Humans come first,
machines second." Take it as convention, not as agent guidance:

- Machine-readable output: `--json` for formatted JSON, `--plain` when human formatting
  breaks one-record-per-line, `-q` to suppress non-essential output. Machine-readable output
  goes to `stdout`, "log messages, errors, and so on" to `stderr`. Detect a human by whether
  the stream is a TTY.
- Exit codes: zero on success, non-zero on failure, "map the non-zero exit codes to the most
  important failure modes".
- Dry run: listed under dangerous actions — "Consider giving the user a way to 'dry run' the
  operation so they can see what'll happen before they commit to it" — with `-n, --dry-run`
  in the conventional-flags list, plus `--no-input` ("don't prompt or do anything
  interactive... If the command requires input, fail and tell the user how to pass the
  information as a flag") and, for severe operations, `--confirm="name-of-thing"` so the
  guard stays scriptable.
- Errors: "Catch errors and rewrite them for humans... Think of it like a conversation,
  where the user has done something wrong and the program is guiding them in the right
  direction. Example: 'Can't write to file.txt. You might need to make it writable by
  running chmod +w file.txt.'" Also: put the most important information at the end.
- Subcommands, for progressive disclosure: reduce complexity by grouping; be consistent
  across subcommands; `noun verb` two-level naming, `docker container create`, "seems to be
  more common"; no ambiguous pairs like "update" and "upgrade"; concise help by default,
  full help on `-h`/`--help` anywhere, and `myapp help <subcommand>` for git-like tools.

**Demonstrated rather than argued.** Playwright CLI is a shipped, first-party CLI built for
agents, and its shape is evidence even where the docs do not justify it: verb-first
commands grouped into the eleven categories listed above, `--json` and `--raw` global flags, per-command
`--help`, a daemon for state, named sessions for isolation, and snapshots written to a file
whose path is returned rather than dumped into stdout. Its "Skills" page states the
progressive-disclosure argument directly — agents "discover capabilities through installable
skills rather than verbose help text", with `playwright-cli install --skills` writing
`.claude/skills/playwright-cli` — and it works without them: "Point your agent at the CLI
and let it discover commands... Check playwright-cli --help for available commands."

**Folklore, or at least unsourced.** The composite claim in pstack Part 1 — deep modules,
`--dry-run` on anything destructive, subcommands for progressive disclosure, error messages
that say what to do instead, rich `--help`, JSON out, presented as a set of "agent-friendly
CLI properties" — is a synthesis with no cited source, and I found no authoritative document
that states it as such. Each element is independently defensible from the sources above;
the bundle is one practitioner's claim. "Deep modules" comes from Ousterhout (Anthropic's
page also cites "Ousterhout's law" on voodoo constants), not from anything about agents.

Specifically not documented anywhere I could reach: any measured comparison of CLI shapes
for agent success, any guidance on how an agent-facing CLI should differ from a
human-facing one beyond the CLI-versus-MCP token trade-off, and any convention for what a
verification CLI's subcommand vocabulary should be. The design will have to decide that
from Playwright CLI's example and its own judgement.

## 4. The feature-map shape

pstack's map is a directory — a `README.md` index plus one file per user-facing feature,
seeded at three to five features from routes, commands, menus, or docs. Each file opens
with an H1 and one paragraph of user-visible behaviour, then uses **exactly four H2s in
order**:

1. `Sub-features` — short IDs, one line each (`create-save` persists a title and body).
2. `How to get to it (user POV)` — every user entry point, including the ones an agent
   would not pick (a keyboard shortcut, a CLI equivalent).
3. `Driving it with <harness>` — starts with `Preconditions:`, then labelled bullets pairing
   each user action with an exact command and an observable result: **Open editor.** Choose
   `New note`. Run `control-notes browser click --role button --name "New note"`. A form
   named `Note editor` appears with focus in the `Title` textbox.
4. `Gotchas` — traps that can waste or invalidate a run.

The README carries what the feature files do not repeat: baseline preconditions, driving
conventions ("Prefer ARIA roles and accessible names over CSS selectors or DOM position",
"Treat every command as literal"), proof and skip reporting (UI proof is an ARIA snapshot
plus a screenshot with the app identity visible; CLI proof is command, stdout, stderr, and
exit code; mutation proof includes "a read-only second view of the stored value"; "Do not
report a skipped entry point as verified through a different path"), and the entry contract
itself. The last instruction is the one that keeps the map from rotting into documentation:
"Keep implementation details out of the map. Name only user paths, stable handles, required
state, commands, and observable proof."

Two properties are enforced across the generator and the maintainer together, and are easy
to lose: the map is what makes partial proof visible — "a proof that drives one convenient
entry point is incomplete when the map lists others" — and it is what the maintenance pass
parallelises over, one subagent per feature file.

**Has anything else converged on this?** Partly, once.

[Playwright Test Agents](https://playwright.dev/docs/test-agents) ship a **planner** that
"explores your app and produces a test plan for one or many scenarios and user flows",
output as "a Markdown test plan saved as `specs/basic-operations.md`" that is "human-readable
but precise enough for test generation", which a **generator** then turns into test files
and a **healer** repairs. The published example's schema is `# <App> Test Plan` →
`## Application Overview` (a feature bullet list) → `## Test Scenarios` → `### N. <Scenario>`
→ `**Seed:** tests/seed.spec.ts` → `#### N.N <Case>` → `**Steps:**` (numbered, user-POV:
"Click in the 'What needs to be done?' input field", "Type 'Buy groceries'", "Press Enter
key") → `**Expected Results:**`.

So three of pstack's four sections have a counterpart: user-POV steps, observable expected
results, and preconditions (Playwright's `seed` test, which the planner actually runs to
perform global setup and which doubles as the example for generated tests). There is no
counterpart to `Sub-features` and — more notably — no counterpart to `Gotchas`. The
convergence on gotchas is instead with skill-authoring guidance generally:
agentskills.io names a `Gotchas` section as the highest-value content a skill can carry,
which is independent support for pstack keeping it as a required H2 rather than an optional
appendix.

Beyond that, no. Claude Code's recorded `/run` and `/verify` skills record launch, not
features, and no schema for them is published. I found no other published artifact with a
fixed per-feature verification schema. Two data points is convergence on the idea of a
maintained Markdown feature/scenario document that a harness is driven from; it is not
convergence on pstack's specific four H2s, and nothing I read argues for four rather than
three or five.

## What this note cannot answer

The design will have to decide these without a source:

- **The subcommand vocabulary for a generated verification CLI.** Playwright CLI is one
  worked example over one surface; nothing generalises it across CLI, service, and mobile
  surfaces.
- **Whether the generator should be thin or thick.** Anthropic states that Claude
  understands the skill format natively and needs no meta-skill, and that evaluations should
  precede documentation; pstack's generator is a long prescriptive procedure that proves its
  own output. Both positions are sourced. They point different ways.
- **Whether four H2s is the right number.** The schema is one author's, held stable by the
  README's entry contract. Playwright's converges on three of the four. Nothing measures it.
- **Two instances of one Android AVD.** Documented concurrency is one AVD per instance on
  distinct port pairs, up to 64. Same-AVD concurrency is undocumented on the page that owns
  the emulator's flags.
- **Any measured claim about agent CLI ergonomics.** Anthropic published evaluation curves
  for MCP tools, not for CLIs. Everything in area 3 about CLIs specifically is convention or
  demonstration, not measurement.
