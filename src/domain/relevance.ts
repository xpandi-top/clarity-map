import { MIXED_EVIDENCE_NOTICE, hasMixedSupport, ruleNeedsReview, sharedTags } from './learning'
import type {
  Belief,
  Evidence,
  Hypothesis,
  LearningData,
  Observation,
  PersonalDefaultRule,
  Thought,
} from './types'

export type ReminderKind = 'observation' | 'evidence' | 'belief' | 'hypothesis' | 'rule'

/**
 * One thing the user has already learned, phrased as a reminder of their own
 * record rather than as advice. `sourceObservationIds` is what makes it a
 * reminder and not a slogan: every line can be traced back to what happened.
 */
export interface LearningReminder {
  id: string
  kind: ReminderKind
  entityId: string
  message: string
  detail?: string
  /** Shown when the record disagrees with itself. Never hidden. */
  caution?: string
  sourceObservationIds: string[]
  /** Why this surfaced here: an explicit link, or a shared tag. */
  via: 'link' | 'tag'
}

function countPhrase(count: number, singular: string, plural: string): string {
  const words = ['no', 'one', 'two', 'three', 'four', 'five']
  const number = count < words.length ? words[count] : String(count)
  return `${number} ${count === 1 ? singular : plural}`
}

function trimStatement(statement: string): string {
  const text = statement.trim()
  return text.endsWith('.') ? text.slice(0, -1) : text
}

function observationReminder(observation: Observation, via: 'link' | 'tag'): LearningReminder {
  const change =
    observation.energyBefore !== undefined && observation.energyAfter !== undefined
      ? `Energy ${observation.energyBefore} → ${observation.energyAfter}.`
      : undefined
  return {
    id: `obs:${observation.id}`,
    kind: 'observation',
    entityId: observation.id,
    message: `You previously recorded: ${trimStatement(observation.description)}.`,
    detail: [new Date(observation.occurredAt).toLocaleDateString(), change]
      .filter(Boolean)
      .join(' · '),
    sourceObservationIds: [observation.id],
    via,
  }
}

function evidenceReminder(evidence: Evidence, via: 'link' | 'tag'): LearningReminder {
  const supporting = evidence.supportingObservationIds.length || evidence.observationIds.length
  const contradicting = evidence.contradictingObservationIds.length
  return {
    id: `evd:${evidence.id}`,
    kind: 'evidence',
    entityId: evidence.id,
    message:
      supporting > 0
        ? `You have ${countPhrase(supporting, 'observation', 'observations')} suggesting that ${
            trimStatement(evidence.statement).charAt(0).toLowerCase() +
            trimStatement(evidence.statement).slice(1)
          }.`
        : `${trimStatement(evidence.statement)}.`,
    caution:
      contradicting > 0
        ? `${countPhrase(contradicting, 'observation points', 'observations point')} the other way.`
        : undefined,
    sourceObservationIds: [
      ...new Set([
        ...evidence.observationIds,
        ...evidence.supportingObservationIds,
        ...evidence.contradictingObservationIds,
      ]),
    ],
    via,
  }
}

function beliefReminder(belief: Belief, via: 'link' | 'tag'): LearningReminder {
  return {
    id: `blf:${belief.id}`,
    kind: 'belief',
    entityId: belief.id,
    message: `Your current working model: ${trimStatement(belief.statement)}.`,
    detail: belief.description,
    caution: hasMixedSupport(belief)
      ? 'This belief currently has mixed evidence.'
      : belief.status === 'uncertain'
        ? 'You marked this belief as uncertain.'
        : undefined,
    sourceObservationIds: [],
    via,
  }
}

function hypothesisReminder(hypothesis: Hypothesis, via: 'link' | 'tag'): LearningReminder {
  return {
    id: `hyp:${hypothesis.id}`,
    kind: 'hypothesis',
    entityId: hypothesis.id,
    message: `You are testing: ${trimStatement(hypothesis.statement)}.`,
    sourceObservationIds: [],
    via,
  }
}

function ruleReminder(rule: PersonalDefaultRule, via: 'link' | 'tag'): LearningReminder {
  const review = ruleNeedsReview(rule)
  return {
    id: `prule:${rule.id}`,
    kind: 'rule',
    entityId: rule.id,
    message: `Your default when ${trimStatement(rule.triggerDescription)}: ${trimStatement(
      rule.defaultResponse,
    )}.`,
    detail: rule.exceptionDescription ? `Exception: ${rule.exceptionDescription}` : undefined,
    caution: review.due ? (review.reason ?? MIXED_EVIDENCE_NOTICE) : undefined,
    sourceObservationIds: [],
    via,
  }
}

