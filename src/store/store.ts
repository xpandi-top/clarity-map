import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SCHEMA_VERSION, STORAGE_KEY } from '../domain/schema'
import { createComparisonSlice } from './comparisonSlice'
import { createDataSlice } from './dataSlice'
import { createDimensionSlice } from './dimensionSlice'
import { createInitialDataState, createInitialUiState } from './initialState'
import { migratePersistedState } from './migrations'
import { createRelationSlice } from './relationSlice'
import { createRuleSlice } from './ruleSlice'
import { createThoughtSlice } from './thoughtSlice'
import { createUiSlice } from './uiSlice'
import { createWorkspaceSlice } from './workspaceSlice'
import type { DataState, StoreState } from './types'

export const useStore = create<StoreState>()(
  persist(
    (...args) => ({
      ...createInitialDataState(),
      ...createInitialUiState(),
      ...createWorkspaceSlice(...args),
      ...createThoughtSlice(...args),
      ...createDimensionSlice(...args),
      ...createRelationSlice(...args),
      ...createComparisonSlice(...args),
      ...createRuleSlice(...args),
      ...createDataSlice(...args),
      ...createUiSlice(...args),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      migrate: (persisted, version) => migratePersistedState(persisted, version),
      // Business data only. Panels, toasts, and undo buffers stay in memory.
      partialize: (state): DataState => ({
        schemaVersion: state.schemaVersion,
        workspaces: state.workspaces,
        currentWorkspaceId: state.currentWorkspaceId,
        thoughts: state.thoughts,
        dimensionsByWorkspace: state.dimensionsByWorkspace,
        relations: state.relations,
        comparisons: state.comparisons,
        rules: state.rules,
        dismissedSuggestionIds: state.dismissedSuggestionIds,
        matrixAxes: state.matrixAxes,
      }),
    },
  ),
)

/** Resets the store to a clean slate. Used by tests. */
export function resetStore(): void {
  useStore.setState({ ...createInitialDataState(), ...createInitialUiState() })
}
