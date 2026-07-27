import { RELATION_LABEL, RELATION_REVERSE_LABEL, RELATION_TYPES } from './defaults'
import { isLateral } from './graph'
import type { RelationType } from './types'

export interface RelationChoice {
  /** Stable value for a `<select>`. */
  key: string
  type: RelationType
  /** True when the other thought is the source of the stored relation. */
  reversed: boolean
  label: string
}

/**
 * Every relationship in both readings, so "is served by" is as reachable as
 * "serves". Symmetric types appear once, because they read the same either
 * way. The wording matches the roadmap edges and the detail panel, so one
 * vocabulary runs through the whole app.
 */
export const RELATION_CHOICES: RelationChoice[] = RELATION_TYPES.flatMap((type) => {
  const forward: RelationChoice = {
    key: type,
    type,
    reversed: false,
    label: RELATION_LABEL[type],
  }
  if (isLateral(type)) return [forward]
  return [
    forward,
    { key: `${type}:reversed`, type, reversed: true, label: RELATION_REVERSE_LABEL[type] },
  ]
})

/** The two most common readings first, then the rest in their usual order. */
export const RELATION_CHOICES_COMMON_FIRST: RelationChoice[] = [
  ...RELATION_CHOICES.filter((choice) => choice.key === 'serves' || choice.key === 'relatedTo'),
  ...RELATION_CHOICES.filter((choice) => choice.key !== 'serves' && choice.key !== 'relatedTo'),
]

export function findChoice(key: string): RelationChoice {
  return RELATION_CHOICES.find((choice) => choice.key === key) ?? RELATION_CHOICES[0]
}

/**
 * Which way round to store a relationship, given the thought the user started
 * from and the one they picked.
 */
export function choiceEndpoints(
  choice: RelationChoice,
  selfId: string,
  otherId: string,
): { sourceThoughtId: string; targetThoughtId: string } {
  return choice.reversed
    ? { sourceThoughtId: otherId, targetThoughtId: selfId }
    : { sourceThoughtId: selfId, targetThoughtId: otherId }
}
