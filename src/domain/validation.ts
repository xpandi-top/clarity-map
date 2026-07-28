import { SCHEMA_VERSION } from './schema'
import { THOUGHT_TYPES, RELATION_TYPES, createDefaultDimensions } from './defaults'
import {
  BELIEF_STATUSES,
  CONFIDENCE_LEVELS,
  EVIDENCE_STATUSES,
  HYPOTHESIS_STATUSES,
  PERSONAL_RULE_STATUSES,
} from './learning'
import { backfillBuiltInPrompts } from './prompts'
import { tx } from '../i18n/core'
import type {
  Belief,
  BeliefStatus,
  BeliefUpdate,
  ConfidenceLevel,
  Dimension,
  Evidence,
  EvidenceStatus,
  ExportEnvelope,
  Hypothesis,
  HypothesisStatus,
  Observation,
  ObservationContext,
  PairwiseComparison,
  PersonalDefaultRule,
  PersonalRuleCondition,
  PersonalRuleStatus,
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

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function optionalStr(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function coerceConfidence(value: unknown): ConfidenceLevel {
  return CONFIDENCE_LEVELS.includes(value as ConfidenceLevel)
    ? (value as ConfidenceLevel)
    : 'veryLow'
}

function coerceContext(raw: unknown): ObservationContext {
  if (!isRecord(raw)) return { tags: [] }
  return {
    location: optionalStr(raw.location),
    timeOfDay: optionalStr(raw.timeOfDay),
    sleepQuality: num(raw.sleepQuality),
    stressLevel: num(raw.stressLevel),
    physicalState: optionalStr(raw.physicalState),
    socialContext: optionalStr(raw.socialContext),
    tags: strArray(raw.tags),
  }
}

function coerceObservation(raw: unknown, workspaceId: string): Observation | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id)
  const description = str(raw.description)
  if (!id || !description) return null
  const createdAt = str(raw.createdAt, new Date().toISOString())
  return {
    id,
    workspaceId,
    title: optionalStr(raw.title),
    description,
    occurredAt: str(raw.occurredAt, createdAt),
    context: coerceContext(raw.context),
    energyBefore: num(raw.energyBefore),
    energyAfter: num(raw.energyAfter),
    moodBefore: num(raw.moodBefore),
    moodAfter: num(raw.moodAfter),
    relatedThoughtIds: strArray(raw.relatedThoughtIds),
    archivedAt: optionalStr(raw.archivedAt),
    createdAt,
    updatedAt: str(raw.updatedAt, createdAt),
  }
}

function coerceEvidence(raw: unknown, workspaceId: string): Evidence | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id)
  const statement = str(raw.statement)
  if (!id || !statement) return null
  const createdAt = str(raw.createdAt, new Date().toISOString())
  return {
    id,
    workspaceId,
    statement,
    observationIds: strArray(raw.observationIds),
    supportingObservationIds: strArray(raw.supportingObservationIds),
    contradictingObservationIds: strArray(raw.contradictingObservationIds),
    relatedThoughtIds: strArray(raw.relatedThoughtIds),
    confidence: coerceConfidence(raw.confidence),
    status: EVIDENCE_STATUSES.includes(str(raw.status) as EvidenceStatus)
      ? (raw.status as EvidenceStatus)
      : 'emerging',
    context: isRecord(raw.context) ? coerceContext(raw.context) : undefined,
    createdAt,
    updatedAt: str(raw.updatedAt, createdAt),
  }
}

function coerceHypothesis(raw: unknown, workspaceId: string): Hypothesis | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id)
  const statement = str(raw.statement)
  if (!id || !statement) return null
  const createdAt = str(raw.createdAt, new Date().toISOString())
  return {
    id,
    workspaceId,
    statement,
    relatedValueIds: strArray(raw.relatedValueIds),
    relatedGoalIds: strArray(raw.relatedGoalIds),
    relatedThoughtIds: strArray(raw.relatedThoughtIds),
    evidenceIds: strArray(raw.evidenceIds),
    contradictingEvidenceIds: strArray(raw.contradictingEvidenceIds),
    status: HYPOTHESIS_STATUSES.includes(str(raw.status) as HypothesisStatus)
      ? (raw.status as HypothesisStatus)
      : 'untested',
    confidence: coerceConfidence(raw.confidence),
    createdAt,
    updatedAt: str(raw.updatedAt, createdAt),
  }
}

