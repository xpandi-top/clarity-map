import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore, useStore } from './store'
import { migratePersistedState } from './migrations'
import { buildExport, serializeExport } from '../domain/importExport'
import { relevantLearning } from '../domain/relevance'
import { SCHEMA_VERSION } from '../domain/schema'
import { validateImport } from '../domain/validation'

const api = () => useStore.getState()

beforeEach(() => {
  window.localStorage.clear()
  resetStore()
})

describe('observations and evidence', () => {
  it('refuses to record anything without a workspace or without words', () => {
    expect(api().addObservation({ description: 'orphan' })).toBeNull()
    api().startWorkspace()
    expect(api().addObservation({ description: '   ' })).toBeNull()
    expect(api().addEvidence({ statement: '  ' })).toBeNull()
    expect(api().observations).toHaveLength(0)
  })

  it('keeps evidence from pointing at an observation that has been deleted', () => {
    api().startWorkspace()
    const observationId = api().addObservation({ description: 'Left the house' })!
    const evidenceId = api().addEvidence({
      statement: 'Changing environments helps',
      observationIds: [observationId],
      supportingObservationIds: [observationId],
    })!

    api().deleteObservation(observationId)

    const evidence = api().evidence.find((entry) => entry.id === evidenceId)!
    expect(evidence.observationIds).toEqual([])
    expect(evidence.supportingObservationIds).toEqual([])
  })
})

describe('belief updates', () => {
  it('keeps the previous belief and links it to its replacement', () => {
    api().startWorkspace()
    const previousId = api().addBelief({ statement: 'Milk tea means I have failed' })!

    const updatedId = api().recordBeliefUpdate({
      previousBeliefId: previousId,
      updatedStatement: 'One milk tea does not mean abandoning the health goal',
      reason: 'The evening it happened, dinner still got cooked.',
      confidence: 'low',
    })!

    const previous = api().beliefs.find((belief) => belief.id === previousId)!
    const updated = api().beliefs.find((belief) => belief.id === updatedId)!

    expect(previous.statement).toBe('Milk tea means I have failed')
    expect(previous.status).toBe('replaced')
    expect(previous.replacementBeliefId).toBe(updatedId)
    expect(updated.previousBeliefId).toBe(previousId)

    const update = api().beliefUpdates[0]
    expect(update.previousStatement).toBe('Milk tea means I have failed')
    expect(update.updatedBeliefId).toBe(updatedId)
    expect(update.reason).toContain('dinner still got cooked')
  })

  it('marks a revision uncertain when evidence points both ways', () => {
    api().startWorkspace()
    const against = api().addEvidence({ statement: 'Once it made things worse' })!
    const id = api().recordBeliefUpdate({
      updatedStatement: 'Leaving the house usually helps',
      reason: 'Mostly, but not always.',
      contradictingEvidenceIds: [against],
    })!
    const belief = api().beliefs.find((entry) => entry.id === id)!
    expect(belief.status).toBe('uncertain')
    expect(belief.contradictingEvidenceIds).toEqual([against])
  })
})

describe('personal default rules', () => {
  it('needs both a name and a default response', () => {
    api().startWorkspace()
    expect(api().addPersonalRule({ name: 'A rule', defaultResponse: '  ' })).toBeNull()
  })

  it('keeps the original when a rule is replaced', () => {
    api().startWorkspace()
    const originalId = api().addPersonalRule({
      name: 'Ten-minute limit',
      defaultResponse: 'Choose a good-enough option after ten minutes',
      status: 'active',
    })!

    const replacementId = api().replacePersonalRule(originalId, {
      name: 'Five-minute limit',
      defaultResponse: 'Choose a good-enough option after five minutes',
    })!

    const original = api().personalRules.find((rule) => rule.id === originalId)!
    expect(original.status).toBe('replaced')
    expect(original.replacedByRuleId).toBe(replacementId)
    expect(api().personalRules).toHaveLength(2)
  })
})

/**
 * Scenario G from the specification, start to finish: an experience becomes a
 * reading, the reading changes a belief, the belief becomes something to try,
 * and all of it survives an export and re-import.
 */
