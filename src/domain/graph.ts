import { UPWARD_RELATIONS } from './defaults'
import type { RelationType, ThoughtRelation } from './types'

/**
 * Hierarchical reading of a relation: which end sits higher in the structure.
 * Lateral relations (`conflictsWith`, `relatedTo`) have no direction and
 * return null.
 */
export function hierarchy(
  relation: Pick<ThoughtRelation, 'sourceThoughtId' | 'targetThoughtId' | 'type'>,
): { upper: string; lower: string } | null {
  if (UPWARD_RELATIONS.includes(relation.type)) {
    return { upper: relation.targetThoughtId, lower: relation.sourceThoughtId }
  }
  if (relation.type === 'breaksDownInto') {
    return { upper: relation.sourceThoughtId, lower: relation.targetThoughtId }
  }
  return null
}

export function isLateral(type: RelationType): boolean {
  return type === 'conflictsWith' || type === 'relatedTo'
}

/**
 * Inverse of `hierarchy`: given which thought should sit above the other,
 * work out which way round the relation has to be stored. Used when a
 * connection is drawn on the roadmap canvas.
 */
export function relationEndpoints(
  type: RelationType,
  upperId: string,
  lowerId: string,
): { sourceThoughtId: string; targetThoughtId: string } {
  if (type === 'breaksDownInto' || isLateral(type)) {
    return { sourceThoughtId: upperId, targetThoughtId: lowerId }
  }
  return { sourceThoughtId: lowerId, targetThoughtId: upperId }
}

/** True when an identical relation (same pair, same type) already exists. */
export function isDuplicateRelation(
  relations: ThoughtRelation[],
  candidate: Pick<ThoughtRelation, 'sourceThoughtId' | 'targetThoughtId' | 'type'>,
): boolean {
  return relations.some(
    (relation) =>
      relation.type === candidate.type &&
      relation.sourceThoughtId === candidate.sourceThoughtId &&
      relation.targetThoughtId === candidate.targetThoughtId,
  )
}

/** Drops exact duplicates, keeping the first occurrence. */
export function dedupeRelations(relations: ThoughtRelation[]): ThoughtRelation[] {
  const seen = new Set<string>()
  const result: ThoughtRelation[] = []
  for (const relation of relations) {
    const key = `${relation.sourceThoughtId}>${relation.targetThoughtId}:${relation.type}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(relation)
  }
  return result
}

type Adjacency = Map<string, Set<string>>

function buildAdjacency(relations: ThoughtRelation[]): { up: Adjacency; down: Adjacency } {
  const up: Adjacency = new Map()
  const down: Adjacency = new Map()
  for (const relation of relations) {
    const levels = hierarchy(relation)
    if (!levels) continue
    if (!up.has(levels.lower)) up.set(levels.lower, new Set())
    up.get(levels.lower)!.add(levels.upper)
    if (!down.has(levels.upper)) down.set(levels.upper, new Set())
    down.get(levels.upper)!.add(levels.lower)
  }
  return { up, down }
}

function traverse(adjacency: Adjacency, startId: string, maxDepth = Infinity): string[] {
  const visited = new Set<string>([startId])
  const result: string[] = []
  let frontier = [startId]
  let depth = 0

  while (frontier.length > 0 && depth < maxDepth) {
    const next: string[] = []
    for (const id of frontier) {
      for (const neighbour of adjacency.get(id) ?? []) {
        if (visited.has(neighbour)) continue
        visited.add(neighbour)
        result.push(neighbour)
        next.push(neighbour)
      }
    }
    frontier = next
    depth += 1
  }

  return result
}

/** Thoughts this thought contributes to, walking upward. Excludes the start. */
export function upstreamIds(
  relations: ThoughtRelation[],
  thoughtId: string,
  maxDepth = Infinity,
): string[] {
  return traverse(buildAdjacency(relations).up, thoughtId, maxDepth)
}

/** Thoughts beneath this thought, walking downward. Excludes the start. */
export function downstreamIds(
  relations: ThoughtRelation[],
  thoughtId: string,
  maxDepth = Infinity,
): string[] {
  return traverse(buildAdjacency(relations).down, thoughtId, maxDepth)
}

/**
 * Connected subgraph around a thought: itself, everything above, everything
 * below, plus laterally linked neighbours of any included node.
 */
export function neighbourhoodIds(
  relations: ThoughtRelation[],
  thoughtId: string,
  options: { direction?: 'both' | 'up' | 'down'; maxDepth?: number; includeLateral?: boolean } = {},
): string[] {
  const { direction = 'both', maxDepth = Infinity, includeLateral = true } = options
  const ids = new Set<string>([thoughtId])

  if (direction !== 'down') {
    for (const id of upstreamIds(relations, thoughtId, maxDepth)) ids.add(id)
  }
  if (direction !== 'up') {
    for (const id of downstreamIds(relations, thoughtId, maxDepth)) ids.add(id)
  }

  if (includeLateral) {
    for (const relation of relations) {
      if (!isLateral(relation.type)) continue
      if (ids.has(relation.sourceThoughtId)) ids.add(relation.targetThoughtId)
      else if (ids.has(relation.targetThoughtId)) ids.add(relation.sourceThoughtId)
    }
  }

  return [...ids]
}

/**
 * Cycles in the hierarchical edges. Reported as a warning rather than blocked,
 * because a graph of goals is legitimately not a tree.
 */
export function findCycles(relations: ThoughtRelation[]): string[][] {
  const { down } = buildAdjacency(relations)
  const cycles: string[][] = []
  const state = new Map<string, 'visiting' | 'done'>()
  const stack: string[] = []

  const visit = (id: string) => {
    const current = state.get(id)
    if (current === 'done') return
    if (current === 'visiting') {
      const start = stack.indexOf(id)
      if (start !== -1) cycles.push([...stack.slice(start), id])
      return
    }
    state.set(id, 'visiting')
    stack.push(id)
    for (const child of down.get(id) ?? []) visit(child)
    stack.pop()
    state.set(id, 'done')
  }

  const nodes = new Set<string>()
  for (const relation of relations) {
    const levels = hierarchy(relation)
    if (!levels) continue
    nodes.add(levels.upper)
    nodes.add(levels.lower)
  }
  for (const id of [...nodes].sort()) visit(id)

  return cycles
}

/**
 * Would adding this relation introduce a hierarchical cycle? Used to warn
 * during relation creation without blocking it.
 */
export function wouldCreateCycle(
  relations: ThoughtRelation[],
  candidate: Pick<ThoughtRelation, 'sourceThoughtId' | 'targetThoughtId' | 'type'>,
): boolean {
  const levels = hierarchy(candidate)
  if (!levels) return false
  if (levels.upper === levels.lower) return true
  // A cycle appears when the new "upper" is already beneath the new "lower".
  return downstreamIds(relations, levels.lower).includes(levels.upper)
}
