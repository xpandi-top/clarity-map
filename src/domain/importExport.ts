import { createId, nowIso } from './ids'
import { SCHEMA_VERSION } from './schema'
import type { ExportEnvelope, WorkspaceData } from './types'

export function buildExport(workspaces: WorkspaceData[]): ExportEnvelope {
  return {
    app: 'clarity-map',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    data: { workspaces },
  }
}

export function serializeExport(workspaces: WorkspaceData[]): string {
  return JSON.stringify(buildExport(workspaces), null, 2)
}

export interface ImportPreview {
  workspaces: Array<{
    name: string
    thoughts: number
    dimensions: number
    relations: number
    comparisons: number
    rules: number
    /** True when a workspace with this id already exists locally. */
    conflicts: boolean
  }>
  totalThoughts: number
}

export function buildImportPreview(
  envelope: ExportEnvelope,
  existingWorkspaceIds: string[],
): ImportPreview {
  const existing = new Set(existingWorkspaceIds)
  return {
    workspaces: envelope.data.workspaces.map((entry) => ({
      name: entry.workspace.name,
      thoughts: entry.thoughts.length,
      dimensions: entry.dimensions.length,
      relations: entry.relations.length,
      comparisons: entry.comparisons.length,
      rules: entry.rules.length,
      conflicts: existing.has(entry.workspace.id),
    })),
    totalThoughts: envelope.data.workspaces.reduce(
      (total, entry) => total + entry.thoughts.length,
      0,
    ),
  }
}

/**
 * Rewrites every id in a workspace so an imported copy can live alongside an
 * existing workspace with the same ids. Relations, comparisons, and rules are
 * remapped consistently.
 */
export function reassignIds(entry: WorkspaceData): WorkspaceData {
  const workspaceId = createId('ws')
  const thoughtIdMap = new Map<string, string>()
  for (const thought of entry.thoughts) thoughtIdMap.set(thought.id, createId('th'))

  const mapThought = (id: string) => thoughtIdMap.get(id) ?? id

  return {
    workspace: { ...entry.workspace, id: workspaceId },
    thoughts: entry.thoughts.map((thought) => ({
      ...thought,
      id: mapThought(thought.id),
      workspaceId,
    })),
    // Dimension ids stay stable: built-ins are shared and rules point at them.
    dimensions: entry.dimensions.map((dimension) => ({ ...dimension })),
    relations: entry.relations.map((relation) => ({
      ...relation,
      id: createId('rel'),
      workspaceId,
      sourceThoughtId: mapThought(relation.sourceThoughtId),
      targetThoughtId: mapThought(relation.targetThoughtId),
    })),
    comparisons: entry.comparisons.map((comparison) => ({
      ...comparison,
      id: createId('cmp'),
      workspaceId,
      leftThoughtId: mapThought(comparison.leftThoughtId),
      rightThoughtId: mapThought(comparison.rightThoughtId),
    })),
    rules: entry.rules.map((rule) => ({ ...rule, workspaceId })),
    dismissedSuggestionIds: [],
  }
}
