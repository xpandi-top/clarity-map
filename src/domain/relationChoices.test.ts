import { describe, expect, it } from 'vitest'
import { RELATION_TYPES } from './defaults'
import { hierarchy, isLateral, relationPhrase } from './graph'
import {
  RELATION_CHOICES,
  RELATION_CHOICES_COMMON_FIRST,
  choiceEndpoints,
  findChoice,
} from './relationChoices'

describe('relationship choices', () => {
  it('offers both readings of every directional relationship', () => {
    for (const type of RELATION_TYPES) {
      const forOne = RELATION_CHOICES.filter((choice) => choice.type === type)
      expect(forOne).toHaveLength(isLateral(type) ? 1 : 2)
    }
  })

  it('offers "is served by" alongside "serves"', () => {
    const labels = RELATION_CHOICES.map((choice) => choice.label)
    expect(labels).toContain('serves')
    expect(labels).toContain('is served by')
  })

  it('never repeats a symmetric relationship', () => {
    expect(RELATION_CHOICES.filter((choice) => choice.type === 'relatedTo')).toHaveLength(1)
    expect(RELATION_CHOICES.filter((choice) => choice.type === 'conflictsWith')).toHaveLength(1)
  })

  it('keeps every choice key unique', () => {
    const keys = RELATION_CHOICES.map((choice) => choice.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('puts the two most common readings first without dropping any', () => {
    expect(RELATION_CHOICES_COMMON_FIRST[0].key).toBe('serves')
    expect(RELATION_CHOICES_COMMON_FIRST[1].key).toBe('relatedTo')
    expect(RELATION_CHOICES_COMMON_FIRST).toHaveLength(RELATION_CHOICES.length)
  })

  it('falls back to the first choice for an unknown key', () => {
    expect(findChoice('nonsense')).toBe(RELATION_CHOICES[0])
  })
})

describe('storing a chosen relationship', () => {
  it('stores a forward choice from this thought outwards', () => {
    expect(choiceEndpoints(findChoice('serves'), 'me', 'other')).toEqual({
      sourceThoughtId: 'me',
      targetThoughtId: 'other',
    })
  })

  it('stores a reversed choice the other way round', () => {
    expect(choiceEndpoints(findChoice('serves:reversed'), 'me', 'other')).toEqual({
      sourceThoughtId: 'other',
      targetThoughtId: 'me',
    })
  })

  it('reads back exactly the phrase that was picked', () => {
    for (const choice of RELATION_CHOICES) {
      const endpoints = choiceEndpoints(choice, 'me', 'other')
      expect(relationPhrase({ ...endpoints, type: choice.type }, 'me')).toBe(choice.label)
    }
  })

  it('puts the other thought above this one for a reversed upward relation', () => {
    const endpoints = choiceEndpoints(findChoice('milestoneOf:reversed'), 'goal', 'milestone')
    // "This thought has milestone X" means X sits beneath it.
    expect(hierarchy({ ...endpoints, type: 'milestoneOf' })).toEqual({
      upper: 'goal',
      lower: 'milestone',
    })
  })
})
