import {
  BUILTIN_DIMENSION,
  createDefaultDimensions,
  createDefaultRules,
  createWorkspace,
} from '../domain/defaults'
import { createExampleWorkspace } from '../domain/example'
import { createId, nowIso } from '../domain/ids'
import { reassignIds } from '../domain/importExport'
import type { WorkspaceData } from '../domain/types'
import { createInitialDataState } from './initialState'
import type { SliceCreator, StoreState, WorkspaceActions } from './types'

/** Adds a fully-formed workspace to the store and makes it current. */
export function ingestWorkspace(state: StoreState, entry: WorkspaceData): Partial<StoreState> {
  return {
    workspaces: [...state.workspaces, entry.workspace],
    currentWorkspaceId: entry.workspace.id,
    thoughts: [...state.thoughts, ...entry.thoughts],
    dimensionsByWorkspace: {
      ...state.dimensionsByWorkspace,
      [entry.workspace.id]: entry.dimensions,
    },
    relations: [...state.relations, ...entry.relations],
    comparisons: [...state.comparisons, ...entry.comparisons],
    rules: [...state.rules, ...entry.rules],
    matrixAxes: {
      ...state.matrixAxes,
      [entry.workspace.id]: {
        x: BUILTIN_DIMENSION.motivation,
        y: BUILTIN_DIMENSION.importance,
      },
    },
  }
}

export const createWorkspaceSlice: SliceCreator<WorkspaceActions> = (set, get) => ({
  startWorkspace: (name) => {
    const workspace = createWorkspace(name?.trim() || 'My thoughts')
    set((state) =>
      ingestWorkspace(state, {
        workspace,
        thoughts: [],
        dimensions: createDefaultDimensions(),
        relations: [],
        comparisons: [],
        rules: createDefaultRules(workspace.id),
        dismissedSuggestionIds: [],
      }),
    )
    return workspace.id
  },

  loadExampleWorkspace: () => {
    const entry = createExampleWorkspace()
    set((state) => ingestWorkspace(state, entry))
    return entry.workspace.id
  },

  setCurrentWorkspace: (workspaceId) => {
    if (!get().workspaces.some((workspace) => workspace.id === workspaceId)) return
    set({ currentWorkspaceId: workspaceId, selectedThoughtId: null })
  },

  renameWorkspace: (workspaceId, name) => {
    set((state) => ({
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === workspaceId
          ? { ...workspace, name: name.trim() || workspace.name, updatedAt: nowIso() }
          : workspace,
      ),
    }))
  },

  duplicateWorkspace: (workspaceId) => {
    const state = get()
    const source = state.workspaces.find((workspace) => workspace.id === workspaceId)
    if (!source) return null
    const copy = reassignIds({
      workspace: { ...source, name: `${source.name} (copy)`, createdAt: nowIso(), updatedAt: nowIso() },
      thoughts: state.thoughts.filter((thought) => thought.workspaceId === workspaceId),
      dimensions: state.dimensionsByWorkspace[workspaceId] ?? createDefaultDimensions(),
      relations: state.relations.filter((relation) => relation.workspaceId === workspaceId),
      comparisons: state.comparisons.filter(
        (comparison) => comparison.workspaceId === workspaceId,
      ),
      rules: state.rules.filter((rule) => rule.workspaceId === workspaceId),
      dismissedSuggestionIds: [],
    })
    copy.rules = copy.rules.map((rule) => ({ ...rule, id: createId('rule') }))
    set((current) => ingestWorkspace(current, copy))
    return copy.workspace.id
  },

  clearWorkspace: (workspaceId) => {
    set((state) => ({
      thoughts: state.thoughts.filter((thought) => thought.workspaceId !== workspaceId),
      relations: state.relations.filter((relation) => relation.workspaceId !== workspaceId),
      comparisons: state.comparisons.filter(
        (comparison) => comparison.workspaceId !== workspaceId,
      ),
      selectedThoughtId: null,
      lastDeletion: null,
    }))
  },

  deleteWorkspace: (workspaceId) => {
    set((state) => {
      const workspaces = state.workspaces.filter((workspace) => workspace.id !== workspaceId)
      const dimensionsByWorkspace = { ...state.dimensionsByWorkspace }
      delete dimensionsByWorkspace[workspaceId]
      const matrixAxes = { ...state.matrixAxes }
      delete matrixAxes[workspaceId]
      return {
        workspaces,
        dimensionsByWorkspace,
        matrixAxes,
        thoughts: state.thoughts.filter((thought) => thought.workspaceId !== workspaceId),
        relations: state.relations.filter((relation) => relation.workspaceId !== workspaceId),
        comparisons: state.comparisons.filter(
          (comparison) => comparison.workspaceId !== workspaceId,
        ),
        rules: state.rules.filter((rule) => rule.workspaceId !== workspaceId),
        currentWorkspaceId:
          state.currentWorkspaceId === workspaceId
            ? (workspaces[0]?.id ?? null)
            : state.currentWorkspaceId,
        selectedThoughtId: null,
        lastDeletion: null,
      }
    })
  },

  clearAllData: () => {
    set({ ...createInitialDataState(), selectedThoughtId: null, lastDeletion: null })
  },

  setStage: (stage) => {
    const workspaceId = get().currentWorkspaceId
    if (!workspaceId) return
    set((state) => ({
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === workspaceId
          ? { ...workspace, currentStage: stage, updatedAt: nowIso() }
          : workspace,
      ),
    }))
  },
})
