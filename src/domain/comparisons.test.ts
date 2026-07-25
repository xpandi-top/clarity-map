import { describe, expect, it } from 'vitest'
import {
  QUICK_MODE_ROUNDS,
  allPairs,
  comparisonProgress,
  nextPair,
  rankByScore,
  remainingPairs,
  scoreComparisons,
} from './comparisons'
import type { PairwiseComparison } from './types'

const DIMENSION = 'dim_importance'

function comparison(
  left: string,
  right: string,
  result: PairwiseComparison['result'],
  dimensionId = DIMENSION,
): PairwiseComparison {
  return {
    id: `${left}-${right}-${result}`,
    workspaceId: 'ws',
    dimensionId,
    leftThoughtId: left,
    rightThoughtId: right,
    result,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('pairwise scoring', () => {
  it('scores wins as 100 and losses as 0', () => {
    const scores = scoreComparisons(['a', 'b'], [comparison('a', 'b', 'left')], DIMENSION)
    const a = scores.find((entry) => entry.thoughtId === 'a')!
    const b = scores.find((entry) => entry.thoughtId === 'b')!
    expect(a).toMatchObject({ wins: 1, losses: 0, completed: 1, score: 100 })
    expect(b).toMatchObject({ wins: 0, losses: 1, completed: 1, score: 0 })
  })

  it('counts a tie as half a win for both thoughts', () => {
    const scores = scoreComparisons(['a', 'b'], [comparison('a', 'b', 'tie')], DIMENSION)
    expect(scores.every((entry) => entry.score === 50)).toBe(true)
    expect(scores.every((entry) => entry.ties === 1)).toBe(true)
  })

  it('ignores skipped comparisons entirely', () => {
    const withSkip = scoreComparisons(
      ['a', 'b'],
      [comparison('a', 'b', 'left'), comparison('a', 'b', 'skipped')],
      DIMENSION,
    )
    const withoutSkip = scoreComparisons(['a', 'b'], [comparison('a', 'b', 'left')], DIMENSION)
    expect(withSkip).toEqual(withoutSkip)
    expect(withSkip.find((entry) => entry.thoughtId === 'a')?.completed).toBe(1)
  })

  it('ignores comparisons recorded against another dimension', () => {
    const scores = scoreComparisons(
      ['a', 'b'],
      [comparison('a', 'b', 'left', 'dim_priority')],
      DIMENSION,
    )
    expect(scores.every((entry) => entry.completed === 0 && entry.score === 0)).toBe(true)
  })

  it('ranks by score, then by number of comparisons', () => {
    const ranked = rankByScore([
      { thoughtId: 'a', wins: 1, losses: 1, ties: 0, completed: 2, score: 50 },
      { thoughtId: 'b', wins: 2, losses: 0, ties: 0, completed: 2, score: 100 },
      { thoughtId: 'c', wins: 1, losses: 0, ties: 0, completed: 1, score: 100 },
    ])
    expect(ranked.map((entry) => entry.thoughtId)).toEqual(['b', 'c', 'a'])
  })
})

describe('pair generation', () => {
  it('produces every unique pair once', () => {
    expect(allPairs(['a', 'b', 'c'])).toEqual([
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ])
  })

  it('does not repeat a pair that has already been judged', () => {
    const open = remainingPairs(
      ['a', 'b', 'c'],
      [comparison('a', 'b', 'left')],
      DIMENSION,
      'complete',
    )
    expect(open).toEqual([
      ['a', 'c'],
      ['b', 'c'],
    ])
  })

  it('stops quick mode once every thought has had enough rounds', () => {
    const ids = ['a', 'b', 'c', 'd']
    const judged = allPairs(ids)
      .slice(0, QUICK_MODE_ROUNDS * 2)
      .map(([left, right]) => comparison(left, right, 'left'))
    const open = remainingPairs(ids, judged, DIMENSION, 'quick')
    expect(open.length).toBeLessThan(allPairs(ids).length - judged.length + 1)
  })

  it('reports progress with skipped rounds counted separately', () => {
    const progress = comparisonProgress(
      ['a', 'b', 'c'],
      [comparison('a', 'b', 'left'), comparison('a', 'c', 'skipped')],
      DIMENSION,
      'complete',
    )
    expect(progress).toMatchObject({ completed: 1, skipped: 1, remaining: 1 })
  })

  it('returns null when nothing is left to compare', () => {
    expect(nextPair(['a'], [], DIMENSION, 'complete')).toBeNull()
  })
})
