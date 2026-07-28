import { hasMixedSupport, ruleNeedsReview } from './learning'
import type {
  Belief,
  Evidence,
  LearningData,
  Observation,
  PersonalDefaultRule,
} from './types'

export interface LearningInbox {
  /** Newest first. Everything recorded lately, interpreted or not. */
  recentObservations: Observation[]
  /** Recorded but attached to nothing at all. */
  unlinkedObservations: Observation[]
  /** Linked to a thought, but no evidence has been drawn from them yet. */
  awaitingInterpretation: Observation[]
  /** A reading that rests on one observation or none. */
  weaklySupported: Evidence[]
  /** Readings whose own observations disagree. */
  contradictory: Evidence[]
  /** Uncertain, mixed, or standing on nothing recorded. */
  beliefsNeedingReview: Array<{ belief: Belief; reason: string }>
  /** Experimental or dated rules the user said they would revisit. */
  rulesAwaitingReview: Array<{ rule: PersonalDefaultRule; reason: string }>
}

const byNewest = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt)

export function buildLearningInbox(data: LearningData, now = new Date().toISOString()): LearningInbox {
  const interpreted = new Set<string>()
  for (const evidence of data.evidence) {
    for (const id of evidence.observationIds) interpreted.add(id)
    for (const id of evidence.supportingObservationIds) interpreted.add(id)
    for (const id of evidence.contradictingObservationIds) interpreted.add(id)
  }

  // Archived records stay in the file and in exports; they just stop asking
  // for attention here.
  const observations = data.observations
    .filter((observation) => !observation.archivedAt)
    .sort(byNewest)

  const beliefsNeedingReview: LearningInbox['beliefsNeedingReview'] = []
  for (const belief of data.beliefs) {
    if (belief.status === 'retired' || belief.status === 'replaced') continue
    if (hasMixedSupport(belief)) {
      beliefsNeedingReview.push({
        belief,
        reason: 'Supporting and contradicting evidence are both recorded.',
      })
    } else if (belief.status === 'uncertain') {
      beliefsNeedingReview.push({ belief, reason: 'You marked this belief as uncertain.' })
    } else if (belief.evidenceIds.length === 0) {
      beliefsNeedingReview.push({
        belief,
        reason: 'Nothing you have recorded is attached to this belief yet.',
      })
    }
  }

  const rulesAwaitingReview: LearningInbox['rulesAwaitingReview'] = []
  for (const rule of data.personalRules) {
    const review = ruleNeedsReview(rule, now)
    if (review.due) {
      rulesAwaitingReview.push({ rule, reason: review.reason ?? 'Due for review.' })
    } else if (rule.status === 'experimental') {
      rulesAwaitingReview.push({ rule, reason: 'Still experimental — try it, then revisit.' })
    }
  }

  return {
    recentObservations: observations.slice(0, 10),
    unlinkedObservations: observations.filter(
      (observation) =>
        observation.relatedThoughtIds.length === 0 && !interpreted.has(observation.id),
    ),
    awaitingInterpretation: observations.filter(
      (observation) =>
        observation.relatedThoughtIds.length > 0 && !interpreted.has(observation.id),
    ),
    weaklySupported: data.evidence.filter(
      (evidence) =>
        evidence.status !== 'retired' &&
        evidence.contradictingObservationIds.length === 0 &&
        new Set([...evidence.observationIds, ...evidence.supportingObservationIds]).size <= 1,
    ),
    contradictory: data.evidence.filter(
      (evidence) => evidence.contradictingObservationIds.length > 0,
    ),
    beliefsNeedingReview,
    rulesAwaitingReview,
  }
}

/** Total number of things the inbox is asking the user to look at. */
export function inboxOpenCount(inbox: LearningInbox): number {
  return (
    inbox.unlinkedObservations.length +
    inbox.awaitingInterpretation.length +
    inbox.weaklySupported.length +
    inbox.contradictory.length +
    inbox.beliefsNeedingReview.length +
    inbox.rulesAwaitingReview.length
  )
}
