import { describe, expect, it } from 'vitest'
import {
  createBelief,
  createEvidence,
  createObservation,
  createPersonalRule,
} from './learning'
import { relevantLearning, rulesMatchingSituation } from './relevance'
import type { LearningData } from './types'

const WS = 'ws_test'
const THOUGHT = { id: 'th_walk', tags: [] as string[] }

function data(patch: Partial<LearningData> = {}): LearningData {
  return {
    observations: [],
    evidence: [],
    hypotheses: [],
    beliefs: [],
    beliefUpdates: [],
    personalRules: [],
    ...patch,
  }
}

describe('relevant learning', () => {
  it('reaches a belief through an observation linked to the thought', () => {
    const observation = createObservation(WS, {
      description: 'After leaving the house, I felt more willing to walk',
      relatedThoughtIds: [THOUGHT.id],
      energyBefore: 2,
      energyAfter: 4,
    })
    const evidence = createEvidence(WS, {
      statement: 'Changing environments may help me regain movement motivation',
      observationIds: [observation.id],
      supportingObservationIds: [observation.id],
    })
    const belief = createBelief(WS, {
      statement: 'Motivation may appear after I begin moving',
      evidenceIds: [evidence.id],
    })

    const reminders = relevantLearning(
      THOUGHT,
      data({ observations: [observation], evidence: [evidence], beliefs: [belief] }),
    )

    expect(reminders.map((entry) => entry.kind)).toEqual(['observation', 'evidence', 'belief'])
    expect(reminders[0].message).toContain('You previously recorded')
    expect(reminders[1].message).toContain('one observation suggesting')
    // Every line can be traced back to a record.
    expect(reminders[1].sourceObservationIds).toContain(observation.id)
  })

  it('says when a belief has evidence on both sides rather than hiding it', () => {
    const supporting = createEvidence(WS, { statement: 'It helped', relatedThoughtIds: [THOUGHT.id] })
    const against = createEvidence(WS, { statement: 'It did not help', relatedThoughtIds: [THOUGHT.id] })
    const belief = createBelief(WS, {
      statement: 'Leaving the house helps',
      evidenceIds: [supporting.id],
      contradictingEvidenceIds: [against.id],
    })

    const reminders = relevantLearning(
      THOUGHT,
      data({ evidence: [supporting, against], beliefs: [belief] }),
    )
    const beliefReminder = reminders.find((entry) => entry.kind === 'belief')
    expect(beliefReminder?.caution).toBe('This belief currently has mixed evidence.')
  })

  it('matches on shared tags, and marks that it did', () => {
    const observation = createObservation(WS, {
      description: 'Left the house and felt lighter',
      context: { tags: ['energy'] },
    })
    const reminders = relevantLearning(
      { id: 'th_other', tags: ['Energy'] },
      data({ observations: [observation] }),
    )
    expect(reminders).toHaveLength(1)
    expect(reminders[0].via).toBe('tag')
  })

  it('leaves out retired and archived records', () => {
    const observation = createObservation(WS, {
      description: 'Old note',
      relatedThoughtIds: [THOUGHT.id],
      archivedAt: '2026-01-01T00:00:00.000Z',
    })
    const evidence = createEvidence(WS, {
      statement: 'Retired reading',
      relatedThoughtIds: [THOUGHT.id],
      status: 'retired',
    })
    expect(relevantLearning(THOUGHT, data({ observations: [observation], evidence: [evidence] })))
      .toHaveLength(0)
  })

  it('hands back the current working model, not the one it replaced', () => {
    const evidence = createEvidence(WS, { statement: 'It helped', relatedThoughtIds: [THOUGHT.id] })
    const previous = createBelief(WS, {
      statement: 'I need motivation before I move',
      status: 'replaced',
      evidenceIds: [evidence.id],
    })
    const current = createBelief(WS, {
      statement: 'Motivation may follow movement',
      evidenceIds: [evidence.id],
      previousBeliefId: previous.id,
    })

    const beliefReminders = relevantLearning(
      THOUGHT,
      data({ evidence: [evidence], beliefs: [previous, current] }),
    ).filter((entry) => entry.kind === 'belief')

    expect(beliefReminders).toHaveLength(1)
    expect(beliefReminders[0].entityId).toBe(current.id)
  })

  it('surfaces a default rule linked to the thought, with its review warning', () => {
    const rule = createPersonalRule(WS, {
      name: 'Go outside first',
      triggerDescription: 'my energy is low',
      defaultResponse: 'Go outside for five minutes, then decide',
      relatedGoalIds: [THOUGHT.id],
      evidenceIds: ['a'],
      contradictingEvidenceIds: ['b'],
    })
    const reminders = relevantLearning(THOUGHT, data({ personalRules: [rule] }))
    expect(reminders[0].message).toContain('Your default when my energy is low')
    expect(reminders[0].caution).toContain('mixed evidence')
  })
})

describe('rules matching a typed situation', () => {
  it('matches on the words the user wrote, and ignores retired rules', () => {
    const active = createPersonalRule(WS, {
      name: 'Decide within ten minutes',
      triggerDescription: 'I have been deliberating for a long time',
      defaultResponse: 'Choose a good-enough option',
      status: 'active',
    })
    const retired = createPersonalRule(WS, {
      name: 'Deliberate carefully',
      triggerDescription: 'deliberating',
      defaultResponse: 'Keep weighing it up',
      status: 'retired',
    })

    const matched = rulesMatchingSituation([active, retired], 'I have been deliberating all evening')
    expect(matched.map((rule) => rule.id)).toEqual([active.id])
  })

  it('returns nothing for an empty situation', () => {
    const rule = createPersonalRule(WS, { name: 'A', defaultResponse: 'B' })
    expect(rulesMatchingSituation([rule], '   ')).toEqual([])
  })
})
