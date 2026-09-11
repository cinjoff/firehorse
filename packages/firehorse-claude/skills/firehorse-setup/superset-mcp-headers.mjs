#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const envFile =
  process.env.FIREHORSE_SUPERSET_ENV_FILE ||
  join(homedir(), ".config", "firehorse", "superset.env");

function isSecure(path) {
  if (platform() === "win32") return true;
  const mode = statSync(path).mode & 0o777;
  return (mode & 0o077) === 0;
}

function parseEnv(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

let apiKey = process.env.SUPERSET_API_KEY || "";

if (!apiKey && existsSync(envFile)) {
  if (!isSecure(envFile)) {
    console.error(`${envFile} must be private. Run: chmod 600 ${envFile}`);
    process.exit(1);
  }
  apiKey = parseEnv(readFileSync(envFile, "utf8")).SUPERSET_API_KEY || "";
}

if (!apiKey) {
  console.error("SUPERSET_API_KEY is not set and no private Firehorse env file was found.");
  process.exit(1);
}

process.stdout.write(JSON.stringify({ Authorization: `Bearer ${apiKey}` }));
