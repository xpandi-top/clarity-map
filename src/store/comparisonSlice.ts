import { createId, nowIso } from '../domain/ids'
import type { PairwiseComparison } from '../domain/types'
import type { ComparisonActions, SliceCreator } from './types'

export const createComparisonSlice: SliceCreator<ComparisonActions> = (set, get) => ({
  recordComparison: (dimensionId, leftThoughtId, rightThoughtId, result) => {
    const workspaceId = get().currentWorkspaceId
    if (!workspaceId) return
    const comparison: PairwiseComparison = {
      id: createId('cmp'),
      workspaceId,
      dimensionId,
      leftThoughtId,
      rightThoughtId,
      result,
      createdAt: nowIso(),
    }
    set((state) => ({ comparisons: [...state.comparisons, comparison] }))
  },

  clearComparisons: (dimensionId) => {
    const workspaceId = get().currentWorkspaceId
    if (!workspaceId) return
    set((state) => ({
      comparisons: state.comparisons.filter(
        (comparison) =>
          comparison.workspaceId !== workspaceId || comparison.dimensionId !== dimensionId,
      ),
    }))
  },
})
