import { describe, expect, it } from 'vitest'
import { BUILTIN_DIMENSION } from './defaults'
import {
  ACTION_TAG,
  EMPTY_ACTION_FILTERS,
  allTags,
  filterThoughts,
  isActionable,
  matchesActionFilters,
  nextActions,
} from './selectors'
import { makeThought } from '../test/factories'

const goal = makeThought({ text: 'Improve physical health', type: 'goal' })
const habit = makeThought({ text: 'Walk every day', type: 'habit', tags: ['Morning'] })
const action = makeThought({ text: 'Call my family', type: 'action' })
const unclassified = makeThought({ text: 'Something vague' })
const all = [goal, habit, action, unclassified]

describe('filtering by type', () => {
  it('returns everything when no types are selected', () => {
    expect(filterThoughts(all, { types: [] })).toEqual(all)
    expect(filterThoughts(all, {})).toEqual(all)
  })

  it('keeps only the selected type', () => {
    expect(filterThoughts(all, { types: ['habit'] })).toEqual([habit])
  })

  it('treats several selected types as a union', () => {
    expect(filterThoughts(all, { types: ['habit', 'action'] })).toEqual([habit, action])
  })

  it('can isolate unclassified thoughts', () => {
    expect(filterThoughts(all, { types: ['unclassified'] })).toEqual([unclassified])
  })

  it('combines a type filter with a search term', () => {
    expect(filterThoughts(all, { types: ['habit', 'action'], search: 'family' })).toEqual([
      action,
    ])
  })

  it('excludes statuses that are not selected', () => {
    const archived = makeThought({ text: 'Old thing', status: 'archived' })
    expect(filterThoughts([...all, archived], { statuses: ['active'] })).toEqual(all)
  })

  it('lists tags across the workspace in a stable order', () => {
    expect(allTags([habit, makeThought({ tags: ['Alpha', 'Morning'] })])).toEqual([
      'Alpha',
      'Morning',
    ])
  })
})

describe('action filters', () => {
  const easyHighImpact = makeThought({
    type: 'action',
    dimensionValues: {
      [BUILTIN_DIMENSION.difficulty]: 2,
      [BUILTIN_DIMENSION.impact]: 5,
      [BUILTIN_DIMENSION.priority]: 5,
    },
    estimatedMinutes: 10,
  })
  const hardBlocked = makeThought({
    type: 'action',
    dimensionValues: { [BUILTIN_DIMENSION.difficulty]: 5, [BUILTIN_DIMENSION.impact]: 2 },
    tags: [ACTION_TAG.hasPrerequisites],
  })

  it('recognises only actions and habits as actionable', () => {
    expect(isActionable(action)).toBe(true)
    expect(isActionable(habit)).toBe(true)
    expect(isActionable(goal)).toBe(false)
  })

  it('passes everything through when no filter is set', () => {
    expect(matchesActionFilters(hardBlocked, EMPTY_ACTION_FILTERS)).toBe(true)
  })

  it('applies each flag independently', () => {
    expect(
      matchesActionFilters(easyHighImpact, { ...EMPTY_ACTION_FILTERS, lowDifficulty: true }),
    ).toBe(true)
    expect(
      matchesActionFilters(hardBlocked, { ...EMPTY_ACTION_FILTERS, lowDifficulty: true }),
    ).toBe(false)
    expect(
      matchesActionFilters(easyHighImpact, { ...EMPTY_ACTION_FILTERS, under15Minutes: true }),
    ).toBe(true)
    expect(
      matchesActionFilters(hardBlocked, { ...EMPTY_ACTION_FILTERS, noPrerequisite: true }),
    ).toBe(false)
  })

  it('orders next actions by priority, then impact, then least difficulty', () => {
    expect(nextActions([hardBlocked, easyHighImpact])[0]).toBe(easyHighImpact)
  })
})
