# What the Claude Code hook surface actually allows

Read from `code.claude.com/docs/en/hooks`, scraped 2026-09-20. This is the constraint set any
design has to live inside, and two of its rules rule out the obvious first attempt.

## Stop is the right event

`Stop` fires when the main agent has finished responding. It does not fire on a user
interrupt; API errors route to `StopFailure` instead. It has no matcher and always fires.

Its input carries more than the common fields:

| Field | Why it matters here |
|---|---|
| `last_assistant_message` | The final response text, without parsing the transcript. The docs say to prefer it: the transcript file is not guaranteed to hold the final message at Stop time on all versions. |
| `background_tasks` | In-flight tasks with `type`, `status`, `description`. Lets a hook tell "session is done" from "session is paused waiting on work". |
| `session_crons` | Scheduled wakeups from `CronCreate`, `ScheduleWakeup`, and `/loop`. |
| `stop_hook_active` | `true` when Claude Code is already continuing because of a stop hook. |

## The trap: additionalContext on Stop restarts the turn

`hookSpecificOutput.additionalContext` on a `Stop` hook does not print a note and let the
session end. It **keeps the conversation going** so Claude can act on the guidance, under the
same loop protections as `decision: "block"`: the `stop_hook_active` flag and a cap of eight
consecutive continuations.

That is the opposite of what a "you are done, start a fresh session" banner needs. Using it
would make the session refuse to end, which is the exact failure the recommendation is meant
to prevent.

**Use `systemMessage` instead.** It is a universal JSON output field, described as a warning
message shown to the user, and `Stop` is not on the list of events that discard it. The turn
ends normally and the user sees the line.

The events that *do* discard `systemMessage`: `Setup`, `InstructionsLoaded`, `MessageDisplay`,
`Notification`, `ConfigChange`, `PreCompact`, `PostCompact`, `WorktreeCreate`,
`WorktreeRemove`, `Elicitation`, `ElicitationResult`, `StopFailure`, and `SessionEnd`.

## SessionEnd is useless for this

`SessionEnd` discards all JSON output fields including `systemMessage`, has no decision
control, and defaults to a 1.5 second timeout. It can write a state file. It cannot say
anything.

## Other pieces worth knowing

- **Matchers.** Tool events match on `tool_name`, so `PostToolUse` with matcher `Skill`
  fires on every skill invocation. `UserPromptExpansion` matches on command or skill names.
  `Stop`, `UserPromptSubmit`, and `PostToolBatch` have no matcher support.
- **Output cap.** `additionalContext`, `systemMessage`, and plain stdout are each capped at
  10,000 characters, measured per field per hook. Over the cap, Claude Code writes the string
  to a file and substitutes the path plus a 2,000 character preview, and does not ask Claude
  to read the file. No setting raises the cap.
- **Prompt and agent hooks exist.** `type: "prompt"` sends the hook input plus your prompt to
  a Claude model, Haiku by default, and reads a structured decision back. `type: "agent"`
  spawns a verifier with tool access. Both are supported on `Stop`, `PostToolUse`,
  `UserPromptSubmit`, `TaskCompleted`, and nine other events. This is a real alternative to
  calling Jev, and it needs no API key and no network code.
- **Async hooks.** An async hook does not block the turn, but its `additionalContext` and
  `systemMessage` are delivered to Claude on the next turn and **neither is shown to the
  user**. So a "tell the user what to do next" hook cannot be async. Jev's 70 to 500ms makes
  that acceptable.
- **terminalSequence** emits an allowlisted OSC escape (desktop notification, window title,
  bell) and works even on events that discard `systemMessage`. Hooks have no controlling
  terminal, so this is the only way to ring a bell.
- **Hooks in plugins.** Firehorse already ships `packages/firehorse-claude/hooks/hooks.json`
  with two `SessionStart` command hooks using `${CLAUDE_PLUGIN_ROOT}` and 5 second timeouts.
  A `Stop` entry goes in the same file.

## The shape this forces

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node",
            "args": ["${CLAUDE_PLUGIN_ROOT}/hooks/next-action.mjs"],
            "timeout": 5,
            "statusMessage": "Checking what comes next"
          }
        ]
      }
    ]
  }
}
```

The hook reads stdin, decides, and prints at most:

```json
{ "systemMessage": "▶ Next: /firehorse:build #218. Start a fresh session (/clear) first." }
```

Print nothing and exit 0 when there is nothing to say. That is the default case and should be
the common one.
