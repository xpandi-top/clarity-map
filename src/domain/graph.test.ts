import { describe, expect, it } from 'vitest'
import {
  dedupeRelations,
  downstreamIds,
  findCycles,
  isDuplicateRelation,
  neighbourhoodIds,
  upstreamIds,
  wouldCreateCycle,
} from './graph'
import { makeRelation } from '../test/factories'

// walk -> health -> wellbeing, and health breaks down into stretching.
const walkServesHealth = makeRelation('walk', 'serves', 'health')
const healthServesWellbeing = makeRelation('health', 'serves', 'wellbeing')
const healthBreaksIntoStretching = makeRelation('health', 'breaksDownInto', 'stretching')
const relations = [walkServesHealth, healthServesWellbeing, healthBreaksIntoStretching]

describe('graph traversal', () => {
  it('walks upstream to everything a thought contributes to', () => {
    expect(upstreamIds(relations, 'walk').sort()).toEqual(['health', 'wellbeing'])
  })

  it('walks downstream to everything beneath a thought', () => {
    expect(downstreamIds(relations, 'wellbeing').sort()).toEqual([
      'health',
      'stretching',
      'walk',
    ])
  })

  it('respects a depth limit', () => {
    expect(upstreamIds(relations, 'walk', 1)).toEqual(['health'])
  })

  it('includes laterally related thoughts in a neighbourhood', () => {
    const withLateral = [...relations, makeRelation('walk', 'relatedTo', 'music')]
    expect(neighbourhoodIds(withLateral, 'walk')).toContain('music')
    expect(neighbourhoodIds(withLateral, 'walk', { includeLateral: false })).not.toContain(
      'music',
    )
  })

  it('limits a neighbourhood to one direction when asked', () => {
    expect(neighbourhoodIds(relations, 'health', { direction: 'up' }).sort()).toEqual([
      'health',
      'wellbeing',
    ])
    expect(neighbourhoodIds(relations, 'health', { direction: 'down' }).sort()).toEqual([
      'health',
      'stretching',
      'walk',
    ])
  })
})

describe('duplicate relationships', () => {
  it('rejects an identical source, target, and type', () => {
    expect(
      isDuplicateRelation(relations, {
        sourceThoughtId: 'walk',
        targetThoughtId: 'health',
        type: 'serves',
      }),
    ).toBe(true)
  })

  it('allows the same pair with a different relationship type', () => {
    expect(
      isDuplicateRelation(relations, {
        sourceThoughtId: 'walk',
        targetThoughtId: 'health',
        type: 'supports',
      }),
    ).toBe(false)
  })

  it('drops exact duplicates but keeps the first', () => {
    const duplicated = [...relations, makeRelation('walk', 'serves', 'health')]
    expect(dedupeRelations(duplicated)).toHaveLength(relations.length)
  })
})

describe('cycle detection', () => {
  it('finds no cycles in an acyclic graph', () => {
    expect(findCycles(relations)).toEqual([])
  })

  it('reports a cycle rather than silently dropping it', () => {
    const cyclic = [...relations, makeRelation('wellbeing', 'serves', 'walk')]
    const cycles = findCycles(cyclic)
    expect(cycles.length).toBeGreaterThan(0)
    expect(cycles[0].length).toBeGreaterThan(1)
  })

  it('warns before a relationship would close a loop', () => {
    expect(
      wouldCreateCycle(relations, {
        sourceThoughtId: 'wellbeing',
        targetThoughtId: 'walk',
        type: 'serves',
      }),
    ).toBe(true)
    expect(
      wouldCreateCycle(relations, {
        sourceThoughtId: 'walk',
        targetThoughtId: 'newGoal',
        type: 'serves',
      }),
    ).toBe(false)
  })

  it('treats lateral relationships as cycle-free', () => {
    expect(
      wouldCreateCycle(relations, {
        sourceThoughtId: 'wellbeing',
        targetThoughtId: 'walk',
        type: 'relatedTo',
      }),
    ).toBe(false)
  })
})
