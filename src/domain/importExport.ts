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
    /** Observations, evidence, hypotheses, beliefs, updates, and rules. */
    learningRecords: number
    /** True when a workspace with this id already exists locally. */
    conflicts: boolean
  }>
  totalThoughts: number
}

function countLearning(entry: WorkspaceData): number {
  return (
    entry.observations.length +
    entry.evidence.length +
    entry.hypotheses.length +
    entry.beliefs.length +
    entry.beliefUpdates.length +
    entry.personalRules.length
  )
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
      learningRecords: countLearning(entry),
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

  // Learning records reference each other by id as well as referencing
  // thoughts, so every chain — observation to evidence to belief to rule —
  // has to be remapped together or the history comes apart.
  const learningIdMap = new Map<string, string>()
  const remember = (id: string, prefix: string) => learningIdMap.set(id, createId(prefix))
  for (const observation of entry.observations) remember(observation.id, 'obs')
  for (const evidence of entry.evidence) remember(evidence.id, 'evd')
  for (const hypothesis of entry.hypotheses) remember(hypothesis.id, 'hyp')
  for (const belief of entry.beliefs) remember(belief.id, 'blf')
  for (const rule of entry.personalRules) remember(rule.id, 'prule')

  const mapLearning = (id: string) => learningIdMap.get(id) ?? id
  const mapLearningList = (ids: string[] | undefined) => (ids ?? []).map(mapLearning)
  const mapLearningOptional = (id: string | undefined) =>
    id === undefined ? undefined : mapLearning(id)

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
    observations: entry.observations.map((observation) => ({
      ...observation,
      id: mapLearning(observation.id),
      workspaceId,
      relatedThoughtIds: observation.relatedThoughtIds.map(mapThought),
    })),
    evidence: entry.evidence.map((evidence) => ({
      ...evidence,
      id: mapLearning(evidence.id),
      workspaceId,
      observationIds: mapLearningList(evidence.observationIds),
      supportingObservationIds: mapLearningList(evidence.supportingObservationIds),
      contradictingObservationIds: mapLearningList(evidence.contradictingObservationIds),
      relatedThoughtIds: evidence.relatedThoughtIds.map(mapThought),
    })),
    hypotheses: entry.hypotheses.map((hypothesis) => ({
      ...hypothesis,
      id: mapLearning(hypothesis.id),
      workspaceId,
      relatedValueIds: hypothesis.relatedValueIds.map(mapThought),
      relatedGoalIds: hypothesis.relatedGoalIds.map(mapThought),
      relatedThoughtIds: hypothesis.relatedThoughtIds?.map(mapThought),
      evidenceIds: mapLearningList(hypothesis.evidenceIds),
      contradictingEvidenceIds: hypothesis.contradictingEvidenceIds
        ? mapLearningList(hypothesis.contradictingEvidenceIds)
        : undefined,
    })),
    beliefs: entry.beliefs.map((belief) => ({
      ...belief,
      id: mapLearning(belief.id),
      workspaceId,
      evidenceIds: mapLearningList(belief.evidenceIds),
      contradictingEvidenceIds: belief.contradictingEvidenceIds
        ? mapLearningList(belief.contradictingEvidenceIds)
        : undefined,
      relatedThoughtIds: belief.relatedThoughtIds?.map(mapThought),
      previousBeliefId: mapLearningOptional(belief.previousBeliefId),
      replacementBeliefId: mapLearningOptional(belief.replacementBeliefId),
    })),
    beliefUpdates: entry.beliefUpdates.map((update) => ({
      ...update,
      id: createId('bup'),
      workspaceId,
      previousBeliefId: mapLearningOptional(update.previousBeliefId),
      updatedBeliefId: mapLearning(update.updatedBeliefId),
      supportingEvidenceIds: mapLearningList(update.supportingEvidenceIds),
      contradictingEvidenceIds: mapLearningList(update.contradictingEvidenceIds),
    })),
    personalRules: entry.personalRules.map((rule) => ({
      ...rule,
      id: mapLearning(rule.id),
      workspaceId,
      evidenceIds: mapLearningList(rule.evidenceIds),
      contradictingEvidenceIds: rule.contradictingEvidenceIds
        ? mapLearningList(rule.contradictingEvidenceIds)
        : undefined,
      relatedValueIds: rule.relatedValueIds.map(mapThought),
      relatedGoalIds: rule.relatedGoalIds.map(mapThought),
      relatedThoughtIds: rule.relatedThoughtIds?.map(mapThought),
      replacedByRuleId: mapLearningOptional(rule.replacedByRuleId),
    })),
  }
}
