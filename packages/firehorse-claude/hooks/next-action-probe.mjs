#!/usr/bin/env node
// Emits one fixed banner at Stop. It is an experiment, not a feature.
//
// cinjoff/firehorse#253 asks a question no document answers: does a
// `systemMessage` from a Stop hook actually reach the reader, and does it stay
// read after the third session? GSD's equivalent advice lands in the
// assistant's own final message, where the reader is already looking. This
// renders somewhere else. Everything else on the #252 map assumes that works.
//
// The string is fixed on purpose. Any real next-action logic here would
// confound the thing being measured, which is the delivery channel alone.
//
// Off unless FIREHORSE_NEXT_PROBE=1. The ticket says to wire it into
// hooks.json, and an unconditional probe banner would then fire for everyone
// who installs the plugin. Opt-in keeps the experiment self-service.
//
// Delete this file and its hooks.json entry when #253 closes.

if (process.env.FIREHORSE_NEXT_PROBE !== "1") process.exit(0);

// Three lines, because #253 asks whether the glyph and the rule survive the
// terminal or whether the banner has to collapse to one plain line.
const BANNER = [
  "───────────────────────────────────────────────",
  "▶ Next · this is the #253 probe, not real advice",
  "  If you are reading this, the channel works.",
].join("\n");

try {
  process.stdout.write(`${JSON.stringify({ systemMessage: BANNER })}\n`);
} catch {
  // A probe must never be the reason a turn fails to end.
}

process.exit(0);
