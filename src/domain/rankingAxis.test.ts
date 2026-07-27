import { describe, expect, it } from 'vitest'
import { BUILTIN_DIMENSION, createDefaultDimensions } from './defaults'
import { computeMatrixPoints, getDimensionValue } from './matrix'
import {
  RANK_AXIS_PREFIX,
  createRankAwareResolver,
  createRankAxes,
  createRankAxis,
  isRankAxis,
  rankScores,
  rankedDimensionId,
} from './rankingAxis'
import type { PairwiseComparison } from './types'
import { makeThought } from '../test/factories'

const dimensions = createDefaultDimensions()
const importance = dimensions.find((entry) => entry.id === BUILTIN_DIMENSION.importance)!
const priority = dimensions.find((entry) => entry.id === BUILTIN_DIMENSION.priority)!

const alpha = makeThought({ text: 'Alpha' })
const bravo = makeThought({ text: 'Bravo' })
const charlie = makeThought({ text: 'Charlie' })
const thoughts = [alpha, bravo, charlie]

function comparison(
  left: string,
  right: string,
  result: PairwiseComparison['result'],
  dimensionId: string = BUILTIN_DIMENSION.importance,
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

describe('ranking axes', () => {
  it('builds a 0 to 100 scale from a dimension', () => {
    const axis = createRankAxis(importance)
    expect(axis.id).toBe(`${RANK_AXIS_PREFIX}${importance.id}`)
    expect(axis.kind).toBe('scale')
    expect(axis.min).toBe(0)
    expect(axis.max).toBe(100)
    expect(axis.name).toBe('Importance (ranking)')
  })

  it('recognises a ranking axis and the dimension behind it', () => {
    const axis = createRankAxis(priority)
    expect(isRankAxis(axis.id)).toBe(true)
    expect(isRankAxis(priority.id)).toBe(false)
    expect(rankedDimensionId(axis.id)).toBe(priority.id)
  })

  it('never offers a ranking of a ranking', () => {
    const axes = createRankAxes(dimensions)
    expect(axes.every((axis) => !isRankAxis(rankedDimensionId(axis.id)))).toBe(true)
    expect(createRankAxes(axes)).toEqual([])
  })

  it('excludes dimensions that should not be ranked', () => {
    const axes = createRankAxes(dimensions, [BUILTIN_DIMENSION.thoughtType])
    expect(axes.map((axis) => rankedDimensionId(axis.id))).not.toContain(
      BUILTIN_DIMENSION.thoughtType,
    )
  })
})

describe('ranking scores', () => {
  it('scores a winner above a loser', () => {
    const scores = rankScores(thoughts, [comparison(alpha.id, bravo.id, 'left')], importance.id)
    expect(scores.get(alpha.id)).toBe(100)
    expect(scores.get(bravo.id)).toBe(0)
  })

  it('leaves an uncompared thought without a position', () => {
    const scores = rankScores(thoughts, [comparison(alpha.id, bravo.id, 'left')], importance.id)
    // Null, not zero — never compared is not the same as always lost.
    expect(scores.get(charlie.id)).toBeNull()
  })

  it('ignores comparisons from another dimension', () => {
    const scores = rankScores(
      thoughts,
      [comparison(alpha.id, bravo.id, 'left', BUILTIN_DIMENSION.priority)],
      importance.id,
    )
    expect(scores.get(alpha.id)).toBeNull()
  })
})

describe('plotting a matrix from rankings alone', () => {
  const importanceAxis = createRankAxis(importance)
  const priorityAxis = createRankAxis(priority)

  const comparisons = [
    comparison(alpha.id, bravo.id, 'left'),
    comparison(alpha.id, bravo.id, 'left', BUILTIN_DIMENSION.priority),
  ]

  const resolve = createRankAwareResolver(
    getDimensionValue,
    new Map([
      [importanceAxis.id, rankScores(thoughts, comparisons, importance.id)],
      [priorityAxis.id, rankScores(thoughts, comparisons, priority.id)],
    ]),
  )

  it('places compared thoughts without any answer being stored on them', () => {
    // None of these thoughts has a single dimension value recorded.
    expect(alpha.dimensionValues).toEqual({})

    const { points, unresolved } = computeMatrixPoints(
      thoughts,
      priorityAxis,
      importanceAxis,
      resolve,
    )
    expect(points.map((point) => point.thought.text).sort()).toEqual(['Alpha', 'Bravo'])
    expect(unresolved.map((thought) => thought.text)).toEqual(['Charlie'])
  })

  it('puts the winner in the top-right quadrant', () => {
    const { points } = computeMatrixPoints(thoughts, priorityAxis, importanceAxis, resolve)
    const winner = points.find((point) => point.thought.id === alpha.id)
    const loser = points.find((point) => point.thought.id === bravo.id)
    expect(winner?.quadrant).toBe('highHigh')
    expect(loser?.quadrant).toBe('lowLow')
  })

  it('still reads stored answers for ordinary axes', () => {
    const answered = makeThought({
      dimensionValues: { [BUILTIN_DIMENSION.priority]: 4 },
    })
    expect(resolve(answered, priority)).toBe(4)
  })
})
