import { createId } from '../domain/ids'
import type { SliceCreator, UiActions } from './types'

export const createUiSlice: SliceCreator<UiActions> = (set, get) => ({
  selectThought: (thoughtId) => set({ selectedThoughtId: thoughtId }),

  showToast: (message) => set({ toast: { id: createId('toast'), message } }),

  dismissToast: () => set({ toast: null }),

  setMatrixAxes: (axes) => {
    const workspaceId = get().currentWorkspaceId
    if (!workspaceId) return
    set((state) => ({ matrixAxes: { ...state.matrixAxes, [workspaceId]: axes } }))
  },
})
