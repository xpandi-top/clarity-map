import { describe, expect, it } from 'vitest'
import {
  beliefChain,
  createBelief,
  createEvidence,
  createObservation,
  createPersonalRule,
  derivedEvidenceStatus,
  hasMixedSupport,
  ruleNeedsReview,
  sharedTags,
} from './learning'
import { buildLearningInbox, inboxOpenCount } from './learningInbox'
import { buildLearningGraph } from './learningGraph'
import type { LearningData } from './types'

const WS = 'ws_test'

function emptyData(): LearningData {
  return {
    observations: [],
    evidence: [],
    hypotheses: [],
    beliefs: [],
    beliefUpdates: [],
    personalRules: [],
  }
}

describe('evidence status', () => {
  it('calls a reading mixed when its observations disagree', () => {
    const evidence = createEvidence(WS, {
      statement: 'Leaving the house helps',
      supportingObservationIds: ['a', 'b', 'c'],
      contradictingObservationIds: ['d'],
    })
    expect(derivedEvidenceStatus(evidence)).toBe('mixed')
  })

  it('only calls a reading supported once it has been seen repeatedly', () => {
    const twice = createEvidence(WS, { supportingObservationIds: ['a', 'b'] })
    const thrice = createEvidence(WS, { supportingObservationIds: ['a', 'b', 'c'] })
    expect(derivedEvidenceStatus(twice)).toBe('emerging')
    expect(derivedEvidenceStatus(thrice)).toBe('supported')
  })

  it('leaves a retired reading alone', () => {
    const evidence = createEvidence(WS, {
      status: 'retired',
      supportingObservationIds: ['a', 'b', 'c'],
    })
    expect(derivedEvidenceStatus(evidence)).toBe('retired')
  })
})

describe('record factories', () => {
  it('keeps its defaults when an optional field arrives empty', () => {
    // Optional form fields arrive as an explicit undefined; that must not
    // wipe out the timestamp the factory just set.
    const observation = createObservation(WS, {
      description: 'Something happened',
      occurredAt: undefined,
      energyBefore: undefined,
    })
    expect(Number.isNaN(new Date(observation.occurredAt).getTime())).toBe(false)
    expect(observation.energyBefore).toBeUndefined()

    const evidence = createEvidence(WS, { statement: 'A reading', status: undefined })
    expect(evidence.status).toBe('emerging')
  })
})

describe('mixed support', () => {
  it('needs records on both sides', () => {
    expect(hasMixedSupport({ evidenceIds: ['a'], contradictingEvidenceIds: ['b'] })).toBe(true)
    expect(hasMixedSupport({ evidenceIds: ['a'] })).toBe(false)
    expect(hasMixedSupport({ contradictingEvidenceIds: ['b'] })).toBe(false)
  })
})

describe('rule review', () => {
  it('flags a rule whose evidence disagrees', () => {
    const rule = createPersonalRule(WS, {
      name: 'Go outside first',
      defaultResponse: 'Go outside for five minutes.',
      evidenceIds: ['a'],
      contradictingEvidenceIds: ['b'],
      status: 'active',
    })
    const review = ruleNeedsReview(rule)
    expect(review.due).toBe(true)
    expect(review.reason).toContain('mixed evidence')
  })

  it('flags a rule whose review date has passed, and leaves retired rules alone', () => {
    const due = createPersonalRule(WS, {
      name: 'A',
      defaultResponse: 'B',
      status: 'active',
      reviewAt: '2020-01-01T00:00:00.000Z',
    })
    expect(ruleNeedsReview(due, '2026-01-01T00:00:00.000Z').due).toBe(true)

    const retired = createPersonalRule(WS, {
      name: 'A',
      defaultResponse: 'B',
      status: 'retired',
      evidenceIds: ['a'],
      contradictingEvidenceIds: ['b'],
    })
    expect(ruleNeedsReview(retired).due).toBe(false)
  })
})