describe('scenario G — experience to model update', () => {
  it('carries one experience through to a rule, an export, and a reload', () => {
    api().startWorkspace('Scenario G')
    const goalId = api().addThought('Improve physical health')!
    const habitId = api().addThought('Walk every day')!
    api().setThoughtType(goalId, 'goal')
    api().setThoughtType(habitId, 'habit')

    const observationId = api().addObservation({
      description: 'After leaving the house, I became more willing to move.',
      energyBefore: 2,
      energyAfter: 4,
      relatedThoughtIds: [goalId, habitId],
    })!

    const evidenceId = api().addEvidence({
      statement: 'Changing environments may help me regain movement motivation.',
      observationIds: [observationId],
      supportingObservationIds: [observationId],
      relatedThoughtIds: [goalId, habitId],
    })!

    const previousBeliefId = api().addBelief({
      statement: 'I need to feel motivated before I start moving.',
      relatedThoughtIds: [goalId, habitId],
    })!

    const updatedBeliefId = api().recordBeliefUpdate({
      previousBeliefId,
      updatedStatement:
        'Movement motivation may appear after I change environments or begin moving.',
      reason: 'The willingness followed the change of environment, not the other way round.',
      supportingEvidenceIds: [evidenceId],
      relatedThoughtIds: [goalId, habitId],
    })!

    // 7 — the previous belief is still there.
    const previous = api().beliefs.find((belief) => belief.id === previousBeliefId)!
    expect(previous.status).toBe('replaced')
    expect(previous.statement).toBe('I need to feel motivated before I start moving.')

    const ruleId = api().addPersonalRule({
      name: 'Go outside before deciding about exercise',
      triggerDescription: 'my energy is low and I have stayed indoors for a long time',
      defaultResponse: 'Go outside for five minutes, then decide whether I want to exercise.',
      evidenceIds: [evidenceId],
      relatedGoalIds: [goalId],
      relatedThoughtIds: [habitId],
    })!
    expect(api().personalRules.find((rule) => rule.id === ruleId)!.status).toBe('experimental')

    // 10 — the habit's detail panel has all four kinds of record to show.
    const habit = api().thoughts.find((thought) => thought.id === habitId)!
    const reminders = relevantLearning(habit, {
      observations: api().observations,
      evidence: api().evidence,
      hypotheses: api().hypotheses,
      beliefs: api().beliefs,
      beliefUpdates: api().beliefUpdates,
      personalRules: api().personalRules,
    })
    expect(reminders.map((entry) => entry.kind)).toEqual(
      expect.arrayContaining(['observation', 'evidence', 'belief', 'rule']),
    )
    expect(reminders.some((entry) => entry.entityId === updatedBeliefId)).toBe(true)

    // 11 and 12 — the export carries the whole history.
    const workspaceId = api().currentWorkspaceId!
    const exported = api().exportWorkspaceData(workspaceId)!
    expect(exported.observations).toHaveLength(1)
    expect(exported.evidence).toHaveLength(1)
    expect(exported.beliefs).toHaveLength(2)
    expect(exported.beliefUpdates).toHaveLength(1)
    expect(exported.personalRules).toHaveLength(1)

    const parsed = validateImport(serializeExport([exported]))
    expect(parsed.ok).toBe(true)
    const reimported = parsed.value!.data.workspaces[0]
    expect(reimported.beliefUpdates[0].previousStatement).toBe(
      'I need to feel motivated before I start moving.',
    )

    // Merging beside the original reassigns ids without breaking the chain.
    const count = api().importEnvelope(buildExport([exported]), 'merge')
    expect(count).toBe(1)
    const copyWorkspaceId = api().currentWorkspaceId!
    expect(copyWorkspaceId).not.toBe(workspaceId)

    const copyEvidence = api().evidence.filter((entry) => entry.workspaceId === copyWorkspaceId)
    const copyObservations = api().observations.filter(
      (entry) => entry.workspaceId === copyWorkspaceId,
    )
    const copyBeliefs = api().beliefs.filter((entry) => entry.workspaceId === copyWorkspaceId)
    const copyRules = api().personalRules.filter(
      (entry) => entry.workspaceId === copyWorkspaceId,
    )
    const copyThoughtIds = api()
      .thoughts.filter((thought) => thought.workspaceId === copyWorkspaceId)
      .map((thought) => thought.id)

    expect(copyEvidence[0].id).not.toBe(evidenceId)
    expect(copyEvidence[0].supportingObservationIds).toEqual([copyObservations[0].id])
    expect(copyEvidence[0].relatedThoughtIds.every((id) => copyThoughtIds.includes(id))).toBe(true)

    const copyUpdated = copyBeliefs.find((belief) => belief.previousBeliefId)!
    expect(copyBeliefs.some((belief) => belief.id === copyUpdated.previousBeliefId)).toBe(true)
    expect(copyUpdated.evidenceIds).toEqual([copyEvidence[0].id])
    expect(copyRules[0].evidenceIds).toEqual([copyEvidence[0].id])

    // 13 — a reload reads the same records back.
    const persisted = JSON.parse(window.localStorage.getItem('clarity-map-storage') ?? '{}')
    const restored = migratePersistedState(persisted.state, persisted.version ?? SCHEMA_VERSION)
    expect(restored.observations.length).toBe(api().observations.length)
    expect(restored.beliefUpdates.length).toBe(api().beliefUpdates.length)
    expect(restored.personalRules.length).toBe(api().personalRules.length)
  })
})

