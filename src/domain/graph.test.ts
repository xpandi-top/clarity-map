import { describe, expect, it } from 'vitest'
import {
  dedupeRelations,
  depthsFrom,
  downstreamIds,
  findCycles,
  hierarchy,
  rootIds,
  isDuplicateRelation,
  neighbourhoodIds,
  relationEndpoints,
  relationPhrase,
  upstreamIds,
  wouldCreateCycle,
} from './graph'
import { RELATION_REVERSE_LABEL, RELATION_TYPES } from './defaults'
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

describe('reading a relationship in a given direction', () => {
  // The case from the bug report: a goal broken down into a milestone.
  const loseWeight = 'loseWeight'
  const reach45 = 'reach45'
  const milestone = makeRelation(reach45, 'milestoneOf', loseWeight)

  it('reads from the source with the stored phrasing', () => {
    expect(relationPhrase(milestone, reach45)).toBe('is a milestone of')
  })

  it('reads from the target with the inverse phrasing', () => {
    // Drawn top-down the sentence must not become "Lose weight is a
    // milestone of Reach 45kg".
    expect(relationPhrase(milestone, loseWeight)).toBe('has milestone')
  })

  it('has an inverse phrase for every relationship type', () => {
    for (const type of RELATION_TYPES) {
      expect(RELATION_REVERSE_LABEL[type]).toBeTruthy()
      expect(RELATION_REVERSE_LABEL[type]).not.toBe('')
    }
  })

  it('keeps symmetric relationships reading the same both ways', () => {
    const lateral = makeRelation('a', 'relatedTo', 'b')
    expect(relationPhrase(lateral, 'a')).toBe(relationPhrase(lateral, 'b'))
  })

  it('puts the milestone below the goal in the hierarchy', () => {
    expect(hierarchy(milestone)).toEqual({ upper: loseWeight, lower: reach45 })
  })

  it('puts a breaksDownInto child below its parent', () => {
    const breakdown = makeRelation(loseWeight, 'breaksDownInto', reach45)
    expect(hierarchy(breakdown)).toEqual({ upper: loseWeight, lower: reach45 })
    expect(relationPhrase(breakdown, loseWeight)).toBe('breaks down into')
  })
})

describe('drawing a connection on the canvas', () => {
  it.each(RELATION_TYPES)(
    'stores a %s relation so the intended thought ends up on top',
    (type) => {
      const endpoints = relationEndpoints(type, 'upper', 'lower')
      const levels = hierarchy({ ...endpoints, type })
      if (levels) {
        expect(levels).toEqual({ upper: 'upper', lower: 'lower' })
      } else {
        // Lateral relations have no direction; the drag order is kept as-is.
        expect(endpoints).toEqual({ sourceThoughtId: 'upper', targetThoughtId: 'lower' })
      }
    },
  )

  it('inverts breaksDownInto relative to the upward relations', () => {
    expect(relationEndpoints('serves', 'goal', 'action')).toEqual({
      sourceThoughtId: 'action',
      targetThoughtId: 'goal',
    })
    expect(relationEndpoints('breaksDownInto', 'goal', 'action')).toEqual({
      sourceThoughtId: 'goal',
      targetThoughtId: 'action',
    })
  })
})

describe('hierarchy levels', () => {
  it('numbers each level beneath the root', () => {
    const depths = depthsFrom(relations, 'wellbeing')
    expect(depths.get('wellbeing')).toBe(0)
    expect(depths.get('health')).toBe(1)
    expect(depths.get('walk')).toBe(2)
    expect(depths.get('stretching')).toBe(2)
  })

  it('numbers levels upwards when asked', () => {
    const depths = depthsFrom(relations, 'walk', 'up')
    expect(depths.get('walk')).toBe(0)
    expect(depths.get('health')).toBe(1)
    expect(depths.get('wellbeing')).toBe(2)
  })

  it('gives the shortest distance when a thought is reachable two ways', () => {
    const shortcut = [...relations, makeRelation('walk', 'serves', 'wellbeing')]
    expect(depthsFrom(shortcut, 'wellbeing').get('walk')).toBe(1)
  })

  it('leaves unreachable thoughts out entirely', () => {
    expect(depthsFrom(relations, 'wellbeing').has('unrelated')).toBe(false)
  })

  it('finds the thoughts with nothing above them', () => {
    const ids = ['walk', 'health', 'wellbeing', 'stretching', 'loose']
    expect(rootIds(relations, ids).sort()).toEqual(['loose', 'wellbeing'])
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
