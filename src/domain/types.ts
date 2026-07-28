export type ThoughtType =
  | 'unclassified'
  | 'value'
  | 'vision'
  | 'goal'
  | 'outcome'
  | 'milestone'
  | 'project'
  | 'habit'
  | 'action'
  | 'decision'
  | 'problem'
  | 'idea'
  | 'note'

export type ThoughtStatus = 'active' | 'completed' | 'archived'

export type DimensionKind = 'binary' | 'scale' | 'singleSelect' | 'multiSelect' | 'boolean'

export type DimensionStage = 'capture' | 'review' | 'structure' | 'action' | 'optional'

export type DimensionValue = string | number | boolean | string[] | null

export type RelationType =
  | 'serves'
  | 'milestoneOf'
  | 'breaksDownInto'
  | 'prerequisiteFor'
  | 'supports'
  | 'conflictsWith'
  | 'relatedTo'

export type WorkspaceStage =
  | 'capture'
  | 'importance'
  | 'matrix'
  | 'structure'
  | 'actions'
  | 'roadmap'

export interface Thought {
  id: string
  workspaceId: string
  text: string
  description: string
  type: ThoughtType
  dimensionValues: Record<string, DimensionValue>
  tags: string[]
  status: ThoughtStatus
  estimatedMinutes?: number
  createdAt: string
  updatedAt: string
}

export interface DimensionOption {
  id: string
  label: string
  value: string
  order: number
}

export interface Dimension {
  id: string
  name: string
  /** Asked about a single thought: "Is this important to you?" */
  question: string
  /**
   * Asked when weighing two thoughts against each other: "Which one matters
   * more to you?". A single-thought question reads as nonsense on the Compare
   * screen, so the two are kept apart. Optional — `comparativePrompt` falls
   * back to a generated phrasing.
   */
  comparativeQuestion?: string
  description?: string
  kind: DimensionKind
  options?: DimensionOption[]
  min?: number
  max?: number
  step?: number
  lowLabel?: string
  highLabel?: string
  required: boolean
  active: boolean
  builtIn: boolean
  stage: DimensionStage
  order: number
}

export interface ThoughtRelation {
  id: string
  workspaceId: string
  sourceThoughtId: string
  targetThoughtId: string
  type: RelationType
  description?: string
  createdAt: string
}

export interface PairwiseComparison {
  id: string
  workspaceId: string
  dimensionId: string
  leftThoughtId: string
  rightThoughtId: string
  result: 'left' | 'right' | 'tie' | 'skipped'
  createdAt: string
}

export interface Workspace {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  currentStage: WorkspaceStage
}

export type RuleOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'contains'
  | 'isEmpty'
  | 'isNotEmpty'

/**
 * A condition targets either a dimension value (`field: 'dimension'` plus a
 * `dimensionId`) or a structural property of the thought itself.
 */
export interface RuleCondition {
  id: string
  field: 'dimension' | 'type' | 'status' | 'tag' | 'text'
  dimensionId?: string
  operator: RuleOperator
  value?: string | number | boolean | null
}

export type RuleAction =
  | { type: 'addTag'; value: string }
  | { type: 'removeTag'; value: string }
  | { type: 'suggestType'; value: ThoughtType }
  | { type: 'flag'; value: string }
  | { type: 'suggestBreakdown' }
  | { type: 'suggestArchive' }

export interface Rule {
  id: string
  workspaceId: string
  name: string
  enabled: boolean
  match: 'all' | 'any'
  conditions: RuleCondition[]
  actions: RuleAction[]
  builtIn: boolean
  createdAt: string
}

/** A rule match turned into an offer the user may accept, ignore, or dismiss. */
export interface RuleSuggestion {
  /** Deterministic: `${ruleId}:${thoughtId}:${actionIndex}` */
  id: string
  ruleId: string
  ruleName: string
  thoughtId: string
  action: RuleAction
  message: string
  /** True when the action changes data; `flag` suggestions are informational. */
  applicable: boolean
}

/* ---------------------------------------------------------------------------
 * Learning: the bottom-up half of the product.
 *
 * Planning runs Value → Goal → Action. Learning runs the other way:
 * Experience → Observation → Evidence → Belief update → Default rule. These
 * entities are kept apart from Thoughts — a record of what happened is not a
 * thing you intend to do — but every one of them can link to Thoughts.
 * ------------------------------------------------------------------------- */

/**
 * How much weight the user currently puts on something. Shown with plain
 * wording ("Early signal", "Repeated pattern") rather than a number, because a
 * handful of personal observations is not a measurement.
 */
export type ConfidenceLevel = 'veryLow' | 'low' | 'medium' | 'high' | 'veryHigh'

