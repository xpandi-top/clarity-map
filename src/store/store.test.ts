import { beforeEach, describe, expect, it } from 'vitest'
import { resetStore, useStore } from './store'
import { migratePersistedState } from './migrations'
import {
  BUILTIN_DIMENSION,
  IMPORTANCE_YES,
  MOTIVATION_WANT,
  createDefaultDimensions,
} from '../domain/defaults'
import { createExampleWorkspace } from '../domain/example'
import { buildExport, serializeExport } from '../domain/importExport'
import { SCHEMA_VERSION, STORAGE_KEY } from '../domain/schema'
import { validateImport } from '../domain/validation'

const api = () => useStore.getState()

beforeEach(() => {
  window.localStorage.clear()
  resetStore()
})

describe('thoughts', () => {
  it('creates a thought in the current workspace', () => {
    api().startWorkspace('Test')
    const id = api().addThought('  Change jobs  ')
    expect(id).not.toBeNull()
    const thought = api().thoughts[0]
    expect(thought.text).toBe('Change jobs')
    expect(thought.type).toBe('unclassified')
    expect(thought.workspaceId).toBe(api().currentWorkspaceId)
  })

  it('refuses to create a thought with no workspace or no text', () => {
    expect(api().addThought('orphan')).toBeNull()
    api().startWorkspace()
    expect(api().addThought('   ')).toBeNull()
    expect(api().thoughts).toHaveLength(0)
  })

  it('edits a thought and moves its updatedAt forward', () => {
    api().startWorkspace()
    const id = api().addThought('Original')!
    const before = api().thoughts[0].updatedAt
    api().updateThought(id, { text: 'Edited', description: 'More context' })
    const after = api().thoughts[0]
    expect(after.text).toBe('Edited')
    expect(after.description).toBe('More context')
    expect(after.updatedAt >= before).toBe(true)
  })

  it('deletes a thought together with its relationships', () => {
    api().startWorkspace()
    const goal = api().addThought('Improve physical health')!
    const habit = api().addThought('Walk every day')!
    api().addRelation(habit, 'serves', goal)
    expect(api().relations).toHaveLength(1)

    api().deleteThought(habit)
    expect(api().thoughts.map((thought) => thought.id)).toEqual([goal])
    expect(api().relations).toHaveLength(0)
  })

  it('restores the most recent deletion, relationships included', () => {
    api().startWorkspace()
    const goal = api().addThought('Improve physical health')!
    const habit = api().addThought('Walk every day')!
    api().addRelation(habit, 'serves', goal)

    api().deleteThought(habit)
    api().undoDelete()

    expect(api().thoughts).toHaveLength(2)
    expect(api().relations).toHaveLength(1)
    expect(api().lastDeletion).toBeNull()
  })

  it('does nothing when there is no deletion to undo', () => {
    api().startWorkspace()
    api().addThought('Only thought')
    api().undoDelete()
    expect(api().thoughts).toHaveLength(1)
  })
})

describe('dimension values', () => {
  it('records a value and updates the matrix position', () => {
    api().startWorkspace()
    const id = api().addThought('Learn AWS')!
    api().setDimensionValue(id, BUILTIN_DIMENSION.motivation, MOTIVATION_WANT)
    api().setDimensionValue(id, BUILTIN_DIMENSION.importance, IMPORTANCE_YES)

    const thought = api().thoughts[0]
    expect(thought.dimensionValues[BUILTIN_DIMENSION.motivation]).toBe(MOTIVATION_WANT)
    expect(thought.dimensionValues[BUILTIN_DIMENSION.importance]).toBe(IMPORTANCE_YES)
  })

  it('clears a value when set to null', () => {
    api().startWorkspace()
    const id = api().addThought('Learn AWS')!
    api().setDimensionValue(id, BUILTIN_DIMENSION.importance, IMPORTANCE_YES)
    api().setDimensionValue(id, BUILTIN_DIMENSION.importance, null)
    expect(api().thoughts[0].dimensionValues[BUILTIN_DIMENSION.importance]).toBeUndefined()
  })

  it('routes the thought-type dimension to the thought itself', () => {
    api().startWorkspace()
    const id = api().addThought('Walk every day')!
    api().setDimensionValue(id, BUILTIN_DIMENSION.thoughtType, 'habit')
    expect(api().thoughts[0].type).toBe('habit')
    expect(api().thoughts[0].dimensionValues[BUILTIN_DIMENSION.thoughtType]).toBeUndefined()
  })
})