describe('older snapshots', () => {
  it('reads a snapshot written before the learning records existed', () => {
    const migrated = migratePersistedState(
      { schemaVersion: 2, workspaces: [], thoughts: [] },
      2,
    )
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
    expect(migrated.observations).toEqual([])
    expect(migrated.beliefs).toEqual([])
  })

  it('imports a file that has no learning records at all', () => {
    const result = validateImport(
      JSON.stringify({
        app: 'clarity-map',
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        data: {
          workspaces: [
            {
              workspace: { id: 'ws_old', name: 'Old', currentStage: 'capture' },
              thoughts: [{ id: 'th_1', text: 'A thought' }],
              dimensions: [
                { id: 'dim_importance', name: 'Importance', kind: 'binary', question: 'q' },
              ],
              relations: [],
              comparisons: [],
              rules: [],
            },
          ],
        },
      }),
    )
    expect(result.ok).toBe(true)
    expect(result.value!.data.workspaces[0].observations).toEqual([])
    expect(result.value!.data.workspaces[0].personalRules).toEqual([])
  })

  it('drops learning links that point at records the file does not contain', () => {
    const result = validateImport(
      JSON.stringify({
        app: 'clarity-map',
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          workspaces: [
            {
              workspace: { id: 'ws_1', name: 'W', currentStage: 'capture' },
              thoughts: [{ id: 'th_1', text: 'A thought' }],
              dimensions: [
                { id: 'dim_importance', name: 'Importance', kind: 'binary', question: 'q' },
              ],
              relations: [],
              comparisons: [],
              rules: [],
              observations: [
                {
                  id: 'obs_1',
                  description: 'Something happened',
                  relatedThoughtIds: ['th_1', 'th_missing'],
                },
              ],
              evidence: [
                {
                  id: 'evd_1',
                  statement: 'It may mean something',
                  observationIds: ['obs_1', 'obs_missing'],
                },
              ],
              beliefs: [{ id: 'blf_1', statement: 'A model', evidenceIds: ['evd_1', 'evd_gone'] }],
              beliefUpdates: [
                { id: 'bup_orphan', updatedBeliefId: 'blf_missing', updatedStatement: 'Orphan' },
              ],
            },
          ],
        },
      }),
    )

    expect(result.ok).toBe(true)
    const workspace = result.value!.data.workspaces[0]
    expect(workspace.observations[0].relatedThoughtIds).toEqual(['th_1'])
    expect(workspace.evidence[0].observationIds).toEqual(['obs_1'])
    expect(workspace.beliefs[0].evidenceIds).toEqual(['evd_1'])
    expect(workspace.beliefUpdates).toEqual([])
  })
})