export interface ObservationContext {
  location?: string
  timeOfDay?: string
  sleepQuality?: number
  stressLevel?: number
  physicalState?: string
  socialContext?: string
  tags: string[]
}

/** What happened, recorded before interpreting it. */
export interface Observation {
  id: string
  workspaceId: string
  title?: string
  description: string
  occurredAt: string
  context: ObservationContext
  energyBefore?: number
  energyAfter?: number
  moodBefore?: number
  moodAfter?: number
  relatedThoughtIds: string[]
  /** Set when the user has put the record aside. Kept, never deleted. */
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export type EvidenceStatus = 'emerging' | 'supported' | 'mixed' | 'weakened' | 'retired'

/** What one or more observations may indicate. A reading, not a fact. */
export interface Evidence {
  id: string
  workspaceId: string
  statement: string
  observationIds: string[]
  supportingObservationIds: string[]
  contradictingObservationIds: string[]
  relatedThoughtIds: string[]
  confidence: ConfidenceLevel
  status: EvidenceStatus
  /** Optional. Records when this reading seemed to hold. */
  context?: ObservationContext
  createdAt: string
  updatedAt: string
}

export type HypothesisStatus =
  | 'untested'
  | 'partiallySupported'
  | 'supported'
  | 'contradicted'
  | 'inconclusive'
  | 'retired'

/** Something the user wants to test rather than assume. */
export interface Hypothesis {
  id: string
  workspaceId: string
  statement: string
  relatedValueIds: string[]
  relatedGoalIds: string[]
  evidenceIds: string[]
  /** Optional. Evidence that pushes against the hypothesis. */
  contradictingEvidenceIds?: string[]
  relatedThoughtIds?: string[]
  status: HypothesisStatus
  confidence: ConfidenceLevel
  createdAt: string
  updatedAt: string
}

export type BeliefStatus = 'active' | 'uncertain' | 'replaced' | 'retired'

/** The user's current working model. Revised, never silently overwritten. */
export interface Belief {
  id: string
  workspaceId: string
  statement: string
  description?: string
  confidence: ConfidenceLevel
  status: BeliefStatus
  evidenceIds: string[]
  /** Optional. Evidence that pushes against the belief; never hidden. */
  contradictingEvidenceIds?: string[]
  relatedThoughtIds?: string[]
  previousBeliefId?: string
  replacementBeliefId?: string
  createdAt: string
  updatedAt: string
}

/** One step in the history of a working model. The previous belief is kept. */
export interface BeliefUpdate {
  id: string
  workspaceId: string
  previousBeliefId?: string
  previousStatement?: string
  updatedBeliefId: string
  updatedStatement: string
  reason: string
  supportingEvidenceIds: string[]
  contradictingEvidenceIds: string[]
  confidence: ConfidenceLevel
  createdAt: string
  reviewAt?: string
}

export type PersonalRuleStatus =
  | 'experimental'
  | 'active'
  | 'needsReview'
  | 'retired'
  | 'replaced'

/**
 * A condition on a rule's trigger. Free text by design: the trigger is
 * something the user recognises in themselves, not a query the app evaluates.
 */
export interface PersonalRuleCondition {
  id: string
  description: string
  /** Optional machine-readable hint, e.g. `energy <= 3`. */
  field?: string
  operator?: RuleOperator
  value?: string | number | boolean | null
}

/** A default, not a command. "Try this first", never "you must". */
export interface PersonalDefaultRule {
  id: string
  workspaceId: string
  name: string
  triggerDescription: string
  conditions: PersonalRuleCondition[]
  defaultResponse: string
  exceptionDescription?: string
  relatedValueIds: string[]
  relatedGoalIds: string[]
  evidenceIds: string[]
  contradictingEvidenceIds?: string[]
  relatedThoughtIds?: string[]
  context?: ObservationContext
  confidence: ConfidenceLevel
  status: PersonalRuleStatus
  replacedByRuleId?: string
  lastUsedAt?: string
  createdAt: string
  updatedAt: string
  reviewAt?: string
}

/** Everything a workspace holds about how the user has learned. */
export interface LearningData {
  observations: Observation[]
  evidence: Evidence[]
  hypotheses: Hypothesis[]
  beliefs: Belief[]
  beliefUpdates: BeliefUpdate[]
  personalRules: PersonalDefaultRule[]
}

export interface WorkspaceData extends LearningData {
  workspace: Workspace
  thoughts: Thought[]
  dimensions: Dimension[]
  relations: ThoughtRelation[]
  comparisons: PairwiseComparison[]
  rules: Rule[]
  dismissedSuggestionIds: string[]
}

export interface ExportEnvelope {
  app: 'clarity-map'
  schemaVersion: number
  exportedAt: string
  data: {
    workspaces: WorkspaceData[]
  }
}
