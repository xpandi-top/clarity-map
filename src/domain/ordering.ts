import { BUILTIN_DIMENSION } from './defaults'
import { rankByScore, scoreComparisons } from './comparisons'
import type { PairwiseComparison, Thought } from './types'

export type ThoughtOrder = 'comparison' | 'priority' | 'newest' | 'alphabetical'

export const ORDER_LABEL: Record<ThoughtOrder, string> = {
  comparison: 'Comparison ranking',
  priority: 'Priority',
  newest: 'Newest first',
  alphabetical: 'A to Z',
}

function priorityOf(thought: Thought): number {
  const value = thought.dimensionValues[BUILTIN_DIMENSION.priority]
  return typeof value === 'number' ? value : 0
}

function byPriority(a: Thought, b: Thought): number {
  const difference = priorityOf(b) - priorityOf(a)
  return difference !== 0 ? difference : a.text.localeCompare(b.text)
}

function byNewest(a: Thought, b: Thought): number {
  return b.createdAt.localeCompare(a.createdAt)
}

function byText(a: Thought, b: Thought): number {
  return a.text.localeCompare(b.text)
}

export interface OrderOptions {
  order: ThoughtOrder
  comparisons?: PairwiseComparison[]
  /** Dimension whose comparison history decides the ranking. */
  dimensionId?: string
}

/**
 * Sorts thoughts for display. `comparison` uses the pairwise ranking the user
 * built on the Compare screen; thoughts that have never been compared keep
 * their priority order and sit below the ones that have, so an unfinished
 * comparison round never buries a judged thought.
 */
export function orderThoughts(thoughts: Thought[], options: OrderOptions): Thought[] {
  const list = [...thoughts]

  switch (options.order) {
    case 'priority':
      return list.sort(byPriority)
    case 'newest':
      return list.sort(byNewest)
    case 'alphabetical':
      return list.sort(byText)
    case 'comparison': {
      const { comparisons = [], dimensionId } = options
      if (!dimensionId) return list.sort(byPriority)

      const ids = list.map((thought) => thought.id)
      const scores = scoreComparisons(ids, comparisons, dimensionId)
      const scoreById = new Map(scores.map((entry) => [entry.thoughtId, entry]))
      const rankById = new Map(
        rankByScore(scores.filter((entry) => entry.completed > 0)).map((entry, index) => [
          entry.thoughtId,
          index,
        ]),
      )

      const judged = list.filter((thought) => (scoreById.get(thought.id)?.completed ?? 0) > 0)
      const unjudged = list.filter(
        (thought) => (scoreById.get(thought.id)?.completed ?? 0) === 0,
      )

      judged.sort(
        (a, b) => (rankById.get(a.id) ?? 0) - (rankById.get(b.id) ?? 0),
      )
      unjudged.sort(byPriority)

      return [...judged, ...unjudged]
    }
    default:
      return list
  }
}

/** True when the ranking has anything to say about these thoughts. */
export function hasComparisonData(
  thoughts: Thought[],
  comparisons: PairwiseComparison[],
  dimensionId: string,
): boolean {
  const ids = new Set(thoughts.map((thought) => thought.id))
  return comparisons.some(
    (comparison) =>
      comparison.dimensionId === dimensionId &&
      comparison.result !== 'skipped' &&
      ids.has(comparison.leftThoughtId) &&
      ids.has(comparison.rightThoughtId),
  )
}