describe('belief chain', () => {
  it('reads oldest first across replacements', () => {
    const first = createBelief(WS, { statement: 'One' })
    const second = createBelief(WS, { statement: 'Two', previousBeliefId: first.id })
    const third = createBelief(WS, { statement: 'Three', previousBeliefId: second.id })
    first.replacementBeliefId = second.id
    second.replacementBeliefId = third.id

    const chain = beliefChain([third, first, second], second.id)
    expect(chain.map((belief) => belief.statement)).toEqual(['One', 'Two', 'Three'])
  })

  it('does not loop when two beliefs point at each other', () => {
    const a = createBelief(WS, { statement: 'A' })
    const b = createBelief(WS, { statement: 'B', previousBeliefId: a.id })
    a.previousBeliefId = b.id
    expect(beliefChain([a, b], a.id).length).toBeLessThanOrEqual(2)
  })
})

describe('shared tags', () => {
  it('ignores case', () => {
    expect(sharedTags(['Energy', 'sleep'], ['energy'])).toEqual(['Energy'])
  })
})

describe('learning inbox', () => {
  it('separates unlinked observations from those awaiting interpretation', () => {
    const loose = createObservation(WS, { description: 'Loose' })
    const linked = createObservation(WS, { description: 'Linked', relatedThoughtIds: ['th_1'] })
    const interpreted = createObservation(WS, {
      description: 'Interpreted',
      relatedThoughtIds: ['th_1'],
    })
    const evidence = createEvidence(WS, {
      statement: 'Means something',
      observationIds: [interpreted.id],
      supportingObservationIds: [interpreted.id],
    })

    const inbox = buildLearningInbox({
      ...emptyData(),
      observations: [loose, linked, interpreted],
      evidence: [evidence],
    })

    expect(inbox.unlinkedObservations.map((entry) => entry.id)).toEqual([loose.id])
    expect(inbox.awaitingInterpretation.map((entry) => entry.id)).toEqual([linked.id])
    expect(inbox.weaklySupported.map((entry) => entry.id)).toEqual([evidence.id])
    expect(inboxOpenCount(inbox)).toBeGreaterThan(0)
  })

  it('leaves archived observations out of the inbox', () => {
    const archived = createObservation(WS, {
      description: 'Put aside',
      archivedAt: '2026-01-01T00:00:00.000Z',
    })
    const inbox = buildLearningInbox({ ...emptyData(), observations: [archived] })
    expect(inbox.recentObservations).toHaveLength(0)
    expect(inbox.unlinkedObservations).toHaveLength(0)
  })

  it('flags a belief with nothing recorded behind it', () => {
    const belief = createBelief(WS, { statement: 'Rest must be earned' })
    const inbox = buildLearningInbox({ ...emptyData(), beliefs: [belief] })
    expect(inbox.beliefsNeedingReview).toHaveLength(1)
  })
})

describe('learning graph', () => {
  it('walks from a belief back to the observation behind it', () => {
    const observation = createObservation(WS, { description: 'Left the house' })
    const evidence = createEvidence(WS, {
      statement: 'Changing environments helps',
      observationIds: [observation.id],
      supportingObservationIds: [observation.id],
    })
    const belief = createBelief(WS, {
      statement: 'Motivation can follow movement',
      evidenceIds: [evidence.id],
    })

    const graph = buildLearningGraph(
      { ...emptyData(), observations: [observation], evidence: [evidence], beliefs: [belief] },
      { focusId: belief.id, maxDepth: 2 },
    )

    expect(graph.nodes.map((node) => node.id).sort()).toEqual(
      [belief.id, evidence.id, observation.id].sort(),
    )
    expect(graph.edges.some((edge) => edge.type === 'supportsBelief')).toBe(true)
    expect(graph.edges.some((edge) => edge.type === 'derivedFrom')).toBe(true)
  })

  it('marks evidence that pushes against a belief as weakening it', () => {
    const evidence = createEvidence(WS, { statement: 'One indulgence changed nothing' })
    const belief = createBelief(WS, {
      statement: 'One indulgence means failure',
      contradictingEvidenceIds: [evidence.id],
    })
    const graph = buildLearningGraph({ ...emptyData(), evidence: [evidence], beliefs: [belief] })
    expect(graph.edges.find((edge) => edge.type === 'weakensBelief')).toBeDefined()
  })

  it('leaves thoughts out unless they are asked for', () => {
    const observation = createObservation(WS, {
      description: 'Went for a walk',
      relatedThoughtIds: ['th_walk'],
    })
    const data = { ...emptyData(), observations: [observation] }
    expect(buildLearningGraph(data).nodes.map((node) => node.kind)).toEqual(['observation'])
  })
})