describe('relationships', () => {
  it('rejects an exact duplicate', () => {
    api().startWorkspace()
    const a = api().addThought('Walk every day')!
    const b = api().addThought('Improve physical health')!
    expect(api().addRelation(a, 'serves', b).ok).toBe(true)
    const second = api().addRelation(a, 'serves', b)
    expect(second.ok).toBe(false)
    expect(second.reason).toContain('already exists')
    expect(api().relations).toHaveLength(1)
  })

  it('rejects a thought relating to itself', () => {
    api().startWorkspace()
    const a = api().addThought('Walk every day')!
    expect(api().addRelation(a, 'serves', a).ok).toBe(false)
  })

  it('keeps a relationship that closes a loop but reports a warning', () => {
    api().startWorkspace()
    const a = api().addThought('A')!
    const b = api().addThought('B')!
    api().addRelation(a, 'serves', b)
    const result = api().addRelation(b, 'serves', a)
    expect(result.ok).toBe(true)
    expect(result.warning).toContain('loop')
    expect(api().relations).toHaveLength(2)
  })
})

describe('comparisons', () => {
  it('stores results and clears them per dimension', () => {
    api().startWorkspace()
    const a = api().addThought('A')!
    const b = api().addThought('B')!
    api().recordComparison(BUILTIN_DIMENSION.importance, a, b, 'left')
    api().recordComparison(BUILTIN_DIMENSION.priority, a, b, 'right')
    expect(api().comparisons).toHaveLength(2)

    api().clearComparisons(BUILTIN_DIMENSION.importance)
    expect(api().comparisons).toHaveLength(1)
    expect(api().comparisons[0].dimensionId).toBe(BUILTIN_DIMENSION.priority)
  })
})

describe('dimensions', () => {
  it('adds a custom dimension and refuses to delete built-in ones', () => {
    api().startWorkspace()
    const workspaceId = api().currentWorkspaceId!
    const id = api().addDimension({
      name: 'Energy effect (custom)',
      question: 'Does this restore you?',
      kind: 'scale',
      min: -5,
      max: 5,
      step: 1,
      required: false,
      active: true,
      stage: 'optional',
    })!

    expect(api().dimensionsByWorkspace[workspaceId].some((entry) => entry.id === id)).toBe(true)

    api().deleteDimension(BUILTIN_DIMENSION.importance)
    expect(
      api().dimensionsByWorkspace[workspaceId].some(
        (entry) => entry.id === BUILTIN_DIMENSION.importance,
      ),
    ).toBe(true)

    api().deleteDimension(id)
    expect(api().dimensionsByWorkspace[workspaceId].some((entry) => entry.id === id)).toBe(false)
  })
})

describe('import and export', () => {
  it('leaves existing data untouched when a file fails validation', () => {
    api().startWorkspace()
    api().addThought('Something I already wrote')
    const before = structuredClone(api().thoughts)

    const result = validateImport('{"app":"not-clarity-map"}')
    expect(result.ok).toBe(false)
    if (result.ok && result.value) api().importEnvelope(result.value, 'replace')

    expect(api().thoughts).toEqual(before)
  })

  it('merges an imported workspace alongside existing data', () => {
    api().startWorkspace()
    api().addThought('Local thought')
    const example = createExampleWorkspace()

    const result = validateImport(serializeExport([example]))
    expect(result.ok).toBe(true)
    const count = api().importEnvelope(result.value!, 'merge')

    expect(count).toBe(1)
    expect(api().workspaces).toHaveLength(2)
    expect(api().thoughts.length).toBe(1 + example.thoughts.length)
  })

  it('reassigns ids when an imported workspace collides with a local one', () => {
    const example = createExampleWorkspace()
    api().importEnvelope(buildExport([example]), 'merge')
    api().importEnvelope(buildExport([example]), 'merge')

    const ids = api().workspaces.map((workspace) => workspace.id)
    expect(new Set(ids).size).toBe(2)
    expect(api().thoughts).toHaveLength(example.thoughts.length * 2)
  })

  it('replaces everything when the user asks for replace', () => {
    api().startWorkspace()
    api().addThought('Local thought')
    const example = createExampleWorkspace()

    api().importEnvelope(buildExport([example]), 'replace')

    expect(api().workspaces).toHaveLength(1)
    expect(api().thoughts).toHaveLength(example.thoughts.length)
  })

  it('round-trips an export back through import', () => {
    api().loadExampleWorkspace()
    const workspaceId = api().currentWorkspaceId!
    const exported = api().exportWorkspaceData(workspaceId)!
    const relationCount = exported.relations.length

    api().deleteWorkspace(workspaceId)
    expect(api().thoughts).toHaveLength(0)

    const result = validateImport(serializeExport([exported]))
    api().importEnvelope(result.value!, 'merge')

    expect(api().thoughts).toHaveLength(exported.thoughts.length)
    expect(api().relations).toHaveLength(relationCount)
    expect(api().comparisons).toHaveLength(exported.comparisons.length)
  })
})