/**
 * What the user has already learned that touches this thought.
 *
 * Matching is explicit links first, then shared tags — no semantic guessing,
 * so nothing appears that the user cannot trace. Retired records stay out.
 */
export function relevantLearning(
  thought: Pick<Thought, 'id' | 'tags'>,
  data: LearningData,
): LearningReminder[] {
  const reminders: LearningReminder[] = []
  const seen = new Set<string>()
  const push = (reminder: LearningReminder) => {
    if (seen.has(reminder.id)) return
    seen.add(reminder.id)
    reminders.push(reminder)
  }

  const linkedObservationIds = new Set<string>()
  for (const observation of data.observations) {
    if (observation.archivedAt) continue
    const linked = observation.relatedThoughtIds.includes(thought.id)
    const tagged = !linked && sharedTags(thought.tags, observation.context.tags).length > 0
    if (!linked && !tagged) continue
    linkedObservationIds.add(observation.id)
    push(observationReminder(observation, linked ? 'link' : 'tag'))
  }

  const linkedEvidenceIds = new Set<string>()
  for (const evidence of data.evidence) {
    if (evidence.status === 'retired') continue
    const linked =
      evidence.relatedThoughtIds.includes(thought.id) ||
      evidence.observationIds.some((id) => linkedObservationIds.has(id)) ||
      evidence.supportingObservationIds.some((id) => linkedObservationIds.has(id)) ||
      evidence.contradictingObservationIds.some((id) => linkedObservationIds.has(id))
    const tagged =
      !linked && sharedTags(thought.tags, evidence.context?.tags ?? []).length > 0
    if (!linked && !tagged) continue
    linkedEvidenceIds.add(evidence.id)
    push(evidenceReminder(evidence, linked ? 'link' : 'tag'))
  }

  const touchesEvidence = (ids: string[] | undefined) =>
    (ids ?? []).some((id) => linkedEvidenceIds.has(id))

  for (const belief of data.beliefs) {
    // A replaced belief is history, not a working model. It stays in the
    // timeline, but it should not be handed back as what you currently think.
    if (belief.status === 'retired' || belief.status === 'replaced') continue
    if (
      belief.relatedThoughtIds?.includes(thought.id) ||
      touchesEvidence(belief.evidenceIds) ||
      touchesEvidence(belief.contradictingEvidenceIds)
    ) {
      push(beliefReminder(belief, 'link'))
    }
  }

  for (const hypothesis of data.hypotheses) {
    if (hypothesis.status === 'retired') continue
    if (
      hypothesis.relatedThoughtIds?.includes(thought.id) ||
      hypothesis.relatedValueIds.includes(thought.id) ||
      hypothesis.relatedGoalIds.includes(thought.id) ||
      touchesEvidence(hypothesis.evidenceIds)
    ) {
      push(hypothesisReminder(hypothesis, 'link'))
    }
  }

  for (const rule of data.personalRules) {
    if (rule.status === 'retired' || rule.status === 'replaced') continue
    const linked =
      rule.relatedThoughtIds?.includes(thought.id) ||
      rule.relatedValueIds.includes(thought.id) ||
      rule.relatedGoalIds.includes(thought.id) ||
      touchesEvidence(rule.evidenceIds) ||
      touchesEvidence(rule.contradictingEvidenceIds)
    const tagged = !linked && sharedTags(thought.tags, rule.context?.tags ?? []).length > 0
    if (!linked && !tagged) continue
    push(ruleReminder(rule, linked ? 'link' : 'tag'))
  }

  return reminders
}

/**
 * Rules whose written trigger matches text the user has just typed. Manual by
 * design — the app never watches for conditions in the background.
 */
export function rulesMatchingSituation(
  rules: PersonalDefaultRule[],
  situation: string,
): PersonalDefaultRule[] {
  const words = situation
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3)
  if (words.length === 0) return []

  return rules
    .filter((rule) => rule.status !== 'retired' && rule.status !== 'replaced')
    .map((rule) => {
      const haystack = [
        rule.name,
        rule.triggerDescription,
        rule.defaultResponse,
        ...rule.conditions.map((condition) => condition.description),
        ...(rule.context?.tags ?? []),
      ]
        .join(' ')
        .toLowerCase()
      return { rule, hits: words.filter((word) => haystack.includes(word)).length }
    })
    .filter((entry) => entry.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((entry) => entry.rule)
}
