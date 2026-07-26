import { describe, expect, it } from 'vitest'
import { BUILTIN_DIMENSION } from './defaults'
import { hasComparisonData, orderThoughts } from './ordering'
import type { PairwiseComparison } from './types'
import { makeThought } from '../test/factories'

const DIMENSION = BUILTIN_DIMENSION.importance

const alpha = makeThought({ text: 'Alpha', createdAt: '2026-01-01T00:00:00.000Z' })
const bravo = makeThought({
  text: 'Bravo',
  createdAt: '2026-01-02T00:00:00.000Z',
  dimensionValues: { [BUILTIN_DIMENSION.priority]: 5 },
})
const charlie = makeThought({
  text: 'Charlie',
  createdAt: '2026-01-03T00:00:00.000Z',
  dimensionValues: { [BUILTIN_DIMENSION.priority]: 3 },
})
const all = [alpha, bravo, charlie]

function comparison(
  left: string,
  right: string,
  result: PairwiseComparison['result'],
): PairwiseComparison {
  return {
    id: `${left}-${right}`,
    workspaceId: 'ws',
    dimensionId: DIMENSION,
    leftThoughtId: left,
    rightThoughtId: right,
    result,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

const texts = (thoughts: ReturnType<typeof orderThoughts>) =>
  thoughts.map((thought) => thought.text)

describe('ordering thoughts', () => {
  it('sorts by priority, highest first', () => {
    expect(texts(orderThoughts(all, { order: 'priority' }))).toEqual([
      'Bravo',
      'Charlie',
      'Alpha',
    ])
  })

  it('sorts newest first', () => {
    expect(texts(orderThoughts(all, { order: 'newest' }))).toEqual([
      'Charlie',
      'Bravo',
      'Alpha',
    ])
  })

  it('sorts alphabetically', () => {
    expect(texts(orderThoughts([charlie, alpha, bravo], { order: 'alphabetical' }))).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ])
  })

  it('never mutates the input array', () => {
    const input = [charlie, alpha, bravo]
    orderThoughts(input, { order: 'alphabetical' })
    expect(texts(input)).toEqual(['Charlie', 'Alpha', 'Bravo'])
  })
})

describe('ordering by the comparison ranking', () => {
  it('puts the winner of a comparison first', () => {
    const ordered = orderThoughts(all, {
      order: 'comparison',
      comparisons: [comparison(charlie.id, bravo.id, 'left')],
      dimensionId: DIMENSION,
    })
    expect(texts(ordered).slice(0, 2)).toEqual(['Charlie', 'Bravo'])
  })

  it('keeps thoughts that have never been compared at the end', () => {
    const ordered = orderThoughts(all, {
      order: 'comparison',
      comparisons: [comparison(charlie.id, bravo.id, 'left')],
      dimensionId: DIMENSION,
    })
    // Alpha has no comparisons, so it sits below both judged thoughts even
    // though Bravo lost its only round.
    expect(texts(ordered)).toEqual(['Charlie', 'Bravo', 'Alpha'])
  })

  it('ignores skipped rounds when ranking', () => {
    const withSkip = orderThoughts(all, {
      order: 'comparison',
      comparisons: [comparison(alpha.id, bravo.id, 'skipped')],
      dimensionId: DIMENSION,
    })
    expect(texts(withSkip)).toEqual(texts(orderThoughts(all, { order: 'priority' })))
  })

  it('ignores comparisons recorded against another dimension', () => {
    const other: PairwiseComparison = {
      ...comparison(alpha.id, bravo.id, 'left'),
      dimensionId: BUILTIN_DIMENSION.difficulty,
    }
    expect(
      texts(
        orderThoughts(all, { order: 'comparison', comparisons: [other], dimensionId: DIMENSION }),
      ),
    ).toEqual(texts(orderThoughts(all, { order: 'priority' })))
  })

  it('falls back to priority when nothing has been compared', () => {
    expect(
      texts(orderThoughts(all, { order: 'comparison', comparisons: [], dimensionId: DIMENSION })),
    ).toEqual(['Bravo', 'Charlie', 'Alpha'])
  })

  it('reports whether a ranking exists for these thoughts', () => {
    expect(hasComparisonData(all, [], DIMENSION)).toBe(false)
    expect(
      hasComparisonData(all, [comparison(alpha.id, bravo.id, 'skipped')], DIMENSION),
    ).toBe(false)
    expect(hasComparisonData(all, [comparison(alpha.id, bravo.id, 'left')], DIMENSION)).toBe(
      true,
    )
    // A comparison between thoughts outside this set does not count.
    expect(hasComparisonData([charlie], [comparison(alpha.id, bravo.id, 'left')], DIMENSION)).toBe(
      false,
    )
  })
})
