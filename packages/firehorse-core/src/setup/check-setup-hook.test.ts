import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import nodePath from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const packageRoot = process.cwd();
const repoRoot = nodePath.dirname(nodePath.dirname(packageRoot));
const hookPath = nodePath.join(repoRoot, "packages/firehorse-claude/hooks/check-setup.mjs");

const tempRepos: string[] = [];

afterEach(async () => {
  await Promise.all(tempRepos.splice(0).map((repo) => rm(repo, { recursive: true, force: true })));
});

async function repoWith(paths: readonly string[]): Promise<string> {
  const root = await mkdtemp(nodePath.join(os.tmpdir(), "firehorse-hook-"));
  tempRepos.push(root);
  for (const path of paths) {
    await mkdir(nodePath.join(root, path), { recursive: true });
  }
  return root;
}

function runHook(root: string): Promise<{ exitCode: number; stdout: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [hookPath],
      { cwd: root, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } },
      (error, stdout) => {
        resolve({ exitCode: typeof error?.code === "number" ? error.code : 0, stdout });
      },
    );
  });
}

// The hook nags at every SessionStart, so a marker that the user did not choose
// deliberately turns an arbitrary repo into an advertisement.
describe("SessionStart setup hook consent", { timeout: 20_000 }, () => {
  it("stays silent in a repo that only has docs/agents/", async () => {
    const root = await repoWith(["docs/agents"]);

    await expect(runHook(root)).resolves.toEqual({ exitCode: 0, stdout: "" });
  });

  it("reports the missing manifest once .firehorse/ exists", async () => {
    const root = await repoWith(["docs/agents", ".firehorse"]);

    const result = await runHook(root);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(
      "firehorse: no .firehorse/manifest.json — run /firehorse:new-project\n",
    );
  });

  it("reports the missing manifest for a repo declaring the firehorse marketplace", async () => {
    const root = await repoWith([".claude-plugin"]);
    await writeFile(
      nodePath.join(root, ".claude-plugin/marketplace.json"),
      `${JSON.stringify({ plugins: [{ name: "firehorse", source: "./packages/firehorse-claude" }] }, null, 2)}\n`,
    );

    const result = await runHook(root);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("run /firehorse:new-project");
  });

  it("names the plugin forms of the commands, which are what resolve", async () => {
    const root = await repoWith([".firehorse"]);
    await writeFile(
      nodePath.join(root, ".firehorse/manifest.json"),
      `${JSON.stringify({ schemaVersion: 2, setup: { mattPocockSkills: { version: "1.2.3", at: "now" } } }, null, 2)}\n`,
    );

    const result = await runHook(root);

    expect(result.stdout).toBe("firehorse: repo has not been indexed — run /firehorse:index\n");
  });
});
