#!/usr/bin/env tsx
/**
 * `pnpm upstreams:check` — compare `upstreams.lock.json` against the plugins
 * installed under `~/.claude/plugins/` and report impact: a vanished or renamed
 * skill that a workflow references names the workflows that break.
 *
 * `pnpm upstreams:check --write` accepts a new baseline and prints what moved.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  UPSTREAMS_LOCK_PATH,
  UpstreamsLockfileError,
  buildUpstreamsLockfile,
  collectUpstreamSkillUsages,
  diffUpstreams,
  formatUpstreamDriftReport,
  serialiseUpstreamsLockfile,
} from "../packages/firehorse-core/src/upstreams/index.js";
import { loadDefinitions } from "./lib/definitions-io.js";
import { readUpstreamsState } from "./lib/upstreams-io.js";

const repoRoot = process.cwd();

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const unknown = args.filter((arg) => arg !== "--write");
  if (unknown.length > 0) {
    throw new Error(`Usage: pnpm upstreams:check [--write] (got ${unknown.join(" ")})`);
  }

  const state = await readUpstreamsState(repoRoot);
  const usages = collectUpstreamSkillUsages(await loadDefinitions(repoRoot));

  if (state.installed === null) {
    // CI has no ~/.claude/plugins/. Absence is not drift.
    console.log(
      `upstreams:check skipped the on-disk comparison: ${state.pluginsDir} does not exist.`,
    );
    const report = diffUpstreams({
      declared: state.declared,
      lockfile: state.lockfile,
      installed: null,
      usages,
    });
    if (write) {
      throw new Error(
        `--write needs ${state.pluginsDir} to read a new baseline from. Nothing written.`,
      );
    }
    printReport(report, usages.length, state.declared.length);
    return;
  }

  const report = diffUpstreams({
    declared: state.declared,
    lockfile: state.lockfile,
    installed: state.installed,
    usages,
  });

  if (write) {
    const next = buildUpstreamsLockfile({
      plugins: state.installed,
      generatedAt: new Date().toISOString(),
    });
    await writeFile(path.join(repoRoot, UPSTREAMS_LOCK_PATH), serialiseUpstreamsLockfile(next));
    const moved = formatUpstreamDriftReport(report);
    console.log(
      state.lockfilePresent
        ? `upstreams:check --write rewrote ${UPSTREAMS_LOCK_PATH} from ${state.installed.length} installed plugin(s).`
        : `upstreams:check --write created ${UPSTREAMS_LOCK_PATH} from ${state.installed.length} installed plugin(s).`,
    );
    if (moved.length === 0) {
      console.log("Nothing moved; only generatedAt changed.");
      return;
    }
    console.log("What moved:");
    for (const line of moved) {
      console.log(`  ${line}`);
    }
    return;
  }

  printReport(report, usages.length, state.declared.length);
}

function printReport(
  report: ReturnType<typeof diffUpstreams>,
  referenceCount: number,
  declaredCount: number,
): void {
  for (const line of formatUpstreamDriftReport(report)) {
    console.log(line);
  }

  const scope = `${declaredCount} declared plugin(s), ${referenceCount} upstreamSkills reference(s)`;
  if (!report.ok) {
    console.error(
      `upstreams:check found ${report.breaking.length} breaking change(s) across ${scope}.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    report.advisory.length === 0
      ? `upstreams:check found no drift across ${scope} (basis: ${report.basis}).`
      : `upstreams:check found ${report.advisory.length} advisory change(s) and no breakage across ${scope} (basis: ${report.basis}). Run 'pnpm upstreams:check --write' to accept them.`,
  );
}

void main().catch((error: unknown) => {
  if (error instanceof UpstreamsLockfileError) {
    console.error(error.message);
  } else if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
