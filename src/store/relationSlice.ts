import { createId, nowIso } from '../domain/ids'
import { isDuplicateRelation, wouldCreateCycle } from '../domain/graph'
import type { ThoughtRelation } from '../domain/types'
import type { RelationActions, SliceCreator } from './types'

export const createRelationSlice: SliceCreator<RelationActions> = (set, get) => ({
  addRelation: (sourceThoughtId, type, targetThoughtId, description) => {
    const state = get()
    const workspaceId = state.currentWorkspaceId
    if (!workspaceId) return { ok: false, reason: 'No workspace is open.' }
    if (sourceThoughtId === targetThoughtId) {
      return { ok: false, reason: 'A thought cannot relate to itself.' }
    }
    const scoped = state.relations.filter((relation) => relation.workspaceId === workspaceId)
    const candidate = { sourceThoughtId, targetThoughtId, type }
    if (isDuplicateRelation(scoped, candidate)) {
      return { ok: false, reason: 'That relationship already exists.' }
    }

    const relation: ThoughtRelation = {
      id: createId('rel'),
      workspaceId,
      sourceThoughtId,
      targetThoughtId,
      type,
      description,
      createdAt: nowIso(),
    }
    const warning = wouldCreateCycle(scoped, candidate)
      ? 'This creates a loop in the structure. That can be intentional, so it has been kept.'
      : undefined

    set((current) => ({ relations: [...current.relations, relation] }))
    return { ok: true, warning }
  },

  deleteRelation: (relationId) => {
    set((state) => ({
      relations: state.relations.filter((relation) => relation.id !== relationId),
    }))
  },
})
