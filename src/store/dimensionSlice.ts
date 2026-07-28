import { createId } from '../domain/ids'
import type { Dimension } from '../domain/types'
import type { DimensionActions, SliceCreator, StoreState } from './types'
import { tx } from '../i18n/core'

function withDimensions(
  state: StoreState,
  update: (dimensions: Dimension[]) => Dimension[],
): Partial<StoreState> {
  const workspaceId = state.currentWorkspaceId
  if (!workspaceId) return {}
  const current = state.dimensionsByWorkspace[workspaceId] ?? []
  return {
    dimensionsByWorkspace: {
      ...state.dimensionsByWorkspace,
      [workspaceId]: update(current).map((dimension, index) => ({ ...dimension, order: index })),
    },
  }
}

export const createDimensionSlice: SliceCreator<DimensionActions> = (set, get) => ({
  addDimension: (dimension) => {
    const workspaceId = get().currentWorkspaceId
    if (!workspaceId) return null
    const id = createId('dim')
    set((state) =>
      withDimensions(state, (dimensions) => [
        ...dimensions,
        { ...dimension, id, builtIn: false, order: dimensions.length },
      ]),
    )
    return id
  },

  updateDimension: (dimensionId, patch) => {
    set((state) =>
      withDimensions(state, (dimensions) =>
        dimensions.map((dimension) =>
          dimension.id === dimensionId
            ? { ...dimension, ...patch, id: dimension.id, builtIn: dimension.builtIn }
            : dimension,
        ),
      ),
    )
  },

  duplicateDimension: (dimensionId) => {
    set((state) =>
      withDimensions(state, (dimensions) => {
        const source = dimensions.find((dimension) => dimension.id === dimensionId)
        if (!source) return dimensions
        return [
          ...dimensions,
          {
            ...source,
            id: createId('dim'),
            name: tx('{name} (copy)', '{name}（副本）', { name: source.name }),
            builtIn: false,
            options: source.options?.map((option) => ({ ...option, id: createId('opt') })),
          },
        ]
      }),
    )
  },

  deleteDimension: (dimensionId) => {
    set((state) =>
      withDimensions(state, (dimensions) =>
        // Built-in dimensions can be disabled but never permanently removed.
        dimensions.filter(
          (dimension) => dimension.id !== dimensionId || dimension.builtIn,
        ),
      ),
    )
  },

  moveDimension: (dimensionId, direction) => {
    set((state) =>
      withDimensions(state, (dimensions) => {
        const index = dimensions.findIndex((dimension) => dimension.id === dimensionId)
        const target = index + direction
        if (index === -1 || target < 0 || target >= dimensions.length) return dimensions
        const next = [...dimensions]
        const [moved] = next.splice(index, 1)
        next.splice(target, 0, moved)
        return next
      }),
    )
  },
})
