import type { StateCreator } from 'zustand'
import type {
  Belief,
  BeliefUpdate,
  ConfidenceLevel,
  Dimension,
  DimensionValue,
  Evidence,
  ExportEnvelope,
  Hypothesis,
  Observation,
  PairwiseComparison,
  PersonalDefaultRule,
  Rule,
  RuleSuggestion,
  Thought,
  ThoughtRelation,
  ThoughtStatus,
  ThoughtType,
  Workspace,
  WorkspaceData,
} from '../domain/types'

export interface MatrixAxes {
  x: string
  y: string
}

/** Everything written to localStorage. */
export interface DataState {
  schemaVersion: number
  workspaces: Workspace[]
  currentWorkspaceId: string | null
  thoughts: Thought[]
  dimensionsByWorkspace: Record<string, Dimension[]>
  relations: ThoughtRelation[]
  comparisons: PairwiseComparison[]
  rules: Rule[]
  dismissedSuggestionIds: string[]
  matrixAxes: Record<string, MatrixAxes>
  observations: Observation[]
  evidence: Evidence[]
  hypotheses: Hypothesis[]
  beliefs: Belief[]
  beliefUpdates: BeliefUpdate[]
  personalRules: PersonalDefaultRule[]
}

/** Snapshot kept so the most recent deletion can be undone. */
export interface DeletionRecord {
  thought: Thought
  relations: ThoughtRelation[]
  comparisons: PairwiseComparison[]
}

/** Session-only. Never persisted. */
export interface UiState {
  selectedThoughtId: string | null
  toast: { id: string; message: string } | null
  lastDeletion: DeletionRecord | null
}

export interface WorkspaceActions {
  startWorkspace: (name?: string) => string
  loadExampleWorkspace: () => string
  setCurrentWorkspace: (workspaceId: string) => void
  renameWorkspace: (workspaceId: string, name: string) => void
  duplicateWorkspace: (workspaceId: string) => string | null
  clearWorkspace: (workspaceId: string) => void
  deleteWorkspace: (workspaceId: string) => void
  clearAllData: () => void
  setStage: (stage: Workspace['currentStage']) => void
}

export interface ThoughtActions {
  addThought: (text: string) => string | null
  updateThought: (
    thoughtId: string,
    patch: Partial<Pick<Thought, 'text' | 'description' | 'type' | 'tags' | 'status' | 'estimatedMinutes'>>,
  ) => void
  deleteThought: (thoughtId: string) => void
  undoDelete: () => void
  duplicateThought: (thoughtId: string) => string | null
  setThoughtType: (thoughtId: string, type: ThoughtType) => void
  setThoughtStatus: (thoughtId: string, status: ThoughtStatus) => void
  setDimensionValue: (thoughtId: string, dimensionId: string, value: DimensionValue) => void
  addTag: (thoughtId: string, tag: string) => void
  removeTag: (thoughtId: string, tag: string) => void
}

export interface DimensionActions {
  addDimension: (dimension: Omit<Dimension, 'id' | 'builtIn' | 'order'>) => string | null
  updateDimension: (dimensionId: string, patch: Partial<Dimension>) => void
  duplicateDimension: (dimensionId: string) => void
  deleteDimension: (dimensionId: string) => void
  moveDimension: (dimensionId: string, direction: -1 | 1) => void
}

export interface RelationActions {
  /** Returns null when the relation is a duplicate or otherwise invalid. */
  addRelation: (
    sourceThoughtId: string,
    type: ThoughtRelation['type'],
    targetThoughtId: string,
    description?: string,
  ) => { ok: boolean; reason?: string; warning?: string }
  deleteRelation: (relationId: string) => void
}

export interface ComparisonActions {
  recordComparison: (
    dimensionId: string,
    leftThoughtId: string,
    rightThoughtId: string,
    result: PairwiseComparison['result'],
  ) => void
  clearComparisons: (dimensionId: string) => void
}

export interface RuleActions {
  addRule: (rule: Omit<Rule, 'id' | 'workspaceId' | 'createdAt' | 'builtIn'>) => string | null
  updateRule: (ruleId: string, patch: Partial<Rule>) => void
  deleteRule: (ruleId: string) => void
  dismissSuggestion: (suggestionId: string) => void
  restoreDismissedSuggestions: () => void
  acceptSuggestion: (suggestion: RuleSuggestion) => void
}

/** What a belief revision needs. The previous belief is kept, never edited. */
export interface BeliefUpdateInput {
  previousBeliefId?: string
  updatedStatement: string
  reason: string
  supportingEvidenceIds?: string[]
  contradictingEvidenceIds?: string[]
  confidence?: ConfidenceLevel
  relatedThoughtIds?: string[]
  reviewAt?: string
}

export interface LearningActions {
  addObservation: (input: Partial<Observation> & { description: string }) => string | null
  updateObservation: (observationId: string, patch: Partial<Observation>) => void
  deleteObservation: (observationId: string) => void

  addEvidence: (input: Partial<Evidence> & { statement: string }) => string | null
  updateEvidence: (evidenceId: string, patch: Partial<Evidence>) => void
  deleteEvidence: (evidenceId: string) => void

  addHypothesis: (input: Partial<Hypothesis> & { statement: string }) => string | null
  updateHypothesis: (hypothesisId: string, patch: Partial<Hypothesis>) => void
  deleteHypothesis: (hypothesisId: string) => void

  addBelief: (input: Partial<Belief> & { statement: string }) => string | null
  updateBelief: (beliefId: string, patch: Partial<Belief>) => void
  deleteBelief: (beliefId: string) => void

  /**
   * Writes a revision: creates the updated belief, marks the previous one
   * replaced without deleting it, and records why. Returns the new belief id.
   */
  recordBeliefUpdate: (input: BeliefUpdateInput) => string | null

  addPersonalRule: (
    input: Partial<PersonalDefaultRule> & { name: string; defaultResponse: string },
  ) => string | null
  updatePersonalRule: (ruleId: string, patch: Partial<PersonalDefaultRule>) => void
  /** Keeps the original and links it to its successor. */
  replacePersonalRule: (
    ruleId: string,
    input: Partial<PersonalDefaultRule> & { name: string; defaultResponse: string },
  ) => string | null
  deletePersonalRule: (ruleId: string) => void
}

export interface DataActions {
  exportWorkspaceData: (workspaceId: string) => WorkspaceData | null
  exportAllData: () => WorkspaceData[]
  importEnvelope: (envelope: ExportEnvelope, mode: 'merge' | 'replace') => number
}

export interface UiActions {
  selectThought: (thoughtId: string | null) => void
  showToast: (message: string) => void
  dismissToast: () => void
  setMatrixAxes: (axes: MatrixAxes) => void
}

export type StoreState = DataState &
  UiState &
  WorkspaceActions &
  ThoughtActions &
  DimensionActions &
  RelationActions &
  ComparisonActions &
  RuleActions &
  LearningActions &
  DataActions &
  UiActions

export type SliceCreator<T> = StateCreator<StoreState, [], [], T>
