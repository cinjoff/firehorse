import {
  DefinitionValidationError,
  type DefinitionDiagnostic,
  type FirehorseDefinition,
  type WorkflowDefinition,
} from "./types.js";

export interface ValidateDefinitionSetOptions {
  /** Keys use '<upstream>:<id>', e.g. 'mattpocock-skills:diagnose'. */
  readonly knownUpstreamSkills?: ReadonlySet<string>;
}

export function validateDefinitionSet(
  definitions: readonly FirehorseDefinition[],
  options: ValidateDefinitionSetOptions = {},
): DefinitionDiagnostic[] {
  const diagnostics: DefinitionDiagnostic[] = [];
  const byId = new Map<string, FirehorseDefinition>();

  for (const definition of definitions) {
    const existing = byId.get(definition.frontmatter.id);
    if (existing) {
      diagnostics.push({
        code: "set.duplicate_id",
        message: `Definition ID '${definition.frontmatter.id}' is used by both '${existing.path}' and '${definition.path}'. IDs are globally unique across workflows, skills, and agent roles.`,
        path: definition.path,
        field: "id",
      });
      continue;
    }
    byId.set(definition.frontmatter.id, definition);
  }

  for (const definition of definitions) {
    for (const alias of definition.frontmatter.aliases ?? []) {
      const aliased = byId.get(alias);
      if (aliased) {
        diagnostics.push({
          code: "set.alias_collides_with_id",
          message: `Alias '${alias}' on '${definition.frontmatter.id}' collides with definition ID at '${aliased.path}'.`,
          path: definition.path,
          field: "aliases",
        });
      }
    }

    if (definition.frontmatter.replacedBy) {
      const replacement = byId.get(definition.frontmatter.replacedBy);
      if (!replacement) {
        diagnostics.push({
          code: "set.replacement_missing",
          message: `Replacement definition '${definition.frontmatter.replacedBy}' does not exist.`,
          path: definition.path,
          field: "replacedBy",
        });
      }
    }

    if (definition.kind === "workflow") {
      diagnostics.push(
        ...validateWorkflowReferences(definition, byId, options.knownUpstreamSkills),
      );
    }

    if (
      definition.kind === "agent-role" &&
      definition.frontmatter.name !== definition.frontmatter.id
    ) {
      diagnostics.push({
        code: "agent_role.name_id_mismatch",
        message: `Agent role name '${definition.frontmatter.name}' must match id '${definition.frontmatter.id}' in canonical definitions. Provider projections add native prefixes.`,
        path: definition.path,
        field: "name",
      });
    }
  }

  return diagnostics;
}

export function assertValidDefinitionSet(
  definitions: readonly FirehorseDefinition[],
  options: ValidateDefinitionSetOptions = {},
): void {
  const diagnostics = validateDefinitionSet(definitions, options);
  if (diagnostics.length > 0) {
    throw new DefinitionValidationError(diagnostics);
  }
}

function validateWorkflowReferences(
  definition: WorkflowDefinition,
  byId: ReadonlyMap<string, FirehorseDefinition>,
  knownUpstreamSkills: ReadonlySet<string> | undefined,
): DefinitionDiagnostic[] {
  const diagnostics: DefinitionDiagnostic[] = [];

  for (const reference of definition.frontmatter.supportingSkills ?? []) {
    const target = byId.get(reference.id);
    if (!target) {
      diagnostics.push({
        code: "references.skill_missing",
        message: `Workflow '${definition.frontmatter.id}' references missing Firehorse skill '${reference.id}'.`,
        path: definition.path,
        field: "supportingSkills",
      });
    } else if (target.kind !== "skill") {
      diagnostics.push({
        code: "references.skill_wrong_kind",
        message: `Workflow '${definition.frontmatter.id}' references '${reference.id}' as a skill, but it is a '${target.kind}'.`,
        path: definition.path,
        field: "supportingSkills",
      });
    }
  }

  for (const reference of definition.frontmatter.agentRoles ?? []) {
    const target = byId.get(reference.id);
    if (!target) {
      diagnostics.push({
        code: "references.agent_role_missing",
        message: `Workflow '${definition.frontmatter.id}' references missing agent role '${reference.id}'.`,
        path: definition.path,
        field: "agentRoles",
      });
    } else if (target.kind !== "agent-role") {
      diagnostics.push({
        code: "references.agent_role_wrong_kind",
        message: `Workflow '${definition.frontmatter.id}' references '${reference.id}' as an agent role, but it is a '${target.kind}'.`,
        path: definition.path,
        field: "agentRoles",
      });
    }
  }

  if (knownUpstreamSkills) {
    for (const reference of definition.frontmatter.upstreamSkills ?? []) {
      const key = `${reference.upstream}:${reference.id}`;
      if (!knownUpstreamSkills.has(key)) {
        diagnostics.push({
          code: "references.upstream_skill_missing",
          message: `Workflow '${definition.frontmatter.id}' references unknown upstream skill '${key}'.`,
          path: definition.path,
          field: "upstreamSkills",
        });
      }
    }
  }

  return diagnostics;
}
