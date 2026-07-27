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

export interface WorkspaceData {
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
