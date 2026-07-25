import { createId, nowIso } from '../domain/ids'
import type { Thought, ThoughtRelation } from '../domain/types'

export function makeThought(overrides: Partial<Thought> = {}): Thought {
  const timestamp = nowIso()
  return {
    id: createId('th'),
    workspaceId: 'ws_test',
    text: 'A thought',
    description: '',
    type: 'unclassified',
    dimensionValues: {},
    tags: [],
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  }
}

export function makeRelation(
  sourceThoughtId: string,
  type: ThoughtRelation['type'],
  targetThoughtId: string,
): ThoughtRelation {
  return {
    id: createId('rel'),
    workspaceId: 'ws_test',
    sourceThoughtId,
    targetThoughtId,
    type,
    createdAt: nowIso(),
  }
}
