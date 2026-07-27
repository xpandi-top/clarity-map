import { scoreComparisons } from './comparisons'
import type { Dimension, DimensionValue, PairwiseComparison, Thought } from './types'

/** Ranking axes are synthetic dimensions, keyed off the one they rank. */
export const RANK_AXIS_PREFIX = 'rank:'

export function isRankAxis(dimensionId: string): boolean {
  return dimensionId.startsWith(RANK_AXIS_PREFIX)
}

export function rankedDimensionId(axisId: string): string {
  return axisId.slice(RANK_AXIS_PREFIX.length)
}

/**
 * A 0–100 axis fed by the pairwise ranking rather than by an answer stored on
 * the thought. It lets the matrix place thoughts from comparisons alone, with
 * no want/should or important/not-important question answered first.
 */
export function createRankAxis(source: Dimension): Dimension {
  return {
    id: `${RANK_AXIS_PREFIX}${source.id}`,
    name: `${source.name} (ranking)`,
    question: `Where does this sit when compared on ${source.name.toLowerCase()}?`,
    description: 'Comes from the comparisons you have made, not from an answer you typed.',
    kind: 'scale',
    min: 0,
    max: 100,
    step: 1,
    lowLabel: 'Ranked lower',
    highLabel: 'Ranked higher',
    required: false,
    active: true,
    builtIn: false,
    stage: 'optional',
    order: source.order + 1000,
  }
}

/** Every ranking axis available for a set of dimensions. */
export function createRankAxes(dimensions: Dimension[], excludeIds: string[] = []): Dimension[] {
  return dimensions
    .filter((dimension) => !excludeIds.includes(dimension.id) && !isRankAxis(dimension.id))
    .map(createRankAxis)
}

/**
 * Score per thought for one ranking axis. Thoughts that have not been compared
 * have no position, so they stay in the unplaced list instead of piling up at
 * zero as if they had lost.
 */
export function rankScores(
  thoughts: Thought[],
  comparisons: PairwiseComparison[],
  dimensionId: string,
): Map<string, number | null> {
  const ids = thoughts.map((thought) => thought.id)
  const scores = scoreComparisons(ids, comparisons, dimensionId)
  return new Map(
    scores.map((entry) => [entry.thoughtId, entry.completed > 0 ? entry.score : null]),
  )
}

/**
 * Reads a dimension off a thought, falling back to the ranking tables for
 * synthetic ranking axes.
 */
export function createRankAwareResolver(
  base: (thought: Thought, dimension: Dimension) => DimensionValue,
  rankTables: Map<string, Map<string, number | null>>,
): (thought: Thought, dimension: Dimension) => DimensionValue {
  return (thought, dimension) => {
    if (!isRankAxis(dimension.id)) return base(thought, dimension)
    return rankTables.get(dimension.id)?.get(thought.id) ?? null
  }
}
