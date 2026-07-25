import type { PairwiseComparison } from './types'

export type ComparisonMode = 'quick' | 'complete' | 'manual'

/** Comparisons each thought takes part in during quick mode. */
export const QUICK_MODE_ROUNDS = 3

export interface ComparisonScore {
  thoughtId: string
  wins: number
  losses: number
  ties: number
  /** Comparisons that produced a result; skipped rounds are excluded. */
  completed: number
  /** 0-100. */
  score: number
}

/** Order-independent key for a pair of thoughts. */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Per-thought tally. Skipped comparisons are ignored entirely so they never
 * move a ranking.
 */
export function scoreComparisons(
  thoughtIds: string[],
  comparisons: PairwiseComparison[],
  dimensionId: string,
): ComparisonScore[] {
  const table = new Map<string, ComparisonScore>()
  for (const id of thoughtIds) {
    table.set(id, { thoughtId: id, wins: 0, losses: 0, ties: 0, completed: 0, score: 0 })
  }

  for (const comparison of comparisons) {
    if (comparison.dimensionId !== dimensionId) continue
    if (comparison.result === 'skipped') continue
    const left = table.get(comparison.leftThoughtId)
    const right = table.get(comparison.rightThoughtId)
    if (!left || !right) continue

    left.completed += 1
    right.completed += 1

    if (comparison.result === 'left') {
      left.wins += 1
      right.losses += 1
    } else if (comparison.result === 'right') {
      right.wins += 1
      left.losses += 1
    } else {
      left.ties += 1
      right.ties += 1
    }
  }

  for (const entry of table.values()) {
    entry.score = Math.round(
      ((entry.wins + entry.ties * 0.5) / Math.max(1, entry.completed)) * 100,
    )
  }

  return [...table.values()]
}

/** Highest score first, then most comparisons completed, then id for stability. */
export function rankByScore(scores: ComparisonScore[]): ComparisonScore[] {
  return [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.completed !== a.completed) return b.completed - a.completed
    return a.thoughtId.localeCompare(b.thoughtId)
  })
}

/** Every unique unordered pair, in deterministic order. */
export function allPairs(thoughtIds: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < thoughtIds.length; i += 1) {
    for (let j = i + 1; j < thoughtIds.length; j += 1) {
      pairs.push([thoughtIds[i], thoughtIds[j]])
    }
  }
  return pairs
}

/**
 * Pairs still to compare for a mode. Quick mode stops once every thought has
 * taken part in `QUICK_MODE_ROUNDS` recorded comparisons.
 */
export function remainingPairs(
  thoughtIds: string[],
  comparisons: PairwiseComparison[],
  dimensionId: string,
  mode: ComparisonMode,
): Array<[string, string]> {
  const seen = new Set<string>()
  const participation = new Map<string, number>()
  for (const id of thoughtIds) participation.set(id, 0)

  for (const comparison of comparisons) {
    if (comparison.dimensionId !== dimensionId) continue
    seen.add(pairKey(comparison.leftThoughtId, comparison.rightThoughtId))
    if (comparison.result === 'skipped') continue
    for (const id of [comparison.leftThoughtId, comparison.rightThoughtId]) {
      if (participation.has(id)) participation.set(id, (participation.get(id) ?? 0) + 1)
    }
  }

  const open = allPairs(thoughtIds).filter(([a, b]) => !seen.has(pairKey(a, b)))
  if (mode === 'complete' || mode === 'manual') return open

  return open.filter(
    ([a, b]) =>
      (participation.get(a) ?? 0) < QUICK_MODE_ROUNDS ||
      (participation.get(b) ?? 0) < QUICK_MODE_ROUNDS,
  )
}

/** Next pair to show, or null when the selected mode is finished. */
export function nextPair(
  thoughtIds: string[],
  comparisons: PairwiseComparison[],
  dimensionId: string,
  mode: ComparisonMode,
): [string, string] | null {
  const open = remainingPairs(thoughtIds, comparisons, dimensionId, mode)
  return open.length > 0 ? open[0] : null
}

export interface ComparisonProgress {
  completed: number
  skipped: number
  remaining: number
  total: number
}

export function comparisonProgress(
  thoughtIds: string[],
  comparisons: PairwiseComparison[],
  dimensionId: string,
  mode: ComparisonMode,
): ComparisonProgress {
  const relevant = comparisons.filter((entry) => entry.dimensionId === dimensionId)
  const ids = new Set(thoughtIds)
  const inScope = relevant.filter(
    (entry) => ids.has(entry.leftThoughtId) && ids.has(entry.rightThoughtId),
  )
  const completed = inScope.filter((entry) => entry.result !== 'skipped').length
  const skipped = inScope.length - completed
  const remaining = remainingPairs(thoughtIds, comparisons, dimensionId, mode).length
  return { completed, skipped, remaining, total: completed + skipped + remaining }
}
