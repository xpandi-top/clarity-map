import { createId, nowIso } from './ids'
import type {
  Belief,
  BeliefStatus,
  ConfidenceLevel,
  Evidence,
  EvidenceStatus,
  Hypothesis,
  HypothesisStatus,
  LearningData,
  Observation,
  ObservationContext,
  PersonalDefaultRule,
  PersonalRuleStatus,
} from './types'

export const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  'veryLow',
  'low',
  'medium',
  'high',
  'veryHigh',
]

/**
 * Deliberately not percentages. The user has a handful of personal
 * observations, not a study, and the wording should say so.
 */
export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  veryLow: 'Early signal',
  low: 'Some supporting evidence',
  medium: 'Repeated pattern',
  high: 'Strong current evidence',
  veryHigh: 'Consistently observed',
}

/** Rough numeric stand-in, only for sorting. Never shown as a score. */
export const CONFIDENCE_WEIGHT: Record<ConfidenceLevel, number> = {
  veryLow: 10,
  low: 30,
  medium: 50,
  high: 75,
  veryHigh: 90,
}

export const EVIDENCE_STATUSES: EvidenceStatus[] = [
  'emerging',
  'supported',
  'mixed',
  'weakened',
  'retired',
]

export const EVIDENCE_STATUS_LABEL: Record<EvidenceStatus, string> = {
  emerging: 'Emerging',
  supported: 'Supported',
  mixed: 'Mixed evidence',
  weakened: 'Weakened',
  retired: 'Retired',
}

export const HYPOTHESIS_STATUSES: HypothesisStatus[] = [
  'untested',
  'partiallySupported',
  'supported',
  'contradicted',
  'inconclusive',
  'retired',
]

export const HYPOTHESIS_STATUS_LABEL: Record<HypothesisStatus, string> = {
  untested: 'Untested',
  partiallySupported: 'Partially supported',
  supported: 'Supported',
  contradicted: 'Contradicted',
  inconclusive: 'Inconclusive',
  retired: 'Retired',
}

export const BELIEF_STATUSES: BeliefStatus[] = ['active', 'uncertain', 'replaced', 'retired']

export const BELIEF_STATUS_LABEL: Record<BeliefStatus, string> = {
  active: 'Active',
  uncertain: 'Uncertain',
  replaced: 'Replaced',
  retired: 'Retired',
}

export const PERSONAL_RULE_STATUSES: PersonalRuleStatus[] = [
  'experimental',
  'active',
  'needsReview',
  'retired',
  'replaced',
]

export const PERSONAL_RULE_STATUS_LABEL: Record<PersonalRuleStatus, string> = {
  experimental: 'Experimental',
  active: 'Active',
  needsReview: 'Needs review',
  retired: 'Retired',
  replaced: 'Replaced',
}

export const MIXED_EVIDENCE_NOTICE =
  'This rule has mixed evidence. Review before treating it as a default.'

export function emptyContext(): ObservationContext {
  return { tags: [] }
}

/** A workspace that has not learned anything yet. */
export function emptyLearningData(): LearningData {
  return {
    observations: [],
    evidence: [],
    hypotheses: [],
    beliefs: [],
    beliefUpdates: [],
    personalRules: [],
  }
}

export function createObservation(
  workspaceId: string,
  patch: Partial<Observation> = {},
): Observation {
  const timestamp = nowIso()
  return {
    id: createId('obs'),
    workspaceId,
    description: '',
    occurredAt: timestamp,
    context: emptyContext(),
    relatedThoughtIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...patch,
  }
}

export function createEvidence(workspaceId: string, patch: Partial<Evidence> = {}): Evidence {
  const timestamp = nowIso()
  return {
    id: createId('evd'),
    workspaceId,
    statement: '',
    observationIds: [],
    supportingObservationIds: [],
    contradictingObservationIds: [],
    relatedThoughtIds: [],
    confidence: 'veryLow',
    status: 'emerging',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...patch,
  }
}

export function createHypothesis(
  workspaceId: string,
  patch: Partial<Hypothesis> = {},
): Hypothesis {
  const timestamp = nowIso()
  return {
    id: createId('hyp'),
    workspaceId,
    statement: '',
    relatedValueIds: [],
    relatedGoalIds: [],
    evidenceIds: [],
    contradictingEvidenceIds: [],
    relatedThoughtIds: [],
    status: 'untested',
    confidence: 'veryLow',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...patch,
  }
}