describe('persistence', () => {
  it('writes business data to storage and leaves UI state out', async () => {
    api().startWorkspace('Persisted')
    const id = api().addThought('Remembered thought')!
    api().selectThought(id)

    await Promise.resolve()
    const snapshot = window.localStorage.getItem(STORAGE_KEY)
    expect(snapshot).not.toBeNull()

    const parsed = JSON.parse(snapshot!)
    expect(parsed.version).toBe(SCHEMA_VERSION)
    expect(parsed.state.thoughts).toHaveLength(1)
    expect(parsed.state.selectedThoughtId).toBeUndefined()
    expect(parsed.state.toast).toBeUndefined()
    expect(parsed.state.lastDeletion).toBeUndefined()
  })

  it('restores a persisted snapshot on rehydrate', async () => {
    api().startWorkspace('Persisted')
    api().addThought('Remembered thought')
    await Promise.resolve()
    const snapshot = window.localStorage.getItem(STORAGE_KEY)!

    resetStore()
    expect(api().thoughts).toHaveLength(0)

    window.localStorage.setItem(STORAGE_KEY, snapshot)
    await useStore.persist.rehydrate()

    expect(api().thoughts).toHaveLength(1)
    expect(api().thoughts[0].text).toBe('Remembered thought')
    expect(api().workspaces[0].name).toBe('Persisted')
  })
})

describe('schema migration', () => {
  it('stamps the current schema version onto an unversioned snapshot', () => {
    const migrated = migratePersistedState({ thoughts: [], workspaces: [] }, 0)
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
    expect(migrated.thoughts).toEqual([])
  })

  it('gives built-in dimensions saved at version 1 their comparative wording', () => {
    // A version 1 snapshot: no dimension knew how to phrase a comparison.
    const legacy = createDefaultDimensions().map(({ comparativeQuestion: _drop, ...rest }) => rest)
    const migrated = migratePersistedState(
      { schemaVersion: 1, dimensionsByWorkspace: { ws_1: legacy } },
      1,
    )

    const importance = migrated.dimensionsByWorkspace.ws_1.find(
      (entry) => entry.id === BUILTIN_DIMENSION.importance,
    )
    expect(importance?.comparativeQuestion).toBe('Which one matters more to you?')
  })

  it('leaves wording the user wrote alone', () => {
    const custom = createDefaultDimensions().map((entry) =>
      entry.id === BUILTIN_DIMENSION.importance
        ? { ...entry, comparativeQuestion: 'Which one would I regret dropping?' }
        : entry,
    )
    const migrated = migratePersistedState(
      { schemaVersion: 1, dimensionsByWorkspace: { ws_1: custom } },
      1,
    )

    expect(
      migrated.dimensionsByWorkspace.ws_1.find(
        (entry) => entry.id === BUILTIN_DIMENSION.importance,
      )?.comparativeQuestion,
    ).toBe('Which one would I regret dropping?')
  })

  it('keeps the data in a current snapshot', () => {
    const example = createExampleWorkspace()
    const migrated = migratePersistedState(
      {
        schemaVersion: SCHEMA_VERSION,
        workspaces: [example.workspace],
        thoughts: example.thoughts,
        currentWorkspaceId: example.workspace.id,
      },
      SCHEMA_VERSION,
    )
    expect(migrated.thoughts).toHaveLength(example.thoughts.length)
    expect(migrated.currentWorkspaceId).toBe(example.workspace.id)
  })

  it('falls back to a clean state for an unreadable snapshot', () => {
    const migrated = migratePersistedState(null, 1)
    expect(migrated.workspaces).toEqual([])
    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION)
  })
})
