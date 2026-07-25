import { describe, expect, it } from 'vitest'
import {
  BUILTIN_DIMENSION,
  IMPORTANCE_NOT,
  MOTIVATION_SHOULD,
  createDefaultDimensions,
  createDefaultRules,
} from './defaults'
import { applySuggestion, evaluateRules, ruleMatches } from './rules'
import type { Rule } from './types'
import { makeThought } from '../test/factories'

const dimensions = createDefaultDimensions()

function rule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'rule_test',
    workspaceId: 'ws',
    name: 'Test rule',
    enabled: true,
    match: 'all',
    builtIn: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    conditions: [
      {
        id: 'c1',
        field: 'dimension',
        dimensionId: BUILTIN_DIMENSION.motivation,
        operator: 'equals',
        value: MOTIVATION_SHOULD,
      },
      {
        id: 'c2',
        field: 'dimension',
        dimensionId: BUILTIN_DIMENSION.importance,
        operator: 'equals',
        value: IMPORTANCE_NOT,
      },
    ],
    actions: [{ type: 'flag', value: 'Consider reducing this.' }],
    ...overrides,
  }
}

const lowValueObligation = makeThought({
  dimensionValues: {
    [BUILTIN_DIMENSION.motivation]: MOTIVATION_SHOULD,
    [BUILTIN_DIMENSION.importance]: IMPORTANCE_NOT,
  },
})

const halfMatching = makeThought({
  dimensionValues: { [BUILTIN_DIMENSION.motivation]: MOTIVATION_SHOULD },
})

describe('rule matching', () => {
  it('requires every condition when match is all', () => {
    expect(ruleMatches(lowValueObligation, rule(), dimensions)).toBe(true)
    expect(ruleMatches(halfMatching, rule(), dimensions)).toBe(false)
  })

  it('requires only one condition when match is any', () => {
    expect(ruleMatches(halfMatching, rule({ match: 'any' }), dimensions)).toBe(true)
    expect(ruleMatches(makeThought(), rule({ match: 'any' }), dimensions)).toBe(false)
  })

  it('never matches a disabled rule', () => {
    expect(ruleMatches(lowValueObligation, rule({ enabled: false }), dimensions)).toBe(false)
  })

  it('compares numeric dimensions with the ordering operators', () => {
    const easy = makeThought({
      type: 'action',
      dimensionValues: {
        [BUILTIN_DIMENSION.difficulty]: 2,
        [BUILTIN_DIMENSION.impact]: 5,
      },
    })
    const highLeverage = createDefaultRules('ws').find(
      (entry) => entry.name === 'High-leverage action',
    )!
    expect(ruleMatches(easy, highLeverage, dimensions)).toBe(true)
    expect(
      ruleMatches(
        makeThought({
          type: 'action',
          dimensionValues: {
            [BUILTIN_DIMENSION.difficulty]: 4,
            [BUILTIN_DIMENSION.impact]: 5,
          },
        }),
        highLeverage,
        dimensions,
      ),
    ).toBe(false)
  })
})

describe('suggestions', () => {
  it('produces a suggestion without touching the thought', () => {
    const before = structuredClone(lowValueObligation)
    const suggestions = evaluateRules([lowValueObligation], [rule()], dimensions)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].message).toBe('Consider reducing this.')
    expect(suggestions[0].applicable).toBe(false)
    expect(lowValueObligation).toEqual(before)
  })

  it('omits suggestions that have been permanently dismissed', () => {
    const [suggestion] = evaluateRules([lowValueObligation], [rule()], dimensions)
    expect(evaluateRules([lowValueObligation], [rule()], dimensions, [suggestion.id])).toEqual(
      [],
    )
  })

  it('does not suggest a tag the thought already carries', () => {
    const tagRule = rule({ actions: [{ type: 'addTag', value: 'Review' }] })
    const tagged = makeThought({
      tags: ['Review'],
      dimensionValues: lowValueObligation.dimensionValues,
    })
    expect(evaluateRules([tagged], [tagRule], dimensions)).toEqual([])
  })

  it('returns a new thought when a suggestion is applied', () => {
    const applied = applySuggestion(lowValueObligation, { type: 'addTag', value: 'Review' })
    expect(applied).not.toBe(lowValueObligation)
    expect(applied.tags).toEqual(['Review'])
    expect(lowValueObligation.tags).toEqual([])
  })

  it('changes the type only through an explicit apply', () => {
    const typeRule = rule({ actions: [{ type: 'suggestType', value: 'project' }] })
    const [suggestion] = evaluateRules([lowValueObligation], [typeRule], dimensions)
    expect(lowValueObligation.type).toBe('unclassified')
    expect(applySuggestion(lowValueObligation, suggestion.action).type).toBe('project')
  })
})