export function createBelief(workspaceId: string, patch: Partial<Belief> = {}): Belief {
  const timestamp = nowIso()
  return {
    id: createId('blf'),
    workspaceId,
    statement: '',
    confidence: 'low',
    status: 'active',
    evidenceIds: [],
    contradictingEvidenceIds: [],
    relatedThoughtIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...patch,
  }
}

export function createPersonalRule(
  workspaceId: string,
  patch: Partial<PersonalDefaultRule> = {},
): PersonalDefaultRule {
  const timestamp = nowIso()
  return {
    id: createId('prule'),
    workspaceId,
    name: '',
    triggerDescription: '',
    conditions: [],
    defaultResponse: '',
    relatedValueIds: [],
    relatedGoalIds: [],
    evidenceIds: [],
    contradictingEvidenceIds: [],
    relatedThoughtIds: [],
    confidence: 'veryLow',
    status: 'experimental',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...patch,
  }
}

/**
 * Status implied by how the observations behind a piece of evidence line up.
 * Never overrides `retired`, which is the user's own decision, and never
 * upgrades past what the counts justify.
 */
export function derivedEvidenceStatus(evidence: Evidence): EvidenceStatus {
  if (evidence.status === 'retired') return 'retired'
  const supporting = evidence.supportingObservationIds.length
  const contradicting = evidence.contradictingObservationIds.length
  if (contradicting > 0 && supporting > 0) return 'mixed'
  if (contradicting > 0) return 'weakened'
  if (supporting >= 3) return 'supported'
  return 'emerging'
}

/** True when supporting and contradicting records exist side by side. */
export function hasMixedSupport(entry: {
  evidenceIds?: string[]
  contradictingEvidenceIds?: string[]
  supportingObservationIds?: string[]
  contradictingObservationIds?: string[]
}): boolean {
  const supporting =
    (entry.evidenceIds?.length ?? 0) + (entry.supportingObservationIds?.length ?? 0)
  const contradicting =
    (entry.contradictingEvidenceIds?.length ?? 0) +
    (entry.contradictingObservationIds?.length ?? 0)
  return supporting > 0 && contradicting > 0
}

/** A rule is due for review when it is dated, or when its evidence disagrees. */
export function ruleNeedsReview(
  rule: PersonalDefaultRule,
  now: string = nowIso(),
): { due: boolean; reason?: string } {
  if (rule.status === 'retired' || rule.status === 'replaced') return { due: false }
  if (rule.status === 'needsReview') return { due: true, reason: 'Marked for review.' }
  if (hasMixedSupport(rule)) return { due: true, reason: MIXED_EVIDENCE_NOTICE }
  if (rule.reviewAt && rule.reviewAt <= now) {
    return { due: true, reason: 'The review date you set has passed.' }
  }
  return { due: false }
}

/**
 * Belief history in order, oldest first, for one belief and everything it
 * replaced or was replaced by.
 */
export function beliefChain(beliefs: Belief[], beliefId: string): Belief[] {
  const byId = new Map(beliefs.map((belief) => [belief.id, belief]))
  const chain: Belief[] = []

  let current = byId.get(beliefId)
  const seenBack = new Set<string>()
  while (current && !seenBack.has(current.id)) {
    seenBack.add(current.id)
    chain.unshift(current)
    current = current.previousBeliefId ? byId.get(current.previousBeliefId) : undefined
  }

  let forward = byId.get(beliefId)
  const seenForward = new Set<string>([beliefId])
  while (forward?.replacementBeliefId) {
    const next = byId.get(forward.replacementBeliefId)
    if (!next || seenForward.has(next.id)) break
    seenForward.add(next.id)
    chain.push(next)
    forward = next
  }

  return chain
}

/** Tag overlap, the matching rule for release one. Case-insensitive. */
export function sharedTags(left: string[], right: string[]): string[] {
  const normalised = new Set(right.map((tag) => tag.toLowerCase()))
  return left.filter((tag) => normalised.has(tag.toLowerCase()))
}