function coerceBelief(raw: unknown, workspaceId: string): Belief | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id)
  const statement = str(raw.statement)
  if (!id || !statement) return null
  const createdAt = str(raw.createdAt, new Date().toISOString())
  return {
    id,
    workspaceId,
    statement,
    description: optionalStr(raw.description),
    confidence: coerceConfidence(raw.confidence),
    status: BELIEF_STATUSES.includes(str(raw.status) as BeliefStatus)
      ? (raw.status as BeliefStatus)
      : 'active',
    evidenceIds: strArray(raw.evidenceIds),
    contradictingEvidenceIds: strArray(raw.contradictingEvidenceIds),
    relatedThoughtIds: strArray(raw.relatedThoughtIds),
    previousBeliefId: optionalStr(raw.previousBeliefId),
    replacementBeliefId: optionalStr(raw.replacementBeliefId),
    createdAt,
    updatedAt: str(raw.updatedAt, createdAt),
  }
}

function coerceBeliefUpdate(raw: unknown, workspaceId: string): BeliefUpdate | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id)
  const updatedBeliefId = str(raw.updatedBeliefId)
  const updatedStatement = str(raw.updatedStatement)
  if (!id || !updatedBeliefId || !updatedStatement) return null
  return {
    id,
    workspaceId,
    previousBeliefId: optionalStr(raw.previousBeliefId),
    previousStatement: optionalStr(raw.previousStatement),
    updatedBeliefId,
    updatedStatement,
    reason: str(raw.reason),
    supportingEvidenceIds: strArray(raw.supportingEvidenceIds),
    contradictingEvidenceIds: strArray(raw.contradictingEvidenceIds),
    confidence: coerceConfidence(raw.confidence),
    createdAt: str(raw.createdAt, new Date().toISOString()),
    reviewAt: optionalStr(raw.reviewAt),
  }
}

