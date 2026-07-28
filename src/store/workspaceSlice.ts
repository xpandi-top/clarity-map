import {
  BUILTIN_DIMENSION,
  createDefaultDimensions,
  createDefaultRules,
  createWorkspace,
} from '../domain/defaults'
import { createExampleWorkspace } from '../domain/example'
import { createId, nowIso } from '../domain/ids'
import { emptyLearningData } from '../domain/learning'
import { reassignIds } from '../domain/importExport'
import type { WorkspaceData } from '../domain/types'
import { createInitialDataState } from './initialState'
import type { SliceCreator, StoreState, WorkspaceActions } from './types'
import { tx } from '../i18n/core'

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
    observations: [...state.observations, ...entry.observations],
    evidence: [...state.evidence, ...entry.evidence],
    hypotheses: [...state.hypotheses, ...entry.hypotheses],
    beliefs: [...state.beliefs, ...entry.beliefs],
    beliefUpdates: [...state.beliefUpdates, ...entry.beliefUpdates],
    personalRules: [...state.personalRules, ...entry.personalRules],
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
        ...emptyLearningData(),
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
      workspace: {
        ...source,
        name: tx('{name} (copy)', '{name}（副本）', { name: source.name }),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      thoughts: state.thoughts.filter((thought) => thought.workspaceId === workspaceId),
      dimensions: state.dimensionsByWorkspace[workspaceId] ?? createDefaultDimensions(),
      relations: state.relations.filter((relation) => relation.workspaceId === workspaceId),
      comparisons: state.comparisons.filter(
        (comparison) => comparison.workspaceId === workspaceId,
      ),
      rules: state.rules.filter((rule) => rule.workspaceId === workspaceId),
      dismissedSuggestionIds: [],
      observations: state.observations.filter(
        (observation) => observation.workspaceId === workspaceId,
      ),
      evidence: state.evidence.filter((entry) => entry.workspaceId === workspaceId),
      hypotheses: state.hypotheses.filter(
        (hypothesis) => hypothesis.workspaceId === workspaceId,
      ),
      beliefs: state.beliefs.filter((belief) => belief.workspaceId === workspaceId),
      beliefUpdates: state.beliefUpdates.filter(
        (update) => update.workspaceId === workspaceId,
      ),
      personalRules: state.personalRules.filter((rule) => rule.workspaceId === workspaceId),
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
      // Learning records point at thoughts, so they go with them rather than
      // being left behind referring to nothing.
      observations: state.observations.filter(
        (observation) => observation.workspaceId !== workspaceId,
      ),
      evidence: state.evidence.filter((entry) => entry.workspaceId !== workspaceId),
      hypotheses: state.hypotheses.filter(
        (hypothesis) => hypothesis.workspaceId !== workspaceId,
      ),
      beliefs: state.beliefs.filter((belief) => belief.workspaceId !== workspaceId),
      beliefUpdates: state.beliefUpdates.filter(
        (update) => update.workspaceId !== workspaceId,
      ),
      personalRules: state.personalRules.filter((rule) => rule.workspaceId !== workspaceId),
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
        observations: state.observations.filter(
          (observation) => observation.workspaceId !== workspaceId,
        ),
        evidence: state.evidence.filter((entry) => entry.workspaceId !== workspaceId),
        hypotheses: state.hypotheses.filter(
          (hypothesis) => hypothesis.workspaceId !== workspaceId,
        ),
        beliefs: state.beliefs.filter((belief) => belief.workspaceId !== workspaceId),
        beliefUpdates: state.beliefUpdates.filter(
          (update) => update.workspaceId !== workspaceId,
        ),
        personalRules: state.personalRules.filter((rule) => rule.workspaceId !== workspaceId),
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
