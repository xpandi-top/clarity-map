/**
 * Words that usually start a described state rather than something you can
 * start doing. Deliberately small and readable — this only ever produces a
 * non-blocking hint, never an automatic change.
 */
const OUTCOME_STARTERS = [
  'be ',
  'become ',
  'have ',
  'feel ',
  'improve',
  'increase',
  'reduce',
  'get better',
  'master',
  'understand',
  'be more',
  'more ',
  'less ',
  'stop being',
]

/** True when the text reads more like a result than a startable action. */
export function looksLikeOutcome(text: string): boolean {
  const normalised = text.trim().toLowerCase()
  if (normalised.length === 0) return false
  return OUTCOME_STARTERS.some((starter) => normalised.startsWith(starter))
}

export const OUTCOME_HINT =
  'This may describe a result rather than an action that can be started directly. You can keep the current classification.'
