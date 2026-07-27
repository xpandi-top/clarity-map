import { SCHEMA_VERSION } from './schema'
import { THOUGHT_TYPES, RELATION_TYPES, createDefaultDimensions } from './defaults'
import { backfillBuiltInPrompts } from './prompts'
import type {
  Dimension,
  ExportEnvelope,
  PairwiseComparison,
  Rule,
  Thought,
  ThoughtRelation,
  Workspace,
  WorkspaceData,
} from './types'

export interface ValidationResult<T> {
  ok: boolean
  errors: string[]
  value?: T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

function coerceThought(raw: unknown, workspaceId: string): Thought | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id)
  const text = str(raw.text)
  if (!id || !text) return null
  const type = THOUGHT_TYPES.includes(raw.type as never) ? (raw.type as Thought['type']) : 'unclassified'
  const status =
    raw.status === 'completed' || raw.status === 'archived' ? raw.status : 'active'
  const createdAt = str(raw.createdAt, new Date().toISOString())
  return {
    id,
    workspaceId,
    text,
    description: str(raw.description),
    type,
    dimensionValues: isRecord(raw.dimensionValues)
      ? (raw.dimensionValues as Thought['dimensionValues'])
      : {},
    tags: strArray(raw.tags),
    status,
    estimatedMinutes:
      typeof raw.estimatedMinutes === 'number' ? raw.estimatedMinutes : undefined,
    createdAt,
    updatedAt: str(raw.updatedAt, createdAt),
  }
}

function coerceDimension(raw: unknown): Dimension | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id)
  const name = str(raw.name)
  const kinds = ['binary', 'scale', 'singleSelect', 'multiSelect', 'boolean']
  if (!id || !name || !kinds.includes(str(raw.kind))) return null
  const stages = ['capture', 'review', 'structure', 'action', 'optional']
  return {
    id,
    name,
    question: str(raw.question, name),
    comparativeQuestion:
      typeof raw.comparativeQuestion === 'string' ? raw.comparativeQuestion : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    kind: raw.kind as Dimension['kind'],
    options: Array.isArray(raw.options)
      ? raw.options
          .filter(isRecord)
          .map((option, index) => ({
            id: str(option.id, `opt_${index}`),
            label: str(option.label, str(option.value, `Option ${index + 1}`)),
            value: str(option.value, `option_${index}`),
            order: typeof option.order === 'number' ? option.order : index,
          }))
      : undefined,
    min: typeof raw.min === 'number' ? raw.min : undefined,
    max: typeof raw.max === 'number' ? raw.max : undefined,
    step: typeof raw.step === 'number' ? raw.step : undefined,
    lowLabel: typeof raw.lowLabel === 'string' ? raw.lowLabel : undefined,
    highLabel: typeof raw.highLabel === 'string' ? raw.highLabel : undefined,
    required: raw.required === true,
    active: raw.active !== false,
    builtIn: raw.builtIn === true,
    stage: stages.includes(str(raw.stage)) ? (raw.stage as Dimension['stage']) : 'optional',
    order: typeof raw.order === 'number' ? raw.order : 0,
  }
}

function coerceRelation(raw: unknown, workspaceId: string): ThoughtRelation | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id)
  const sourceThoughtId = str(raw.sourceThoughtId)
  const targetThoughtId = str(raw.targetThoughtId)
  if (!id || !sourceThoughtId || !targetThoughtId) return null
  if (!RELATION_TYPES.includes(raw.type as never)) return null
  return {
    id,
    workspaceId,
    sourceThoughtId,
    targetThoughtId,
    type: raw.type as ThoughtRelation['type'],
    description: typeof raw.description === 'string' ? raw.description : undefined,
    createdAt: str(raw.createdAt, new Date().toISOString()),
  }
}

function coerceComparison(raw: unknown, workspaceId: string): PairwiseComparison | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id)
  const results = ['left', 'right', 'tie', 'skipped']
  if (!id || !results.includes(str(raw.result))) return null
  const leftThoughtId = str(raw.leftThoughtId)
  const rightThoughtId = str(raw.rightThoughtId)
  const dimensionId = str(raw.dimensionId)
  if (!leftThoughtId || !rightThoughtId || !dimensionId) return null
  return {
    id,
    workspaceId,
    dimensionId,
    leftThoughtId,
    rightThoughtId,
    result: raw.result as PairwiseComparison['result'],
    createdAt: str(raw.createdAt, new Date().toISOString()),
  }
}

function coerceRule(raw: unknown, workspaceId: string): Rule | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id)
  const name = str(raw.name)
  if (!id || !name) return null
  return {
    id,
    workspaceId,
    name,
    enabled: raw.enabled !== false,
    match: raw.match === 'any' ? 'any' : 'all',
    conditions: Array.isArray(raw.conditions)
      ? (raw.conditions.filter(isRecord) as unknown as Rule['conditions'])
      : [],
    actions: Array.isArray(raw.actions)
      ? (raw.actions.filter(isRecord) as unknown as Rule['actions'])
      : [],
    builtIn: raw.builtIn === true,
    createdAt: str(raw.createdAt, new Date().toISOString()),
  }
}