function coercePersonalRule(raw: unknown, workspaceId: string): PersonalDefaultRule | null {
  if (!isRecord(raw)) return null
  const id = str(raw.id)
  const name = str(raw.name)
  const defaultResponse = str(raw.defaultResponse)
  if (!id || !name || !defaultResponse) return null
  const createdAt = str(raw.createdAt, new Date().toISOString())
  return {
    id,
    workspaceId,
    name,
    triggerDescription: str(raw.triggerDescription),
    conditions: Array.isArray(raw.conditions)
      ? raw.conditions.filter(isRecord).map((condition, index) => ({
          id: str(condition.id, `pcond_${index}`),
          description: str(condition.description),
          field: optionalStr(condition.field),
          operator: condition.operator as PersonalRuleCondition['operator'],
          value:
            typeof condition.value === 'string' ||
            typeof condition.value === 'number' ||
            typeof condition.value === 'boolean'
              ? condition.value
              : undefined,
        }))
      : [],
    defaultResponse,
    exceptionDescription: optionalStr(raw.exceptionDescription),
    relatedValueIds: strArray(raw.relatedValueIds),
    relatedGoalIds: strArray(raw.relatedGoalIds),
    relatedThoughtIds: strArray(raw.relatedThoughtIds),
    evidenceIds: strArray(raw.evidenceIds),
    contradictingEvidenceIds: strArray(raw.contradictingEvidenceIds),
    context: isRecord(raw.context) ? coerceContext(raw.context) : undefined,
    confidence: coerceConfidence(raw.confidence),
    status: PERSONAL_RULE_STATUSES.includes(str(raw.status) as PersonalRuleStatus)
      ? (raw.status as PersonalRuleStatus)
      : 'experimental',
    replacedByRuleId: optionalStr(raw.replacedByRuleId),
    lastUsedAt: optionalStr(raw.lastUsedAt),
    createdAt,
    updatedAt: str(raw.updatedAt, createdAt),
    reviewAt: optionalStr(raw.reviewAt),
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
      tx(
        'The file uses schema version {fileVersion}, which is newer than this app (version {appVersion}).',
        '该文件使用架构版本 {fileVersion}，高于当前应用版本（{appVersion}）。',
        { fileVersion: schemaVersion, appVersion: SCHEMA_VERSION },
      ),
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
      errors.push(
        tx('Workspace {number} is not a valid object.', '第 {number} 个工作区不是有效对象。', {
          number: index + 1,
        }),
      )
      return
    }
    const workspace = coerceWorkspace(entry.workspace)
    if (!workspace) {
      errors.push(
        tx(
          'Workspace {number} is missing its workspace record.',
          '第 {number} 个工作区缺少工作区记录。',
          { number: index + 1 },
        ),
      )
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
      errors.push(
        tx('Workspace “{name}” has no dimensions.', '工作区“{name}”没有维度。', {
          name: workspace.name,
        }),
      )
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

    // Learning records are optional: files written before schema 3 have none.
    const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
    const keepThoughts = (ids: string[]) => ids.filter((id) => thoughtIds.has(id))

    const observations = list(entry.observations)
      .map((observation) => coerceObservation(observation, workspace.id))
      .filter((observation): observation is Observation => observation !== null)
      .map((observation) => ({
        ...observation,
        relatedThoughtIds: keepThoughts(observation.relatedThoughtIds),
      }))
    const observationIds = new Set(observations.map((observation) => observation.id))
    const keepObservations = (ids: string[]) => ids.filter((id) => observationIds.has(id))

    const evidence = list(entry.evidence)
      .map((item) => coerceEvidence(item, workspace.id))
      .filter((item): item is Evidence => item !== null)
      .map((item) => ({
        ...item,
        observationIds: keepObservations(item.observationIds),
        supportingObservationIds: keepObservations(item.supportingObservationIds),
        contradictingObservationIds: keepObservations(item.contradictingObservationIds),
        relatedThoughtIds: keepThoughts(item.relatedThoughtIds),
      }))
    const evidenceIds = new Set(evidence.map((item) => item.id))
    const keepEvidence = (ids: string[] | undefined) =>
      (ids ?? []).filter((id) => evidenceIds.has(id))

    const hypotheses = list(entry.hypotheses)
      .map((hypothesis) => coerceHypothesis(hypothesis, workspace.id))
      .filter((hypothesis): hypothesis is Hypothesis => hypothesis !== null)
      .map((hypothesis) => ({
        ...hypothesis,
        relatedValueIds: keepThoughts(hypothesis.relatedValueIds),
        relatedGoalIds: keepThoughts(hypothesis.relatedGoalIds),
        relatedThoughtIds: keepThoughts(hypothesis.relatedThoughtIds ?? []),
        evidenceIds: keepEvidence(hypothesis.evidenceIds),
        contradictingEvidenceIds: keepEvidence(hypothesis.contradictingEvidenceIds),
      }))

    const beliefs = list(entry.beliefs)
      .map((belief) => coerceBelief(belief, workspace.id))
      .filter((belief): belief is Belief => belief !== null)
      .map((belief) => ({
        ...belief,
        evidenceIds: keepEvidence(belief.evidenceIds),
        contradictingEvidenceIds: keepEvidence(belief.contradictingEvidenceIds),
        relatedThoughtIds: keepThoughts(belief.relatedThoughtIds ?? []),
      }))
    const beliefIds = new Set(beliefs.map((belief) => belief.id))

    // A revision that has lost the belief it produced says nothing, so it is
    // dropped; one that has lost only its predecessor still reads correctly
    // because the previous wording is stored on the update itself.
    const beliefUpdates = list(entry.beliefUpdates)
      .map((update) => coerceBeliefUpdate(update, workspace.id))
      .filter((update): update is BeliefUpdate => update !== null)
      .filter((update) => beliefIds.has(update.updatedBeliefId))
      .map((update) => ({
        ...update,
        supportingEvidenceIds: keepEvidence(update.supportingEvidenceIds),
        contradictingEvidenceIds: keepEvidence(update.contradictingEvidenceIds),
      }))

    const personalRules = list(entry.personalRules)
      .map((rule) => coercePersonalRule(rule, workspace.id))
      .filter((rule): rule is PersonalDefaultRule => rule !== null)
      .map((rule) => ({
        ...rule,
        evidenceIds: keepEvidence(rule.evidenceIds),
        contradictingEvidenceIds: keepEvidence(rule.contradictingEvidenceIds),
        relatedValueIds: keepThoughts(rule.relatedValueIds),
        relatedGoalIds: keepThoughts(rule.relatedGoalIds),
        relatedThoughtIds: keepThoughts(rule.relatedThoughtIds ?? []),
      }))

    workspaces.push({
      workspace,
      thoughts,
      dimensions,
      relations,
      comparisons,
      rules,
      dismissedSuggestionIds: strArray(entry.dismissedSuggestionIds),
      observations,
      evidence,
      hypotheses,
      beliefs,
      beliefUpdates,
      personalRules,
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
