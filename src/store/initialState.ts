import { SCHEMA_VERSION } from '../domain/schema'
import type { DataState, UiState } from './types'

export function createInitialDataState(): DataState {
  return {
    schemaVersion: SCHEMA_VERSION,
    workspaces: [],
    currentWorkspaceId: null,
    thoughts: [],
    dimensionsByWorkspace: {},
    relations: [],
    comparisons: [],
    rules: [],
    dismissedSuggestionIds: [],
    matrixAxes: {},
    observations: [],
    evidence: [],
    hypotheses: [],
    beliefs: [],
    beliefUpdates: [],
    personalRules: [],
  }
}

export function createInitialUiState(): UiState {
  return {
    selectedThoughtId: null,
    toast: null,
    lastDeletion: null,
  }
}
