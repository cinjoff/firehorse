import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import matter from "gray-matter";
import { z } from "zod";

import {
  DefinitionValidationError,
  type DefinitionDiagnostic,
  type DefinitionFrontmatter,
  type FirehorseDefinition,
  definitionFrontmatterSchema,
  definitionKindDirectories,
  formatDefinitionDiagnostics,
  requiredSectionsByKind,
} from "./types.js";

export interface ParseDefinitionOptions {
  readonly path: string;
  readonly content: string;
}

export async function parseDefinitionFile(
  path: string,
): Promise<FirehorseDefinition> {
  return parseDefinition({ path, content: await readFile(path, "utf8") });
}

export function parseDefinition(
  options: ParseDefinitionOptions,
): FirehorseDefinition {
  const diagnostics: DefinitionDiagnostic[] = [];
  let parsed: matter.GrayMatterFile<string>;

  try {
    parsed = matter(options.content);
  } catch (error) {
    throw new DefinitionValidationError([
      {
        code: "frontmatter.parse",
        message: error instanceof Error ? error.message : String(error),
        path: options.path,
      },
    ]);
  }

  const frontmatter = definitionFrontmatterSchema.safeParse(parsed.data);
  if (!frontmatter.success) {
    throw new DefinitionValidationError(
      zodIssuesToDiagnostics(frontmatter.error, options.path),
    );
  }

  diagnostics.push(...validateDefinitionPath(options.path, frontmatter.data));
  diagnostics.push(...validateRequiredSections(options.path, frontmatter.data, parsed.content));
  diagnostics.push(...validateDeprecation(frontmatter.data, options.path));

  if (diagnostics.length > 0) {
    throw new DefinitionValidationError(diagnostics);
  }

  return {
    kind: frontmatter.data.kind,
    frontmatter: frontmatter.data,
    body: parsed.content.trimStart(),
    path: options.path.replaceAll("\\", "/"),
    sourceContent: options.content,
    sourceHash: sha256(options.content),
  } as FirehorseDefinition;
}

export function validateDefinitionPath(
  path: string,
  frontmatter: DefinitionFrontmatter,
): DefinitionDiagnostic[] {
  const normalizedPath = path.replaceAll("\\", "/");
  const expectedSuffix = `definitions/${definitionKindDirectories[frontmatter.kind]}/${frontmatter.id}.md`;

  if (!normalizedPath.endsWith(expectedSuffix)) {
    return [
      {
        code: "path.id_mismatch",
        message: `Definition '${frontmatter.id}' of kind '${frontmatter.kind}' must live at a path ending in '${expectedSuffix}'.`,
        path: normalizedPath,
        field: "id",
      },
    ];
  }

  return [];
}

export function validateRequiredSections(
  path: string,
  frontmatter: DefinitionFrontmatter,
  body: string,
): DefinitionDiagnostic[] {
  const headings = new Set(
    [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => match[1]?.trim()),
  );

  return requiredSectionsByKind[frontmatter.kind]
    .filter((section) => !headings.has(section))
    .map((section) => ({
      code: "body.missing_section",
      message: `Missing required '## ${section}' section for ${frontmatter.kind} definition '${frontmatter.id}'.`,
      path,
      section,
    }));
}

function validateDeprecation(
  frontmatter: DefinitionFrontmatter,
  path: string,
): DefinitionDiagnostic[] {
  if (frontmatter.replacedBy && !frontmatter.deprecated) {
    return [
      {
        code: "frontmatter.replaced_by_without_deprecated",
        message: "Set deprecated: true when replacedBy is declared.",
        path,
        field: "replacedBy",
      },
    ];
  }

  return [];
}

export function zodIssuesToDiagnostics(
  error: z.ZodError,
  path: string,
): DefinitionDiagnostic[] {
  return error.issues.map((issue) => ({
    code: `frontmatter.${issue.code}`,
    message: issue.message,
    path,
    field: issue.path.map(String).join("."),
  }));
}

export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export { formatDefinitionDiagnostics };
