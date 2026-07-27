import { describe, expect, it } from 'vitest'
import { BUILTIN_DIMENSION, createDefaultDimensions } from './defaults'
import { comparativePrompt, hasAuthoredComparison, suggestComparativeQuestion } from './prompts'
import type { Dimension } from './types'

const dimensions = createDefaultDimensions()

function dimension(overrides: Partial<Dimension> = {}): Dimension {
  return {
    id: 'dim_custom',
    name: 'Cost',
    question: 'How expensive is this?',
    kind: 'scale',
    min: 1,
    max: 5,
    required: false,
    active: true,
    builtIn: false,
    stage: 'optional',
    order: 0,
    ...overrides,
  }
}

describe('comparative prompts', () => {
  it('never reuses a single-thought question when comparing', () => {
    // The bug: "Is this something I want, or something I believe I should do?"
    // was shown above two cards.
    for (const entry of dimensions) {
      if (entry.id === BUILTIN_DIMENSION.thoughtType) continue
      expect(comparativePrompt(entry)).not.toBe(entry.question)
    }
  })

  it('asks every comparison as a choice between two things', () => {
    for (const entry of dimensions) {
      if (entry.id === BUILTIN_DIMENSION.thoughtType) continue
      const prompt = comparativePrompt(entry)
      expect(prompt.toLowerCase()).toContain('which one')
      expect(prompt.endsWith('?')).toBe(true)
    }
  })

  it('uses the wording written for a built-in dimension', () => {
    const importance = dimensions.find((entry) => entry.id === BUILTIN_DIMENSION.importance)!
    expect(comparativePrompt(importance)).toBe('Which one matters more to you?')
  })

  it('generates a readable question for a dimension without one', () => {
    expect(comparativePrompt(dimension())).toBe('Which one would you put higher on cost?')
  })

  it('prefers an authored question over the generated one', () => {
    const authored = dimension({ comparativeQuestion: 'Which one costs more?' })
    expect(comparativePrompt(authored)).toBe('Which one costs more?')
    expect(hasAuthoredComparison(authored)).toBe(true)
  })

  it('treats blank wording as absent rather than showing an empty heading', () => {
    const blank = dimension({ comparativeQuestion: '   ' })
    expect(hasAuthoredComparison(blank)).toBe(false)
    expect(comparativePrompt(blank)).toBe('Which one would you put higher on cost?')
  })

  it('suggests a starting point from the name alone', () => {
    expect(suggestComparativeQuestion('Energy effect')).toBe(
      'Which one would you put higher on energy effect?',
    )
    expect(suggestComparativeQuestion('  ')).toBe('')
  })
})
