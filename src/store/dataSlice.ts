import { createDefaultDimensions } from '../domain/defaults'
import { reassignIds } from '../domain/importExport'
import type { WorkspaceData } from '../domain/types'
import { createInitialDataState } from './initialState'
import { ingestWorkspace } from './workspaceSlice'
import type { DataActions, SliceCreator, StoreState } from './types'

function collect(state: StoreState, workspaceId: string): WorkspaceData | null {
  const workspace = state.workspaces.find((entry) => entry.id === workspaceId)
  if (!workspace) return null
  return {
    workspace,
    thoughts: state.thoughts.filter((thought) => thought.workspaceId === workspaceId),
    dimensions: state.dimensionsByWorkspace[workspaceId] ?? createDefaultDimensions(),
    relations: state.relations.filter((relation) => relation.workspaceId === workspaceId),
    comparisons: state.comparisons.filter(
      (comparison) => comparison.workspaceId === workspaceId,
    ),
    rules: state.rules.filter((rule) => rule.workspaceId === workspaceId),
    dismissedSuggestionIds: state.dismissedSuggestionIds,
  }
}

export const createDataSlice: SliceCreator<DataActions> = (set, get) => ({
  exportWorkspaceData: (workspaceId) => collect(get(), workspaceId),

  exportAllData: () => {
    const state = get()
    return state.workspaces
      .map((workspace) => collect(state, workspace.id))
      .filter((entry): entry is WorkspaceData => entry !== null)
  },

  /**
   * Adds imported workspaces. In `replace` mode local data is discarded first;
   * in `merge` mode ids that already exist are reassigned so nothing is
   * overwritten. Returns the number of workspaces imported.
   */
  importEnvelope: (envelope, mode) => {
    const incoming = envelope.data.workspaces
    if (incoming.length === 0) return 0

    if (mode === 'replace') {
      set({ ...createInitialDataState(), selectedThoughtId: null, lastDeletion: null })
    }

    for (const entry of incoming) {
      set((state) => {
        const collides = state.workspaces.some(
          (workspace) => workspace.id === entry.workspace.id,
        )
        return ingestWorkspace(state, collides ? reassignIds(entry) : entry)
      })
    }

    return incoming.length
  },
})
