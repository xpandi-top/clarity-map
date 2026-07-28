import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CollectionBrowser } from '../../components/common/CollectionBrowser'
import { useCollectionBrowser } from '../../components/common/useCollectionBrowser'
import { DimensionInput } from '../../components/dimensions/DimensionInput'
import { FocusedThoughtCard } from '../../components/thoughts/FocusedThoughtCard'
import { ThoughtMeta } from '../../components/thoughts/ThoughtMeta'
import { InlineThoughtDetails } from '../../components/thoughts/ThoughtDetailPanel'
import { BUILTIN_DIMENSION } from '../../domain/defaults'
import { getDimensionValue } from '../../domain/matrix'
import {
  ACTION_TAG,
  EMPTY_ACTION_FILTERS,
  isActionable,
  matchesActionFilters,
  nextActions,
  type ActionFilterFlags,
} from '../../domain/selectors'
import type { Thought } from '../../domain/types'
import { useActiveDimensions, useStore, useVisibleThoughts } from '../../store'

const ASSESSMENT_DIMENSIONS = [
  BUILTIN_DIMENSION.difficulty,
  BUILTIN_DIMENSION.priority,
  BUILTIN_DIMENSION.impact,
  BUILTIN_DIMENSION.energy,
  BUILTIN_DIMENSION.urgency,
]

const FILTER_LABELS: Array<{ key: keyof ActionFilterFlags; label: string }> = [
  { key: 'lowDifficulty', label: 'Low difficulty' },
  { key: 'highImpact', label: 'High impact' },
  { key: 'lowEnergyFriendly', label: 'Suitable for low-energy periods' },
  { key: 'under15Minutes', label: 'Under 15 minutes' },
  { key: 'delegatable', label: 'Delegatable' },
  { key: 'noPrerequisite', label: 'No prerequisite' },
  { key: 'canStartNow', label: 'Can start now' },
]

export function ActionsScreen() {
  const thoughts = useVisibleThoughts()
  const [flags, setFlags] = useState<ActionFilterFlags>(EMPTY_ACTION_FILTERS)

  const actionable = useMemo(() => thoughts.filter(isActionable), [thoughts])
  const filtered = useMemo(
    () => actionable.filter((thought) => matchesActionFilters(thought, flags)),
    [actionable, flags],
  )
  const suggested = useMemo(() => nextActions(actionable), [actionable])
  const browser = useCollectionBrowser(filtered.length)

  return (
    <div className="stack">
      <div className="screen-header">
        <h1>Actions and habits</h1>
        <p>
          Review what you can complete and what you want to repeat. Add only the detail that
          helps you choose what to do.
        </p>
      </div>

      {actionable.length === 0 ? (
        <p className="empty-state">
          No thoughts are classified as an Action or Habit yet. You can classify them in{' '}
          <Link to="/structure">Structure</Link>.
        </p>
      ) : null}

      {suggested.length > 0 ? (
        <details className="concept-guide">
          <summary>Suggested order ({suggested.length})</summary>
          <div className="stack concept-guide__content">
            <p className="faint" style={{ margin: 0 }}>
              Sorted by priority, then impact, then least difficulty.
            </p>
            <ol className="stack" style={{ gap: 'var(--space-2)' }}>
              {suggested.map((thought) => (
                <li key={thought.id}>
                  {thought.text} <ThoughtMeta thought={thought} />
                </li>
              ))}
            </ol>
          </div>
        </details>
      ) : null}

      <fieldset className="filter-bar" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="label">Filters</legend>
        {FILTER_LABELS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            className="button button--small"
            aria-pressed={flags[filter.key]}
            onClick={() =>
              setFlags((current) => ({ ...current, [filter.key]: !current[filter.key] }))
            }
          >
            {filter.label}
          </button>
        ))}
        <button
          type="button"
          className="button button--quiet button--small"
          onClick={() => setFlags(EMPTY_ACTION_FILTERS)}
        >
          Clear filters
        </button>
      </fieldset>

      <p className="muted" role="status">
        Showing {filtered.length} of {actionable.length}
      </p>

      {actionable.length > 0 ? (
        <CollectionBrowser
          mode={browser.mode}
          onModeChange={browser.setMode}
          index={browser.index}
          total={filtered.length}
          itemLabel="action"
          onPrevious={browser.previous}
          onNext={browser.next}
        />
      ) : null}

      {actionable.length > 0 && filtered.length === 0 ? (
        <div className="empty-state stack">
          <p style={{ margin: 0 }}>No actions match these filters.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button
              type="button"
              className="button button--small"
              onClick={() => setFlags(EMPTY_ACTION_FILTERS)}
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <ul
          className={`settings-list ${
            browser.mode === 'focus' ? 'collection-list--focus' : ''
          }`}
        >
          {filtered.slice(browser.start, browser.end).map((thought) => (
            <li
              key={thought.id}
              className={browser.mode === 'focus' ? 'focused-thought stack' : undefined}
            >
              {browser.mode === 'focus' ? (
                <>
                  <FocusedThoughtCard thought={thought} label="Action or habit" />
                  <InlineThoughtDetails thoughtId={thought.id} />
                </>
              ) : (
                <ActionAssessment thought={thought} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ActionAssessment({ thought }: { thought: Thought }) {
  const dimensions = useActiveDimensions()
  const setDimensionValue = useStore((state) => state.setDimensionValue)
  const updateThought = useStore((state) => state.updateThought)
  const addTag = useStore((state) => state.addTag)
  const removeTag = useStore((state) => state.removeTag)
  const selectThought = useStore((state) => state.selectThought)

  const assessment = dimensions.filter((dimension) =>
    ASSESSMENT_DIMENSIONS.includes(dimension.id as (typeof ASSESSMENT_DIMENSIONS)[number]),
  )

  const toggleTag = (tag: string, next: boolean) => {
    if (next) addTag(thought.id, tag)
    else removeTag(thought.id, tag)
  }

  return (
    <div className="settings-item stack">
      <div className="spread">
        <div>
          <p style={{ margin: 0 }}>{thought.text}</p>
          <ThoughtMeta thought={thought} />
        </div>
        <button
          type="button"
          className="button button--small"
          onClick={() => selectThought(thought.id)}
        >
          Open details
        </button>
      </div>

      <div className="grid-2">
        {assessment.map((dimension) => (
          <DimensionInput
            key={dimension.id}
            dimension={dimension}
            value={getDimensionValue(thought, dimension)}
            onChange={(value) => setDimensionValue(thought.id, dimension.id, value)}
          />
        ))}
      </div>

      <div className="field">
        <label htmlFor={`minutes-${thought.id}`}>Estimated minutes</label>
        <input
          id={`minutes-${thought.id}`}
          className="input"
          type="number"
          min={0}
          value={thought.estimatedMinutes ?? ''}
          onChange={(event) => {
            const raw = event.target.value
            const parsed = Number(raw)
            updateThought(thought.id, {
              estimatedMinutes:
                raw.trim() === '' || Number.isNaN(parsed) || parsed < 0 ? undefined : parsed,
            })
          }}
        />
      </div>

      <div className="stack" style={{ gap: 'var(--space-1)' }}>
        {Object.values(ACTION_TAG).map((tag) => (
          <label key={tag} className="checkbox-row">
            <input
              type="checkbox"
              checked={thought.tags.includes(tag)}
              onChange={(event) => toggleTag(tag, event.target.checked)}
            />
            <span>{tag}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
