import type { Dimension } from './types'
import { tx } from '../i18n/core'

/**
 * A dimension is asked about in two different situations, and one wording
 * cannot serve both.
 *
 * Answering one thought: "Is this important to you?"
 * Weighing two thoughts: "Which one matters more to you?"
 *
 * Built-in dimensions carry both. Custom and imported ones may only carry the
 * single-thought question, so this generates a comparative reading rather than
 * showing a question that makes no sense next to two cards.
 */
export function comparativePrompt(dimension: Dimension): string {
  const authored = dimension.comparativeQuestion?.trim()
  if (authored) return authored
  return tx(
    'Which one would you put higher on {name}?',
    '如果按“{name}”来权衡，你会把哪一项放得更高？',
    { name: dimension.name.toLowerCase() },
  )
}

/** True when the wording was written for this dimension rather than generated. */
export function hasAuthoredComparison(dimension: Dimension): boolean {
  return (dimension.comparativeQuestion?.trim().length ?? 0) > 0
}

/**
 * Suggestion offered in the dimension editors, so authoring a comparative
 * question starts from something sensible instead of a blank field.
 */
export function suggestComparativeQuestion(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  return tx(
    'Which one would you put higher on {name}?',
    '如果按“{name}”来权衡，你会把哪一项放得更高？',
    { name: trimmed.toLowerCase() },
  )
}

/**
 * Gives built-in dimensions saved before comparative questions existed the
 * wording written for them, instead of leaving them on the generated
 * fallback. Anything the user has authored is left alone.
 */
export function backfillBuiltInPrompts(
  dimensions: Dimension[],
  defaults: Dimension[],
): Dimension[] {
  const byId = new Map(defaults.map((entry) => [entry.id, entry]))
  return dimensions.map((dimension) => {
    if (!dimension.builtIn || hasAuthoredComparison(dimension)) return dimension
    const source = byId.get(dimension.id)
    if (!source?.comparativeQuestion) return dimension
    return { ...dimension, comparativeQuestion: source.comparativeQuestion }
  })
}