function coerceWorkspace(raw: unknown): Workspace | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id)
  if (!id) return null
  const stages = ['capture', 'importance', 'matrix', 'structure', 'actions', 'roadmap']
  const createdAt = str(raw.createdAt, new Date().toISOString())
  return {
    id,
    name: str(raw.name, 'Imported workspace'),
    createdAt,
    updatedAt: str(raw.updatedAt, createdAt),
    currentStage: stages.includes(str(raw.currentStage))
      ? (raw.currentStage as Workspace['currentStage'])
      : 'capture',
  }
}

/**
 * Parses and validates an exported file. Returns a fully coerced value or a
 * list of errors; callers must not touch existing state when `ok` is false.
 */
export function validateImport(input: unknown): ValidationResult<ExportEnvelope> {
  const errors: string[] = []

  let parsed: unknown = input
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input)
    } catch {
      return { ok: false, errors: ['The file is not valid JSON.'] }
    }
  }

  if (!isRecord(parsed)) {
    return { ok: false, errors: ['The file does not contain a Clarity Map export object.'] }
  }
  if (parsed.app !== 'clarity-map') {
    errors.push('This file was not exported from Clarity Map.')
  }
  const schemaVersion = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : null
  if (schemaVersion === null) {
    errors.push('The file is missing a schema version.')
  } else if (schemaVersion > SCHEMA_VERSION) {
    errors.push(
      `The file uses schema version ${schemaVersion}, which is newer than this app (version ${SCHEMA_VERSION}).`,
    )
  }
  if (!isRecord(parsed.data) || !Array.isArray((parsed.data as Record<string, unknown>).workspaces)) {
    errors.push('The file does not contain any workspaces.')
  }
  if (errors.length > 0) return { ok: false, errors }

  const rawWorkspaces = (parsed.data as { workspaces: unknown[] }).workspaces
  const workspaces: WorkspaceData[] = []

  rawWorkspaces.forEach((entry, index) => {
    if (!isRecord(entry)) {
      errors.push(`Workspace ${index + 1} is not a valid object.`)
      return
    }
    const workspace = coerceWorkspace(entry.workspace)
    if (!workspace) {
      errors.push(`Workspace ${index + 1} is missing its workspace record.`)
      return
    }
    const thoughts = Array.isArray(entry.thoughts)
      ? entry.thoughts
          .map((thought) => coerceThought(thought, workspace.id))
          .filter((thought): thought is Thought => thought !== null)
      : []
    // Files exported before schema 2 have no comparative questions; give the
    // built-ins the wording that ships with the app.
    const dimensions = backfillBuiltInPrompts(
      Array.isArray(entry.dimensions)
        ? entry.dimensions
            .map(coerceDimension)
            .filter((dimension): dimension is Dimension => dimension !== null)
        : [],
      createDefaultDimensions(),
    )
    if (dimensions.length === 0) {
      errors.push(`Workspace “${workspace.name}” has no dimensions.`)
      return
    }
    const thoughtIds = new Set(thoughts.map((thought) => thought.id))
    const relations = (Array.isArray(entry.relations) ? entry.relations : [])
      .map((relation) => coerceRelation(relation, workspace.id))
      .filter((relation): relation is ThoughtRelation => relation !== null)
      .filter(
        (relation) =>
          thoughtIds.has(relation.sourceThoughtId) && thoughtIds.has(relation.targetThoughtId),
      )
    const comparisons = (Array.isArray(entry.comparisons) ? entry.comparisons : [])
      .map((comparison) => coerceComparison(comparison, workspace.id))
      .filter((comparison): comparison is PairwiseComparison => comparison !== null)
      .filter(
        (comparison) =>
          thoughtIds.has(comparison.leftThoughtId) && thoughtIds.has(comparison.rightThoughtId),
      )
    const rules = (Array.isArray(entry.rules) ? entry.rules : [])
      .map((rule) => coerceRule(rule, workspace.id))
      .filter((rule): rule is Rule => rule !== null)

    workspaces.push({
      workspace,
      thoughts,
      dimensions,
      relations,
      comparisons,
      rules,
      dismissedSuggestionIds: strArray(entry.dismissedSuggestionIds),
    })
  })

  if (errors.length > 0) return { ok: false, errors }
  if (workspaces.length === 0) {
    return { ok: false, errors: ['The file did not contain any readable workspaces.'] }
  }

  return {
    ok: true,
    errors: [],
    value: {
      app: 'clarity-map',
      schemaVersion: SCHEMA_VERSION,
      exportedAt: str(parsed.exportedAt, new Date().toISOString()),
      data: { workspaces },
    },
  }
}
