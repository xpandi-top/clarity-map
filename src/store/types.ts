import type { StateCreator } from 'zustand'
import type {
  Dimension,
  DimensionValue,
  ExportEnvelope,
  PairwiseComparison,
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
  DataActions &
  UiActions

export type SliceCreator<T> = StateCreator<StoreState, [], [], T>
