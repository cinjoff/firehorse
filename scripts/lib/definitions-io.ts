import { readdir } from "node:fs/promises";
import path from "node:path";

import {
  parseDefinitionFile,
  type FirehorseDefinition,
} from "../../packages/firehorse-core/src/definitions/index.js";

export const DEFINITIONS_ROOT = "packages/firehorse-core/definitions";

export async function loadDefinitions(repoRoot: string): Promise<FirehorseDefinition[]> {
  const root = path.join(repoRoot, DEFINITIONS_ROOT);
  const files = (await listMarkdownFiles(root)).sort((a, b) => a.localeCompare(b));
  return Promise.all(files.map((file) => parseDefinitionFile(file)));
}

export async function listMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        return listMarkdownFiles(fullPath);
      }
      if (entry.isFile() && entry.name.endsWith(".md")) {
        return [fullPath];
      }
      return [];
    }),
  );
  return files.flat();
}
