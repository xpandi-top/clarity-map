import { BUILTIN_DIMENSION } from '../domain/defaults'
import { createId, nowIso } from '../domain/ids'
import type { Thought } from '../domain/types'
import type { SliceCreator, StoreState, ThoughtActions } from './types'

function replaceThought(
  state: StoreState,
  thoughtId: string,
  update: (thought: Thought) => Thought,
): Partial<StoreState> {
  return {
    thoughts: state.thoughts.map((thought) =>
      thought.id === thoughtId ? { ...update(thought), updatedAt: nowIso() } : thought,
    ),
  }
}

export const createThoughtSlice: SliceCreator<ThoughtActions> = (set, get) => ({
  addThought: (text) => {
    const trimmed = text.trim()
    const workspaceId = get().currentWorkspaceId
    if (!trimmed || !workspaceId) return null
    const timestamp = nowIso()
    const thought: Thought = {
      id: createId('th'),
      workspaceId,
      text: trimmed,
      description: '',
      type: 'unclassified',
      dimensionValues: {},
      tags: [],
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    set((state) => ({ thoughts: [...state.thoughts, thought] }))
    return thought.id
  },

  updateThought: (thoughtId, patch) => {
    set((state) =>
      replaceThought(state, thoughtId, (thought) => ({
        ...thought,
        ...patch,
        text: patch.text !== undefined ? patch.text.trim() || thought.text : thought.text,
      })),
    )
  },

  deleteThought: (thoughtId) => {
    const state = get()
    const thought = state.thoughts.find((entry) => entry.id === thoughtId)
    if (!thought) return
    const relations = state.relations.filter(
      (relation) =>
        relation.sourceThoughtId === thoughtId || relation.targetThoughtId === thoughtId,
    )
    const comparisons = state.comparisons.filter(
      (comparison) =>
        comparison.leftThoughtId === thoughtId || comparison.rightThoughtId === thoughtId,
    )
    set({
      thoughts: state.thoughts.filter((entry) => entry.id !== thoughtId),
      relations: state.relations.filter((relation) => !relations.includes(relation)),
      comparisons: state.comparisons.filter((comparison) => !comparisons.includes(comparison)),
      lastDeletion: { thought, relations, comparisons },
      selectedThoughtId: state.selectedThoughtId === thoughtId ? null : state.selectedThoughtId,
    })
  },

  undoDelete: () => {
    const record = get().lastDeletion
    if (!record) return
    set((state) => ({
      thoughts: [...state.thoughts, record.thought],
      relations: [...state.relations, ...record.relations],
      comparisons: [...state.comparisons, ...record.comparisons],
      lastDeletion: null,
    }))
  },

  duplicateThought: (thoughtId) => {
    const source = get().thoughts.find((thought) => thought.id === thoughtId)
    if (!source) return null
    const timestamp = nowIso()
    const copy: Thought = {
      ...source,
      id: createId('th'),
      text: `${source.text} (copy)`,
      dimensionValues: { ...source.dimensionValues },
      tags: [...source.tags],
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    set((state) => ({ thoughts: [...state.thoughts, copy] }))
    return copy.id
  },

  setThoughtType: (thoughtId, type) => {
    set((state) => replaceThought(state, thoughtId, (thought) => ({ ...thought, type })))
  },

  setThoughtStatus: (thoughtId, status) => {
    set((state) => replaceThought(state, thoughtId, (thought) => ({ ...thought, status })))
  },

  setDimensionValue: (thoughtId, dimensionId, value) => {
    // The thought-type dimension mirrors `thought.type`, so route it there.
    if (dimensionId === BUILTIN_DIMENSION.thoughtType) {
      if (typeof value === 'string') get().setThoughtType(thoughtId, value as Thought['type'])
      return
    }
    set((state) =>
      replaceThought(state, thoughtId, (thought) => {
        const dimensionValues = { ...thought.dimensionValues }
        if (value === null) delete dimensionValues[dimensionId]
        else dimensionValues[dimensionId] = value
        return { ...thought, dimensionValues }
      }),
    )
  },

  addTag: (thoughtId, tag) => {
    const trimmed = tag.trim()
    if (!trimmed) return
    set((state) =>
      replaceThought(state, thoughtId, (thought) =>
        thought.tags.includes(trimmed)
          ? thought
          : { ...thought, tags: [...thought.tags, trimmed] },
      ),
    )
  },

  removeTag: (thoughtId, tag) => {
    set((state) =>
      replaceThought(state, thoughtId, (thought) => ({
        ...thought,
        tags: thought.tags.filter((entry) => entry !== tag),
      })),
    )
  },
})
