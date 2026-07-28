import { describe, expect, it } from 'vitest'
import {
  createFallbackAnalysis,
  reduceAction,
  validateReflectionAnalysis,
} from './reflectionAssistant'

describe('reflection assistant', () => {
  it('keeps deterministic fallback observations grounded in the original text', () => {
    const result = createFallbackAnalysis('I feel sleepy. I opened my laptop.', 'en')
    expect(result.observations).toEqual(['I feel sleepy.', 'I opened my laptop.'])
    expect(result.actions).toHaveLength(3)
    expect(result.actions.map((action) => action.estimated_minutes)).toEqual([2, 3, 10])
  })

  it('rejects actions that exceed the energy limit', () => {
    const result = createFallbackAnalysis('Packing feels difficult.', 'en')
    result.actions[0].estimated_minutes = 8
    expect(validateReflectionAnalysis(result)).toBeNull()
  })

  it('deterministically makes compound or counted actions smaller', () => {
    expect(reduceAction('Open the document and write three headings.', 'en')).toBe(
      'Open the document.',
    )
    expect(reduceAction('Write down three shots.', 'en')).toBe('Write down one shots.')
  })
})
